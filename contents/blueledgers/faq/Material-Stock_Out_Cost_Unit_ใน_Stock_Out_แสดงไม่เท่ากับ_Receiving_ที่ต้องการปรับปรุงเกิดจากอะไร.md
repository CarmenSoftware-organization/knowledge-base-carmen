---
title: Cost/Unit ใน Stock Out แสดงไม่เท่ากับ Receiving ที่ต้องการปรับปรุงเกิดจากอะไร
description: 
published: true
date: 2026-04-15T20:37:14Z
tags: blueledgers,faq,documentation
editor: markdown
dateCreated: 2026-04-15T20:37:14Z
faq_module: Material
faq_submodule: Stock Out
faq_category: General
---

# Cost/Unit ใน Stock Out แสดงไม่เท่ากับ Receiving ที่ต้องการปรับปรุงเกิดจากอะไร

## Sample case

ต้องการทำStock Out รายการ 10010004  Store 1FB05 ด้วยCost 40 ตามเอกสาร RC25080003

## Cause of problems

เอกสาร Stock Out จะบันทึก Cost ตามการคำนวณของระบบ ไม่สามารถกำหนดเองได้  
![](_images/material-stock-out-cost-unit-ใน-stock-out-แสดงไมเทากบ-receiving-ทตองการปรบปรงเกดจากอะไร/img-001.png)  
![](_images/material-stock-out-cost-unit-ใน-stock-out-แสดงไมเทากบ-receiving-ทตองการปรบปรงเกดจากอะไร/img-002.png)

## Solution

ไม่สามารถแก้ไขให้ Stock Out ออกตาม Cost/Unit ของเอกสาร RC ได้เนื่องจาก Cost/Unit จะคำนวณตามวิธีการคำนวณ Cost ที่ตั้งค่าเอาไว้   
1\.วิธีการคำนวณ Cost แบบ Average  
2\.วิธีการคำนวณ Cost แบบ Fifo

## Tags

Related topics:
