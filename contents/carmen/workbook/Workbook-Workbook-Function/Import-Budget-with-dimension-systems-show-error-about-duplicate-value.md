---
title: "Import Budget ใน workbook แล้วแสดง ข้อความ “Error: department code …\\.\\. already exists\\. Please change department code in row ……”"
description: "Import Budget ใน workbook แล้วแสดง ข้อความ “Error: department code …\\.\\. already exists\\. Please change department code in row ……”"
lang: th-TH
published: true
date: 2026-04-20T05:06:39.000Z
tags: carmen_cloud,documentation
editor: markdown
dateCreated: 2026-04-20T05:06:39.000Z
---

# Import Budget ใน workbook แล้วแสดง ข้อความ “Error: department code …\.\. already exists\. Please change department code in row ……”

Sample case : ต้องการ import budget โดยแยก dimension แต่ระบบแจ้งว่า department ซ้ำ จะต้องแก้ไขอย่างไร

![](_images/import-budget-with-dimension-systems-sho-22464d4664/img-001.png)

Cause of Problems : เนื่องจาก Add in version เก่าไม่รองรับการ import budget แยกตาม dimension

Solution : กรณีที่ไม่สามารถ import budget ได้ ถ้าหากใน 1 sheet มี department code \+ Account code \+ Dimension ที่ซ้ำกัน สามารถแก้ไขโดย ต้อง update to new version 3\.9610 เพื่อแก้ไขปัญหาดังกล่าว

![](_images/import-budget-with-dimension-systems-sho-22464d4664/img-002.png)
