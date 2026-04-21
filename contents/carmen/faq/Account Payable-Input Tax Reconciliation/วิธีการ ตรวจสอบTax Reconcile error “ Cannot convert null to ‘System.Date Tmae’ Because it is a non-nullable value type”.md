---
title: วิธีการ ตรวจสอบTax Reconcile error “ Cannot convert null to ‘System.Date Tmae’ Because it is a non-nullable value type”
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
# วิธีการ ตรวจสอบTax Reconcile error “ Cannot convert null to ‘System.Date Tmae’ Because it is a non-nullable value type”

## Title
เมื่อเข้า function “Input Tax Reconciliation” แล้ว ระบบแสดงข้อความ __“ Cannot convert null to ‘System.Date Tmae’ Because it is a non-nullable value type”__ จะแก้ไขอย่างไร

## Sample case
ต้องการทำ Input Tax Reconciliation แต่ะระบบแจ้งเตือน error

## Cause of problems
เนื่องจากใน invoice ไม่ได้บันทึก tax invoice date เอาไว้จึงไม่สามารถทำ Input Tax Reconciliation ได้

## Solution

ค้นหา invoice ที่ ไม่ได้กรอก Tax Invoice date หรือ tax period เอาไว้

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

![](_images/account-payable-input-tax-reconciliation-tax-reconcile-error-cannot-convert-null-to-system-date-tmae-because-it-is-a-non-nullable-value-type/img-005.png)

## Tags

Carmen
