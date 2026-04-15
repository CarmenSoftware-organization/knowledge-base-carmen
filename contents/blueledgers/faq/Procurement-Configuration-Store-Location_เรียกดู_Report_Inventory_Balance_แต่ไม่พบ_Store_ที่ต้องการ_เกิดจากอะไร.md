---
title: เรียกดู Report Inventory Balance แต่ไม่พบ Store ที่ต้องการ เกิดจากอะไร
description: 
published: true
date: 2026-04-15T20:37:14Z
tags: blueledgers,faq,documentation
editor: markdown
dateCreated: 2026-04-15T20:37:14Z
faq_module: Procurement
faq_submodule: Configuration
faq_category: Store-Location
---

# เรียกดู Report Inventory Balance แต่ไม่พบ Store ที่ต้องการ เกิดจากอะไร

## Sample case

ต้องการเรียกดู Store 2AG03 ในรายงานแต่ค้นหาไม่พบ

## Cause of problems

Store เป็น Type แบบค่าใช้จ่าย Default Zero  
![](_images/procurement-configuration-store-location-เรยกด-report-inventory-balance-แตไมพบ-store-ทตองการ-เกดจากอะไร/img-001.png)

## Solution

ตรวจสอบว่าStore ดังกล่าวเป็น Enter Counted Stock หรือ Default System หรือไม่   
สังเกตุในช่อง EOP ว่าแสดงเป็นประเภทใด   
![](_images/procurement-configuration-store-location-เรยกด-report-inventory-balance-แตไมพบ-store-ทตองการ-เกดจากอะไร/img-002.png)  
หากเป็น Default Zero ระบบจะไม่ปรากฏข้อมูลเนื่องจากเป็นStore ค่าใช้จ่ายครับ   
หากเป็นการทำ Receiving ให้ใช้Report Receiving Detail และเลือกวันที่ทำรับเพื่อดูข้อมูล   
![](_images/procurement-configuration-store-location-เรยกด-report-inventory-balance-แตไมพบ-store-ทตองการ-เกดจากอะไร/img-003.png)

## Tags

Related topics:
