---
title: Init Accrued Depre คืออะไร ต้องใส่เมื่อไหร่
description: 
published: true
date: 2026-04-21T03:08:27Z
tags: carmen,faq,documentation
editor: markdown
dateCreated: 2026-04-21T03:08:27Z
faq_module: Asset
faq_submodule: Asset Register
faq_category: General
---
# Init Accrued Depre คืออะไร ต้องใส่เมื่อไหร่

## Title
Init Accrued Depre คืออะไร และต้องใส่เมื่อไหร่?

## Sample case
เมื่อมีการคำนวณค่าเสื่อมราคาให้กับ asset ก่อนเริ่มใช้ระบบ carmen จึงต้องมีการบันทึกค่าเสื่อมราคาสะสมยกมาด้วย

## Cause of problems

## Solution
Init Accrued Depre คือค่าเสื่อมราคาสะสม เมื่อมีการ Register Asset ในระบบ โดยที่มีการคำนวณค่าเสื่อมและเป็นค่าเสื่อมสะสม มาก่อนจะใช้ระบบ Carmen ตามความหมายของข้อความ

- Ini. Accu. Depre. ระบุค่าเสื่อมราคาสะสมยกมา กรณีสินทรัพย์มีการคำนวณค่าเสื่อมมาแล้ว

ดังนั้นหาก Input date และ Acquire date ไม่ตรงกัน นั้นหมายถึงมีการคำนวณค่าเสื่อมมาก่อนนี้แล้ว จึงจำเป็นต้องใส่ข้อมูล Init Accrued Depre เพื่อให้ระบบ Carmen คำนวนต่อโดยการนำมูลค่า Asset หักลบด้วย Init Acc Depre จะได้ Net Book Value เพื่อคำนวนต่อได้อย่างถูกต้อง

![](_images/asset-asset-register-init-accrued-depre/img-001.png)

## Tags

Carmen
