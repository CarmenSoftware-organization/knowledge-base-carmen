---
title: สร้าง PR แล้วไม่พบ Product ที่ต้องการ
description: 
published: true
date: 2026-04-15T20:57:43Z
tags: blueledgers,faq,documentation
editor: markdown
dateCreated: 2026-04-15T20:57:43Z
faq_module: Procurement
faq_submodule: Purchase Request
faq_category: General
---

# สร้าง PR แล้วไม่พบ Product ที่ต้องการ

## Sample case

ต้องการเลือก Product __10000002__   เพื่อสั่งซื้อเข้าที่ Store 1GR01 แต่เมื่อสร้าง PR แล้วไม่พบรายการสินค้า  
![](_images/procurement-purchase-request-สราง-pr-แลวไมพบ-product-ทตองการ/img-001.png)

## Cause of problems

เกิดจาก 2 ส่วน ดังนี้  
A\. Product ไม่ได้อยู่ใน Category Type ของ PR ที่สร้าง  
B\. Product ไม่ได้ถูก Assign to Store/Location

## Solution

A\. Product ไม่ได้อยู่ใน Category Type ของ PR ที่สร้าง สามารถตรวจสอบได้ดังนี้  
1\. เข้าเมนู Procurement   
2\. Configuration  
3\. Category   
![](_images/procurement-purchase-request-สราง-pr-แลวไมพบ-product-ทตองการ/img-002.png)  
1\.1\. เลือก Category >Sub Category>Item Group  
จากตัวอย่างคือ   
1\. Category \(Food\)  
2\. Sub Category \(Meat\)  
3\. Item Group \(Beef\)  
จากตัวอย่าง Product 10000002  อยู่ใน Category Type Market List หากสร้าง PR Type General ก็จะไม่พบ Product ตัวนี้  
![](_images/procurement-purchase-request-สราง-pr-แลวไมพบ-product-ทตองการ/img-003.png)  
B\. ตรวจสอบว่า Product นี้ถูก Assign to Store/Location ไว้ที่ 1GR01 แล้วหรือยัง  
1\. ไปที่เมนู Procurement  
2\. Product  
![](_images/procurement-purchase-request-สราง-pr-แลวไมพบ-product-ทตองการ/img-004.png)  
3\.คลิกเลือก Product 10000002 หรือพิมพ์ Product Code 10000002 หรือตาม Product ที่ต้องการ ในช่องค้นหา  
![](_images/procurement-purchase-request-สราง-pr-แลวไมพบ-product-ทตองการ/img-005.png)  
  
4\. ดูในช่อง Assign to Store/Location ว่า Store 1GR01หรือ Store ที่ต้องการ ถูกติ๊กเลือกไว้หรือไม่  
![](_images/procurement-purchase-request-สราง-pr-แลวไมพบ-product-ทตองการ/img-006.png)  
  
5\. หากยังไม่ได้ assign ให้ทำการ Assign to Store/Location ที่ 1GR01 หรือ Store ที่ต้องการและกด Assign และกด Save  
![](_images/procurement-purchase-request-สราง-pr-แลวไมพบ-product-ทตองการ/img-007.png)  
  
6\. กลับไปที่ PR จะปรากฏรายการ Product __10000002__  และสามารถดำเนินการทำเอกสาร PR ได้ตามปกติ   
![](_images/procurement-purchase-request-สราง-pr-แลวไมพบ-product-ทตองการ/img-008.png)

## Tags

Procurement
