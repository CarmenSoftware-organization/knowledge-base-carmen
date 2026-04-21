-- generated at 2026-04-21T07:50:27Z
-- bu: carmen
BEGIN;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM public.business_units WHERE slug = 'carmen') THEN RAISE EXCEPTION 'BU not found: carmen'; END IF; END $$;

-- reset existing FAQ tree for this BU
DELETE FROM public.faq_entries e
USING public.faq_categories c, public.faq_submodules s, public.faq_modules m, public.business_units bu
WHERE e.category_id = c.id
  AND c.submodule_id = s.id
  AND s.module_id = m.id
  AND m.bu_id = bu.id
  AND bu.slug = 'carmen';

DELETE FROM public.faq_categories c
USING public.faq_submodules s, public.faq_modules m, public.business_units bu
WHERE c.submodule_id = s.id
  AND s.module_id = m.id
  AND m.bu_id = bu.id
  AND bu.slug = 'carmen';

DELETE FROM public.faq_submodules s
USING public.faq_modules m, public.business_units bu
WHERE s.module_id = m.id
  AND m.bu_id = bu.id
  AND bu.slug = 'carmen';

DELETE FROM public.faq_modules m
USING public.business_units bu
WHERE m.bu_id = bu.id
  AND bu.slug = 'carmen';

