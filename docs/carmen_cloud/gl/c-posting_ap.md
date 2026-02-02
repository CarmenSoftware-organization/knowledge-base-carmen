---
title: Posting Account Payable to GL
lang: th-TH
---

# Posting Account Payable to GL

การดึงข้อมูล AP Invoice และ AP Payment จากระบบ Account Payable มาลงบันทึกเป็นสมุดบัญชีรายวันซื้อ และสมุดบัญชีรายวันจ่ายในระบบบัญชีแยกประเภท โดยมีขั้นตอนดังต่อไปนี้

## การ Post ข้อมูล AP Invoice และ Payment เข้า GL

1. Click เข้าสู่ General Ledger Module

2. เลือกฟังก์ชัน Procedure

3. ไปที่ Posting from Account Payable กำหนดวันที่ที่ต้องการดึงข้อมูลได้จากช่อง From – To

4. กด **<span class="btn">POST</span>** เพื่อให้ระบบดึงข้อมูลมาบันทึกบัญชีใน GL

![alt text](image-67.png)

5. เมื่อระบบทำการดึงข้อมูลเรียบร้อยแล้วระบบจะหน้าต่างแสดงข้อความ Post A/P Success และจำนวน JV ที่ถูกโพสเข้าไปในระบบ ตัวอย่างตามภาพด้านล่าง

<p align="center">
    <img src="./image-68.png"  />
</p>

6. การตรวจสอบข้อมูลหลังจากทำการ Posting from Account Payable

6.1 Click General Ledger Module

6.2 Click Journal Voucher

![alt text](image-69.png)

ตัวอย่างการบันทึกบัญชีใน A/P Invoice

![alt text](image-70.png)

รายละเอียดคำอธิบายของข้อมูลจาก Invoice (Journal Voucher Detail)

คำอธิบายเพิ่มเติมในส่วนของ Journal Detail Comment ของ Invoice

S = Sequence S:74 คือ invoice sequence เลขที่ 74

V = Vendor Code V: A004 คือ รหัสร้านค้า ตามด้วยชื่อร้านค้า AMATI INVOCATION CO., LTD (HEAD OFFICE)

I = Invoice No. I: IV2408001 คือเลขที่ใบแจ้งหนี้

D = Details D: รายละเอียดสินค้า LG Android TV 55”

![alt text](image-71.png)

## ตัวอย่างการบันทึกบัญชีใน A/P Payment

![alt text](image-72.png)

รายละเอียดคำอธิบายของข้อมูลจาก Payment (Journal Voucher Detail)

คำอธิบายเพิ่มเติมในส่วนของ Journal Detail Comment ของ Payment

Pay = Payment Sequence Pay:190 คือ payment sequence เลขที่ 190

V = Vendor Code V: A004 คือ รหัสร้านค้า ตามด้วยชื่อร้านค้า AMATI INVOCATION CO., LTD (HEAD OFFICE)

Chq = Invoice No. Chq: 2408001 คือ เช็คเลขที่ 240801

D = Payment Description D: คือ description ของ Payment

<p align="center">
    <img src="./image-73.png" />
</p>

<p style="margin: 0;">Video ประกอบ</p>
<h3 style="margin: 0;">Posting from Other Modules | การบันทึกรายการบัญชีจากส่วนงานอื่น ๆ</h3>

<iframe width="560" height="315" src="https://www.youtube.com/embed/Cs2i3cUqduM?si=aCVRFuxzd0jPKj8r" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

<iframe width="560" height="315" src="https://www.youtube.com/embed/_0at6R984hI?si=RNv2DTqUIAsYy4re" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>