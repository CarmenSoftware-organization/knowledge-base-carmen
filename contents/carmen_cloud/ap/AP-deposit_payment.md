---
title: Deposit Payment
description: Deposit Payment
published: true
date: 2026-02-23T05:02:48.621Z
tags: carmen_cloud,documentation
editor: markdown
dateCreated: 2026-02-02T06:52:45.113Z
---

---
title: "Deposit Payment"
weight: 10
---


การทำ Deposit Payment หรือจ่ายเงินมัดจำในระบบ
## การสร้าง A/P Invoice สำหรับทำ Deposit Payment

ขั้นตอนนี้ใช้สำหรับสร้าง Invoice เพื่อรองรับการทำ Deposit Payment


1. Click เข้าสู่ Account Payable Module

2. เลือกฟังก์ชัน Invoice

3. กดปุ่ม Add <img src="/public/add_icon.png" style="display: inline-block;" /> ระบบจะแสดงหน้า AP Invoice <img src="./image-113.png"  />

4. บันทึกข้อมูลตามขั้นตอนของ Invoice ตามปกติ โดยสร้าง Invoice ตามจำนวนเงิน Deposit ที่ต้องจ่าย

5. บันทึกบัญชีโดย Debit ด้วย Deposit และ Credit ด้วยเจ้าหนี้ และกด OK เพื่อเสร็จสิ้นขั้นตอน <img src="./image-114.png"  />

6. เมื่อบันทึก detail ครบแล้วให้กด **<span class="btn">SAVE</span>**

7. ระบบจะแสดง Invoice ที่เสร็จสิ้น <img src="./image-115.png"  />

## การสร้าง Payment เพื่อชำระ Deposit
สร้าง Payment โดยนำ Deposit Invoice มาชำระ

1. Click เข้าสู่ Account Payable Module

2. เลือกฟังก์ชัน Payment

3. กดปุ่ม Add <img src="/public/add_icon.png" style="display: inline-block;" /> ระบบจะแสดงหน้า AP Payment <img src="./image-116.png"  />

4. บันทึกข้อมูล Payment ตามปกติ

5. เลือก Deposit Invoice ที่สร้างขึ้น และนำมาชำระ

6. กด **<span class="btn">OK</span>** เพื่อเสร็จสิ้นขั้นตอน <img src="./image-117.png"  />

7. กด **<span class="btn">SAVE</span>** เพื่อเสร็จสิ้นการบันทึก Payment <img src="./image-118.png"  />


> 
>  หลังจากเสร็จสิ้นขั้นตอนข้างต้น จะทำให้ Deposit หรือเงินมัดจำยังคงค้างอยู่ (Debit – Deposit)
>  ต้องดำเนินการตามขั้นตอนของ Apply Deposit with Invoice เพื่อล้างยอด Deposit ที่ตั้งเอาไว้
{.is-warning}
