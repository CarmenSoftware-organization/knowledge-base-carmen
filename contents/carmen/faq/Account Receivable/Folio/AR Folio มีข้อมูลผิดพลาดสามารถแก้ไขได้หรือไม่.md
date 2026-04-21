---
title: AR Folio มีข้อมูลผิดพลาดสามารถแก้ไขได้หรือไม่
description: 
published: true
date: 2026-04-21T03:08:27Z
tags: carmen,faq,documentation
editor: markdown
dateCreated: 2026-04-21T03:08:27Z
faq_module: Account Receivable
faq_submodule: Folio
faq_category: General
---
# AR Folio มีข้อมูลผิดพลาดสามารถแก้ไขได้หรือไม่

## Title
AR Folio มีข้อมูลผิดพลาดสามารถแก้ไขได้หรือไม่?

## Sample case
ตรวจสอบข้อมูล interface แล้วพบว่าข้อมูลจาก PMS ไม่ถูกต้อง

## Cause of problems
มีการบันทึกข้อมูลจาก PMS ไม่ถูกต้อง

Solutions : สามารถ void ได้อย่างเดียว ไม่สามารถแก้ไขได้ เนื่องจากข้อมูลใน Folio จะเป็นการส่งข้อมูลจากระบบ PMS จึงไม่สามารถแก้ไขได้ ขั้นตอนการ void สามารถทำได้ดังนี้

1. Folio ที่ยังไม่ถูกดึงไปทำ Invoice สามารถยกเลิก \(Void\) ได้

- เมื่อเข้าไปที่ folio แล้ว ให้ทำการค้นหา folio ที่ต้องการ
- ให้สังเกต ที่ icon ใน column แรก หากเป็นรูป ถังขยะ แปลว่าสามารถ void ได้ เนื่องจากยังไม่ได้นำไปสร้าง invoice

![](_images/account-receivable-folio-ar-folio/img-001.png)

- เมื่อ void แล้ว folio จะแสดง status เป็น Void

![](_images/account-receivable-folio-ar-folio/img-002.png)

1. Folio ที่ดึงไปทำ invoice แล้ว ต้องทำการยกเลิกใบแจ้งหนี้ก่อนและทำการยกเลิกรายการ Folio ที่ไม่ต้องการอีกครั้ง หลังจากนั้นต้องทำใบแจ้งหนี้ใหม่แบบ Manual ที่ถูกต้อง สามารถศึกษาข้อมูลเพิ่มเติมจากคู่มือการทำ AR invoice

![](_images/account-receivable-folio-ar-folio/img-003.png)

https://docscarmencloud.vercel.app/carmen\_cloud/ar/AR-invoice.html

## Tags

Carmen
