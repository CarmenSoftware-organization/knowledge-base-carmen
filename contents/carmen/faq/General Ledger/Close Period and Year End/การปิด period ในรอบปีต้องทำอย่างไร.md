---
title: การปิด period ในรอบปีต้องทำอย่างไร
description: 
published: true
date: 2026-04-21T03:08:27Z
tags: carmen,faq,documentation
editor: markdown
dateCreated: 2026-04-21T03:08:27Z
faq_module: General Ledger
faq_submodule: Close Period and Year End
faq_category: General
---
# การปิด period ในรอบปีต้องทำอย่างไร

## Title
การปิด period ในรอบปีต้องทำอย่างไร

## Sample case
ต้องการปิดปีบัญชีแล้วให้ระบบกลับบัญชีรายได้และค่าใช้จ่ายให้โดยอัตโนมัติ

## Cause of problems

## Solution
การปิด period ทำได้ 2 แบบ คือปิดเดือน และปิดปี

การปิดเดือน จะเป็นการปิดเพื่อป้องการมิให้มูลค่าของตัวเลขที่เคยผ่านการตรวจสอบแล้วมีความเคลื่อนไหว \(ไม่สามารถแก้ไขข้อมูลได้หลังจากปิดperiod ไปแล้ว\)

การปิดปี หรือ ปิด period เดือน สุดท้าย Module GL จะเป็นการปิดปีเพื่อยกยอดรายการที่ใช้ account code type : Balance sheet ไปสู่ปีต่อไป และเป็นการปิดรายได้ และค่าใช้จ่ายเข้า กำไร \(ขาดทุน\) จะไม่มีผลต่อปริ้นรายงานต่างๆ และไม่สามารถแก้ไขข้อมูลเดิมได้ ยกเว้นจะต้องการเปิด period เพื่อทำการแก้ไข

ต้องทำการปิดในแต่ละ Module ของการใช้งาน เริ่ม Asset Module  >> AR Module>> AP Module ก่อน

1. โดยการเลือก Procedure >> Closed period

![](_images/general-ledger-close-period-and-year-end-period/img-001.png)

เป็นลักษณะเดียวกันกับการปิดเดือน จะต้องทำให้ครบทั้ง 12 เดือน  ของ  Asset Module >> AR Module>> AP Module

1. ไปที่ GL Module เพื่อทำการปิดปี

ดำเนินการเช่นเดียวกันกับการปิด period ของเดือน และ ของ Module การใช้งานอื่น

![](_images/general-ledger-close-period-and-year-end-period/img-002.png)

1. หลังจากทำการ Close period เดือน 12 แล้ว จะมีข้อมูล YE เกิดขึ้น ที่ JV Moule : Prefix : YE

![](_images/general-ledger-close-period-and-year-end-period/img-003.png)

ซึ่งข้อมูล YE นี้จะเกิดขึ้นอัตโนมัติจากการปิด period จะเป็นการคำนวณรายได้ และ ค่าใช้จ่าย ทั้งปี เพื่อหากำไร\(ขาดทุน\) รวมทั้งปี ซึ่งยอดจะต้องตรงกันกับข้อมูล Trial Balance เดือน 12

![](_images/general-ledger-close-period-and-year-end-period/img-004.png)

ลักษณะของ JVของข้อมูลในรายการ JV นั้นจะเป็นการแสดงข้อมูลรวมตามแต่ละ account code ทั้งปี ของ Type : Income  และจะสลับ Nature : Debit >> Credit เช่นตอนบันทึกบัญชี ค่าใช้จ่ายเป็น Debit ในรายการนี้จะสลับเป็น Credit แทน  จะเห็นว่าแตกต่างจาก Account code ที่ Setting ไว้

![](_images/general-ledger-close-period-and-year-end-period/img-005.png)

![](_images/general-ledger-close-period-and-year-end-period/img-006.png)

## Tags

Carmen
