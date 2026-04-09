-- 0008_clear_faq_carmen.sql
-- ลบข้อมูล FAQ ทั้งหมดของ BU slug = 'carmen' (mock / เตรียมใส่ใหม่)
-- ไม่แตะ BU อื่น (เช่น blueledgers)
-- CASCADE จาก faq_modules ไป submodules, categories, entries, faq_related
--
-- รัน: go run cmd/server/main.go migrate migrations/0008_clear_faq_carmen.sql

DELETE FROM public.faq_modules
WHERE bu_id = (SELECT id FROM public.business_units WHERE slug = 'carmen' LIMIT 1);
