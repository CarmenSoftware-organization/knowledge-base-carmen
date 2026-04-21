---
title: PR 1 ใบ สร้างเอกสาร PO ได้ 2 ใบ เกิดจากอะไร
description: 
published: true
date: 2026-04-15T20:57:43Z
tags: blueledgers,faq,documentation
editor: markdown
dateCreated: 2026-04-15T20:57:43Z
faq_module: Procurement
faq_submodule: Purchase Order
faq_category: General
---

# PR 1 ใบ สร้างเอกสาร PO ได้ 2 ใบ เกิดจากอะไร

## Sample case

PR25080007 Gen แล้วได้PO 2ใบ คือ PO25080001และ PO25080002  
![](_images/procurement-purchase-order-pr-1-ใบ-สรางเอกสาร-po-ได-2-ใบ-เกดจากอะไร/img-001.png)

## Cause of problems

สินค้าใน PR มีการกำหนด Delivery date ต่างกัน คือ 20/08/2025 และ 21/08/2025 ทำให้ระบบแยกเป็น 2 PO  
ระบบสร้างเอกสาร PO จาก Vendor และ Delivery on   
![](_images/procurement-purchase-order-pr-1-ใบ-สรางเอกสาร-po-ได-2-ใบ-เกดจากอะไร/img-002.png)

## Solution

ไม่สามารถรวมเป็น 1 PO ได้เนื่องจากระบบสร้างเอกสาร PO จาก Vendor และ Delivery on หากต้องการรวมต้องทำPRใบใหม่ และ แก้ไข Delivery on ให้เป็นวันที่เดียวกัน 

สำหรับ PO ที่ออกไปแล้ว ให้ทำการ Close PO

## Tags

Related topics:
