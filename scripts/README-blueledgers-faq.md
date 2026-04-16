# Blueledgers FAQ Workflow

## 1) Convert source docs from Drive folder

```bash
python scripts/blueledgers_faq_from_drive.py \
  --source-dir "C:/Users/thinnakorn/Downloads/drive-download-20260415T200848Z-3-001" \
  --output-dir "contents/blueledgers/faq" \
  --clean-output
```

What this does:

- Reads `.docx` and `.md` recursively from source
- Parses hierarchy from folder name `Module-Submodule-Category`
- Writes FAQ markdown into subfolders, e.g. `contents/blueledgers/faq/Material-Procedure-Closing Balance/<article>.md`
- Copies/rewrites images into `contents/blueledgers/faq/_images/<article-slug>/...`
- Adds frontmatter fields: `faq_module`, `faq_submodule`, `faq_category`

## 2) Sync wiki + rebuild vector index for Blueledgers

```bash
ADMIN_KEY="<your-admin-api-key>" ./scripts/sync-wiki-and-reindex-bu.sh blueledgers
```

Or:

```bash
BU=blueledgers ADMIN_KEY="<your-admin-api-key>" API_BASE=http://localhost:8080 ./scripts/sync-wiki-and-reindex-bu.sh
```

## 3) Build SQL to import FAQ tree into DB tables (`public.faq_*`)

```bash
python scripts/build_faq_seed_sql.py \
  --faq-dir "contents/blueledgers/faq" \
  --bu blueledgers \
  --out-sql "scripts/seed_blueledgers_faq.sql"
```

Default behavior clears old FAQ data of this BU first.  
If you do not want purge, add `--no-purge`.

## 4) Run generated SQL

Run the generated file with your DB client (psql / Beekeeper / Neon SQL editor), for example:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/seed_blueledgers_faq.sql
```
