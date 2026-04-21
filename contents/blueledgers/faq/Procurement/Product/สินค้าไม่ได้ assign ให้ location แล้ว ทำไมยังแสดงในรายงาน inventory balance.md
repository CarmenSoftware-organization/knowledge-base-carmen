---
title: สินค้าไม่ได้ assign ให้ location แล้ว ทำไมยังแสดงในรายงาน inventory balance
description: 
published: true
date: 2026-04-15T20:57:43Z
tags: blueledgers,faq,documentation
editor: markdown
dateCreated: 2026-04-15T20:57:43Z
faq_module: Procurement
faq_submodule: Product
faq_category: General
---

# สินค้าไม่ได้ assign ให้ location แล้ว ทำไมยังแสดงในรายงาน inventory balance

## Sample case

Product 10030002 ปรากฏที่รายงาน Inventory Balance แม้จะมีการนำสินค้าออกจาก Store 1FB05 : F&B Main Kitchen แล้ว  
Casuse of Problems: สินค้ายังมีจำนวนคงเหลืออยู่ในระบบก่อนจะทำการนำสินค้าออกจาก Store   
![](_images/procurement-product-สนคาไมได-assign-ให-location-แลว-ทำไมยงแสดงในรายงาน-inventory-balance/img-001.png)

## Solution

ปรับปรุง stock คงเหลือของสินค้าน้้นให้เป็น 0 ก่อน ตามขั้นตอนนี้

1\.ไปที่ Product 10030002 ทำการ Assign to Store/Location Store 1FB05 : F&B Main Kitchen อีกครั้ง เพื่อให้สามารถมองเห็น Product นี้เพื่อทำ Stock Out ออกให้เป็น 0 หากไม่ทำจะมองไม่เห็นรายการเวลาทำเอกสาร Stock Out  
![](_images/procurement-product-สนคาไมได-assign-ให-location-แลว-ทำไมยงแสดงในรายงาน-inventory-balance/img-002.png)  
  
  
  
  
2\.ทำเอกสาร Stock Out ออกให้เป็น 0 โดยตรวจสอบยอดของคงค้างด้วย Report  Inventory Balance จากตัวอย่าง คือ Qty คงค้าง 10 Kg   
![](_images/procurement-product-สนคาไมได-assign-ให-location-แลว-ทำไมยงแสดงในรายงาน-inventory-balance/img-003.png)  
3\.ไปที่ Product 10030002 ทำการยกเลิกการ Assign to Store/Location Store 1FB05 : F&B Main Kitchen อีกครั้ง

4\. ตรวจสอบรายงาน Inventory Balance ว่ายังมี Qty คงเหลืออีกหรือไม่  
จากตัวอย่างรายงานจะไม่แสดงสินค้าคงเหลือแล้ว  
![](_images/procurement-product-สนคาไมได-assign-ให-location-แลว-ทำไมยงแสดงในรายงาน-inventory-balance/img-004.png)

## Tags

Related topics:
