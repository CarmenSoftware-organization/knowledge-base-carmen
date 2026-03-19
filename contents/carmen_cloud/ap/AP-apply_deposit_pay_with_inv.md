---
title: Apply Deposit with Invoice
description: Apply Deposit with Invoice
published: true
date: 2026-02-27T02:22:31.466Z
tags: carmen_cloud,documentation
editor: markdown
dateCreated: 2026-02-02T06:52:35.758Z
---


การนำ Deposit หรือเงินมัดจำมาลดยอด Invoice เมื่อได้รับสินค้าหรือบริการแล้วจะต้องมีการนำ Deposit มาใช้เพื่อลดยอดหนี้ก่อนชำระเงิน

## การสร้าง A/P Invoice เพื่อล้าง Deposit ที่ตั้งไว้

ขั้นตอนนี้ใช้สำหรับสร้าง Invoice เพื่อล้าง Deposit และ ลดยอดหนี้ของสินค้าหรือบริการ

สร้าง A/P Invoice เพื่อล้าง Deposit และลอดยอดหนี้

   1. Click เข้าสู่ Account Payable Module

   2. เลือกฟังก์ชัน Invoice

   3. เลือก Deposit Invoice ที่ตั้งเอาไว้ก่อนหน้านี้ <img src="./image-106.png"  />

   4. กด Copy เพื่อนำข้อมูลของ Deposit มาใช้ <img src="./image-107.png"  />

   5. Invoice ที่ copy นี้เป็นเอกสารภายในเพื่อใช้ในการล้างยอด Deposit ที่ตั้งเอาไว้ และลดยอดหนี้ของสินค้าหรือบริการที่ได้รับมา

   6. ในส่วนของ Header สามารถใส่เลขที่ invoice เพื่อ running เอกสารภายใน และใส่ description เพื่อเพิ่มการอธิบาย <img src="./image-108.png"  />

   7. การบันทึกบัญชีโดย Debit ด้วย Deposit และ Credit ด้วยเจ้าหนี้ เหมือนกับ Invoice ที่ Copy มา

   8. แก้ไขจำนวนเงินให้เป็นติดลบเพื่อลดยอดบัญชี Deposit ที่ตั้งไว้ และลดยอดหนี้

   9. กด **<span class="btn">OK</span>** เพื่อเสร็จสิ้นขั้นตอน <img src="./image-110.png"  />

   10. เมื่อบันทึก detail ครบแล้วให้กด **<span class="btn">SAVE</span>**

  11. ระบบจะแสดง Invoice ที่เสร็จสิ้น

   ![alt text](image-110.png)

## การสร้าง Payment โดยนำ Deposit มาใช้

การสร้าง Payment โดยนำ Deposit มาใช้คู่กับ Invoice ของสินค้าหรือบริการที่ได้รับ

   1. Click เข้าสู่ Account Payable Module
   2. เลือกฟังก์ชัน Payment
   3. กดปุ่ม Add <img src="/public/add_icon.png" style="display: inline-block;" /> ระบบจะแสดงหน้า AP Payment <img src="./image-111.png"  />
   4. บันทึกข้อมูล Payment ตามปกติ
   5. เลือก Deposit ที่ตั้งไว้ พร้อมกันกับ Invoice จากสินค้าหรือบริการที่ได้รับมาเพื่อลดยอดเจ้าหนี้ลง จึงทำให้จำนวนเงินที่จะต้องชำระลดลง

   6. กด **<span class="btn">OK</span>** เพื่อเสร็จสิ้นขั้นตอน <img src="./image-112.png"  />

> **หมายเหตุ**
> 
> Debit Deposit ที่ตั้งเอาไว้ก่อนหน้านี้จะถูกล้างออกในขั้นตอน “การสร้าง A/P Invoice เพื่อล้าง Deposit ที่ตั้งไว้”
{.is-warning}

