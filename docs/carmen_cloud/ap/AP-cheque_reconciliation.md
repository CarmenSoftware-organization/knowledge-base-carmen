---
title: Vendor
lang: th-TH
---

# Cheque Reconciliation

## การกระทบยอดเช็ค (Cheque Reconciliation) by User manually

Function นี้ คือขั้นตอนการบันทึกข้อมูลวันที่ vendor นำ Cheque ไปขึ้นเงินกับธนาคารเรียบร้อยแล้ว
การทำการกระทบยอดเช็คนั้นสามารถทำได้หลังจากที่ได้ทำการยืนยันเลขที่เช็คแล้วในหน้า Payment ข้อมูลการชำระทั้งหมดจะปรากฏบนหน้าจอนี้เพื่อทำการกระทบยอดเช็คจ่าย วิธีการดังต่อไปนี้

1. Click เข้าสู่ Account Payable Module

2. เลือกฟังก์ชัน Procedure

3. ไปที่ Cheque Reconciliation

4. การกำหนดการตั้งค่า Default Cheque date วันที่ Default Clearing Date ที่ต้องการให้ระบบแสดงให้อัตโนมัติ

5. กดเมนูคำสั่ง <img src="./image-33.png" style="display: inline-block;" />

![alt text](image-34.png)

6. ระบบจะเข้าสู่หน้า Cheque Reconciliation จะแสดงเช็คคงค้างทั้งหมด ตามตัวอย่าง จากภาพด้านล่าง

<p style="text-align: right;">สามารถเลือก payment type เพื่อ filter ข้อมูลหากมีการจ่าย Cheque จากหลาย ๆ ธนาคาร</p>

![alt text](image-35.png)

7. ติ๊กเครื่องหมายถูกที่ช่องแรก ☑️ ของเลขที่ cheque ที่จะทำ Reconcile ระบบจะระบุค่า Cheque Clearing Date ตามที่ได้เซ็ตไว้ในข้อ 4 หรือ ผู้ใช้งานสามารถเปลี่ยนแปลงได้โดยการเลือกวันที่ ที่ช่อง Cheque Clearing date ของแต่ละรายการ ตามวันที่ที่ Cheque ถูกขึ้นเงินตามที่แสดงบน Bank Statement

8. หากตรวจสอบข้อมูลถูกต้องครบแล้วให้เมนูคำสั่ง ทางด้านล่างขวามือเพื่อบันทึกรายการ

9. เมื่อระบบทำการบันทึกข้อมูลเรียบร้อยแล้วจะแสดงข้อความ Success ตามตัวอย่างภาพด้านล่าง

10. กดปุ่ม **<span class="btn">OK</span>** เพื่อปิดหน้าต่าง

<p align="center">
    <img src="./image-16.png"  />
</p>

11. สามารถตรวจสอบรายงาน ได้ที่ Account Payable Module > Report>Cheque Reconciliation

![alt text](image-36.png)
