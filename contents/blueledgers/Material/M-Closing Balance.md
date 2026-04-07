---
title: Closing Balance
lang: th-TH
---
# Closing Balance & Close Period

**Closing Balance** คือ การตรวจนับสินค้าคงเหลือเพื่อปิดระบบสินค้าคงคลัง (ใช้กับ Location ประเภท Enter Count Stock) โดยมีขั้นตอนในการทำงานดังต่อไปนี้
1.	เอา cursor ไปวางที่ “Material” และเลือก Procedure จากนั้น Click เมนู “Closing Balance”
2.	Click ปุ่ม Create เพื่อสร้างเอกสารตรวจนับ (Physical count)
![alt text](image-35.png) 

3.	“Store” ระบุ Location สำหรับตรวจนับ
4.	“Date” ระบุวันที่สำหรับการตรวจนับ
5.	“Description” ระบุสาระสำคัญหรือรายละเอียดในการตรวจนับ 
6.	“Print” Click เมนู Print เพื่อพิมพ์เอกสารตรวจนับ
7.	“Back” Click คำสั่ง Back เพื่อยกเลิก
![alt text](image-36.png)

**การบันทึกข้อมูลการนับสินค้าคงคลังเข้าสู่ระบบสามารถทำได้ 2 วิธี คือ**

•	Manual เป็นการบันทึกข้อมูลการตรวจนับผ่านหน้าจอระบบ

•	Export and Import เป็นการบันทึกข้อมูลการตรวจนับผ่าน Excel และนำ file เข้าระบบ

8.	การบันทึกข้อมูลแบบ Manual

Click “Edit” เพื่อเริ่มกรอกข้อมูลการตรวจนับ

กรอกจำนวนสินค้าคงเหลือลงในช่อง “Balance Qty”

ในกรณีที่สินค้าดังกล่าวไม่มีการนับ หรือ มีคงเหลือเท่ากับ 0 สามารถปล่อยเป็นค่าว่างเอาไว้ได้
![alt text](image-37.png)

8.1	Click เมนู “Set empty to zero” เพื่อกำหนดให้ทุกรายการสินค้าที่ Quantity เป็นค่าว่าง ให้มี “Quantity” 
เท่ากับ 0 เพื่อช่วยลดเวลาและข้อผิดพลาดจากการระบุจำนวนสินค้าที่ตรวจนับ (ในกรณีไม่มีสินค้าคงเหลือให้ระบุในช่องว่าเป็น 0 เสมอ) 

8.2	เมื่อระบุยอดตรวจนับเสร็จสิ้นแล้วให้ Click ปุ่ม “Save”
![alt text](image-38.png) 

8.3	Click ปุ่ม OK เพื่อยืนยันการบันทึกข้อมูล
 ![alt text](image-39.png)

8.4	เมื่อตรวจสอบเอกสารครบถ้วนแล้วให้ Click คำสั่ง ”Commit” เพื่ออนุมัติเอกสาร
![alt text](image-40.png)

9.	การบันทึกข้อมูลการตรวจนับผ่าน Excel และนำ file เข้าระบบ
Click “Export” เพื่อ export รายการสินค้าของ location นี้ เพื่อไปกรอกใน Excel
โดยจะได้ file เป็นนามสกุล .csv
![alt text](image-41.png)



10.	บันทึกข้อมูลตรวจนับใน Excel file ใน Column F เสร็จสิ้นแล้วให้ทำการ Save ข้อมูล โดยนามสกุลของ file จะต้องเป็น .csv
![alt text](image-42.png)
11.	Click ปุ่ม ”Import” เพื่อนำเข้าข้อมูลตรวจนับจาก Excel โดย file จะต้องมีนามสกุล .csv เท่านั้น
![alt text](image-43.png)
12.	Click ปุ่ม ”Choose File” และเลือก Excel file นำเข้าข้อมูล
13.	เลือกไฟล์แล้ว Click ปุ่ม ”Open”
14.	Click ปุ่ม ”Import” เพื่อนำเข้าข้อมูล
![alt text](image-44.png)
15.	ระบบจะแจ้งผลการนำเข้าข้อมูล ให้ Click ปุ่ม “OK”
![alt text](image-45.png)
16.	เมื่อตรวจสอบเอกสารครบถ้วนแล้วให้ Click คำสั่ง “Commit” เพื่ออนุมัติเอกสาร



