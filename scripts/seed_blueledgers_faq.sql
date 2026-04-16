-- generated at 2026-04-15T20:57:43Z
-- bu: blueledgers
BEGIN;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM public.business_units WHERE slug = 'blueledgers') THEN RAISE EXCEPTION 'BU not found: blueledgers'; END IF; END $$;

-- reset existing FAQ tree for this BU
DELETE FROM public.faq_entries e
USING public.faq_categories c, public.faq_submodules s, public.faq_modules m, public.business_units bu
WHERE e.category_id = c.id
  AND c.submodule_id = s.id
  AND s.module_id = m.id
  AND m.bu_id = bu.id
  AND bu.slug = 'blueledgers';

DELETE FROM public.faq_categories c
USING public.faq_submodules s, public.faq_modules m, public.business_units bu
WHERE c.submodule_id = s.id
  AND s.module_id = m.id
  AND m.bu_id = bu.id
  AND bu.slug = 'blueledgers';

DELETE FROM public.faq_submodules s
USING public.faq_modules m, public.business_units bu
WHERE s.module_id = m.id
  AND m.bu_id = bu.id
  AND bu.slug = 'blueledgers';

DELETE FROM public.faq_modules m
USING public.business_units bu
WHERE m.bu_id = bu.id
  AND bu.slug = 'blueledgers';

