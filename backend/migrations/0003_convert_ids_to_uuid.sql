-- 0003_convert_ids_to_uuid.sql
-- One-time in-place conversion of every public.* integer id/FK to UUID, preserving
-- all rows and relationships. Atomic; no-op when business_units.id is already uuid.
-- Apply with psql AFTER the schema is on the INT version (post-0001/0002 INT).

DO $$
BEGIN
  -- Guard: skip entirely if already converted.
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_schema='public' AND table_name='business_units' AND column_name='id') <> 'integer' THEN
    RAISE NOTICE '0003: business_units.id is not integer; skipping (already converted).';
    RETURN;
  END IF;

  -- ── Phase A: new UUID per row (the id map) ──────────────────────────────
  ALTER TABLE public.business_units  ADD COLUMN id_uuid UUID NOT NULL DEFAULT gen_random_uuid();
  ALTER TABLE public.documents       ADD COLUMN id_uuid UUID NOT NULL DEFAULT gen_random_uuid();
  ALTER TABLE public.document_chunks ADD COLUMN id_uuid UUID NOT NULL DEFAULT gen_random_uuid();
  ALTER TABLE public.chat_history    ADD COLUMN id_uuid UUID NOT NULL DEFAULT gen_random_uuid();
  ALTER TABLE public.activity_logs   ADD COLUMN id_uuid UUID NOT NULL DEFAULT gen_random_uuid();
  ALTER TABLE public.faq_modules     ADD COLUMN id_uuid UUID NOT NULL DEFAULT gen_random_uuid();
  ALTER TABLE public.faq_submodules  ADD COLUMN id_uuid UUID NOT NULL DEFAULT gen_random_uuid();
  ALTER TABLE public.faq_categories  ADD COLUMN id_uuid UUID NOT NULL DEFAULT gen_random_uuid();
  ALTER TABLE public.faq_entries     ADD COLUMN id_uuid UUID NOT NULL DEFAULT gen_random_uuid();

  -- ── Phase B: translate FKs through each parent's id↔id_uuid map ──────────
  ALTER TABLE public.documents ADD COLUMN bu_id_uuid UUID;
  UPDATE public.documents d SET bu_id_uuid = b.id_uuid FROM public.business_units b WHERE b.id = d.bu_id;

  ALTER TABLE public.document_chunks ADD COLUMN bu_id_uuid UUID, ADD COLUMN doc_id_uuid UUID;
  UPDATE public.document_chunks c SET bu_id_uuid = b.id_uuid FROM public.business_units b WHERE b.id = c.bu_id;
  UPDATE public.document_chunks c SET doc_id_uuid = d.id_uuid FROM public.documents d WHERE d.id = c.doc_id;

  ALTER TABLE public.chat_history ADD COLUMN bu_id_uuid UUID;
  UPDATE public.chat_history h SET bu_id_uuid = b.id_uuid FROM public.business_units b WHERE b.id = h.bu_id;

  ALTER TABLE public.activity_logs ADD COLUMN bu_id_uuid UUID;
  UPDATE public.activity_logs a SET bu_id_uuid = b.id_uuid FROM public.business_units b WHERE b.id = a.bu_id;  -- NULL bu_id stays NULL

  ALTER TABLE public.faq_modules ADD COLUMN bu_id_uuid UUID;
  UPDATE public.faq_modules m SET bu_id_uuid = b.id_uuid FROM public.business_units b WHERE b.id = m.bu_id;

  ALTER TABLE public.faq_submodules ADD COLUMN module_id_uuid UUID;
  UPDATE public.faq_submodules s SET module_id_uuid = m.id_uuid FROM public.faq_modules m WHERE m.id = s.module_id;

  ALTER TABLE public.faq_categories ADD COLUMN submodule_id_uuid UUID;
  UPDATE public.faq_categories c SET submodule_id_uuid = s.id_uuid FROM public.faq_submodules s WHERE s.id = c.submodule_id;

  ALTER TABLE public.faq_entries ADD COLUMN category_id_uuid UUID;
  UPDATE public.faq_entries e SET category_id_uuid = c.id_uuid FROM public.faq_categories c WHERE c.id = e.category_id;

  ALTER TABLE public.faq_related ADD COLUMN faq_id_uuid UUID, ADD COLUMN related_faq_id_uuid UUID;
  UPDATE public.faq_related r SET faq_id_uuid = e.id_uuid FROM public.faq_entries e WHERE e.id = r.faq_id;
  UPDATE public.faq_related r SET related_faq_id_uuid = e.id_uuid FROM public.faq_entries e WHERE e.id = r.related_faq_id;

  -- ── Phase C: drop old FK/PK/int columns, rename, re-add PK+FK+indexes+UNIQUE ──
  -- children first (drop their FKs), then swap each table.

  -- faq_related (composite PK + 2 FKs)
  ALTER TABLE public.faq_related DROP CONSTRAINT faq_related_pkey;
  ALTER TABLE public.faq_related DROP CONSTRAINT faq_related_faq_id_fkey, DROP CONSTRAINT faq_related_related_faq_id_fkey;
  ALTER TABLE public.faq_related DROP COLUMN faq_id, DROP COLUMN related_faq_id;
  ALTER TABLE public.faq_related RENAME COLUMN faq_id_uuid TO faq_id;
  ALTER TABLE public.faq_related RENAME COLUMN related_faq_id_uuid TO related_faq_id;
  ALTER TABLE public.faq_related ALTER COLUMN faq_id SET NOT NULL, ALTER COLUMN related_faq_id SET NOT NULL;

  -- faq_entries
  ALTER TABLE public.faq_entries DROP CONSTRAINT faq_entries_category_id_fkey;
  ALTER TABLE public.faq_entries DROP COLUMN category_id, DROP COLUMN id CASCADE;
  ALTER TABLE public.faq_entries RENAME COLUMN id_uuid TO id;
  ALTER TABLE public.faq_entries RENAME COLUMN category_id_uuid TO category_id;
  ALTER TABLE public.faq_entries ADD PRIMARY KEY (id), ALTER COLUMN id SET DEFAULT gen_random_uuid(), ALTER COLUMN category_id SET NOT NULL;

  -- faq_categories
  ALTER TABLE public.faq_categories DROP CONSTRAINT faq_categories_submodule_id_fkey;
  ALTER TABLE public.faq_categories DROP COLUMN submodule_id, DROP COLUMN id CASCADE;
  ALTER TABLE public.faq_categories RENAME COLUMN id_uuid TO id;
  ALTER TABLE public.faq_categories RENAME COLUMN submodule_id_uuid TO submodule_id;
  ALTER TABLE public.faq_categories ADD PRIMARY KEY (id), ALTER COLUMN id SET DEFAULT gen_random_uuid(), ALTER COLUMN submodule_id SET NOT NULL;

  -- faq_submodules
  ALTER TABLE public.faq_submodules DROP CONSTRAINT faq_submodules_module_id_fkey;
  ALTER TABLE public.faq_submodules DROP COLUMN module_id, DROP COLUMN id CASCADE;
  ALTER TABLE public.faq_submodules RENAME COLUMN id_uuid TO id;
  ALTER TABLE public.faq_submodules RENAME COLUMN module_id_uuid TO module_id;
  ALTER TABLE public.faq_submodules ADD PRIMARY KEY (id), ALTER COLUMN id SET DEFAULT gen_random_uuid(), ALTER COLUMN module_id SET NOT NULL;

  -- faq_modules
  ALTER TABLE public.faq_modules DROP CONSTRAINT faq_modules_bu_id_fkey;
  ALTER TABLE public.faq_modules DROP COLUMN bu_id, DROP COLUMN id CASCADE;
  ALTER TABLE public.faq_modules RENAME COLUMN id_uuid TO id;
  ALTER TABLE public.faq_modules RENAME COLUMN bu_id_uuid TO bu_id;
  ALTER TABLE public.faq_modules ADD PRIMARY KEY (id), ALTER COLUMN id SET DEFAULT gen_random_uuid(), ALTER COLUMN bu_id SET NOT NULL;

  -- document_chunks
  ALTER TABLE public.document_chunks DROP CONSTRAINT document_chunks_bu_id_fkey, DROP CONSTRAINT document_chunks_doc_id_fkey;
  ALTER TABLE public.document_chunks DROP COLUMN bu_id, DROP COLUMN doc_id, DROP COLUMN id CASCADE;
  ALTER TABLE public.document_chunks RENAME COLUMN id_uuid TO id;
  ALTER TABLE public.document_chunks RENAME COLUMN bu_id_uuid TO bu_id;
  ALTER TABLE public.document_chunks RENAME COLUMN doc_id_uuid TO doc_id;
  ALTER TABLE public.document_chunks ADD PRIMARY KEY (id), ALTER COLUMN id SET DEFAULT gen_random_uuid(), ALTER COLUMN bu_id SET NOT NULL, ALTER COLUMN doc_id SET NOT NULL;

  -- documents
  ALTER TABLE public.documents DROP CONSTRAINT documents_bu_id_fkey;
  ALTER TABLE public.documents DROP COLUMN bu_id, DROP COLUMN id CASCADE;
  ALTER TABLE public.documents RENAME COLUMN id_uuid TO id;
  ALTER TABLE public.documents RENAME COLUMN bu_id_uuid TO bu_id;
  ALTER TABLE public.documents ADD PRIMARY KEY (id), ALTER COLUMN id SET DEFAULT gen_random_uuid(), ALTER COLUMN bu_id SET NOT NULL;

  -- chat_history
  ALTER TABLE public.chat_history DROP CONSTRAINT chat_history_bu_id_fkey;
  ALTER TABLE public.chat_history DROP COLUMN bu_id, DROP COLUMN id CASCADE;
  ALTER TABLE public.chat_history RENAME COLUMN id_uuid TO id;
  ALTER TABLE public.chat_history RENAME COLUMN bu_id_uuid TO bu_id;
  ALTER TABLE public.chat_history ADD PRIMARY KEY (id), ALTER COLUMN id SET DEFAULT gen_random_uuid(), ALTER COLUMN bu_id SET NOT NULL;

  -- activity_logs (bu_id stays nullable, SET NULL)
  ALTER TABLE public.activity_logs DROP CONSTRAINT activity_logs_bu_id_fkey;
  ALTER TABLE public.activity_logs DROP COLUMN bu_id, DROP COLUMN id CASCADE;
  ALTER TABLE public.activity_logs RENAME COLUMN id_uuid TO id;
  ALTER TABLE public.activity_logs RENAME COLUMN bu_id_uuid TO bu_id;
  ALTER TABLE public.activity_logs ADD PRIMARY KEY (id), ALTER COLUMN id SET DEFAULT gen_random_uuid();

  -- business_units (parent last)
  ALTER TABLE public.business_units DROP COLUMN id CASCADE;
  ALTER TABLE public.business_units RENAME COLUMN id_uuid TO id;
  ALTER TABLE public.business_units ADD PRIMARY KEY (id), ALTER COLUMN id SET DEFAULT gen_random_uuid();

  -- ── re-add FKs (now uuid↔uuid) ──────────────────────────────────────────
  ALTER TABLE public.documents       ADD CONSTRAINT documents_bu_id_fkey       FOREIGN KEY (bu_id)  REFERENCES public.business_units(id) ON DELETE CASCADE;
  ALTER TABLE public.document_chunks ADD CONSTRAINT document_chunks_bu_id_fkey FOREIGN KEY (bu_id)  REFERENCES public.business_units(id) ON DELETE CASCADE;
  ALTER TABLE public.document_chunks ADD CONSTRAINT document_chunks_doc_id_fkey FOREIGN KEY (doc_id) REFERENCES public.documents(id)      ON DELETE CASCADE;
  ALTER TABLE public.chat_history    ADD CONSTRAINT chat_history_bu_id_fkey    FOREIGN KEY (bu_id)  REFERENCES public.business_units(id) ON DELETE CASCADE;
  ALTER TABLE public.activity_logs   ADD CONSTRAINT activity_logs_bu_id_fkey   FOREIGN KEY (bu_id)  REFERENCES public.business_units(id) ON DELETE SET NULL;
  ALTER TABLE public.faq_modules     ADD CONSTRAINT faq_modules_bu_id_fkey     FOREIGN KEY (bu_id)  REFERENCES public.business_units(id) ON DELETE CASCADE;
  ALTER TABLE public.faq_submodules  ADD CONSTRAINT faq_submodules_module_id_fkey   FOREIGN KEY (module_id)    REFERENCES public.faq_modules(id)    ON DELETE CASCADE;
  ALTER TABLE public.faq_categories  ADD CONSTRAINT faq_categories_submodule_id_fkey FOREIGN KEY (submodule_id) REFERENCES public.faq_submodules(id) ON DELETE CASCADE;
  ALTER TABLE public.faq_entries     ADD CONSTRAINT faq_entries_category_id_fkey     FOREIGN KEY (category_id)  REFERENCES public.faq_categories(id) ON DELETE CASCADE;
  ALTER TABLE public.faq_related     ADD CONSTRAINT faq_related_pkey PRIMARY KEY (faq_id, related_faq_id);
  ALTER TABLE public.faq_related     ADD CONSTRAINT faq_related_faq_id_fkey         FOREIGN KEY (faq_id)         REFERENCES public.faq_entries(id) ON DELETE CASCADE;
  ALTER TABLE public.faq_related     ADD CONSTRAINT faq_related_related_faq_id_fkey FOREIGN KEY (related_faq_id) REFERENCES public.faq_entries(id) ON DELETE CASCADE;

  -- ── re-create indexes + UNIQUE on the new columns ───────────────────────
  CREATE INDEX IF NOT EXISTS idx_documents_bu ON public.documents(bu_id);
  CREATE INDEX IF NOT EXISTS idx_chunks_bu    ON public.document_chunks(bu_id);
  ALTER TABLE public.documents     ADD CONSTRAINT documents_bu_id_path_key UNIQUE (bu_id, path);
  ALTER TABLE public.faq_modules   ADD CONSTRAINT faq_modules_bu_id_slug_key UNIQUE (bu_id, slug);
  ALTER TABLE public.faq_submodules ADD CONSTRAINT faq_submodules_module_id_slug_key UNIQUE (module_id, slug);
  ALTER TABLE public.faq_categories ADD CONSTRAINT faq_categories_submodule_id_slug_key UNIQUE (submodule_id, slug);
  CREATE INDEX IF NOT EXISTS idx_chat_history_bu_id      ON public.chat_history(bu_id);
  CREATE INDEX IF NOT EXISTS idx_activity_logs_bu_id     ON public.activity_logs(bu_id);
END $$;
