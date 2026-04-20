---
title: "เมื่อ import JV แล้ว ระบบแสดง ข้อความ “ Error \\[Dr/Cr is equal Zero\\] เกิดจากอะไร"
description: "เมื่อ import JV แล้ว ระบบแสดง ข้อความ “ Error \\[Dr/Cr is equal Zero\\] เกิดจากอะไร"
lang: th-TH
published: true
date: 2026-04-20T05:06:39.000Z
tags: carmen_cloud,documentation
editor: markdown
dateCreated: 2026-04-20T05:06:39.000Z
---

# เมื่อ import JV แล้ว ระบบแสดง ข้อความ “ Error \[Dr/Cr is equal Zero\] เกิดจากอะไร

Sample case : ต้องการ import JV แต่ระบบแจ้ง Error แก้ไขอย่างไร

![](_images/import-jv-but-systems-show-message-that--3d7cfabb14/img-001.png)

Cause of Problems : ไม่ได้ใส่ข้อมูลช่อง Rate จึงทำให้ total amount ไม่ถูกต้อง

Solution : ให้กรอกตัวเลข currency rate ในช่อง Rate เช่น 1\.00 โดยต้องใส่ใน detail ทุกบรรทัด

![](_images/import-jv-but-systems-show-message-that--3d7cfabb14/img-002.png)