-- upsert modules
INSERT INTO public.faq_modules (bu_id, name, slug, sort_order)
SELECT bu.id, 'Material', 'material', 10
FROM public.business_units bu
WHERE bu.slug = 'blueledgers'
ON CONFLICT (bu_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_modules (bu_id, name, slug, sort_order)
SELECT bu.id, 'Options', 'options', 20
FROM public.business_units bu
WHERE bu.slug = 'blueledgers'
ON CONFLICT (bu_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_modules (bu_id, name, slug, sort_order)
SELECT bu.id, 'Procurement', 'procurement', 30
FROM public.business_units bu
WHERE bu.slug = 'blueledgers'
ON CONFLICT (bu_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_modules (bu_id, name, slug, sort_order)
SELECT bu.id, 'Report', 'report', 40
FROM public.business_units bu
WHERE bu.slug = 'blueledgers'
ON CONFLICT (bu_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;

-- upsert submodules
INSERT INTO public.faq_submodules (module_id, name, slug, sort_order)
SELECT m.id, 'Procedure', 'procedure', 10
FROM public.faq_modules m
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers' AND m.slug = 'material'
ON CONFLICT (module_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_submodules (module_id, name, slug, sort_order)
SELECT m.id, 'Stock Out', 'stock-out', 20
FROM public.faq_modules m
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers' AND m.slug = 'material'
ON CONFLICT (module_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_submodules (module_id, name, slug, sort_order)
SELECT m.id, 'Store Requisition', 'store-requisition', 30
FROM public.faq_modules m
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers' AND m.slug = 'material'
ON CONFLICT (module_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_submodules (module_id, name, slug, sort_order)
SELECT m.id, 'Personal Setting', 'personal-setting', 40
FROM public.faq_modules m
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers' AND m.slug = 'options'
ON CONFLICT (module_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_submodules (module_id, name, slug, sort_order)
SELECT m.id, 'System Setting', 'system-setting', 50
FROM public.faq_modules m
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers' AND m.slug = 'options'
ON CONFLICT (module_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_submodules (module_id, name, slug, sort_order)
SELECT m.id, 'Configuration', 'configuration', 60
FROM public.faq_modules m
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers' AND m.slug = 'procurement'
ON CONFLICT (module_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_submodules (module_id, name, slug, sort_order)
SELECT m.id, 'Credit Note', 'credit-note', 70
FROM public.faq_modules m
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers' AND m.slug = 'procurement'
ON CONFLICT (module_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_submodules (module_id, name, slug, sort_order)
SELECT m.id, 'Product', 'product', 80
FROM public.faq_modules m
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers' AND m.slug = 'procurement'
ON CONFLICT (module_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_submodules (module_id, name, slug, sort_order)
SELECT m.id, 'Purchase Order', 'purchase-order', 90
FROM public.faq_modules m
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers' AND m.slug = 'procurement'
ON CONFLICT (module_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_submodules (module_id, name, slug, sort_order)
SELECT m.id, 'Purchase Request', 'purchase-request', 100
FROM public.faq_modules m
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers' AND m.slug = 'procurement'
ON CONFLICT (module_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_submodules (module_id, name, slug, sort_order)
SELECT m.id, 'Receiving', 'receiving', 110
FROM public.faq_modules m
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers' AND m.slug = 'procurement'
ON CONFLICT (module_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_submodules (module_id, name, slug, sort_order)
SELECT m.id, 'General', 'general', 120
FROM public.faq_modules m
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers' AND m.slug = 'report'
ON CONFLICT (module_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;

-- upsert categories
INSERT INTO public.faq_categories (submodule_id, name, slug, sort_order)
SELECT s.id, 'Closing Balance', 'closing-balance', 10
FROM public.faq_submodules s
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers'
  AND m.slug = 'material'
  AND s.slug = 'procedure'
ON CONFLICT (submodule_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_categories (submodule_id, name, slug, sort_order)
SELECT s.id, 'General', 'general', 20
FROM public.faq_submodules s
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers'
  AND m.slug = 'material'
  AND s.slug = 'stock-out'
ON CONFLICT (submodule_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_categories (submodule_id, name, slug, sort_order)
SELECT s.id, 'General', 'general', 30
FROM public.faq_submodules s
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers'
  AND m.slug = 'material'
  AND s.slug = 'store-requisition'
ON CONFLICT (submodule_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_categories (submodule_id, name, slug, sort_order)
SELECT s.id, 'General', 'general', 40
FROM public.faq_submodules s
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers'
  AND m.slug = 'options'
  AND s.slug = 'personal-setting'
ON CONFLICT (submodule_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_categories (submodule_id, name, slug, sort_order)
SELECT s.id, 'Company Profile', 'company-profile', 50
FROM public.faq_submodules s
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers'
  AND m.slug = 'options'
  AND s.slug = 'system-setting'
ON CONFLICT (submodule_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_categories (submodule_id, name, slug, sort_order)
SELECT s.id, 'Category', 'category', 60
FROM public.faq_submodules s
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers'
  AND m.slug = 'procurement'
  AND s.slug = 'configuration'
ON CONFLICT (submodule_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_categories (submodule_id, name, slug, sort_order)
SELECT s.id, 'Store-Location', 'store-location', 70
FROM public.faq_submodules s
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers'
  AND m.slug = 'procurement'
  AND s.slug = 'configuration'
ON CONFLICT (submodule_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_categories (submodule_id, name, slug, sort_order)
SELECT s.id, 'General', 'general', 80
FROM public.faq_submodules s
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers'
  AND m.slug = 'procurement'
  AND s.slug = 'credit-note'
ON CONFLICT (submodule_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_categories (submodule_id, name, slug, sort_order)
SELECT s.id, 'General', 'general', 90
FROM public.faq_submodules s
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers'
  AND m.slug = 'procurement'
  AND s.slug = 'product'
ON CONFLICT (submodule_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_categories (submodule_id, name, slug, sort_order)
SELECT s.id, 'General', 'general', 100
FROM public.faq_submodules s
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers'
  AND m.slug = 'procurement'
  AND s.slug = 'purchase-order'
ON CONFLICT (submodule_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_categories (submodule_id, name, slug, sort_order)
SELECT s.id, 'General', 'general', 110
FROM public.faq_submodules s
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers'
  AND m.slug = 'procurement'
  AND s.slug = 'purchase-request'
ON CONFLICT (submodule_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_categories (submodule_id, name, slug, sort_order)
SELECT s.id, 'General', 'general', 120
FROM public.faq_submodules s
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers'
  AND m.slug = 'procurement'
  AND s.slug = 'receiving'
ON CONFLICT (submodule_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_categories (submodule_id, name, slug, sort_order)
SELECT s.id, 'General', 'general', 130
FROM public.faq_submodules s
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers'
  AND m.slug = 'report'
  AND s.slug = 'general'
ON CONFLICT (submodule_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;

-- insert FAQ entries
INSERT INTO public.faq_entries
  (category_id, title, sample_case, problem_cause, solution, tags, is_active, created_by)
SELECT c.id, 'สร้างเอกสาร Physical Count \(Closing Balance\) แล้วไม่พบ Store/Location ที่ต้องการนับ', 'ต้องการ Physical Count ของ Store “IT” แต่เมื่อกด Create แล้วไม่พบ Store ดังกล่าว  
![](_images/material-procedure-closing-balance-สรางเอกสาร-physical-count-closing-balance-แลวไมพบ-store-location-ทตองการนบ/img-001.png)', 'ไม่มีการเปิดสิทธิ์การมองเห็น Store ใน User หรือ Type ของ Store  ไม่ใช่ Enter Counted Stock', 'ตรวจสอบข้อมูล 2 ส่วน ดังนี้  
1\.ตรวจสอบว่าStore ดังกล่าวเป็น EOP Type Enter Counted Stock หรือไม่  
![](_images/material-procedure-closing-balance-สรางเอกสาร-physical-count-closing-balance-แลวไมพบ-store-location-ทตองการนบ/img-002.png)  
2\.ตรวจสอบสิทธิ์ในการเข้าถึง Store ของ User   
ไปที่  Options > Administrator > User ยังไม่มีการเปิดการมองเห็นให้ User ดำเนินการให้เรียบร้อย  
![](_images/material-procedure-closing-balance-สรางเอกสาร-physical-count-closing-balance-แลวไมพบ-store-location-ทตองการนบ/img-003.png)![](_images/material-procedure-closing-balance-สรางเอกสาร-physical-count-closing-balance-แลวไมพบ-store-location-ทตองการนบ/img-004.png)  
กด Create อีกครั้ง จะปรากฏ Store IT ขึ้นมาเรียบร้อย ดำเนินการ Physical Count ได้ตามปกติ  
![](_images/material-procedure-closing-balance-สรางเอกสาร-physical-count-closing-balance-แลวไมพบ-store-location-ทตองการนบ/img-005.png)', ARRAY['blueledgers','faq','documentation']::text[], TRUE, 'seed-script'
FROM public.faq_categories c
JOIN public.faq_submodules s ON s.id = c.submodule_id
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers'
  AND m.slug = 'material'
  AND s.slug = 'procedure'
  AND c.slug = 'closing-balance';
INSERT INTO public.faq_entries
  (category_id, title, sample_case, problem_cause, solution, tags, is_active, created_by)
SELECT c.id, 'Cost/Unit ใน Stock Out แสดงไม่เท่ากับ Receiving ที่ต้องการปรับปรุงเกิดจากอะไร', 'ต้องการทำStock Out รายการ 10010004  Store 1FB05 ด้วยCost 40 ตามเอกสาร RC25080003', 'เอกสาร Stock Out จะบันทึก Cost ตามการคำนวณของระบบ ไม่สามารถกำหนดเองได้  
![](_images/material-stock-out-cost-unit-ใน-stock-out-แสดงไมเทากบ-receiving-ทตองการปรบปรงเกดจากอะไร/img-001.png)  
![](_images/material-stock-out-cost-unit-ใน-stock-out-แสดงไมเทากบ-receiving-ทตองการปรบปรงเกดจากอะไร/img-002.png)', 'ไม่สามารถแก้ไขให้ Stock Out ออกตาม Cost/Unit ของเอกสาร RC ได้เนื่องจาก Cost/Unit จะคำนวณตามวิธีการคำนวณ Cost ที่ตั้งค่าเอาไว้   
1\.วิธีการคำนวณ Cost แบบ Average  
2\.วิธีการคำนวณ Cost แบบ Fifo', ARRAY['blueledgers','faq','documentation']::text[], TRUE, 'seed-script'
FROM public.faq_categories c
JOIN public.faq_submodules s ON s.id = c.submodule_id
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers'
  AND m.slug = 'material'
  AND s.slug = 'stock-out'
  AND c.slug = 'general';
INSERT INTO public.faq_entries
  (category_id, title, sample_case, problem_cause, solution, tags, is_active, created_by)
SELECT c.id, 'Commit เอกสาร Store Requisition ไม่ได้ระบบแสดงข้อความ “Please closing period before issue this document”', 'ต้องการCommit SR25080001 ระบบแจ้ง “The document is not allowed to issue\. \.\.Please closing period before issue this document”  
![](_images/material-store-requisition-commit-เอกสาร-store-requisition-ไมไดระบบแสดงขอความ-please-closing-period-before-issue-this-document/img-001.png)', 'เกิดจาก Period ยังไม่ได้ปิด ระบบจึงแจ้งให้ปิด Period เดือน 3 ให้เสร็จสิ้นก่อน จากตัวอย่างคือ Store Requisition จะ issue ในเดือน 4 แต่ Period ในระบบคือ Period 31/03/2025 ทำให้ไม่สามารถ Approve ใน Period อนาคตได้', 'ปิด Period เดือน 3 ให้เสร็จสิ้นก่อน แล้วจึงทำการ Approve เอกสาร Store Requisition ในขั้นตอน Issue อีกครั้ง ตามขั้นตอนดังนี้  
1\. ไปที่หัวข้อ Material>Procedure> Period End ระบบจะแสดงเอกสาร Receiving ที่ยัง Commit ไม่เสร็จสิ้น และแสดง Store ที่ยังไม่ได้ทำการ Physical Count \(Closing Balance\) 

2\. ดำเนินการ Commit เอกสาร Receiving ให้เรียบร้อย

3\. ดำเนินการทำ Physical Count \(Closing Balance\) ให้เรียบร้อยทุก location

4\. ไปที่หัวข้อ Material>Procedure> Period End  
![](_images/material-store-requisition-commit-เอกสาร-store-requisition-ไมไดระบบแสดงขอความ-please-closing-period-before-issue-this-document/img-002.png)  
5\. หลังจากดำเนินการจัดการเอกสารที่ค้างในระบบเรียบร้อยแล้วให้ทำการกดปุ่ม Closed Period  
![](_images/material-store-requisition-commit-เอกสาร-store-requisition-ไมไดระบบแสดงขอความ-please-closing-period-before-issue-this-document/img-003.png)  
  
  
จะปรากฏเป็นข้อมูล Period 30/04/2025![](_images/material-store-requisition-commit-เอกสาร-store-requisition-ไมไดระบบแสดงขอความ-please-closing-period-before-issue-this-document/img-004.png)  
6\. กลับไปที่เอกสาร SR25080001 กด Approve ก็สามารถกด Commit เอกสารได้แล้ว![](_images/material-store-requisition-commit-เอกสาร-store-requisition-ไมไดระบบแสดงขอความ-please-closing-period-before-issue-this-document/img-005.png)  
![](_images/material-store-requisition-commit-เอกสาร-store-requisition-ไมไดระบบแสดงขอความ-please-closing-period-before-issue-this-document/img-006.png)', ARRAY['blueledgers','faq','documentation']::text[], TRUE, 'seed-script'
FROM public.faq_categories c
JOIN public.faq_submodules s ON s.id = c.submodule_id
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers'
  AND m.slug = 'material'
  AND s.slug = 'store-requisition'
  AND c.slug = 'general';
INSERT INTO public.faq_entries
  (category_id, title, sample_case, problem_cause, solution, tags, is_active, created_by)
SELECT c.id, 'การเพิ่มหรือเปลี่ยนลายเซ็นต์ของ User', 'ต้องการเพิ่ม หรือเปลี่ยนเลายเซ็นต์ในระบบ ทำอย่างไร', 'ไม่สามารถลบลายเซ็นต์เดิมได้ ต้องทำการUpdate File ลายเซ็นต์  
![](_images/options-personal-setting-การเพมหรอเปลยนลายเซนตของ-user/img-001.png)', 'กำหนดลายเซ็นต์ได้จากหน้าจอ Personal Setting

ไปที่ Options> Personal Setting> Choose File   
เลือก File รูปภาพลายเซ็นต์ ขนาดไม่เกิน \(Dimensions: 200x100 pixels\.\) กด Open และกด Save  
![](_images/options-personal-setting-การเพมหรอเปลยนลายเซนตของ-user/img-002.png)  
  
![](_images/options-personal-setting-การเพมหรอเปลยนลายเซนตของ-user/img-003.png)  
ระบบจะแสดงลายเซ็นต์ที่ทำการอัพโหลดไปจาก File  
![](_images/options-personal-setting-การเพมหรอเปลยนลายเซนตของ-user/img-004.png)', ARRAY['blueledgers','faq','documentation']::text[], TRUE, 'seed-script'
FROM public.faq_categories c
JOIN public.faq_submodules s ON s.id = c.submodule_id
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers'
  AND m.slug = 'options'
  AND s.slug = 'personal-setting'
  AND c.slug = 'general';
INSERT INTO public.faq_entries
  (category_id, title, sample_case, problem_cause, solution, tags, is_active, created_by)
SELECT c.id, 'แบบฟอร์ม PO แสดงข้อมูลบริษัทไม่ถูกต้อง แก้ไขอย่างไร', 'ฟอร์ม PO Company Profile ผิดต้องการแก้ไข', 'ข้อมูลใน Company Profile ไม่ถูกต้อง  
  
![](_images/options-system-setting-company-profile-แบบฟอรม-po-แสดงขอมลบรษทไมถกตอง-แกไขอยางไร/img-001.png)', 'แก้ไขข้อมูลบริษัที่ Company Profile

ไปที่หัวข้อ Options > System Setting > Company Profile กด Edit   
ทำการแก้ไขข้อมูลตามต้องการ กด Save   
![](_images/options-system-setting-company-profile-แบบฟอรม-po-แสดงขอมลบรษทไมถกตอง-แกไขอยางไร/img-002.png)  
  
  
  
ทดลองกด Print PO อีกครั้ง ข้อมูลจะเปลี่ยนแปลงตามการแก้ไข  
![](_images/options-system-setting-company-profile-แบบฟอรม-po-แสดงขอมลบรษทไมถกตอง-แกไขอยางไร/img-003.png)', ARRAY['blueledgers','faq','documentation']::text[], TRUE, 'seed-script'
FROM public.faq_categories c
JOIN public.faq_submodules s ON s.id = c.submodule_id
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers'
  AND m.slug = 'options'
  AND s.slug = 'system-setting'
  AND c.slug = 'company-profile';
INSERT INTO public.faq_entries
  (category_id, title, sample_case, problem_cause, solution, tags, is_active, created_by)
SELECT c.id, 'การตรวจสอบว่าสินค้าอยู่ในหมวด PR Type อะไร', 'สร้าง PR แล้วแต่ไม่พบ Product 10000001 จึงต้องการตรวจสอบว่าอยู่ภายใต้ PR Type อะไร', 'Solution: ตรวจสอบข้อมูลจากหน้าจอ Category ตามขั้นตอนดังนี้ 

1\. ตรวจสอบว่า Product อยู่ใน Item group อะไร

ไปที่ Product ที่ต้องการตรวจสอบ ดูส่วนข้อมูลช่อง Item Group ว่าอยู่ Item Group ใด  
![](_images/procurement-configuration-category-การตรวจสอบวาสนคาอยในหมวด-pr-type-อะไร/img-001.png)  
2\. ตรวจสอบว่า Item Group อยู่ใน PR type อะไร

ไปที่ Procurement > Configuration > Category  
เลือกดูว่า Item Group นั้นอยู่ภายใต้ Category Type ใด   
Market list หรือ General ให้เลือกสร้าง PR Type ให้ถูกต้อง เนื่องจากตัวระบบหากสร้าง PR Type General ก็จะไม่พบProduct ที่อยู่ในหมวด Category Type ประภท Market list หรือ Asset   
![](_images/procurement-configuration-category-การตรวจสอบวาสนคาอยในหมวด-pr-type-อะไร/img-002.png)', 'ตรวจสอบข้อมูลจากหน้าจอ Category ตามขั้นตอนดังนี้ 

1\. ตรวจสอบว่า Product อยู่ใน Item group อะไร

ไปที่ Product ที่ต้องการตรวจสอบ ดูส่วนข้อมูลช่อง Item Group ว่าอยู่ Item Group ใด  
![](_images/procurement-configuration-category-การตรวจสอบวาสนคาอยในหมวด-pr-type-อะไร/img-001.png)  
2\. ตรวจสอบว่า Item Group อยู่ใน PR type อะไร

ไปที่ Procurement > Configuration > Category  
เลือกดูว่า Item Group นั้นอยู่ภายใต้ Category Type ใด   
Market list หรือ General ให้เลือกสร้าง PR Type ให้ถูกต้อง เนื่องจากตัวระบบหากสร้าง PR Type General ก็จะไม่พบProduct ที่อยู่ในหมวด Category Type ประภท Market list หรือ Asset   
![](_images/procurement-configuration-category-การตรวจสอบวาสนคาอยในหมวด-pr-type-อะไร/img-002.png)

## Tags

Procurement', ARRAY['blueledgers','faq','documentation']::text[], TRUE, 'seed-script'
FROM public.faq_categories c
JOIN public.faq_submodules s ON s.id = c.submodule_id
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers'
  AND m.slug = 'procurement'
  AND s.slug = 'configuration'
  AND c.slug = 'category';
INSERT INTO public.faq_entries
  (category_id, title, sample_case, problem_cause, solution, tags, is_active, created_by)
SELECT c.id, 'รายงานเกี่ยวกับ Inventory ไม่แสดง Location ที่ต้องการ เกิดจากอะไร', 'เรียก Report ในระบบแล้วไม่พบข้อมูล Store  
ที่ Report Inventory Balance', 'เนื่องจากรายงานในส่วนของ Inventory จะแสดงเฉพาะ Store ที่มี EOP Type ประเภท Inventory เท่านั้น โดย EOP type ประเภท Inventory ประกอบด้วย  
1\. EOP : Enter Counted Stock	  
2\. EOP :  Default System  
นั้นแสดงว่า Store ที่ไม่พบที่ Report คือ Store ประเภทค่าใช้จ่าย หรือ EOP : Default Zero  
![](_images/procurement-configuration-store-location-รายงานเกยวกบ-inventory-ไมแสดง-location-ทตองการ-เกดจากอะไร/img-001.png)', 'ตรวจสอบว่า Store มี EOP type อะไร

- เข้าไปที่ Procurement > Configuration > Store/Location
- เลือก Store ที่ต้องการตรวจสอบ จากตัวอย่าง คือ Store IT  
\- ดูในช่อง EOP จะแสดงข้อมูล Type Store ดังกล่าว  
จากตัวอย่าง Store IT คือ Store Type Default Zero   
ระบบจึงไม่แสดงข้อมูล Inventory ของ Store นี้![](_images/procurement-configuration-store-location-รายงานเกยวกบ-inventory-ไมแสดง-location-ทตองการ-เกดจากอะไร/img-002.png)', ARRAY['blueledgers','faq','documentation']::text[], TRUE, 'seed-script'
FROM public.faq_categories c
JOIN public.faq_submodules s ON s.id = c.submodule_id
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers'
  AND m.slug = 'procurement'
  AND s.slug = 'configuration'
  AND c.slug = 'store-location';
INSERT INTO public.faq_entries
  (category_id, title, sample_case, problem_cause, solution, tags, is_active, created_by)
SELECT c.id, 'เรียกดู Report Inventory Balance แต่ไม่พบ Store ที่ต้องการ เกิดจากอะไร', 'ต้องการเรียกดู Store 2AG03 ในรายงานแต่ค้นหาไม่พบ', 'Store เป็น Type แบบค่าใช้จ่าย Default Zero  
![](_images/procurement-configuration-store-location-เรยกด-report-inventory-balance-แตไมพบ-store-ทตองการ-เกดจากอะไร/img-001.png)', 'ตรวจสอบว่าStore ดังกล่าวเป็น Enter Counted Stock หรือ Default System หรือไม่   
สังเกตุในช่อง EOP ว่าแสดงเป็นประเภทใด   
![](_images/procurement-configuration-store-location-เรยกด-report-inventory-balance-แตไมพบ-store-ทตองการ-เกดจากอะไร/img-002.png)  
หากเป็น Default Zero ระบบจะไม่ปรากฏข้อมูลเนื่องจากเป็นStore ค่าใช้จ่ายครับ   
หากเป็นการทำ Receiving ให้ใช้Report Receiving Detail และเลือกวันที่ทำรับเพื่อดูข้อมูล   
![](_images/procurement-configuration-store-location-เรยกด-report-inventory-balance-แตไมพบ-store-ทตองการ-เกดจากอะไร/img-003.png)', ARRAY['blueledgers','faq','documentation']::text[], TRUE, 'seed-script'
FROM public.faq_categories c
JOIN public.faq_submodules s ON s.id = c.submodule_id
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers'
  AND m.slug = 'procurement'
  AND s.slug = 'configuration'
  AND c.slug = 'store-location';
INSERT INTO public.faq_entries
  (category_id, title, sample_case, problem_cause, solution, tags, is_active, created_by)
SELECT c.id, 'สร้างเอกสาร Credit Note แต่หาเอกสาร Receiving ไม่พบเกิดจากอะไร', 'ต้องการทำ Credit Note จากเอกสาร RC25030019 แต่เมื่อค้นหาแล้วไม่พบเอกสารใบนี้  
![](_images/procurement-credit-note-สรางเอกสาร-credit-note-แตหาเอกสาร-receiving-ไมพบเกดจากอะไร/img-001.png)  
Cause of problem : เลือก Date ใน Credit Note ก่อน วันที่ของเอกสาร Receiving', '', 'ตรวจสอบเอกสาร Receiving ว่า Date เป็นวันที่ใด และเลือก Date ในเอกสาร CN ให้เป็นวันเดียวกัน หรือเป็นวันที่อยู่หลังจากวันที่ Receiving  
จากตัวอย่างคือ 17/06/2025 ระบบยึดจาก Date ของเอกสาร Receiving  
![](_images/procurement-credit-note-สรางเอกสาร-credit-note-แตหาเอกสาร-receiving-ไมพบเกดจากอะไร/img-002.png)  
![](_images/procurement-credit-note-สรางเอกสาร-credit-note-แตหาเอกสาร-receiving-ไมพบเกดจากอะไร/img-003.png)  
![](_images/procurement-credit-note-สรางเอกสาร-credit-note-แตหาเอกสาร-receiving-ไมพบเกดจากอะไร/img-004.png)', ARRAY['blueledgers','faq','documentation']::text[], TRUE, 'seed-script'
FROM public.faq_categories c
JOIN public.faq_submodules s ON s.id = c.submodule_id
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers'
  AND m.slug = 'procurement'
  AND s.slug = 'credit-note'
  AND c.slug = 'general';
INSERT INTO public.faq_entries
  (category_id, title, sample_case, problem_cause, solution, tags, is_active, created_by)
SELECT c.id, 'การปรับปรุง on hand ให้เป็น 0 ก่อน ยกเลิกใช้งานใน location ที่ต้องการ จะต้องทำอย่างไร', 'Product 10030002 ปรากฏ on hand ที่รายงาน Inventory Balance ที่ location 1FB05 : F&B Main Kitchen แต่ต้องการจะเยิกเลิกการใช้สินค้าใน location นี้แล้ว', 'สินค้าที่มีข้อมูล On hand อยู่จะยังแสดงในรายงานแม้จะยกเลิกการ assign store/location ไปแล้ว  
![](_images/procurement-product-การปรบปรง-on-hand-ใหเปน-0-กอนยกเลกใชงานใน-location-ทตองการ-จะตองทำอยางไร/img-001.png)', '1\.ทำเอกสาร Stock Out ออกให้เป็น 0 โดยตรวจสอบยอดของคงค้างด้วย Report  Inventory Balance จากตัวอย่าง คือ Qty คงค้าง 10 Kg   
![](_images/procurement-product-การปรบปรง-on-hand-ใหเปน-0-กอนยกเลกใชงานใน-location-ทตองการ-จะตองทำอยางไร/img-002.png)  
2\. ตรวจสอบรายงาน Inventory Balance ว่ายังมี Qty คงเหลืออีกหรือไม่  
จากตัวอย่างรายงานจะไม่แสดงสินค้าคงเหลือแล้ว  
![](_images/procurement-product-การปรบปรง-on-hand-ใหเปน-0-กอนยกเลกใชงานใน-location-ทตองการ-จะตองทำอยางไร/img-003.png)', ARRAY['blueledgers','faq','documentation']::text[], TRUE, 'seed-script'
FROM public.faq_categories c
JOIN public.faq_submodules s ON s.id = c.submodule_id
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers'
  AND m.slug = 'procurement'
  AND s.slug = 'product'
  AND c.slug = 'general';
INSERT INTO public.faq_entries
  (category_id, title, sample_case, problem_cause, solution, tags, is_active, created_by)
SELECT c.id, 'วิธีการคำนวณ Cost แบบ Average', 'ต้องการทราบวิธีคำนวณ Cost/Unit ของรายการ 22020001 เป็นเท่าใด ณ เดือน 11', 'Solution: เรียก Report Inventory Movement Detailed By Product  
โดยให้ทำการเลือก Period ที่ต้องการ

และเรียกทุก Store/Location 

กำหนดสินค้าที่ต้องการตรวจสอบ cost/unit  
![](_images/procurement-product-วธการคำนวณ-cost-แบบ-average/img-001.png)  
  
  
  


วิธีคำนวณหา average cost นำเอา total amount และ total qty มาคำนวณ

\(1 \+ 2 \+ 3 \+ 4 – 5\) / \(6 \+ 7 \+ 8 \+ 9 – 10\)  
\(199413\.99\+798785\.03\+0\+0\-0\) / \(77\+4\.50\+5\.10\+5\+7\+7\+420\-0\)  
\(998199\.02\) / \(525\.6\)  
Cost/Unit = 1899\.16   
![](_images/procurement-product-วธการคำนวณ-cost-แบบ-average/img-002.png)', 'เรียก Report Inventory Movement Detailed By Product  
โดยให้ทำการเลือก Period ที่ต้องการ

และเรียกทุก Store/Location 

กำหนดสินค้าที่ต้องการตรวจสอบ cost/unit  
![](_images/procurement-product-วธการคำนวณ-cost-แบบ-average/img-001.png)  
  
  
  


วิธีคำนวณหา average cost นำเอา total amount และ total qty มาคำนวณ

\(1 \+ 2 \+ 3 \+ 4 – 5\) / \(6 \+ 7 \+ 8 \+ 9 – 10\)  
\(199413\.99\+798785\.03\+0\+0\-0\) / \(77\+4\.50\+5\.10\+5\+7\+7\+420\-0\)  
\(998199\.02\) / \(525\.6\)  
Cost/Unit = 1899\.16   
![](_images/procurement-product-วธการคำนวณ-cost-แบบ-average/img-002.png)

## Tags', ARRAY['blueledgers','faq','documentation']::text[], TRUE, 'seed-script'
FROM public.faq_categories c
JOIN public.faq_submodules s ON s.id = c.submodule_id
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers'
  AND m.slug = 'procurement'
  AND s.slug = 'product'
  AND c.slug = 'general';
INSERT INTO public.faq_entries
  (category_id, title, sample_case, problem_cause, solution, tags, is_active, created_by)
SELECT c.id, 'วิธีตรวจสอบสินค้าที่ยังไม่มีการกำหนด Order Unit', 'ต้องการรู้ว่า Product ใดบ้างในระบบที่ยังไม่มีการ Set Order Unit', '', 'ตรวจสอบได้จากรายงาน Product List ตามขั้นตอนดังนี้

ไปที่หัวข้อ Report > Product List > เลือกข้อมูลที่ต้องการตรวจสอบ > กด OK  
![](_images/procurement-product-วธตรวจสอบสนคาทยงไมมการกำหนด-order-unit/img-001.png)  
โดยดูข้อมูลในช่อง Unit  โดยแบ่งเป็น2รายการ คือ Inventory และ Order หากมีค่าว่างคือรายการ Product ที่ยังไม่มีการ Set unit แนะนำให้ทำการตั้งค่าที่ Product ให้สมบูรณ์เพื่อป้องกันการทำ Receiving ไม่ได้

![](_images/procurement-product-วธตรวจสอบสนคาทยงไมมการกำหนด-order-unit/img-002.png)', ARRAY['blueledgers','faq','documentation']::text[], TRUE, 'seed-script'
FROM public.faq_categories c
JOIN public.faq_submodules s ON s.id = c.submodule_id
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers'
  AND m.slug = 'procurement'
  AND s.slug = 'product'
  AND c.slug = 'general';
INSERT INTO public.faq_entries
  (category_id, title, sample_case, problem_cause, solution, tags, is_active, created_by)
SELECT c.id, 'สินค้าไม่ได้ assign ให้ location แล้ว ทำไมยังแสดงในรายงาน inventory balance', 'Product 10030002 ปรากฏที่รายงาน Inventory Balance แม้จะมีการนำสินค้าออกจาก Store 1FB05 : F&B Main Kitchen แล้ว  
Casuse of Problems: สินค้ายังมีจำนวนคงเหลืออยู่ในระบบก่อนจะทำการนำสินค้าออกจาก Store   
![](_images/procurement-product-สนคาไมได-assign-ให-location-แลว-ทำไมยงแสดงในรายงาน-inventory-balance/img-001.png)', '', 'ปรับปรุง stock คงเหลือของสินค้าน้้นให้เป็น 0 ก่อน ตามขั้นตอนนี้

1\.ไปที่ Product 10030002 ทำการ Assign to Store/Location Store 1FB05 : F&B Main Kitchen อีกครั้ง เพื่อให้สามารถมองเห็น Product นี้เพื่อทำ Stock Out ออกให้เป็น 0 หากไม่ทำจะมองไม่เห็นรายการเวลาทำเอกสาร Stock Out  
![](_images/procurement-product-สนคาไมได-assign-ให-location-แลว-ทำไมยงแสดงในรายงาน-inventory-balance/img-002.png)  
  
  
  
  
2\.ทำเอกสาร Stock Out ออกให้เป็น 0 โดยตรวจสอบยอดของคงค้างด้วย Report  Inventory Balance จากตัวอย่าง คือ Qty คงค้าง 10 Kg   
![](_images/procurement-product-สนคาไมได-assign-ให-location-แลว-ทำไมยงแสดงในรายงาน-inventory-balance/img-003.png)  
3\.ไปที่ Product 10030002 ทำการยกเลิกการ Assign to Store/Location Store 1FB05 : F&B Main Kitchen อีกครั้ง

4\. ตรวจสอบรายงาน Inventory Balance ว่ายังมี Qty คงเหลืออีกหรือไม่  
จากตัวอย่างรายงานจะไม่แสดงสินค้าคงเหลือแล้ว  
![](_images/procurement-product-สนคาไมได-assign-ให-location-แลว-ทำไมยงแสดงในรายงาน-inventory-balance/img-004.png)', ARRAY['blueledgers','faq','documentation']::text[], TRUE, 'seed-script'
FROM public.faq_categories c
JOIN public.faq_submodules s ON s.id = c.submodule_id
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers'
  AND m.slug = 'procurement'
  AND s.slug = 'product'
  AND c.slug = 'general';
INSERT INTO public.faq_entries
  (category_id, title, sample_case, problem_cause, solution, tags, is_active, created_by)
SELECT c.id, 'PR 1 ใบ สร้างเอกสาร PO ได้ 2 ใบ เกิดจากอะไร', 'PR25080007 Gen แล้วได้PO 2ใบ คือ PO25080001และ PO25080002  
![](_images/procurement-purchase-order-pr-1-ใบ-สรางเอกสาร-po-ได-2-ใบ-เกดจากอะไร/img-001.png)', 'สินค้าใน PR มีการกำหนด Delivery date ต่างกัน คือ 20/08/2025 และ 21/08/2025 ทำให้ระบบแยกเป็น 2 PO  
ระบบสร้างเอกสาร PO จาก Vendor และ Delivery on   
![](_images/procurement-purchase-order-pr-1-ใบ-สรางเอกสาร-po-ได-2-ใบ-เกดจากอะไร/img-002.png)', 'ไม่สามารถรวมเป็น 1 PO ได้เนื่องจากระบบสร้างเอกสาร PO จาก Vendor และ Delivery on หากต้องการรวมต้องทำPRใบใหม่ และ แก้ไข Delivery on ให้เป็นวันที่เดียวกัน 

สำหรับ PO ที่ออกไปแล้ว ให้ทำการ Close PO', ARRAY['blueledgers','faq','documentation']::text[], TRUE, 'seed-script'
FROM public.faq_categories c
JOIN public.faq_submodules s ON s.id = c.submodule_id
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers'
  AND m.slug = 'procurement'
  AND s.slug = 'purchase-order'
  AND c.slug = 'general';
INSERT INTO public.faq_entries
  (category_id, title, sample_case, problem_cause, solution, tags, is_active, created_by)
SELECT c.id, 'สร้าง PR แต่ไม่พบ Location ที่ต้องการขอซื้อ', 'ต้องการสร้าง PR ของ Location A&G\-Accounting แต่ไม่พบ  A&G\-Accounting', ': User ไม่ได้รับการ Assign  Location เอาไว้ ระบบจึงไม่แสดง Store/Location ขึ้นมาให้เลือก  
![](_images/procurement-purchase-request-สราง-pr-แตไมพบ-location-ใหเลอก/img-001.png)', 'Assign location ให้กับ user ที่ต้องการ

 เข้าเมนู  
1\.Options  
2\.Administrator  
3\.User  
![](_images/procurement-purchase-request-สราง-pr-แตไมพบ-location-ใหเลอก/img-002.png)  
4\.คลิก User ที่ติดปัญหา จากตัวอย่าง คือ User: Support   
![](_images/procurement-purchase-request-สราง-pr-แตไมพบ-location-ใหเลอก/img-003.png)  
  
  
  
  
  
5\.คลิกเลือก BU ที่ใช้งานจากตัวอย่างคือ BU PK   
6\.กดปุ่ม Edit  
![](_images/procurement-purchase-request-สราง-pr-แตไมพบ-location-ใหเลอก/img-004.png)  
7\.เลือก Store A&G\-Accounting   
8\.กด Save   
![](_images/procurement-purchase-request-สราง-pr-แตไมพบ-location-ใหเลอก/img-005.png)  
  
กลับมาที่เอกสาร PR ก็จะพบ Location A&G\-Accounting ให้คลิกเลือกแล้วครับ ตามรูปภาพด้านล่าง  
![](_images/procurement-purchase-request-สราง-pr-แตไมพบ-location-ใหเลอก/img-006.png)', ARRAY['blueledgers','faq','documentation']::text[], TRUE, 'seed-script'
FROM public.faq_categories c
JOIN public.faq_submodules s ON s.id = c.submodule_id
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers'
  AND m.slug = 'procurement'
  AND s.slug = 'purchase-request'
  AND c.slug = 'general';
INSERT INTO public.faq_entries
  (category_id, title, sample_case, problem_cause, solution, tags, is_active, created_by)
SELECT c.id, 'สร้าง PR แล้วไม่พบ Product ที่ต้องการ', 'ต้องการเลือก Product __10000002__   เพื่อสั่งซื้อเข้าที่ Store 1GR01 แต่เมื่อสร้าง PR แล้วไม่พบรายการสินค้า  
![](_images/procurement-purchase-request-สราง-pr-แลวไมพบ-product-ทตองการ/img-001.png)', 'เกิดจาก 2 ส่วน ดังนี้  
A\. Product ไม่ได้อยู่ใน Category Type ของ PR ที่สร้าง  
B\. Product ไม่ได้ถูก Assign to Store/Location', 'A\. Product ไม่ได้อยู่ใน Category Type ของ PR ที่สร้าง สามารถตรวจสอบได้ดังนี้  
1\. เข้าเมนู Procurement   
2\. Configuration  
3\. Category   
![](_images/procurement-purchase-request-สราง-pr-แลวไมพบ-product-ทตองการ/img-002.png)  
1\.1\. เลือก Category >Sub Category>Item Group  
จากตัวอย่างคือ   
1\. Category \(Food\)  
2\. Sub Category \(Meat\)  
3\. Item Group \(Beef\)  
จากตัวอย่าง Product 10000002  อยู่ใน Category Type Market List หากสร้าง PR Type General ก็จะไม่พบ Product ตัวนี้  
![](_images/procurement-purchase-request-สราง-pr-แลวไมพบ-product-ทตองการ/img-003.png)  
B\. ตรวจสอบว่า Product นี้ถูก Assign to Store/Location ไว้ที่ 1GR01 แล้วหรือยัง  
1\. ไปที่เมนู Procurement  
2\. Product  
![](_images/procurement-purchase-request-สราง-pr-แลวไมพบ-product-ทตองการ/img-004.png)  
3\.คลิกเลือก Product 10000002 หรือพิมพ์ Product Code 10000002 หรือตาม Product ที่ต้องการ ในช่องค้นหา  
![](_images/procurement-purchase-request-สราง-pr-แลวไมพบ-product-ทตองการ/img-005.png)  
  
4\. ดูในช่อง Assign to Store/Location ว่า Store 1GR01หรือ Store ที่ต้องการ ถูกติ๊กเลือกไว้หรือไม่  
![](_images/procurement-purchase-request-สราง-pr-แลวไมพบ-product-ทตองการ/img-006.png)  
  
5\. หากยังไม่ได้ assign ให้ทำการ Assign to Store/Location ที่ 1GR01 หรือ Store ที่ต้องการและกด Assign และกด Save  
![](_images/procurement-purchase-request-สราง-pr-แลวไมพบ-product-ทตองการ/img-007.png)  
  
6\. กลับไปที่ PR จะปรากฏรายการ Product __10000002__  และสามารถดำเนินการทำเอกสาร PR ได้ตามปกติ   
![](_images/procurement-purchase-request-สราง-pr-แลวไมพบ-product-ทตองการ/img-008.png)', ARRAY['blueledgers','faq','documentation']::text[], TRUE, 'seed-script'
FROM public.faq_categories c
JOIN public.faq_submodules s ON s.id = c.submodule_id
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers'
  AND m.slug = 'procurement'
  AND s.slug = 'purchase-request'
  AND c.slug = 'general';
INSERT INTO public.faq_entries
  (category_id, title, sample_case, problem_cause, solution, tags, is_active, created_by)
SELECT c.id, 'เปิดเอกสาร PR แล้ว ไม่พบปุ่ม Approved เกิดจากอะไร', 'เปิดเอกสาร PR24020004 แล้วไม่พบปุ่มปุ่ม Approved/Reject/Send Back ให้กด  
![](_images/procurement-purchase-request-เปดเอกสาร-pr-แลว-ไมพบปม-approved-เกดจากอะไร/img-001.png)', 'สาเหตุเกิดจากการเปิดเอกสารเมื่ออยู่ในหมวด View All ทำให้ไม่สามารถแก้ไขหรือ approve ได้![](_images/procurement-purchase-request-เปดเอกสาร-pr-แลว-ไมพบปม-approved-เกดจากอะไร/img-002.png)  
  
  
  
  
  
  
Solutions : ให้เลือกขั้นตอนการ Approve ก่อน ที่จะเลือกเอกสาร PR ตามขั้นตอนดังนี้

1. ไปที่หัวข้อ View 
2. เลือก Approval step ที่ต้องการ approve แล้วระบบจะแสดง list ของ PR ที่รอการ approve  
![](_images/procurement-purchase-request-เปดเอกสาร-pr-แลว-ไมพบปม-approved-เกดจากอะไร/img-003.png)  
  
3\. ทำการคลิกที่ PR24020004 หรือหมายเลข PR ที่ต้องการ approve![](_images/procurement-purchase-request-เปดเอกสาร-pr-แลว-ไมพบปม-approved-เกดจากอะไร/img-004.png)  
  
4\. จะพบว่าปุ่ม Approved/Reject/Send Back ปรากฏขึ้นมาแล้วตามรูปภาพ![](_images/procurement-purchase-request-เปดเอกสาร-pr-แลว-ไมพบปม-approved-เกดจากอะไร/img-005.png)', '# เปิดเอกสาร PR แล้ว ไม่พบปุ่ม Approved เกิดจากอะไร

## Sample case

เปิดเอกสาร PR24020004 แล้วไม่พบปุ่มปุ่ม Approved/Reject/Send Back ให้กด  
![](_images/procurement-purchase-request-เปดเอกสาร-pr-แลว-ไมพบปม-approved-เกดจากอะไร/img-001.png)

## Cause of problems

สาเหตุเกิดจากการเปิดเอกสารเมื่ออยู่ในหมวด View All ทำให้ไม่สามารถแก้ไขหรือ approve ได้![](_images/procurement-purchase-request-เปดเอกสาร-pr-แลว-ไมพบปม-approved-เกดจากอะไร/img-002.png)  
  
  
  
  
  
  
Solutions : ให้เลือกขั้นตอนการ Approve ก่อน ที่จะเลือกเอกสาร PR ตามขั้นตอนดังนี้

1. ไปที่หัวข้อ View 
2. เลือก Approval step ที่ต้องการ approve แล้วระบบจะแสดง list ของ PR ที่รอการ approve  
![](_images/procurement-purchase-request-เปดเอกสาร-pr-แลว-ไมพบปม-approved-เกดจากอะไร/img-003.png)  
  
3\. ทำการคลิกที่ PR24020004 หรือหมายเลข PR ที่ต้องการ approve![](_images/procurement-purchase-request-เปดเอกสาร-pr-แลว-ไมพบปม-approved-เกดจากอะไร/img-004.png)  
  
4\. จะพบว่าปุ่ม Approved/Reject/Send Back ปรากฏขึ้นมาแล้วตามรูปภาพ![](_images/procurement-purchase-request-เปดเอกสาร-pr-แลว-ไมพบปม-approved-เกดจากอะไร/img-005.png)

## Tags

Procurement', ARRAY['blueledgers','faq','documentation']::text[], TRUE, 'seed-script'
FROM public.faq_categories c
JOIN public.faq_submodules s ON s.id = c.submodule_id
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers'
  AND m.slug = 'procurement'
  AND s.slug = 'purchase-request'
  AND c.slug = 'general';
INSERT INTO public.faq_entries
  (category_id, title, sample_case, problem_cause, solution, tags, is_active, created_by)
SELECT c.id, 'ใน View ไม่พบขั้นตอนการ Approve PR ที่ต้องการเกิดจากอะไร', 'ต้องการ approve PR24050002 ที่ Step Approved By HOD แต่ที่ View ไม่พบ “Approved By HOD”', 'User ที่ติดปัญหา ไม่ได้ถูก Assign เอาไว้ที่หัวข้อ Step Approved By HOD ใน Workflow Configuration ส่วนของ Purchase Request ![](_images/procurement-purchase-request-ใน-view-ไมพบขนตอนการ-approve-pr-ทตองการเกดจากอะไร/img-001.png) ![](_images/procurement-purchase-request-ใน-view-ไมพบขนตอนการ-approve-pr-ทตองการเกดจากอะไร/img-002.png)', 'Assign user ที่ต้องการลงใน approval step ที่ต้องการ

<a id="_heading=h.cy8v51lyzvpc"></a>ไปที่เมนู   
1\.Options  
2\. Administrator  
3\. Workflow Configuration  
![](_images/procurement-purchase-request-ใน-view-ไมพบขนตอนการ-approve-pr-ทตองการเกดจากอะไร/img-003.png)  
4\.ไปที่ Step Approved By HOD ใน Workflow Configuration จากตัวอย่างคือ \(2\) Approved By HOD  
5\.กดปุ่ม Edit Approval   
![](_images/procurement-purchase-request-ใน-view-ไมพบขนตอนการ-approve-pr-ทตองการเกดจากอะไร/img-004.png)  
  
  
  
  
  
6\.ทำการเลือก User ที่ต้องการเปิดสิทธิ์การ Approved By HOD จากตัวอย่าง คือ User:Support  
หมายเหตุ:การเลือกสามารถเลือกได้ทั่ง2แบบ คือ 1\.Role\(s\) 2\.User\(s\)  
7\.กด Save  
![](_images/procurement-purchase-request-ใน-view-ไมพบขนตอนการ-approve-pr-ทตองการเกดจากอะไร/img-005.png)  
กลับไปที่ หัวข้อ PR คลิก View จะปรากฏ View ของ Approved By HOD เรียบร้อย   
ทำการคลิก Approved By HOD จะพบเอกสาร กด PR24050002 ที่ Step Approved By HOD เรียบร้อย   
สามารถดำเนินการ Approved เอกสารได้ตามปกติ  
\(หากไม่พบ ไปที่หัวข้อ \#Required Head of Department \(HOD\)\)  
![](_images/procurement-purchase-request-ใน-view-ไมพบขนตอนการ-approve-pr-ทตองการเกดจากอะไร/img-006.png)', ARRAY['blueledgers','faq','documentation']::text[], TRUE, 'seed-script'
FROM public.faq_categories c
JOIN public.faq_submodules s ON s.id = c.submodule_id
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers'
  AND m.slug = 'procurement'
  AND s.slug = 'purchase-request'
  AND c.slug = 'general';
INSERT INTO public.faq_entries
  (category_id, title, sample_case, problem_cause, solution, tags, is_active, created_by)
SELECT c.id, 'ตรวจสอบ Receiving ที่ยังไม่ committed ได้อย่างไร', 'ต้องการปิด Period แต่อยากทราบเอกสาร Receiving ในระบบที่ยังไม่ committed', 'Solution: ตรวจสอบได้ 3 วิธี ดังนี้  
1\. ตรวจสอบที่หัวข้อ Period End  
วิธีตรจสอบและแก้ไข  
\- ตรวจสอบที่หัวข้อ Period End\(แสดงเฉพาะเอกสาร Receiving ภายใน Period นั้น ๆ\)  
ไปที่ 1\.Material>2\.Procedure>3\.Period End  
![](_images/procurement-receiving-7-ตรวจสอบ-receiving-ทยงไม-committed-ไดอยางไร/img-001.png)  
ระบบจะแสดงรายการ Receiving ที่ยังเป็น Status Received ภายใต้ Period ปัจจุบันของระบบ  
![](_images/procurement-receiving-7-ตรวจสอบ-receiving-ทยงไม-committed-ไดอยางไร/img-002.png)  
  
  
  
  
  
  
  
  
2\.Report Receiving Detail  
เลือก ข้อมูลที่ต้องการตรวจสอบ และเลือก Status ของ Receiving เป็น Received เพื่อดูรายการที่ยังไม่ได้มี   
![](_images/procurement-receiving-7-ตรวจสอบ-receiving-ทยงไม-committed-ไดอยางไร/img-003.png)  
  
  
  
  
  
  
  
กด View  ระบบจะแสดงข้อมูลเอกสารที่มี Status ของ Receiving เป็น Received มาแสดงตามรูปภาพด้านล่าง  
![](_images/procurement-receiving-7-ตรวจสอบ-receiving-ทยงไม-committed-ไดอยางไร/img-004.png)  
  
  
  
  
  
  
  
3\.ค้นหาจาก status บนหน้าจอ Receiving list  
พิมพ์คำว่า “Received” ลงในช่องค้นหา จะปรากฏ Status ของเอกสาร Receiving ที่ยังไม่เป็น Status Committed  
![](_images/procurement-receiving-7-ตรวจสอบ-receiving-ทยงไม-committed-ไดอยางไร/img-005.png)  
4\. ที่ View เลือกหัวข้อ Receiving not Committed![](_images/procurement-receiving-7-ตรวจสอบ-receiving-ทยงไม-committed-ไดอยางไร/img-006.png)', 'ตรวจสอบได้ 3 วิธี ดังนี้  
1\. ตรวจสอบที่หัวข้อ Period End  
วิธีตรจสอบและแก้ไข  
\- ตรวจสอบที่หัวข้อ Period End\(แสดงเฉพาะเอกสาร Receiving ภายใน Period นั้น ๆ\)  
ไปที่ 1\.Material>2\.Procedure>3\.Period End  
![](_images/procurement-receiving-7-ตรวจสอบ-receiving-ทยงไม-committed-ไดอยางไร/img-001.png)  
ระบบจะแสดงรายการ Receiving ที่ยังเป็น Status Received ภายใต้ Period ปัจจุบันของระบบ  
![](_images/procurement-receiving-7-ตรวจสอบ-receiving-ทยงไม-committed-ไดอยางไร/img-002.png)  
  
  
  
  
  
  
  
  
2\.Report Receiving Detail  
เลือก ข้อมูลที่ต้องการตรวจสอบ และเลือก Status ของ Receiving เป็น Received เพื่อดูรายการที่ยังไม่ได้มี   
![](_images/procurement-receiving-7-ตรวจสอบ-receiving-ทยงไม-committed-ไดอยางไร/img-003.png)  
  
  
  
  
  
  
  
กด View  ระบบจะแสดงข้อมูลเอกสารที่มี Status ของ Receiving เป็น Received มาแสดงตามรูปภาพด้านล่าง  
![](_images/procurement-receiving-7-ตรวจสอบ-receiving-ทยงไม-committed-ไดอยางไร/img-004.png)  
  
  
  
  
  
  
  
3\.ค้นหาจาก status บนหน้าจอ Receiving list  
พิมพ์คำว่า “Received” ลงในช่องค้นหา จะปรากฏ Status ของเอกสาร Receiving ที่ยังไม่เป็น Status Committed  
![](_images/procurement-receiving-7-ตรวจสอบ-receiving-ทยงไม-committed-ไดอยางไร/img-005.png)  
4\. ที่ View เลือกหัวข้อ Receiving not Committed![](_images/procurement-receiving-7-ตรวจสอบ-receiving-ทยงไม-committed-ไดอยางไร/img-006.png)

## Tags

Procurement', ARRAY['blueledgers','faq','documentation']::text[], TRUE, 'seed-script'
FROM public.faq_categories c
JOIN public.faq_submodules s ON s.id = c.submodule_id
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers'
  AND m.slug = 'procurement'
  AND s.slug = 'receiving'
  AND c.slug = 'general';
INSERT INTO public.faq_entries
  (category_id, title, sample_case, problem_cause, solution, tags, is_active, created_by)
SELECT c.id, 'Receiving รับเกินราคาจาก PO ไม่ได้ ระบบแจ้ง Warning “Price is exceed than the value of price deviation”', 'ต้องการทำเอกสาร Receiving เพื่อรับสินค้า 10000005 ด้วยราคามากกว่า PO คือ Price 20  
![](_images/procurement-receiving-receiving-รบเกนราคาจาก-po-ไมได-ระบบแจง-warning-price-is-exceed-than-the-value-of-price-deviation/img-001.png)', 'เอกสาร Receiving ทำการรับสินค้าด้วยราคาที่มากกว่า Price Deviation\(%\) ที่กำหนเอาไว้ใน Product', 'กำหนด % ของ Price deviation ใน Product ให้เพียงพอต่อการรับสินค้า \(Receiving\) ตามขั้นตอนดังนี้  
1\. ไปที่ Product 10000005   ทำการแก้ไข Price Deviation\(%\) ส่วนของราคา เป็น 100% กด Save![](_images/procurement-receiving-receiving-รบเกนราคาจาก-po-ไมได-ระบบแจง-warning-price-is-exceed-than-the-value-of-price-deviation/img-002.png)  
  
2\. กลับไปที่เอกสาร Receiving ใส่ราคาที่ต้องการ กด Save ตามปกติ ![](_images/procurement-receiving-receiving-รบเกนราคาจาก-po-ไมได-ระบบแจง-warning-price-is-exceed-than-the-value-of-price-deviation/img-003.png) 

3\. ดำเนินการทำ Receiving  ได้เสร็จเรียบร้อย ![](_images/procurement-receiving-receiving-รบเกนราคาจาก-po-ไมได-ระบบแจง-warning-price-is-exceed-than-the-value-of-price-deviation/img-004.png)', ARRAY['blueledgers','faq','documentation']::text[], TRUE, 'seed-script'
FROM public.faq_categories c
JOIN public.faq_submodules s ON s.id = c.submodule_id
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers'
  AND m.slug = 'procurement'
  AND s.slug = 'receiving'
  AND c.slug = 'general';
INSERT INTO public.faq_entries
  (category_id, title, sample_case, problem_cause, solution, tags, is_active, created_by)
SELECT c.id, 'Receiving แบบ Inventory ทำรับผิด Store จะปรับปรุงข้อมูลให้ถูกต้องได้อยางไร', 'จะซื้อของเข้า Store IT แต่รับผิดเข้าไปที่ HK Housekeeping แต่เอกสาร Receiving Commit แล้ว แก้ไขได้อย่างไร', 'ทำรับเข้าผิด Store   
![](_images/procurement-receiving-receiving-แบบ-inventory-ทำรบผด-store-จะปรบปรงขอมลใหถกตองไดอยางไร/img-001.png)', 'สามารถแก้ไขได้ 2 วิธี ดังนี้  
1\. ปรับปรุง stock สินค้าด้วยการทำ Store Requisition แบบ Transfer  
1\.1\.ทำการสร้างเอกสาร SR ในส่วนหัวข้อ Movement Type เลือกเป็นประเภท Transfer  
1\.2\.เลือก Store ที่ต้องการ  
1\.3\.เลือกรายการที่ต้องการ  
1\.4\.เลือกจำนวน Qty ของรายการ![](_images/procurement-receiving-receiving-แบบ-inventory-ทำรบผด-store-จะปรบปรงขอมลใหถกตองไดอยางไร/img-002.png)  
   
  
  
  
  
  
กด Commit เสร็จเรียบร้อย ของก็จะถูกย้ายจาก Store  Housekeeping ไปที่ Store IT เรียบร้อย  
![](_images/procurement-receiving-receiving-แบบ-inventory-ทำรบผด-store-จะปรบปรงขอมลใหถกตองไดอยางไร/img-003.png)  
2\. ปรับปรุง Stock สินค้าด้วยเอกสาร Stock in และ Stock out 

2\.1\.ทำ Stock Out ออกจาก Store  Housekeeping เพื่อตัดของออกให้ถูกต้อง  
![](_images/procurement-receiving-receiving-แบบ-inventory-ทำรบผด-store-จะปรบปรงขอมลใหถกตองไดอยางไร/img-004.png)  
2\.2\.ทำ Stock IN เข้าที่ Store IT เพื่อเพิ่มของเข้าไปที่Store ที่ถูกต้อง  
![](_images/procurement-receiving-receiving-แบบ-inventory-ทำรบผด-store-จะปรบปรงขอมลใหถกตองไดอยางไร/img-005.png)  
เมื่อดำเนินการเรียบร้อยแล้วของก็จะถูกตัดออกจากStore ที่รับผิดและทำการStock in เข้าในStore ที่ถูกต้อง จากตัวอย่างคือStore IT', ARRAY['blueledgers','faq','documentation']::text[], TRUE, 'seed-script'
FROM public.faq_categories c
JOIN public.faq_submodules s ON s.id = c.submodule_id
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers'
  AND m.slug = 'procurement'
  AND s.slug = 'receiving'
  AND c.slug = 'general';
INSERT INTO public.faq_entries
  (category_id, title, sample_case, problem_cause, solution, tags, is_active, created_by)
SELECT c.id, 'Receiving แบบ “Create Manually” เลือก Store แล้วไม่พบ Product', 'ต้องการทำรับสินค้าเข้า Store IT แต่ไม่พบ Product 10000005 ที่ต้องการ', 'ไม่ได้ทำการ Assign to Store/Location ในรายการ Product  
![](_images/procurement-receiving-receiving-แบบ-create-manually-เลอก-store-แลวไมพบ-product/img-001.png)', 'ไปที่ Product ทำการ กดปุ่ม Assign เลือก Store ที่ต้องการ ทำการติ๊กถูกที่ Store และทำการกด Save  
![](_images/procurement-receiving-receiving-แบบ-create-manually-เลอก-store-แลวไมพบ-product/img-002.png)  
![](_images/procurement-receiving-receiving-แบบ-create-manually-เลอก-store-แลวไมพบ-product/img-003.png)  
กลับไปที่เอกสาร Receiving Manuanlly ก็จะพบ Product ปรากฏขึ้นมาให้ทำรายการตามปกติ  
![](_images/procurement-receiving-receiving-แบบ-create-manually-เลอก-store-แลวไมพบ-product/img-004.png)', ARRAY['blueledgers','faq','documentation']::text[], TRUE, 'seed-script'
FROM public.faq_categories c
JOIN public.faq_submodules s ON s.id = c.submodule_id
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers'
  AND m.slug = 'procurement'
  AND s.slug = 'receiving'
  AND c.slug = 'general';
INSERT INTO public.faq_entries
  (category_id, title, sample_case, problem_cause, solution, tags, is_active, created_by)
SELECT c.id, 'Save Receiving แล้วระบบแจ้งข้อความ Error "While saving" เกิดจากอะไร', 'ต้องการกด Save Receiving แต่ระบบแจ้ง Error แก้ไขอย่างไร', 'เกิดจาก ไม่ได้มีการ Set Default Order Unit ที่ Product  
![](_images/procurement-receiving-save-receiving-แลวระบบแจงขอความ-error-while-saving-เกดจากอะไร/img-001.png)  
เป็นการแจ้งเตือนว่า มีรายการไม่มีหน่วย Unit ทำให้เมื่อกด Save จึง Error', 'แจ้ง Support เพื่อดำเนินการแก้ไข เพิ่มหน่วย Order Unit กับรายการที่ติดปัญหา  
วิธีป้องกันและแก้ไขปัญหา ให้ทำการ Set Default Order Unit ใน Product', ARRAY['blueledgers','faq','documentation']::text[], TRUE, 'seed-script'
FROM public.faq_categories c
JOIN public.faq_submodules s ON s.id = c.submodule_id
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers'
  AND m.slug = 'procurement'
  AND s.slug = 'receiving'
  AND c.slug = 'general';
INSERT INTO public.faq_entries
  (category_id, title, sample_case, problem_cause, solution, tags, is_active, created_by)
SELECT c.id, 'ต้องการแก้ไข Invoice Number ของเอกสาร Receiving แต่ Status Committed แล้วทำอย่างไร', '', '', 'เอกสาร Receiving ที่ Status Committed แล้วจะสามารถแก้ไขได้ 2 ส่วน ดังนี้  
1\. Invoice Date\(วันที่ของใบแจ้งหนี้\)  
2\. Invoice\#\(หมายเลขใบแจ้งหนี้\)  
วิธีแก้ไข  
ไปที่เอกสาร Receiving \(ตัวอย่าง RC25060108\) ![](_images/procurement-receiving-ตองการแกไข-invoice-number-ของเอกสาร-receiving-แต-status-committed-แลวทำอยางไร/img-001.png)  
กดปุ่ม Edit   
![](_images/procurement-receiving-ตองการแกไข-invoice-number-ของเอกสาร-receiving-แต-status-committed-แลวทำอยางไร/img-002.png)  
  
  
  
  
  
  
ทำการแก้ไขหมายเลข Invoice\#: แล้วกด Save หลังแก้ไขข้อมูลให้ดำเนินการ Posting from Receiving ไปที่ AP อีกครั้ง

<a id="_heading=h.t0qtcjsyojml"></a>![](_images/procurement-receiving-ตองการแกไข-invoice-number-ของเอกสาร-receiving-แต-status-committed-แลวทำอยางไร/img-003.png)', ARRAY['blueledgers','faq','documentation']::text[], TRUE, 'seed-script'
FROM public.faq_categories c
JOIN public.faq_submodules s ON s.id = c.submodule_id
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers'
  AND m.slug = 'procurement'
  AND s.slug = 'receiving'
  AND c.slug = 'general';
INSERT INTO public.faq_entries
  (category_id, title, sample_case, problem_cause, solution, tags, is_active, created_by)
SELECT c.id, 'วิธีเรียกดู Receiving ที่มี Status Void', 'ต้องการดูว่ามีเอกสาร Receiving หมายเลขใดบ้างที่ถูก Void ไป', 'Solution:สามารถดูได้ 2วิธี  
1\.กด View เลือก Receiving Voided ก็จะแสดงเอกสารที่มี Status Voided ในระบบทั้งหมด  
![](_images/procurement-receiving-วธเรยกด-receiving-ทม-status-void/img-001.png)  
2\.พิมพ์ค้นหา Receiving ในช่องค้นหา ว่า “Voided” ก็จะแสดงเอกสารที่มี Status Voided ในระบบทั้งหมด  
![](_images/procurement-receiving-วธเรยกด-receiving-ทม-status-void/img-002.png)', 'สามารถดูได้ 2วิธี  
1\.กด View เลือก Receiving Voided ก็จะแสดงเอกสารที่มี Status Voided ในระบบทั้งหมด  
![](_images/procurement-receiving-วธเรยกด-receiving-ทม-status-void/img-001.png)  
2\.พิมพ์ค้นหา Receiving ในช่องค้นหา ว่า “Voided” ก็จะแสดงเอกสารที่มี Status Voided ในระบบทั้งหมด  
![](_images/procurement-receiving-วธเรยกด-receiving-ทม-status-void/img-002.png)

## Tags', ARRAY['blueledgers','faq','documentation']::text[], TRUE, 'seed-script'
FROM public.faq_categories c
JOIN public.faq_submodules s ON s.id = c.submodule_id
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers'
  AND m.slug = 'procurement'
  AND s.slug = 'receiving'
  AND c.slug = 'general';
INSERT INTO public.faq_entries
  (category_id, title, sample_case, problem_cause, solution, tags, is_active, created_by)
SELECT c.id, 'การดูสินค้าคงเหลือในระบบ', 'ต้องการตรวจสอบจำนวน และมูลค่าสินค้าคงเหลือในระบบเพื่อกระทบตัวเลขใน General Ledger', 'Solutions : ตรวจสอบได้จาก function Report  
ไปที่ Reports สามารถดูได้จาก3 Report ดังนี้  
1\.Inventory Balance  
ช่อง Balance Qty คือจำนวนสินค้าคงเหลือ หากไม่มีสินค้าหรือสินค้าเป็น 0 จะไม่แสดงที่ Report นี้

![](_images/report-การดสนคาคงเหลอในระบบ/img-001.png)

  
2\. Inventory Movement Detail

ช่อง Closing Qty คือจำนวนสินค้า ตาม Period ที่เลือก![](_images/report-การดสนคาคงเหลอในระบบ/img-002.png)  


3\. Stock Card Detailed  
ช่อง Quantity คือจำนวนสินค้าคงเหลือ ตามเอกสารที่ทำในระบบ Date from ที่เลือก![](_images/report-การดสนคาคงเหลอในระบบ/img-003.png)', '# การดูสินค้าคงเหลือในระบบ

## Sample case

ต้องการตรวจสอบจำนวน และมูลค่าสินค้าคงเหลือในระบบเพื่อกระทบตัวเลขใน General Ledger

## Cause of problems

Solutions : ตรวจสอบได้จาก function Report  
ไปที่ Reports สามารถดูได้จาก3 Report ดังนี้  
1\.Inventory Balance  
ช่อง Balance Qty คือจำนวนสินค้าคงเหลือ หากไม่มีสินค้าหรือสินค้าเป็น 0 จะไม่แสดงที่ Report นี้

![](_images/report-การดสนคาคงเหลอในระบบ/img-001.png)

  
2\. Inventory Movement Detail

ช่อง Closing Qty คือจำนวนสินค้า ตาม Period ที่เลือก![](_images/report-การดสนคาคงเหลอในระบบ/img-002.png)  


3\. Stock Card Detailed  
ช่อง Quantity คือจำนวนสินค้าคงเหลือ ตามเอกสารที่ทำในระบบ Date from ที่เลือก![](_images/report-การดสนคาคงเหลอในระบบ/img-003.png)

## Tags

Material', ARRAY['blueledgers','faq','documentation']::text[], TRUE, 'seed-script'
FROM public.faq_categories c
JOIN public.faq_submodules s ON s.id = c.submodule_id
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'blueledgers'
  AND m.slug = 'report'
  AND s.slug = 'general'
  AND c.slug = 'general';

COMMIT;
