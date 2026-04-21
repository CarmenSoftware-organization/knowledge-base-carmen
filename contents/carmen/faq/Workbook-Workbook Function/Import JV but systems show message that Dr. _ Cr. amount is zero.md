---
title: Import JV but systems show message that Dr. _ Cr. amount is zero
description: 
published: true
date: 2026-04-21T03:08:27Z
tags: carmen,faq,documentation
editor: markdown
dateCreated: 2026-04-21T03:08:27Z
faq_module: Workbook
faq_submodule: Workbook Function
faq_category: General
---
# Import JV but systems show message that Dr. _ Cr. amount is zero

## Title
เมื่อ import JV แล้ว ระบบแสดง ข้อความ “ Error \[Dr/Cr is equal Zero\] เกิดจากอะไร

## Sample case
ต้องการ import JV แต่ระบบแจ้ง Error แก้ไขอย่างไร

![](_images/workbook-workbook-function-import-jv-but-systems-show-message-that-dr-cr-amount-is-zero/img-001.png)

## Cause of problems
ไม่ได้ใส่ข้อมูลช่อง Rate จึงทำให้ total amount ไม่ถูกต้อง

## Solution
ให้กรอกตัวเลข currency rate ในช่อง Rate เช่น 1.00 โดยต้องใส่ใน detail ทุกบรรทัด

![](_images/workbook-workbook-function-import-jv-but-systems-show-message-that-dr-cr-amount-is-zero/img-002.png)

## Tags

Carmen
