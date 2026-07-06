-- vector must live where the app's search_path (public) can resolve its
-- operators/casts; this matches the source. pgcrypto only backstops the
-- gen_random_uuid() column default (core PG13+ also provides it).
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS vector   WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
