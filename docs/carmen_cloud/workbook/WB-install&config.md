---
title: Carmen Add-in
lang: th-TH
---

# Carmen Add-in

Carmen Add-In ใช้สำหรับการส่งและรับข้อมูลจากระบบผ่าน Excel โดยมีความสามารถเบื้องต้นดังนี้

- เรียกรายงานต่าง ๆ ผ่าน Excel เช่น Financial Statement (งบการเงิน) เช่น Balance Sheet, P&L, Daily Revenue, Trial Balance, AP Aging, AR Aging, Account Detail

- Upload Transaction เข้าระบบ เช่น JV และ Budget ด้วย Carmen Workbook



## ความต้องการพื้นฐานของเครื่อง Client (System requirement)

- ระบบ Windows ต้องเป็น Windows 8 หรือใหม่กว่า

- MS-Office version 2016 หรือใหม่กว่า

ขั้นตอนการติดตั้ง Installation

ขั้นตอนการติดตั้ง API สำหรับ Carmen Add In 


## การติดตั้ง Carmen Add in

1.1 Download Excel Add-In จาก URL ของลูกค้าตามด้วย /carmen.api

https://xxxxx.carmen.blue/carmen.api

1.2 Download Excel Add-In x32 หรือ x64 (32/64 Bit ขึ้นอยู่กับ Windows ของลูกค้า)

![alt text](image-1.png)

1.3 Double Click ไฟล์ที่ download มา <img src="./image-2.png" style="display: inline-block;" />
กด Install และดำเนินตามขั้นตอนจนเสร็จสิ้น

![alt text](image-3.png)

## การติดตั้ง Application Configuration

2.1 Download Application Configuration จาก URL ของลูกค้าตามด้วย /carmen.api
https://xxxxx.carmen.blue/carmen.api

2.2 Download Application Configuration x32 หรือ x64 (32/64 Bit ขึ้นอยู่กับ Windows ของลูกค้า)

![alt text](image-1.png)

2.3 Double Click ไฟล์ที่ download <img src="./image-5.png" style="display: inline-block;" />

2.4 กด Run เพื่อเริ่มติดตั้งจนแล้วเสร็จ

![alt text](image-6.png)

## การตั้งค่า Security ของ Excel

3.1 เปิดโปรแกรม Excel > File > Options

![alt text](image-7.png)

3.2 Click ที่ Trust Center > Trust Center Settings

![alt text](image-8.png)

3.3 ตั้งค่า Macro

- Macro Settings > Enable VBA macros
- ติ๊กถูก Enable Excel 4.0 macros when VBA macros are enabled
- กด OK เพื่อเสร็จสิ้นการตั้งค่า Macro

![alt text](image-9.png)

3.4 กด OK เพื่อเสร็จสิ้นการตั้งค่า Trust Center ของข้อ 3.2

## การตั้งค่า Add-In ใน Excel

4.1 เพิ่ม Carmen Add-In โดยไปที่ Excel > File > Options > Add-Ins

4.2 Manage Excel Add – ins กด Go

![alt text](image-10.png)

4.3 ติ๊กถูก Carmen Excel Add-In และกด OK เพื่อเสร็จสิ้นการตั้งค่า

![alt text](image-11.png)

## การตั้งค่าไฟล์ Excel ที่ใช้กับ Carmen Add-In

5.1 Click ขวาที่ไฟล์ Excel > Properties

5.2 ติ๊กถูก Unblock

5.3 กด Apply

5.4 กด OK เพื่อเสร็จสิ้น

![alt text](image-12.png)

## การตั้งค่า Carmen Add-In เพื่อเชื่อมต่อข้อมูลลูกค้า

6.1 เปิดไฟล์ Excel และ click ที่ Tab “Carmen Add-In”
หลังจาก Install Excel Add-In x64 จะมีเมนู Carmen Add-In ปรากฏขึ้นบน Excel

![alt text](image-13.png)

6.2 Click “Config WebAPI” เพื่อเชื่อมต่อข้อมูลลูกค้า

![alt text](image-14.png)

6.3 เชื่อมต่อข้อมูลของลูกค้า (เพื่อความปลอดภัย ขอให้ติดต่อ support เพื่อสอบถามรายละเอียดเพิ่มเติม)

![alt text](image-15.png)

6.4 ทดสอบ Connection โดยการกด Login

![alt text](image-16.png)

6.5 กรอก username และ password ที่ใช้เข้าระบบ Carmen

6.6 กด Login เพื่อเริ่มใช้งาน Carmen Add-In

![alt text](image-17.png)

## การตรวจสอบชื่อ Business Unit (BU)

7.1 กด Recalculate All Sheets เพื่อ update ข้อมูล

![alt text](image-18.png)

7.2 เมื่อเปิด sheet ชื่อ Parameters จะแสดงรายชื่อ BU ที่สามารถใช้งานได้ (ขึ้นอยู่กับ user permission ว่าสามารถเข้าถึง BU ใดบ้าง)

![alt text](image-19.png)

## การกำหนด Business Unit (BU) เพื่อเริ่มใช้งาน

ในการ upload ข้อมูลเข้าระบบจะต้องมีการกำหนด BU ก่อนใช้งาน

8.1 เปิด sheet ชื่อ “Intro” เพื่อกำหนดชื่อ BU (ดูชื่อ BU ได้จาก sheet ชื่อ Parameters)

8.2 กด Refresh เพื่อ update ข้อมูล

<p align="center">
    <img src="./image-20.png" />
</p>

<p style="margin: 0;">Video ประกอบ</p>
<h3 style="margin: 0;">Setup | การตั้งค่าก่อนเริ่มใช้งาน</h3>

<iframe width="560" height="315" src="https://www.youtube.com/embed/Y42UT8szy-M?si=8PvPXm1nOeV5OAWk" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

<iframe width="560" height="315" src="https://www.youtube.com/embed/y9eoJuLLfi8?si=LykxwKbysZNzGMmF" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
