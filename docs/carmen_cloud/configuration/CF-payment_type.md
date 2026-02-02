---
title: Payment Type
lang: th-TH
---

# Payment Type

ขั้นตอนการสร้างประเภทการชำระเงิน/รับชำระเงิน (Payment Type)

Function นี้ใช้สำหรับบันทึกประเภทการชำระเงินเพื่อนำไปใช้กับ Payment ของเจ้าหนี้ Vendor และบันทึกประเภทการรับชำระเงินเพื่อนำไปใช้กับ Receipt ของลูกหนี้ AR

## การเพิ่ม Payment Type

1.1. Click เมนู Configuration

1.2. เลือก Payment type

1.3. กดปุ่ม Add <img src="/public/add_icon.png" style="display: inline-block;" /> ด้านบน ขวามือ

![alt text](image-40.png)

1.4. ระบบจะแสดงหน้าต่าง Payment Typeให้ระบุข้อมูลดังต่อไปนี้

- Code > กำหนด Payment Code
- Description > ระบุชื่อของประเภทการจ่าย/รับชำระเงิน เช่น Cash, Bank Transfer
- Available in module > กำหนด Module ที่สามารถใช้งาน Payment Code นี้
  โดยการติ๊กเครื่องหมายถูกหน้า Module ดังต่อไปนี้
  - Account Payable
  - Account Receivable

---

1.5. กดปุ่ม **<span class="btn">SAVE</span>** เพื่อบันทึกข้อมูล หรือกด Cancel เพื่อยกเลิก

<p align="center">
    <img src="./image-41.png"  />
</p>

1.6. ระบบจะแสดงหน้าต่างตามภาพด้านล่าง ให้กด **<span class="btn">OK</span>** เพื่อปิด

<p align="center">
    <img src="./image-18.png"  />
</p>

## การแก้ไขรหัส Payment Type

2.1. กดปุ่ม Payment Type

2.2. Click ที่ปุ่ม <img src="./visibility.png" style="display: inline-block;" /> หน้า Payment Code ที่ต้องการแก้ไข

![alt text](image-42.png)

2.3. กดปุ่ม จะสามารถแก้ไขได้ 2 ส่วน ได้แก่

- Description
- Available in modules

---

2.4. กด **<span class="btn">SAVE</span>** เพื่อบันทึกข้อมูล

<p align="center">
    <img src="./image-43.png"  />
</p>

2.5. กด **<span class="btn">OK</span>** เพื่อเสร็จสิ้นการบันทึกข้อมูล

<p align="center">
    <img src="./image-18.png"  />
</p>

## การลบรหัส Payment Type

3.1 กดปุ่ม Payment Type

3.2 Click ที่ปุ่ม <img src="./visibility.png" style="display: inline-block;" /> หน้า Payment Code ที่ต้องการลบ

![alt text](image-44.png)

3.3 กดปุ่ม <img src="/public/del_icon.png" style="display: inline-block;" />

<p align="center">
    <img src="./image-45.png"  />
</p>

![alt text](image-45.png)

3.4 ระบบจะขึ้นหน้าต่างให้ยืนยันการลบ

- กด YES เพื่อ ยืนยัน
- หรือ No เพื่อยกเลิก

<p align="center">
    <img src="./image-23.png"  />
</p>

3.5 เมื่อเรียบร้อยแล้วจะมีหน้าต่างแสดงข้อความ Success

<p align="center">
    <img src="./image-18.png"  />
</p>

**หมายเหตุ** : Payment Code ที่มีการใช้งานแล้ว จะไม่สามารถลบได้

4. การใช้งานปุ่มอื่น ๆ บนหน้าจอ

4.1 กดปุ่ม <img src="/public/search_icon.svg" style="display: inline-block;" /> เพื่อค้นหา Payment Code

4.2 กดปุ่ม <img src="/public/cloud_download_icon.svg" style="display: inline-block;" /> เพื่อ Export ประเภทการชำระเงินออกจากระบบเป็น .csv

4.3 กดปุ่ม <img src="/public/print_icon.svg" style="display: inline-block;" /> เพื่อพิมพ์ประเภทการชำระเงิน
