---
title: ตรวจสอบ Receiving ที่ยังไม่ committed ได้อย่างไร
description: 
published: true
date: 2026-04-15T20:37:14Z
tags: blueledgers,faq,documentation
editor: markdown
dateCreated: 2026-04-15T20:37:14Z
faq_module: Procurement
faq_submodule: Receiving
faq_category: General
---

# ตรวจสอบ Receiving ที่ยังไม่ committed ได้อย่างไร

## Sample case

ต้องการปิด Period แต่อยากทราบเอกสาร Receiving ในระบบที่ยังไม่ committed

## Cause of problems

Solution: ตรวจสอบได้ 3 วิธี ดังนี้  
1\. ตรวจสอบที่หัวข้อ Period End  
วิธีตรจสอบและแก้ไข  
\- ตรวจสอบที่หัวข้อ Period End\(แสดงเฉพาะเอกสาร Receiving ภายใน Period นั้น ๆ\)  
ไปที่ 1\.Material>2\.Procedure>3\.Period End  
![](_images/procurement-receiving-7-ตรวจสอบ-receiving-ทยงไม-committed-ไดอยางไร/img-001.png)  
ระบบจะแสดงรายการ Receiving ที่ยังเป็น Status Received ภายใต้ Period ปัจจุบันของระบบ  
![](_images/procurement-receiving-7-ตรวจสอบ-receiving-ทยงไม-committed-ไดอยางไร/img-002.png)  
  
  
  
  
  
  
  
  
2\.Report Receiving Detail  
เลือก ข้อมูลที่ต้องการตรวจสอบ และเลือก Status ของ Receiving เป็น Received เพื่อดูรายการที่ยังไม่ได้มี   
![](_images/procurement-receiving-7-ตรวจสอบ-receiving-ทยงไม-committed-ไดอยางไร/img-003.png)  
  
  
  
  
  
  
  
กด View  ระบบจะแสดงข้อมูลเอกสารที่มี Status ของ Receiving เป็น Received มาแสดงตามรูปภาพด้านล่าง  
![](_images/procurement-receiving-7-ตรวจสอบ-receiving-ทยงไม-committed-ไดอยางไร/img-004.png)  
  
  
  
  
  
  
  
3\.ค้นหาจาก status บนหน้าจอ Receiving list  
พิมพ์คำว่า “Received” ลงในช่องค้นหา จะปรากฏ Status ของเอกสาร Receiving ที่ยังไม่เป็น Status Committed  
![](_images/procurement-receiving-7-ตรวจสอบ-receiving-ทยงไม-committed-ไดอยางไร/img-005.png)  
4\. ที่ View เลือกหัวข้อ Receiving not Committed![](_images/procurement-receiving-7-ตรวจสอบ-receiving-ทยงไม-committed-ไดอยางไร/img-006.png)

## Tags

Procurement
