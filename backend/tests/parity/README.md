# Retrieval Parity Golden Set

Hand-curated questions used to verify the Go hybrid retrieval returns the right
documents. Parity bar: **every `expected_paths` glob must match at least one
path in the top-k** (100% recall on labeled paths).

## Run
```
RUN_DB_TESTS=1 go test ./tests/parity/ -v   # needs reachable DB + LLM_API_KEY
```

Without `RUN_DB_TESTS=1` the harness skips (keeps the offline unit suite green).

## Expand the set
Add objects to `golden_set.json`:
```json
{ "question": "...", "bu": "carmen", "expected_paths": ["%specific-doc%"] }
```
Pick questions whose correct document is unambiguous. Tighten globs from broad
(`%vendor%`) to specific document slugs as you learn the content. Target 30–50
entries across intents/modules (AP, AR, GL, Asset, Configuration, …).

## Starter entries rationale
The initial four entries use intentionally broad globs (`%vendor%`, `%ap%`,
`%purchase%`, `%gl%`) because the exact content paths require domain knowledge
of the deployed `carmen` schema. A domain expert should:
1. Run `RUN_DB_TESTS=1 go test ./tests/parity/ -v` against a seeded database.
2. Inspect the returned `Path` values for each question.
3. Replace the broad glob with the specific document path (e.g. `%vendor%` →
   `vendor/create-vendor`).
4. Add more questions covering AP, AR, GL, Asset, HR, and Configuration modules.
