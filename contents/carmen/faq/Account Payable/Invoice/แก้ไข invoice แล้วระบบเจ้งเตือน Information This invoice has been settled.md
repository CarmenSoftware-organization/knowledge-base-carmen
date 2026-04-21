---
title: แก้ไข invoice แล้วระบบเจ้งเตือน Information This invoice has been settled
description: 
published: true
date: 2026-04-21T03:08:27Z
tags: carmen,faq,documentation
editor: markdown
dateCreated: 2026-04-21T03:08:27Z
faq_module: Account Payable
faq_submodule: Invoice
faq_category: General
---
# แก้ไข invoice แล้วระบบเจ้งเตือน Information This invoice has been settled

## Title
เมื่อแก้ไข Inovice แล้ว ระบบแจ้งเตือน Information “This invoice has been settled, posted from other or it is within closed period. Only allowed to edit Tax Invoice. Do you want to continue?”

## Sample case
ต้องการแก้ไข Invoice ที่ทำ payment ไปแล้ว

## Cause of problems
invoice ใบนี้ทำ payment ไปแล้ว

1. เป็นการแจ้งเตือนให้ทราบว่า ใบแจ้งนี้รายการนี้ ถูกตัดจ่ายแล้ว สังเกตได้จาก ตรงคำว่า Unpaid ในกรอบสีแดง  ซึ่งมีผลทำให้จะไม่สามารถแก้ไขข้อมูลอย่างอื่นได้

![](_images/account-payable-invoice-invoice-information-this-invoice-has-been-settled/img-001.png)

![](_images/account-payable-invoice-invoice-information-this-invoice-has-been-settled/img-002.png)

1. มีการ Settle Total payment หรือมียอดแบ่งจ่ายไปแล้วบางส่วน

![](_images/account-payable-invoice-invoice-information-this-invoice-has-been-settled/img-003.png)

ยกเว้น รายการ Tax invoce   “allowed to edit Tax Invoice. Do you want to continue?” หากเรากด  Yes  ระบบจะอนุญาตให้ทำการแก้ไขเฉพาะบรรทัดข้อมูลเกี่ยวกัน Tax invoice ในกรอบสีแดง

![](_images/account-payable-invoice-invoice-information-this-invoice-has-been-settled/img-004.png)

1. มีการปิด period แล้ว จะไม่สามารถแก้ไขอะไรได้อีกต้องขอเปิด period โดยการส่งเมล์หา support : [support@carmensoftware.com](mailto:support@carmensoftware.com)

## Solution
ระบบจะเปิดให้แก้ไขข้อมูลได้บ้างส่วนเท่านั้น

## Tags

Carmen
