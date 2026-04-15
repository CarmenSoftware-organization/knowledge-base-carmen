---
title: การปรับปรุง on hand ให้เป็น 0 ก่อน ยกเลิกใช้งานใน location ที่ต้องการ จะต้องทำอย่างไร
description: 
published: true
date: 2026-04-15T20:37:14Z
tags: blueledgers,faq,documentation
editor: markdown
dateCreated: 2026-04-15T20:37:14Z
faq_module: Procurement
faq_submodule: Product
faq_category: General
---

# การปรับปรุง on hand ให้เป็น 0 ก่อน ยกเลิกใช้งานใน location ที่ต้องการ จะต้องทำอย่างไร

## Sample case

Product 10030002 ปรากฏ on hand ที่รายงาน Inventory Balance ที่ location 1FB05 : F&B Main Kitchen แต่ต้องการจะเยิกเลิกการใช้สินค้าใน location นี้แล้ว

## Cause of problems

สินค้าที่มีข้อมูล On hand อยู่จะยังแสดงในรายงานแม้จะยกเลิกการ assign store/location ไปแล้ว  
![](_images/procurement-product-การปรบปรง-on-hand-ใหเปน-0-กอนยกเลกใชงานใน-location-ทตองการ-จะตองทำอยางไร/img-001.png)

## Solution

1\.ทำเอกสาร Stock Out ออกให้เป็น 0 โดยตรวจสอบยอดของคงค้างด้วย Report  Inventory Balance จากตัวอย่าง คือ Qty คงค้าง 10 Kg   
![](_images/procurement-product-การปรบปรง-on-hand-ใหเปน-0-กอนยกเลกใชงานใน-location-ทตองการ-จะตองทำอยางไร/img-002.png)  
2\. ตรวจสอบรายงาน Inventory Balance ว่ายังมี Qty คงเหลืออีกหรือไม่  
จากตัวอย่างรายงานจะไม่แสดงสินค้าคงเหลือแล้ว  
![](_images/procurement-product-การปรบปรง-on-hand-ใหเปน-0-กอนยกเลกใชงานใน-location-ทตองการ-จะตองทำอยางไร/img-003.png)

## Tags

Related topics:
