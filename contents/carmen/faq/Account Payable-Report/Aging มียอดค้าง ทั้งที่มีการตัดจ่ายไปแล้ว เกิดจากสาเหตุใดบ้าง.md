---
title: Aging มียอดค้าง ทั้งที่มีการตัดจ่ายไปแล้ว เกิดจากสาเหตุใดบ้าง
description: 
published: true
date: 2026-04-21T03:08:27Z
tags: carmen,faq,documentation
editor: markdown
dateCreated: 2026-04-21T03:08:27Z
faq_module: Account Payable
faq_submodule: Report
faq_category: General
---
# Aging มียอดค้าง ทั้งที่มีการตัดจ่ายไปแล้ว เกิดจากสาเหตุใดบ้าง

## Title
Report Aging มียอดคงค้าง ทั้งที่มีการตัดจ่ายไปแล้ว เกิดจากสาเหตุใดบ้าง

![](_images/account-payable-report-aging/img-001.png)

## Sample case
ดูรายงาน aging แล้วไม่ถูกต้อง

## Cause of problems
ไม่มีการบันทึกวันที่ cheque date

ตรวจสอบข้อมูลการตั้งค่า Setting “Payment Posting” ซึ่งเป็นการตั้งค่าวันที่ในการตัด aging รวมถึงการบันทึก GL และ การบันทึกภาษีหัก ณ ที่จ่าย

หากมีการเลือกข้อมูลเป็น Cheque date เอกสาร payment ทุกใบจะต้องมีการบันทึกวันที่ cheque date ด้วยเสมอ เพื่อให้ระบบตัด aging และ บันทึกเข้า GL ให้

![](_images/account-payable-report-aging/img-002.png)

## Solution
ให้เปิด Payment ที่ไม่ได้ระบุ วันที่เช็ค \(Cheque Date\)

กด edit และ บันทึกวันที่ cheque date ให้ถูกต้อง

จากนั้นระบบจึงจะตัด invoice นี้ออกจาก aging ให้

![](_images/account-payable-report-aging/img-003.png)

## Tags

Carmen