-- upsert modules
INSERT INTO public.faq_modules (bu_id, name, slug, sort_order)
SELECT bu.id, 'Account Payable', 'account-payable', 10
FROM public.business_units bu
WHERE bu.slug = 'carmen'
ON CONFLICT (bu_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_modules (bu_id, name, slug, sort_order)
SELECT bu.id, 'Account Receivable', 'account-receivable', 20
FROM public.business_units bu
WHERE bu.slug = 'carmen'
ON CONFLICT (bu_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_modules (bu_id, name, slug, sort_order)
SELECT bu.id, 'Asset', 'asset', 30
FROM public.business_units bu
WHERE bu.slug = 'carmen'
ON CONFLICT (bu_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_modules (bu_id, name, slug, sort_order)
SELECT bu.id, 'General Ledger', 'general-ledger', 40
FROM public.business_units bu
WHERE bu.slug = 'carmen'
ON CONFLICT (bu_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_modules (bu_id, name, slug, sort_order)
SELECT bu.id, 'Workbook', 'workbook', 50
FROM public.business_units bu
WHERE bu.slug = 'carmen'
ON CONFLICT (bu_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;

-- upsert submodules
INSERT INTO public.faq_submodules (module_id, name, slug, sort_order)
SELECT m.id, 'Input Tax Reconciliation', 'input-tax-reconciliation', 10
FROM public.faq_modules m
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'carmen' AND m.slug = 'account-payable'
ON CONFLICT (module_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_submodules (module_id, name, slug, sort_order)
SELECT m.id, 'Invoice', 'invoice', 20
FROM public.faq_modules m
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'carmen' AND m.slug = 'account-payable'
ON CONFLICT (module_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_submodules (module_id, name, slug, sort_order)
SELECT m.id, 'Report', 'report', 30
FROM public.faq_modules m
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'carmen' AND m.slug = 'account-payable'
ON CONFLICT (module_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_submodules (module_id, name, slug, sort_order)
SELECT m.id, 'Withholding Tax Reconciliation', 'withholding-tax-reconciliation', 40
FROM public.faq_modules m
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'carmen' AND m.slug = 'account-payable'
ON CONFLICT (module_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_submodules (module_id, name, slug, sort_order)
SELECT m.id, 'Folio', 'folio', 50
FROM public.faq_modules m
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'carmen' AND m.slug = 'account-receivable'
ON CONFLICT (module_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_submodules (module_id, name, slug, sort_order)
SELECT m.id, 'Report', 'report', 60
FROM public.faq_modules m
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'carmen' AND m.slug = 'account-receivable'
ON CONFLICT (module_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_submodules (module_id, name, slug, sort_order)
SELECT m.id, 'Asset Register', 'asset-register', 70
FROM public.faq_modules m
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'carmen' AND m.slug = 'asset'
ON CONFLICT (module_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_submodules (module_id, name, slug, sort_order)
SELECT m.id, 'Close Period and Year End', 'close-period-and-year-end', 80
FROM public.faq_modules m
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'carmen' AND m.slug = 'general-ledger'
ON CONFLICT (module_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_submodules (module_id, name, slug, sort_order)
SELECT m.id, 'Installation and Configuration', 'installation-and-configuration', 90
FROM public.faq_modules m
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'carmen' AND m.slug = 'workbook'
ON CONFLICT (module_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_submodules (module_id, name, slug, sort_order)
SELECT m.id, 'Workbook Function', 'workbook-function', 100
FROM public.faq_modules m
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'carmen' AND m.slug = 'workbook'
ON CONFLICT (module_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;

-- upsert categories
INSERT INTO public.faq_categories (submodule_id, name, slug, sort_order)
SELECT s.id, 'General', 'general', 10
FROM public.faq_submodules s
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'carmen'
  AND m.slug = 'account-payable'
  AND s.slug = 'input-tax-reconciliation'
ON CONFLICT (submodule_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_categories (submodule_id, name, slug, sort_order)
SELECT s.id, 'General', 'general', 20
FROM public.faq_submodules s
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'carmen'
  AND m.slug = 'account-payable'
  AND s.slug = 'invoice'
ON CONFLICT (submodule_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_categories (submodule_id, name, slug, sort_order)
SELECT s.id, 'General', 'general', 30
FROM public.faq_submodules s
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'carmen'
  AND m.slug = 'account-payable'
  AND s.slug = 'report'
ON CONFLICT (submodule_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_categories (submodule_id, name, slug, sort_order)
SELECT s.id, 'General', 'general', 40
FROM public.faq_submodules s
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'carmen'
  AND m.slug = 'account-payable'
  AND s.slug = 'withholding-tax-reconciliation'
ON CONFLICT (submodule_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_categories (submodule_id, name, slug, sort_order)
SELECT s.id, 'General', 'general', 50
FROM public.faq_submodules s
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'carmen'
  AND m.slug = 'account-receivable'
  AND s.slug = 'folio'
ON CONFLICT (submodule_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_categories (submodule_id, name, slug, sort_order)
SELECT s.id, 'General', 'general', 60
FROM public.faq_submodules s
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'carmen'
  AND m.slug = 'account-receivable'
  AND s.slug = 'report'
ON CONFLICT (submodule_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_categories (submodule_id, name, slug, sort_order)
SELECT s.id, 'General', 'general', 70
FROM public.faq_submodules s
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'carmen'
  AND m.slug = 'asset'
  AND s.slug = 'asset-register'
ON CONFLICT (submodule_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_categories (submodule_id, name, slug, sort_order)
SELECT s.id, 'General', 'general', 80
FROM public.faq_submodules s
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'carmen'
  AND m.slug = 'general-ledger'
  AND s.slug = 'close-period-and-year-end'
ON CONFLICT (submodule_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_categories (submodule_id, name, slug, sort_order)
SELECT s.id, 'General', 'general', 90
FROM public.faq_submodules s
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'carmen'
  AND m.slug = 'workbook'
  AND s.slug = 'installation-and-configuration'
ON CONFLICT (submodule_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;
INSERT INTO public.faq_categories (submodule_id, name, slug, sort_order)
SELECT s.id, 'General', 'general', 100
FROM public.faq_submodules s
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'carmen'
  AND m.slug = 'workbook'
  AND s.slug = 'workbook-function'
ON CONFLICT (submodule_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;

-- insert FAQ entries
INSERT INTO public.faq_entries
  (category_id, title, sample_case, problem_cause, solution, tags, is_active, created_by)
SELECT c.id, 'การทำ Input Tax reconcile สำหรับ Petty cash invoice', 'บันทึก invoice สำหรับ petty cash โดยมี ใบกำกับภาษี 1 ใบ', '', '1. ขั้นตอนการทำ input tax reconcile
	1. สามารถทำการ Reconcile ได้ตามปกติ จะได้ JV/TX และรายงานภาษีตามข้อมูลในระบบ

![](_images/account-payable-input-tax-reconciliation-input-tax-reconcile-petty-cash-invoice/img-001.png)

-
	1. จากนั้นให้ทำการแก้ไขชื่อบริษัท เลขประจำตัวผู้เสียภาษี และสาขา  ให้ถูกต้องที่ Input Tax Reconcile step 2

![](_images/account-payable-input-tax-reconciliation-input-tax-reconcile-petty-cash-invoice/img-002.png)

![](_images/account-payable-input-tax-reconciliation-input-tax-reconcile-petty-cash-invoice/img-003.png)', ARRAY['carmen','faq','documentation']::text[], TRUE, 'seed-script'
FROM public.faq_categories c
JOIN public.faq_submodules s ON s.id = c.submodule_id
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'carmen'
  AND m.slug = 'account-payable'
  AND s.slug = 'input-tax-reconciliation'
  AND c.slug = 'general';
INSERT INTO public.faq_entries
  (category_id, title, sample_case, problem_cause, solution, tags, is_active, created_by)
SELECT c.id, 'ต้องการเคลียร์ข้อมูลภาษี Input tax Reconcile', 'มีใบกำกับภาษีที่ไม่สามารถ claim ได้ หรือ ไม่ต้องการนำส่งให้สรรพากร จึงต้องการเอาออกจากระบบ

![](_images/account-payable-input-tax-reconciliation-input-tax-reconcile/img-001.png)', '', '1. หากรายการดังกล่าวยังไม่ปิด period สามารถดำเนินการแก้ไขที่ใบแจ้งหนี้ได้ โดยการเปลี่ยน Status : Unclaimed   แม้จะมีการชำระเงินแล้ว ก็สามารถแก้ไขได้

![](_images/account-payable-input-tax-reconciliation-input-tax-reconcile/img-002.png)

![](_images/account-payable-input-tax-reconciliation-input-tax-reconcile/img-003.png)

กด Edit ตามภาพ และยืนยันการแก้ไขข้อมูล  ระบบจะอนุญาตให้ทำการแก้ไขเฉพาะ Tax status

![](_images/account-payable-input-tax-reconciliation-input-tax-reconcile/img-004.png)

เลือก Unclaimed จากนั้นกด save

1. หากมีการปิด period แล้ว สามารถดำเนินการขอเปิด period เพื่อกลับไปแก้ไขข้อมูล Tax Status หน้าinvoice ได้เช่นกัน โดยการส่ง mail: [support@carmensoftware.com   หัวข้อ](about:blank)เรื่องการ ขอเปิด period AP เพื่อทำการแก้ไข status tax period
	1. หลังจากได้รับเมล์ Confirm จากทาง support แล้ว สามารถดำเนินการตามข้อ 1 อีกครั้ง

![](_images/account-payable-input-tax-reconciliation-input-tax-reconcile/img-005.png)

1. กรณีที่ไม่สามารถเปิด period ได้เนื่องจากข้อมูลเป็นปีเก่า
	1. กรณีที่ เอกสารทางภาษีไม่สมบรูณ์ หรือไม่ต้องการเคลมภาษี Vat 7% แล้ว
		1. ให้ทำการ Reconcile แล้วเลือก Status เป็น Unclaimed

![](_images/account-payable-input-tax-reconciliation-input-tax-reconcile/img-006.png)

ระบบจะทำการดึงข้อมูลไปที่รายการภาษี GL/ TX : ซึ่งเป็นการ Reconcile code Tax Auto จากระบบ

![](_images/account-payable-input-tax-reconciliation-input-tax-reconcile/img-007.png)

-
	-
		1.  ลูกค้าต้องทำการปรับปรุงรายการ JV TX ใบดังกล่าวเพื่อมิให้มียอดค้างในข้อมูลภาษี GL  

![](_images/account-payable-input-tax-reconciliation-input-tax-reconcile/img-008.png)

1. สามารถศึกษาวิธีการดำเนินการได้จากคู่มือการใช้งาน Input Tax  Reconcile

[Input Tax Reconciliation | CARMEN](https://docscarmencloud.vercel.app/carmen_cloud/ap/AP-input_tax_reconciliation.html)

![](_images/account-payable-input-tax-reconciliation-input-tax-reconcile/img-009.png)', ARRAY['carmen','faq','documentation']::text[], TRUE, 'seed-script'
FROM public.faq_categories c
JOIN public.faq_submodules s ON s.id = c.submodule_id
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'carmen'
  AND m.slug = 'account-payable'
  AND s.slug = 'input-tax-reconciliation'
  AND c.slug = 'general';
INSERT INTO public.faq_entries
  (category_id, title, sample_case, problem_cause, solution, tags, is_active, created_by)
SELECT c.id, 'วิธีการ ตรวจสอบTax Reconcile error “ Cannot convert null to ‘System.Date Tmae’ Because it is a non-nullable value type”', 'ต้องการทำ Input Tax Reconciliation แต่ะระบบแจ้งเตือน error', '', 'ค้นหา invoice ที่ ไม่ได้กรอก Tax Invoice date หรือ tax period เอาไว้

วิธีการ ตรวจสอบ : ให้ทำการตรวจสอบจากรายงานภาษี : AP>> Report>> Tax invoice >>

จากนั้น filter status = Confirm และ pending

กด Preview

![](_images/account-payable-input-tax-reconciliation-tax-reconcile-error-cannot-convert-null-to-system-date-tmae-because-it-is-a-non-nullable-value-type/img-001.png)

ระบบจะแสดงรายการหน้ารายงานภาษี ซึ่งจะมีข้อมูล Tax invoice date แสดงข้อมูลวันี่ไม่ถูกต้อง ตามตัวอย่าง

![](_images/account-payable-input-tax-reconciliation-tax-reconcile-error-cannot-convert-null-to-system-date-tmae-because-it-is-a-non-nullable-value-type/img-002.png)

วิธีการแก้ไข : นำหมายเลข Invoice ไปตรวจสอบและค้นหาที่

1. Invoice ค้นหาข้อมูลตามหมายเลขใบแจ้งหนี้ และใส่ข้อมูลให้ครบ

![](_images/account-payable-input-tax-reconciliation-tax-reconcile-error-cannot-convert-null-to-system-date-tmae-because-it-is-a-non-nullable-value-type/img-003.png)

1. กลับเข้าสู่ Function การทำ Input Tax reconcile  สามารถดำงานต่อได้

![](_images/account-payable-input-tax-reconciliation-tax-reconcile-error-cannot-convert-null-to-system-date-tmae-because-it-is-a-non-nullable-value-type/img-004.png)

![](_images/account-payable-input-tax-reconciliation-tax-reconcile-error-cannot-convert-null-to-system-date-tmae-because-it-is-a-non-nullable-value-type/img-005.png)', ARRAY['carmen','faq','documentation']::text[], TRUE, 'seed-script'
FROM public.faq_categories c
JOIN public.faq_submodules s ON s.id = c.submodule_id
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'carmen'
  AND m.slug = 'account-payable'
  AND s.slug = 'input-tax-reconciliation'
  AND c.slug = 'general';
INSERT INTO public.faq_entries
  (category_id, title, sample_case, problem_cause, solution, tags, is_active, created_by)
SELECT c.id, 'แก้ไข invoice แล้วระบบเจ้งเตือน Information This invoice has been settled', 'ต้องการแก้ไข Invoice ที่ทำ payment ไปแล้ว', 'invoice ใบนี้ทำ payment ไปแล้ว

1. เป็นการแจ้งเตือนให้ทราบว่า ใบแจ้งนี้รายการนี้ ถูกตัดจ่ายแล้ว สังเกตได้จาก ตรงคำว่า Unpaid ในกรอบสีแดง  ซึ่งมีผลทำให้จะไม่สามารถแก้ไขข้อมูลอย่างอื่นได้

![](_images/account-payable-invoice-invoice-information-this-invoice-has-been-settled/img-001.png)

![](_images/account-payable-invoice-invoice-information-this-invoice-has-been-settled/img-002.png)

1. มีการ Settle Total payment หรือมียอดแบ่งจ่ายไปแล้วบางส่วน

![](_images/account-payable-invoice-invoice-information-this-invoice-has-been-settled/img-003.png)

ยกเว้น รายการ Tax invoce   “allowed to edit Tax Invoice. Do you want to continue?” หากเรากด  Yes  ระบบจะอนุญาตให้ทำการแก้ไขเฉพาะบรรทัดข้อมูลเกี่ยวกัน Tax invoice ในกรอบสีแดง

![](_images/account-payable-invoice-invoice-information-this-invoice-has-been-settled/img-004.png)

1. มีการปิด period แล้ว จะไม่สามารถแก้ไขอะไรได้อีกต้องขอเปิด period โดยการส่งเมล์หา support : [support@carmensoftware.com](mailto:support@carmensoftware.com)', 'ระบบจะเปิดให้แก้ไขข้อมูลได้บ้างส่วนเท่านั้น', ARRAY['carmen','faq','documentation']::text[], TRUE, 'seed-script'
FROM public.faq_categories c
JOIN public.faq_submodules s ON s.id = c.submodule_id
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'carmen'
  AND m.slug = 'account-payable'
  AND s.slug = 'invoice'
  AND c.slug = 'general';
INSERT INTO public.faq_entries
  (category_id, title, sample_case, problem_cause, solution, tags, is_active, created_by)
SELECT c.id, 'Aging มียอดค้าง ทั้งที่มีการตัดจ่ายไปแล้ว เกิดจากสาเหตุใดบ้าง', 'ดูรายงาน aging แล้วไม่ถูกต้อง', '', 'ให้เปิด Payment ที่ไม่ได้ระบุ วันที่เช็ค \(Cheque Date\)

กด edit และ บันทึกวันที่ cheque date ให้ถูกต้อง

จากนั้นระบบจึงจะตัด invoice นี้ออกจาก aging ให้

![](_images/account-payable-report-aging/img-003.png)', ARRAY['carmen','faq','documentation']::text[], TRUE, 'seed-script'
FROM public.faq_categories c
JOIN public.faq_submodules s ON s.id = c.submodule_id
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'carmen'
  AND m.slug = 'account-payable'
  AND s.slug = 'report'
  AND c.slug = 'general';
INSERT INTO public.faq_entries
  (category_id, title, sample_case, problem_cause, solution, tags, is_active, created_by)
SELECT c.id, 'การแก้ไขรายการ ช่องข้อมูลของผู้ถูกหัก ณ ที่จ่าย เช่น เลขที่ประจำตัวผู้เสียภาษีอากร ชื่อ', 'ข้อมูลบนเอกสารแสดงไม่ถูกต้อง', 'มีการบันทึกข้อมูลใน vendor profile ไม่ถูกต้อง หรือ บันทึกข้อมูลใน payment ไม่ถูกต้อง', 'สามารถแก้ไขได้ดังนี้

1. หากต้องการแก้ไขข้อมูลที่ถาวร สามารถแก้ไขได้ที่  Vendor Profile

![](_images/account-payable-withholding-tax-reconciliation-item/img-002.png)

การแก้ไขตรงจุดนี้จะมีผลต่อ รายการ payment ทุกใบของ Vendor ที่มีการจัดทำขึ้นใหม่

1. Payment Voucher : หากมีการ Save ข้อมูลแล้ว ถึงจะแก้ไขที่ Vendor ก็จะไม่มีผลต่อ payment ลูกค้าต้องทำการแก้ไขข้อมูลที่หน้า Payment เอง จะส่งผลต่อไปที่ข้อมูลของ WHT Reconcile ด้วย

![](_images/account-payable-withholding-tax-reconciliation-item/img-003.png)

การแก้ไขตรงจุดนี้จะมีผลต่อ เอกสารภาษี หัก ณ ที่จ่ายเฉพาะรายการนี้ และใน Step ต่อไป แต่จะไม่ส่งผลต่อ Vendor ที่มีการใส่ข้อมูลที่ไม่ถูกต้อง

1. WHT Reconcile : จะเป็นการแก้ไขข้อมูลที่ Step สุดท้าย หลังจากทำ Payment แล้ว และไม่สามารถแก้ไขข้อมูล Payment ได้ เช่น period closed  / Printed  สามารถแก้ไขตรงจุดนี้ได้เพิ่มอีก แต่จะไม่ส่งผล ต่อ Vendor / ข้อมูลใน WHT Payment \(ข้อมูลจะไม่ย้อนกลับไปที่การทำงานที่ผ่านมาแล้ว\) จะมีผลต่อ Step export file นำส่งสรรพากรเท่านั้น ซึ่งจะทำให้ ข้อมูล WHT ไม่ตรงกันหากเช็คย้อนกลับ

__หมายเหตุ: จุดนี้แนะนำให้เป็นการแก้ไขเฉพาะรายการที่เพิ่ม WHT นอกเหนือจากการทำ WHT Payment__

![](_images/account-payable-withholding-tax-reconciliation-item/img-004.png)

1. สามารถศึกษาวิธีการดำเนินการโดยละเอียดได้จากคู่มือการใช้งาน

[Vendor | CARMEN](https://docscarmencloud.vercel.app/carmen_cloud/ap/AP-vendor.html)

![](_images/account-payable-withholding-tax-reconciliation-item/img-005.png)', ARRAY['carmen','faq','documentation']::text[], TRUE, 'seed-script'
FROM public.faq_categories c
JOIN public.faq_submodules s ON s.id = c.submodule_id
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'carmen'
  AND m.slug = 'account-payable'
  AND s.slug = 'withholding-tax-reconciliation'
  AND c.slug = 'general';
INSERT INTO public.faq_entries
  (category_id, title, sample_case, problem_cause, solution, tags, is_active, created_by)
SELECT c.id, 'AR Folio มีข้อมูลผิดพลาดสามารถแก้ไขได้หรือไม่', 'ตรวจสอบข้อมูล interface แล้วพบว่าข้อมูลจาก PMS ไม่ถูกต้อง', 'มีการบันทึกข้อมูลจาก PMS ไม่ถูกต้อง

Solutions : สามารถ void ได้อย่างเดียว ไม่สามารถแก้ไขได้ เนื่องจากข้อมูลใน Folio จะเป็นการส่งข้อมูลจากระบบ PMS จึงไม่สามารถแก้ไขได้ ขั้นตอนการ void สามารถทำได้ดังนี้

1. Folio ที่ยังไม่ถูกดึงไปทำ Invoice สามารถยกเลิก \(Void\) ได้

- เมื่อเข้าไปที่ folio แล้ว ให้ทำการค้นหา folio ที่ต้องการ
- ให้สังเกต ที่ icon ใน column แรก หากเป็นรูป ถังขยะ แปลว่าสามารถ void ได้ เนื่องจากยังไม่ได้นำไปสร้าง invoice

![](_images/account-receivable-folio-ar-folio/img-001.png)

- เมื่อ void แล้ว folio จะแสดง status เป็น Void

![](_images/account-receivable-folio-ar-folio/img-002.png)

1. Folio ที่ดึงไปทำ invoice แล้ว ต้องทำการยกเลิกใบแจ้งหนี้ก่อนและทำการยกเลิกรายการ Folio ที่ไม่ต้องการอีกครั้ง หลังจากนั้นต้องทำใบแจ้งหนี้ใหม่แบบ Manual ที่ถูกต้อง สามารถศึกษาข้อมูลเพิ่มเติมจากคู่มือการทำ AR invoice

![](_images/account-receivable-folio-ar-folio/img-003.png)

https://docscarmencloud.vercel.app/carmen\_cloud/ar/AR-invoice.html', '# AR Folio มีข้อมูลผิดพลาดสามารถแก้ไขได้หรือไม่

## Title
AR Folio มีข้อมูลผิดพลาดสามารถแก้ไขได้หรือไม่?

## Sample case
ตรวจสอบข้อมูล interface แล้วพบว่าข้อมูลจาก PMS ไม่ถูกต้อง

## Cause of problems
มีการบันทึกข้อมูลจาก PMS ไม่ถูกต้อง

Solutions : สามารถ void ได้อย่างเดียว ไม่สามารถแก้ไขได้ เนื่องจากข้อมูลใน Folio จะเป็นการส่งข้อมูลจากระบบ PMS จึงไม่สามารถแก้ไขได้ ขั้นตอนการ void สามารถทำได้ดังนี้

1. Folio ที่ยังไม่ถูกดึงไปทำ Invoice สามารถยกเลิก \(Void\) ได้

- เมื่อเข้าไปที่ folio แล้ว ให้ทำการค้นหา folio ที่ต้องการ
- ให้สังเกต ที่ icon ใน column แรก หากเป็นรูป ถังขยะ แปลว่าสามารถ void ได้ เนื่องจากยังไม่ได้นำไปสร้าง invoice

![](_images/account-receivable-folio-ar-folio/img-001.png)

- เมื่อ void แล้ว folio จะแสดง status เป็น Void

![](_images/account-receivable-folio-ar-folio/img-002.png)

1. Folio ที่ดึงไปทำ invoice แล้ว ต้องทำการยกเลิกใบแจ้งหนี้ก่อนและทำการยกเลิกรายการ Folio ที่ไม่ต้องการอีกครั้ง หลังจากนั้นต้องทำใบแจ้งหนี้ใหม่แบบ Manual ที่ถูกต้อง สามารถศึกษาข้อมูลเพิ่มเติมจากคู่มือการทำ AR invoice

![](_images/account-receivable-folio-ar-folio/img-003.png)

https://docscarmencloud.vercel.app/carmen\_cloud/ar/AR-invoice.html

## Tags

Carmen', ARRAY['carmen','faq','documentation']::text[], TRUE, 'seed-script'
FROM public.faq_categories c
JOIN public.faq_submodules s ON s.id = c.submodule_id
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'carmen'
  AND m.slug = 'account-receivable'
  AND s.slug = 'folio'
  AND c.slug = 'general';
INSERT INTO public.faq_entries
  (category_id, title, sample_case, problem_cause, solution, tags, is_active, created_by)
SELECT c.id, 'AR  Aging มียอดค้างเมื่อมีการตัดลูกหนี้ไปแล้ว เกิดจากอะไร', 'เอกสาร invoice ทำ receipt เพื่อรับเงินแล้ว แต่ invoice ยังแสดงอยู่ในรายงาน aging', 'บันทึก Receipt ย้อนหลัง แล้วไม่ได้เปลี่ยน settle on date', 'ตรวจสอบที่เอกสาร Receipt ว่า กำหนด settle on date เป็นวันที่เท่าไหร่

1. เมื่อมีการตัดลูกหนี้ หรือสร้าง Receipt ด้วยวันที่ย้อนหลัง แต่ไม่ได้เลือกวันที่ settle on date ใน detail เป็นวันที่ย้อนหลังด้วย aging จึงจะตัดตามวันที่ settle on date ใน detail

        

![](_images/account-receivable-report-ar-aging/img-001.png)

![](_images/account-receivable-report-ar-aging/img-002.png)

1. สามารถศึกษารายละเอียดการกำหนด settle on date ได้จากคู่มือ

![](_images/account-receivable-report-ar-aging/img-003.png)', ARRAY['carmen','faq','documentation']::text[], TRUE, 'seed-script'
FROM public.faq_categories c
JOIN public.faq_submodules s ON s.id = c.submodule_id
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'carmen'
  AND m.slug = 'account-receivable'
  AND s.slug = 'report'
  AND c.slug = 'general';
INSERT INTO public.faq_entries
  (category_id, title, sample_case, problem_cause, solution, tags, is_active, created_by)
SELECT c.id, 'Init Accrued Depre คืออะไร ต้องใส่เมื่อไหร่', 'เมื่อมีการคำนวณค่าเสื่อมราคาให้กับ asset ก่อนเริ่มใช้ระบบ carmen จึงต้องมีการบันทึกค่าเสื่อมราคาสะสมยกมาด้วย', '', 'Init Accrued Depre คือค่าเสื่อมราคาสะสม เมื่อมีการ Register Asset ในระบบ โดยที่มีการคำนวณค่าเสื่อมและเป็นค่าเสื่อมสะสม มาก่อนจะใช้ระบบ Carmen ตามความหมายของข้อความ

- Ini. Accu. Depre. ระบุค่าเสื่อมราคาสะสมยกมา กรณีสินทรัพย์มีการคำนวณค่าเสื่อมมาแล้ว

ดังนั้นหาก Input date และ Acquire date ไม่ตรงกัน นั้นหมายถึงมีการคำนวณค่าเสื่อมมาก่อนนี้แล้ว จึงจำเป็นต้องใส่ข้อมูล Init Accrued Depre เพื่อให้ระบบ Carmen คำนวนต่อโดยการนำมูลค่า Asset หักลบด้วย Init Acc Depre จะได้ Net Book Value เพื่อคำนวนต่อได้อย่างถูกต้อง

![](_images/asset-asset-register-init-accrued-depre/img-001.png)', ARRAY['carmen','faq','documentation']::text[], TRUE, 'seed-script'
FROM public.faq_categories c
JOIN public.faq_submodules s ON s.id = c.submodule_id
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'carmen'
  AND m.slug = 'asset'
  AND s.slug = 'asset-register'
  AND c.slug = 'general';
INSERT INTO public.faq_entries
  (category_id, title, sample_case, problem_cause, solution, tags, is_active, created_by)
SELECT c.id, 'การปิด period ในรอบปีต้องทำอย่างไร', 'ต้องการปิดปีบัญชีแล้วให้ระบบกลับบัญชีรายได้และค่าใช้จ่ายให้โดยอัตโนมัติ', '', 'การปิด period ทำได้ 2 แบบ คือปิดเดือน และปิดปี

การปิดเดือน จะเป็นการปิดเพื่อป้องการมิให้มูลค่าของตัวเลขที่เคยผ่านการตรวจสอบแล้วมีความเคลื่อนไหว \(ไม่สามารถแก้ไขข้อมูลได้หลังจากปิดperiod ไปแล้ว\)

การปิดปี หรือ ปิด period เดือน สุดท้าย Module GL จะเป็นการปิดปีเพื่อยกยอดรายการที่ใช้ account code type : Balance sheet ไปสู่ปีต่อไป และเป็นการปิดรายได้ และค่าใช้จ่ายเข้า กำไร \(ขาดทุน\) จะไม่มีผลต่อปริ้นรายงานต่างๆ และไม่สามารถแก้ไขข้อมูลเดิมได้ ยกเว้นจะต้องการเปิด period เพื่อทำการแก้ไข

ต้องทำการปิดในแต่ละ Module ของการใช้งาน เริ่ม Asset Module  >> AR Module>> AP Module ก่อน

1. โดยการเลือก Procedure >> Closed period

![](_images/general-ledger-close-period-and-year-end-period/img-001.png)

เป็นลักษณะเดียวกันกับการปิดเดือน จะต้องทำให้ครบทั้ง 12 เดือน  ของ  Asset Module >> AR Module>> AP Module

1. ไปที่ GL Module เพื่อทำการปิดปี

ดำเนินการเช่นเดียวกันกับการปิด period ของเดือน และ ของ Module การใช้งานอื่น

![](_images/general-ledger-close-period-and-year-end-period/img-002.png)

1. หลังจากทำการ Close period เดือน 12 แล้ว จะมีข้อมูล YE เกิดขึ้น ที่ JV Moule : Prefix : YE

![](_images/general-ledger-close-period-and-year-end-period/img-003.png)

ซึ่งข้อมูล YE นี้จะเกิดขึ้นอัตโนมัติจากการปิด period จะเป็นการคำนวณรายได้ และ ค่าใช้จ่าย ทั้งปี เพื่อหากำไร\(ขาดทุน\) รวมทั้งปี ซึ่งยอดจะต้องตรงกันกับข้อมูล Trial Balance เดือน 12

![](_images/general-ledger-close-period-and-year-end-period/img-004.png)

ลักษณะของ JVของข้อมูลในรายการ JV นั้นจะเป็นการแสดงข้อมูลรวมตามแต่ละ account code ทั้งปี ของ Type : Income  และจะสลับ Nature : Debit >> Credit เช่นตอนบันทึกบัญชี ค่าใช้จ่ายเป็น Debit ในรายการนี้จะสลับเป็น Credit แทน  จะเห็นว่าแตกต่างจาก Account code ที่ Setting ไว้

![](_images/general-ledger-close-period-and-year-end-period/img-005.png)

![](_images/general-ledger-close-period-and-year-end-period/img-006.png)', ARRAY['carmen','faq','documentation']::text[], TRUE, 'seed-script'
FROM public.faq_categories c
JOIN public.faq_submodules s ON s.id = c.submodule_id
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'carmen'
  AND m.slug = 'general-ledger'
  AND s.slug = 'close-period-and-year-end'
  AND c.slug = 'general';
INSERT INTO public.faq_entries
  (category_id, title, sample_case, problem_cause, solution, tags, is_active, created_by)
SELECT c.id, 'วิธีเพิ่ม Carmen Addin คืนมา', 'หลังจากติดตั้งเสร็จแล้ว เมื่อกลับมาเปิด excel แต่ Carmen add in หายไป', 'Excel มีการ block add in', 'วิธีแก้ไขเพิ่ม add in กลับมา
![](_images/workbook-installation-and-configuration-carmen-addin/img-001.png)
1.Click “File”

![](_images/workbook-installation-and-configuration-carmen-addin/img-002.png)

Click “option”

![](_images/workbook-installation-and-configuration-carmen-addin/img-003.png)

2.Click “Add-ins”
3.Cick GO
![](_images/workbook-installation-and-configuration-carmen-addin/img-004.png)

4. Check box at “Carmen AddIn”

5.Click “OK” to complete the process.
![](_images/workbook-installation-and-configuration-carmen-addin/img-005.png)
Excel จะแสดง Carmen Add-in ขึ้นมาตาม สามารถดำเนินการใช้งานได้ตามปกติ

![](_images/workbook-installation-and-configuration-carmen-addin/img-006.png)', ARRAY['carmen','faq','documentation']::text[], TRUE, 'seed-script'
FROM public.faq_categories c
JOIN public.faq_submodules s ON s.id = c.submodule_id
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'carmen'
  AND m.slug = 'workbook'
  AND s.slug = 'installation-and-configuration'
  AND c.slug = 'general';
INSERT INTO public.faq_entries
  (category_id, title, sample_case, problem_cause, solution, tags, is_active, created_by)
SELECT c.id, 'Import Budget with dimension, systems show error about duplicate value', 'ต้องการ import budget โดยแยก dimension แต่ระบบแจ้งว่า department ซ้ำ จะต้องแก้ไขอย่างไร

![](_images/workbook-workbook-function-import-budget-with-dimension-systems-show-error-about-duplicate-value/img-001.png)', 'เนื่องจาก Add in version เก่าไม่รองรับการ import budget แยกตาม dimension', 'กรณีที่ไม่สามารถ import budget ได้ ถ้าหากใน 1 sheet มี department code \+ Account code \+ Dimension ที่ซ้ำกัน สามารถแก้ไขโดย ต้อง update to new version 3.9610 เพื่อแก้ไขปัญหาดังกล่าว

![](_images/workbook-workbook-function-import-budget-with-dimension-systems-show-error-about-duplicate-value/img-002.png)', ARRAY['carmen','faq','documentation']::text[], TRUE, 'seed-script'
FROM public.faq_categories c
JOIN public.faq_submodules s ON s.id = c.submodule_id
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'carmen'
  AND m.slug = 'workbook'
  AND s.slug = 'workbook-function'
  AND c.slug = 'general';
INSERT INTO public.faq_entries
  (category_id, title, sample_case, problem_cause, solution, tags, is_active, created_by)
SELECT c.id, 'Import JV but systems show message that Dr. _ Cr. amount is zero', 'ต้องการ import JV แต่ระบบแจ้ง Error แก้ไขอย่างไร

![](_images/workbook-workbook-function-import-jv-but-systems-show-message-that-dr-cr-amount-is-zero/img-001.png)', 'ไม่ได้ใส่ข้อมูลช่อง Rate จึงทำให้ total amount ไม่ถูกต้อง', 'ให้กรอกตัวเลข currency rate ในช่อง Rate เช่น 1.00 โดยต้องใส่ใน detail ทุกบรรทัด

![](_images/workbook-workbook-function-import-jv-but-systems-show-message-that-dr-cr-amount-is-zero/img-002.png)', ARRAY['carmen','faq','documentation']::text[], TRUE, 'seed-script'
FROM public.faq_categories c
JOIN public.faq_submodules s ON s.id = c.submodule_id
JOIN public.faq_modules m ON m.id = s.module_id
JOIN public.business_units bu ON bu.id = m.bu_id
WHERE bu.slug = 'carmen'
  AND m.slug = 'workbook'
  AND s.slug = 'workbook-function'
  AND c.slug = 'general';

COMMIT;
