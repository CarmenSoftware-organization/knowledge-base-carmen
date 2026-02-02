---
title: Allocation Voucher
lang: th-TH
---

# Allocation Voucher

Function นี้ใช้เพื่อสร้างแม่แบบเอกสารเพื่อปันส่วนค่าใช้จ่าย ให้แต่ละแผนกโดยอัตโนมัติ เช่น ค่าน้ำ ค่าไฟ ค่าอาหาร Canteen

## การสร้าง Allocation Voucher

1.1. Click เข้าสู่ General Ledger Module

1.2. Click เลือก Allocation Voucher

1.3. กดปุ่ม <img src="/public/add_icon.png" style="display: inline-block;" />

![alt text](image-48.png)

1.4. ระบบจะแสดงหน้า Allocation Voucher ให้กำหนดค่าดังต่อไปนี้

**หมายเหตุ** เครื่องหมาย <span class="asterisk">\*</span>
(สัญลักษณ์ \* ช่องที่จำเป็นต้องระบุ)

- <span class="asterisk">\*</span> Prefix > กำหนดประเภทสมุดบัญชีที่ต้องการสร้าง Template
- Description > รายละเอียดเอกสารที่จะทำการปันส่วน
- <span class="asterisk">\*</span> Amount to Amortize > มูลค่ารวมทั้งหมดที่จะใช้ปันส่วน
- <span class="asterisk">\*</span> Allocate Unit > จำนวนสัดส่วนทั้งหมดที่จะใช้ปันส่วน

![alt text](image-49.png)

1.5. กดปุ่ม + เพื่อเพิ่มรายการที่จะใช้บันทึกบัญชี ระบบจะแสดงหน้าต่าง ดังภาพด้านล่าง ให้ระบุข้อมูลดังต่อไปนี้

**หมายเหตุ** เครื่องหมาย <span class="asterisk">\*</span>
(สัญลักษณ์ \* ช่องที่จำเป็นต้องระบุ)

- <span class="asterisk">\*</span> Department > กำหนด Department Code
- <span class="asterisk">\*</span> Account # > กำหนด Account code
- Comment คำอธิบายรายการ
- <span class="asterisk">\*</span> Currency > กำหนดสกุลเงิน
- <span class="asterisk">\*</span> Rate > กำหนดค่าเงิน
- <span class="asterisk">\*</span> Allocation Unit Debit > ระบุจำนวนที่นำมาถัวเฉลี่ยรายได้ค่าใช้จ่ายในส่วนเดบิต
- Amount Debit > มูลค่าที่ถูกถัวเฉลี่ยฝั่งเดบิต
- <span class="asterisk">\*</span> Allocation Unit Debit > ระบุจำนวนที่นำมาถัวเฉลี่ยได้รายค่าใช้จ่ายในส่วนเครดิต
- Amount Credit > มูลค่าที่ถูกถัวเฉลี่ยฝั่งเครดิต
- Base Debit > มูลค่ารวมที่คำนวณรายได้ค่าใช้จ่ายฝั่งเดบิต
- Base Credit > มูลค่ารวมที่คำนวณรายได้หรือค่าใช้จ่ายฝั่งเครดิต
- Dimension > ข้อมูลในส่วนของรายละเอียดขอมูลแยกประเภทรายได้หรือค่าใช้จ่าย

---

1.6. ระบุข้อมูลเรียบร้อยแล้ว กด **<span class="btn">OK</span>**

![alt text](image-50.png)

1.7. เมื่อเพิ่มรายการจนครบตามที่ต้องการแล้วให้กดปุ่ม **<span class="btn">SAVE</span>** เพื่อบันทึก Allocation Template

![alt text](image-51.png)

1.8. กด **<span class="btn">OK</span>** เพื่อเสร็จสิ้นขั้นตอน

<p align="center">
    <img src="./image-4.png"  />
</p>

1.9. เมนูคำสั่งอื่นที่เกี่ยวข้อง

<img src="/public/add_icon.png" style="display: inline-block;" /> สร้างเอกสารแม่แบบ

<img src="/public/edit_icon.png" style="display: inline-block;" /> แก้ไขเอกสารแม่แบบ

<img src="/public/del_icon.png" style="display: inline-block;" /> การยกเลิกเอกสารแม่แบบ

<img src="/public/copy_icon.png" style="display: inline-block;" /> คัดลอกเอกสารแม่แบบ สามารถคัดลอกได้เป็น 4 ประเภท

<p align="center">
    <img src="./image-8.png"  />
</p>

## การใช้ Allocation Voucher Template

2.1. Click เข้าสู่ General Ledger Module

2.2. Click เลือก Allocation

2.3. กดปุ่ม <img src="/public/add_icon.png" style="display: inline-block;" />

![alt text](image-52.png)

2.4. ระบบจะแสดงหน้าจอการสร้าง Journal Voucher

2.5. กดปุ่ม <img src="./template_btn.png" style="display: inline-block;" /> เพื่อนำ Allocation Voucher มาใช้

![alt text](image-53.png)

2.6. ระบบจะแสดงหน้าต่าง Select Template ให้ Click เลือก Select from allocation และกด **<span class="btn">NEXT</span>**

![alt text](image-54.png)

2.7. ระบบจะนำ Allocation Template ที่สร้างไว้มาแสดง

2.8. Click เลือก ☑️ Template ที่ต้องการนำไปบันทึกบัญชี และกด **<span class="btn">NEXT</span>**

![alt text](image-55.png)

2.9. ระบบแสดงรายละเอียดการบันทึกบัญชีของ Allocation Template ที่เลือกและสามารถแก้ไขข้อมูลได้ (สามารถเปลี่ยนแปลง Amount to be allocated และ Allocate Unit ได้ ตามตัวเลขจริงที่อาจะแตกต่างกันได้ในแต่ละเดือน)

2.10. แก้ไขเสร็จสิ้นแล้วกด **<span class="btn">FINISH</span>**

![alt text](image-56.png)

2.11. ระบบสร้าง JV ที่ได้จาก Allocation Template ให้ผู้ใช้งานตรวจสอบข้อมูล หรือเปลี่ยนแปลงแก้ไขข้อมูลได้ตามที่ต้องการแล้วทำการ **<span class="btn">SAVE</span>**

![alt text](image-57.png)

2.12. กด **<span class="btn">OK</span>** เพื่อเสร็จสิ้นขั้นตอน

<p align="center">
    <img src="./image-4.png"  />
</p>

การใช้งานปุ่มอื่น ๆ บนหน้าจอ

3.1 กดปุ่ม <img src="/public/search_icon.svg" style="display: inline-block;" /> เพื่อค้นหา Allocation Voucher

3.2 กดปุ่ม <img src="/public/cloud_download_icon.svg" style="display: inline-block;" /> เพื่อ Export ข้อมูลออกจากระบบเป็น .csv

3.3 กดปุ่ม <img src="/public/print_icon.svg" style="display: inline-block;" /> เพื่อพิมพ์ข้อมูล

<p style="margin: 0;">Video ประกอบ</p>
<h3 style="margin: 0;">Allocation Voucher | การสร้างใบสำคัญบันทึกบัญชีแบบจัดสรรปันส่วนบัญชี</h3>

<iframe width="560" height="315" src="https://www.youtube.com/embed/GUEUhmZcOBA?si=BzI3wYSYsGdhusl6" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

<iframe width="560" height="315" src="https://www.youtube.com/embed/lWH1yTFVmF0?si=wrIwB_fsRvJSBAmT" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>