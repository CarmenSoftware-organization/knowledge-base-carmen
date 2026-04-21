---
title: AR  Aging มียอดค้างเมื่อมีการตัดลูกหนี้ไปแล้ว เกิดจากอะไร
description: 
published: true
date: 2026-04-21T03:08:27Z
tags: carmen,faq,documentation
editor: markdown
dateCreated: 2026-04-21T03:08:27Z
faq_module: Account Receivable
faq_submodule: Report
faq_category: General
---
# AR  Aging มียอดค้างเมื่อมีการตัดลูกหนี้ไปแล้ว เกิดจากอะไร

## Title
AR  Aging มียอดค้างหลังจากมีการตัดลูกหนี้ไปแล้ว เกิดจากอะไร

## Sample case
เอกสาร invoice ทำ receipt เพื่อรับเงินแล้ว แต่ invoice ยังแสดงอยู่ในรายงาน aging

## Cause of problems
บันทึก Receipt ย้อนหลัง แล้วไม่ได้เปลี่ยน settle on date

## Solution
ตรวจสอบที่เอกสาร Receipt ว่า กำหนด settle on date เป็นวันที่เท่าไหร่

1. เมื่อมีการตัดลูกหนี้ หรือสร้าง Receipt ด้วยวันที่ย้อนหลัง แต่ไม่ได้เลือกวันที่ settle on date ใน detail เป็นวันที่ย้อนหลังด้วย aging จึงจะตัดตามวันที่ settle on date ใน detail

        

![](_images/account-receivable-report-ar-aging/img-001.png)

![](_images/account-receivable-report-ar-aging/img-002.png)

1. สามารถศึกษารายละเอียดการกำหนด settle on date ได้จากคู่มือ

![](_images/account-receivable-report-ar-aging/img-003.png)

## Tags

Carmen
