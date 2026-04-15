---
title: Receiving รับเกินราคาจาก PO ไม่ได้ ระบบแจ้ง Warning “Price is exceed than the value of price deviation”
description: 
published: true
date: 2026-04-15T20:37:14Z
tags: blueledgers,faq,documentation
editor: markdown
dateCreated: 2026-04-15T20:37:14Z
faq_module: Procurement
faq_submodule: Receiving
faq_category: General
---

# Receiving รับเกินราคาจาก PO ไม่ได้ ระบบแจ้ง Warning “Price is exceed than the value of price deviation”

## Sample case

ต้องการทำเอกสาร Receiving เพื่อรับสินค้า 10000005 ด้วยราคามากกว่า PO คือ Price 20  
![](_images/procurement-receiving-receiving-รบเกนราคาจาก-po-ไมได-ระบบแจง-warning-price-is-exceed-than-the-value-of-price-deviation/img-001.png)

## Cause of problems

เอกสาร Receiving ทำการรับสินค้าด้วยราคาที่มากกว่า Price Deviation\(%\) ที่กำหนเอาไว้ใน Product

## Solution

กำหนด % ของ Price deviation ใน Product ให้เพียงพอต่อการรับสินค้า \(Receiving\) ตามขั้นตอนดังนี้  
1\. ไปที่ Product 10000005   ทำการแก้ไข Price Deviation\(%\) ส่วนของราคา เป็น 100% กด Save![](_images/procurement-receiving-receiving-รบเกนราคาจาก-po-ไมได-ระบบแจง-warning-price-is-exceed-than-the-value-of-price-deviation/img-002.png)  
  
2\. กลับไปที่เอกสาร Receiving ใส่ราคาที่ต้องการ กด Save ตามปกติ ![](_images/procurement-receiving-receiving-รบเกนราคาจาก-po-ไมได-ระบบแจง-warning-price-is-exceed-than-the-value-of-price-deviation/img-003.png) 

3\. ดำเนินการทำ Receiving  ได้เสร็จเรียบร้อย ![](_images/procurement-receiving-receiving-รบเกนราคาจาก-po-ไมได-ระบบแจง-warning-price-is-exceed-than-the-value-of-price-deviation/img-004.png)
