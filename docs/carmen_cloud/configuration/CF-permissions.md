---
title: Permissions
lang: th-TH
---

# Permissions

ขั้นตอนการกำหนด User Permission ในระบบ
Function นี้ใช้กำหนด Permission เข้าใช้งานระบบ
รายละเอียดฟังก์ชันและสิทธิการใช้งานในระบบ
เมนูฟังก์ชันหลัก ๆ ในระบบจะแบ่งเป็น 2 ส่วน คือ

1.1. ส่วนของ Module ได้แก่

- Account Payable
- General Ledgers,
- Asset Management
- Account Receivable

  1.2. ส่วนของ Configuration และ Setting ได้แก่

- Administrator
- Setting

![alt text](image-10.png)

## สิทธิการใช้งานในระบบจะมีดังต่อไปนี้

- View > สิทธิในการดูข้อมูล
- Add > สิทธิในการเพิ่มข้อมูล
- Update > สิทธิในการแก้ไข หรือ อัพเดตข้อมูล
- Delete > สิทธิในการลบข้อมูล

## ขั้นตอนการกำหนดสิทธิให้กับผู้ใช้งาน (Assign Permission)

![alt text](image-11.png)

1. Click เมนู Configuration

2. เลือกที่ Permissions จะแสดงหน้าต่าง

3. ไปที่ช่อง User เลือก User ที่จะกำหนดสิทธิ

4. เลือก BU ที่จะกำหนดสิทธิให้กับ User

5. กด <img src="/public/edit_icon.png" style="display: inline-block;" />

6. กำหนดสิทธิการใช้งานในแต่ละฟังก์ชัน วิธีการดังต่อไปสี้

6.1. Click ที่ปุ่มลูกศร <img src="./image-12.png" style="display: inline-block;" /> หน้าฟังก์ชันหลักเพื่อขยายดูฟังก์ชันย่อยในแต่ละส่วน

![alt text](image-13.png)

6.2. ไปที่ฟังก์ชันฟังย่อย ที่ต้องการการกำหนดสิทธิ

6.3. ติ๊กเครื่องหมายถูก <img src="./checkbox☑️.png" style="display: inline-block;" /> คอลัมน์ที่ให้สิทธิแก่ User ในการเข้าถึง ดังต่อไปนี้

<img src="./checkbox☑️.png" style="display: inline-block;" /> View ให้สิทธิในการดูข้อมูล

<img src="./checkbox☑️.png" style="display: inline-block;" /> Add ให้สิทธิในการเพิ่มข้อมูล

<img src="./checkbox☑️.png" style="display: inline-block;" /> Update ให้สิทธิในการแก้ไข หรือ อัพเดตข้อมูล

<img src="./checkbox☑️.png" style="display: inline-block;" /> Delete ให้สิทธิในการลบข้อมูล หรือ ยกเลิก (Void)

![alt text](image-14.png)

7. เมื่อกำหนดสิทธิเรียบร้อยแล้วให้กดปุ่ม **<span class="btn">SAVE</span>** เพื่อบันทึกข้อมูล

8. เมื่อระบบทำการบันทึกข้อมูลเรียบร้อยแล้วจะแสดงหน้าต่างแสดงข้อความ “Success” กด **<span class="btn">OK</span>** เพื่อจบการทำงาน

<p align="center">
    <img src="./image-15.png"  />
</p>

**หมายเหตุ** : กรณีที่ User สามารถเข้าได้มากกว่า 1 BU ให้ดำเนินการ ตามข้อ 3-8 จนครบ
