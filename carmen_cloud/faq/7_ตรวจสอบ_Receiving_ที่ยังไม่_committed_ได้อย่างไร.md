---
title: 7. ตรวจสอบ Receiving ที่ยังไม่ committed ได้อย่างไร
description: 
published: true
date: 2026-03-24T18:47:24.758Z
tags: 
editor: markdown
dateCreated: 2026-03-24T18:47:22.598Z
---

---
title: 7. ตรวจสอบ Receiving ที่ยังไม่ committed ได้อย่างไร
published: true
tags: carmen_cloud,faq,documentation
editor: markdown
---

# ตรวจสอบ Receiving ที่ยังไม่ committed ได้อย่างไร

## ตัวอย่างเคส
ต้องการปิด Period แต่อยากทราบเอกสาร Receiving ในระบบที่ยังไม่ committed
## สาเหตุ
## วิธีแก้ไข
ตรวจสอบได้ 3 วิธี ดังนี้
1. ตรวจสอบที่หัวข้อ Period End  
วิธีตรจสอบและแก้ไข  
- ตรวจสอบที่หัวข้อ Period End(แสดงเฉพาะเอกสาร Receiving ภายใน Period นั้น ๆ)  
ไปที่ 1.Material>2.Procedure>3.Period End 

![img-001.png](/carmen_cloud/faq/_images/check-uncommitted-receiving/img-001.png)
ระบบจะแสดงรายการ Receiving ที่ยังเป็น Status Received ภายใต้ Period ปัจจุบันของระบบ  

![img-002.png](/carmen_cloud/faq/_images/check-uncommitted-receiving/img-002.png)

2.Report Receiving Detail  
เลือก ข้อมูลที่ต้องการตรวจสอบ และเลือก Status ของ Receiving เป็น Received เพื่อดูรายการที่ยังไม่ได้มี   

![img-003.png](/carmen_cloud/faq/_images/check-uncommitted-receiving/img-003.png)

กด View  ระบบจะแสดงข้อมูลเอกสารที่มี Status ของ Receiving เป็น Received มาแสดงตามรูปภาพด้านล่าง  

![img-004.png](/carmen_cloud/faq/_images/check-uncommitted-receiving/img-004.png)

3.ค้นหาจาก status บนหน้าจอ Receiving list  
พิมพ์คำว่า “Received” ลงในช่องค้นหา จะปรากฏ Status ของเอกสาร Receiving ที่ยังไม่เป็น Status Committed  

![img-005.png](/carmen_cloud/faq/_images/check-uncommitted-receiving/img-005.png)
4. ที่ View เลือกหัวข้อ Receiving not Committed

![img-006.png](/carmen_cloud/faq/_images/check-uncommitted-receiving/img-006.png)

**Tag:** Procurement
