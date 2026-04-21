---
title: ต้องการเคลียร์ข้อมูลภาษี Input tax Reconcile
description: 
published: true
date: 2026-04-21T03:08:27Z
tags: carmen,faq,documentation
editor: markdown
dateCreated: 2026-04-21T03:08:27Z
faq_module: Account Payable
faq_submodule: Input Tax Reconciliation
faq_category: General
---
# ต้องการเคลียร์ข้อมูลภาษี Input tax Reconcile

## Title
ต้องการยกเลิก ใบกำกับภาษีออกจากหน้าจอ Input Tax Reconciliation ต้องทำอย่างไร

## Sample case
มีใบกำกับภาษีที่ไม่สามารถ claim ได้ หรือ ไม่ต้องการนำส่งให้สรรพากร จึงต้องการเอาออกจากระบบ

![](_images/account-payable-input-tax-reconciliation-input-tax-reconcile/img-001.png)

## Cause of problems

## Solution

1. หากรายการดังกล่าวยังไม่ปิด period สามารถดำเนินการแก้ไขที่ใบแจ้งหนี้ได้ โดยการเปลี่ยน Status : Unclaimed   แม้จะมีการชำระเงินแล้ว ก็สามารถแก้ไขได้

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

![](_images/account-payable-input-tax-reconciliation-input-tax-reconcile/img-009.png)

## Tags

Carmen
