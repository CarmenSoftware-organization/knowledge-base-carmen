---
title: Import Budget with dimension, systems show error about duplicate value
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
# Import Budget with dimension, systems show error about duplicate value

## Title
Import Budget ใน workbook แล้วแสดง ข้อความ “Error: department code ….. already exists. Please change department code in row ……”

## Sample case
ต้องการ import budget โดยแยก dimension แต่ระบบแจ้งว่า department ซ้ำ จะต้องแก้ไขอย่างไร

![](_images/workbook-workbook-function-import-budget-with-dimension-systems-show-error-about-duplicate-value/img-001.png)

## Cause of problems
เนื่องจาก Add in version เก่าไม่รองรับการ import budget แยกตาม dimension

## Solution
กรณีที่ไม่สามารถ import budget ได้ ถ้าหากใน 1 sheet มี department code \+ Account code \+ Dimension ที่ซ้ำกัน สามารถแก้ไขโดย ต้อง update to new version 3.9610 เพื่อแก้ไขปัญหาดังกล่าว

![](_images/workbook-workbook-function-import-budget-with-dimension-systems-show-error-about-duplicate-value/img-002.png)

## Tags

Carmen
