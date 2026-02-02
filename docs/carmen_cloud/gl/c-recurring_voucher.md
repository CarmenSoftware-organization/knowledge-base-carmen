---
title: Recurring Voucher
lang: th-TH
---

# Recurring Voucher

Function นี้ใช้เพื่อสร้างแม่แบบเอกสารที่มีการบันทึกอยู่เป็นประจำ และมีรอบการบันทึกบัญชีด้วยจำนวนเงินที่เท่ากันอย่างต่อเนื่อง เพื่อช่วยลดปริมาณการบันทึกข้อมูลใน JV และลดความผิดพลาดในการเลือกรหัสบัญชีผิด

## การสร้าง Recurring Voucher

1.1. Click เข้าสู่ General Ledger Module

1.2. Click เลือก Recurring Voucher

1.3. กดปุ่ม <img src="/public/add_icon.png" style="display: inline-block;" />

![alt text](image-34.png)

1.4. ระบบจะแสดงหน้า Recurring Voucher ให้กำหนดค่าดังต่อไปนี้

**หมายเหตุ** เครื่องหมาย <span class="asterisk">\*</span>
(สัญลักษณ์ \* ช่องที่จำเป็นต้องระบุ)

- <span class="asterisk">\*</span> Prefix > กำหนดประเภทสมุดบัญชีที่ต้องการสร้าง Template
- Type > กำหนดประเภท ระบบ Default เป็น “Recurring”
- Description > กำหนดคำอธิบายที่ต้องการให้แสดงในหน้า JV
- From > กำหนด Period เริ่มต้นบันทึก JV
- To > กำหนด Period สิ้นสุดการบันทึก JV
- Recurring Every Period > กำหนดรอบของเดือน (Period) ให้ระบบสร้าง JV โดยอัตโนมัติ เช่น
  - 1 คือ สร้าง 1 JV ในทุก ๆ 1 เดือน
  - 2 คือ สร้าง 1 JV ในทุก ๆ 2 เดือน
  - 3 คือ สร้าง 1 JV ในทุก ๆ 3 เดือน (ไตรมาส)

---

1.5. กดปุ่ม + เพื่อเพิ่มรายการที่จะใช้บันทึกบัญชี

![alt text](image-35.png)

1.6. ระบบจะแสดงหน้าต่าง ดังภาพด้านล่าง ให้ระบุข้อมูลดังต่อไปนี้

**หมายเหตุ** เครื่องหมาย <span class="asterisk">\*</span>
(สัญลักษณ์ \* ช่องที่จำเป็นต้องระบุ)

- <span class="asterisk">\*</span> Department > กำหนด Department Code
- <span class="asterisk">\*</span> Account # > กำหนด Account code
- Comment > คำอธิบายรายการ
- <span class="asterisk">\*</span> Currency > กำหนด Currency Code
- <span class="asterisk">\*</span> Rate > กำหนด Currency Rate
- <span class="asterisk">\*</span> Amount Dr / Amount Cr > ใส่ยอดที่ต้องการบันทึก
- Dimension > ใส่ข้อมูล Dimension (ถ้ามี)

---

1.7. ระบุข้อมูลเรียบร้อยแล้ว กด **<span class="btn">OK</span>**

![alt text](image-36.png)

1.8. เมื่อเพิ่มรายการจนครบตามที่ต้องการแล้วให้กดปุ่ม **<span class="btn">SAVE</span>** เพื่อบันทึก Recurring

![alt text](image-37.png)

1.9. กด **<span class="btn">OK</span>** เพื่อเสร็จสิ้นขั้นตอน

<p align="center">
    <img src="./image-4.png"  />
</p>

1.10. เมนูคำสั่งอื่นที่เกี่ยวข้อง

<img src="/public/add_icon.png" style="display: inline-block;" /> สร้างเอกสารแม่แบบ

<img src="/public/edit_icon.png" style="display: inline-block;" /> แก้ไขเอกสารแม่แบบ

<img src="/public/del_icon.png" style="display: inline-block;" /> การยกเลิกเอกสารแม่แบบ

<img src="/public/print_icon.svg" style="display: inline-block;" /> พิมพ์เอกสาร

## การใช้งาน JV Template ประเภท Recurring

2.1. Click เข้าสู่ General Ledger Module

2.2. กดปุ่ม Procedure

2.3. กำหนด Period <img src="./image-38.png" style="display: inline-block;" /> ที่ต้องการในหัวข้อ Apply Recurring Template

2.4. Click **<span class="btn">APPLY</span>** เพื่อให้ระบบ Generate JV จาก Recurring Voucher ที่ได้กำหนดไว้

![alt text](image-39.png)

2.5. เมื่อระบบทำการ Apply JV เรียบร้อยแล้วจะขึ้นหน้าต่าง แสดงจำนวนสมุดบัญชีที่ถูกสร้างขึ้นในรอบบัญชีนั้น

2.6. หลังจากบันทึกข้อมูล ระบบจะแสดงหน้าต่างผลการบันทึกข้อมูล

<p align="center">
    <img src="./image-40.png"  />
</p>

## การตรวจสอบ JV ที่ถูกสร้างจากการ Apply Recurring Voucher

3.1. Click เข้าสู่ General Ledger Module

3.2. Click Journal Voucher

3.3. Journal Voucher ที่แสดง Source “FrJv”

3.4. Click สัญลักษณ์ <img src="./image-29.png" style="display: inline-block;" /> ที่ JV ที่ต้องการดูรายละเอียด

![alt text](image-41.png)

3.5. ตัวอย่างรายละเอียดของ JV ที่สร้างจากการ Apply Recurring Voucher โดยอัตโนมัติ

![alt text](image-42.png)

การใช้งานปุ่มอื่น ๆ บนหน้าจอ

4.1 กดปุ่ม <img src="/public/search_icon.svg" style="display: inline-block;" /> เพื่อค้นหา Recurring Voucher

4.2 กดปุ่ม <img src="/public/cloud_download_icon.svg" style="display: inline-block;" /> เพื่อ Export ข้อมูลออกจากระบบเป็น .csv

4.3 กดปุ่ม <img src="/public/print_icon.svg" style="display: inline-block;" /> เพื่อพิมพ์ข้อมูล

<p style="margin: 0;">Video ประกอบ</p>
<h4 style="margin: 0;">Recurring Voucher | การสร้างใบสำคัญบันทึกบัญชีแบบประจำหรือกำหนดระยะเวลา</h4>

<iframe width="560" height="315" src="https://www.youtube.com/embed/h_xGrmDp6cs?si=NzB0c9sx8-Ui3SBF" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

<iframe width="560" height="315" src="https://www.youtube.com/embed/muzkB6PTRes?si=Frbsoq_UAExEJtZ9" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>