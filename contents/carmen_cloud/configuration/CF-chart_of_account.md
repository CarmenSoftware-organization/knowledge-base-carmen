---
title: Chart Of Accounts
description: Chart Of Accounts
published: true
date: 2026-02-23T04:53:24.510Z
tags: carmen_cloud,documentation
editor: markdown
dateCreated: 2026-02-02T06:54:28.498Z
---

---
title: "Chart of Account"
weight: 13
---


## การสร้างรหัสบัญชี (Account Code) ในระบบ

1. กดปุ่ม Configuration > Chart of Account

2. กดปุ่ม <img src="/public/add_icon.png" style="display: inline-block;" /> ระบบจะแสดงหน้าต่าง Chart of Account ให้กำหนดค่าดังต่อไปนี้

<img src="./image-36.png"  />

3. ขั้นตอนการบันทึกข้อมูลผังบัญชี โดยมีรายละเอียดดังนี้

> **หมายเหตุ** เครื่องหมาย <span class="asterisk">\*</span>
> (สัญลักษณ์ \* ช่องที่จำเป็นต้องระบุ)
{.is-warning}


- <span class="asterisk">\*</span> กำหนดรหัสบัญชี
- Status > กำหนด สถานะของ Account Code
  - Active > เปิดใช้งาน
  - In-active > ปิดไม่ให้ใช้งาน
- <span class="asterisk">\*</span> Description > ระบุคำอธิบายภาษาอังกฤษ
- <span class="asterisk">\*</span> Description (Local) > ระบุคำอธิบายภาษาไทย
- <span class="asterisk">\*</span> Nature > กำหนดลักษณะตามผังบัญชี 5 ประเภท (เมื่อมีการนำ Account Code ไปใช้ในการบันทึกบัญชีแล้ว จะไม่สามารถแก้ไข หรือเปลี่ยน Acc. Nature ได้)
  - หมวด 1 สินทรัพย์ Dr.
  - หมวด 2 หนี้สิน Cr
  - หมวด 3 ทุน Cr.
  - หมวด 4 รายได้ Cr.
  - หมวด 5 ค่าใช้จ่าย Dr.
- <span class="asterisk">\*</span>Type > กำหนดประเภทของรหัสบัญชีในระบบมี 4 ประเภท คือ
  - Header > หมวดบัญชีคุม ไม่ถูกนำคำนวณในการบันทึกบัญชี
  - Balance Sheet > รหัสบัญชีที่สัมพันธ์กับงบดุล
  - Income Statement > รหัสบัญชีที่สัมพันธ์กับงบกำไรขาดทุน
    เมื่อทำขั้นตอน Year End ระบบจะกลับบัญชีในหมวดรายได้และค่าใช้ให้เป็น 0 และบันทึกกำไรขาดทุนตอนสิ้นปีให้อัตโนมัติ
  - Statistic > รหัสบัญชีที่ใช้ในการบันทึกข้อมูลทางสถิติ
- <span class="asterisk">\*</span>Available In Module > กำหนด Module ที่สามารถใช้รหัสบัญชีนี้ได้โดยการติ๊กเครื่องหมายถูกหน้า Module เพื่อป้องกันการบันทึกรหัสบัญชีใน Module ที่ไม่ต้องการ

  - Account Payable
  - Account Receivable
  - General Ledger
  - Asset Management

4. กด **<span class="btn">SAVE</span>** เพื่อบันทึกข้อมูล หรือกด Cancel เพื่อยกเลิก

<p align="center">
    <img src="./image-37.png"  />
</p>

5. กด **<span class="btn">OK</span>** เพื่อเสร็จสิ้นการบันทึกข้อมูล

<p align="center">
    <img src="./image-18.png"  />
</p>

## การแก้ไขรหัสบัญชี Account Code

1. กดปุ่ม Chart of Account

2. Click ที่ปุ่ม <img src="./visibility.png" style="display: inline-block;" /> Account Code ที่ต้องการแก้ไข

<img src="./image-38.png"  />

3. กดปุ่ม จะสามารถแก้ไขได้ 2 ส่วน ได้แก่

- Description, Description (Local)
- Available In Module

---

4. กด **<span class="btn">SAVE</span>** เพื่อบันทึกข้อมูล

<p align="center">
    <img src="./image-39.png"  />
</p>

5. กด **<span class="btn">OK</span>** เพื่อเสร็จสิ้นการบันทึกข้อมูล

<p align="center">
    <img src="./image-18.png"  />
</p>

## การลบรหัสบัญชี Account Code

1. กดปุ่ม Chart of Account

2. Click ที่ปุ่ม <img src="./visibility.png" style="display: inline-block;" /> Account Code ที่ต้องการลบ

3. กดปุ่ม <img src="/public/del_icon.png" style="display: inline-block;" />

4. ระบบจะขึ้นหน้าต่างให้ยืนยันการลบ

- กด YES เพื่อ ยืนยัน
- หรือ No เพื่อยกเลิก

<p align="center">
    <img src="./image-23.png"  />
</p>

6. เมื่อเรียบร้อยแล้วจะมีหน้าต่างแสดงข้อความ Success

<p align="center">
    <img src="./image-18.png"  />
</p>

> **หมายเหตุ** : Account Code ที่มีการใช้งานแล้ว จะไม่สามารถลบได้ แนะนำให้แก้ไข Status เป็น In-Active แทน
{.is-warning}


## การใช้งานปุ่มอื่น ๆ บนหน้าจอ

1. กดปุ่ม <img src="/public/search_icon.svg" style="display: inline-block;" /> เพื่อค้นหา Currency
2. กดปุ่ม <img src="/public/cloud_download_icon.svg" style="display: inline-block;" /> เพื่อ Export ข้อมูลอัตราแลกเปลี่ยนออกจากระบบเป็น .csv

3. กดปุ่ม <img src="/public/print_icon.svg" style="display: inline-block;" /> เพื่อพิมพ์ข้อมูลอัตราแลกเปลี่ยน
