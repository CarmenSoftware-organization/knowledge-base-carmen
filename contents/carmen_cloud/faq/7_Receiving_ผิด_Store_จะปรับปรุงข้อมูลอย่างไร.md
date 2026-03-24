---
title: 7.Receiving ผิด Store จะปรับปรุงข้อมูลอย่างไร
description: 
published: true
date: 2026-03-24T20:39:01.305Z
tags: 
editor: markdown
dateCreated: 2026-03-24T20:39:01.305Z
---

---
title: 7.Receiving ผิด Store จะปรับปรุงข้อมูลอย่างไร
published: true
tags: carmen_cloud,faq,documentation
editor: markdown
---

# Receiving แบบ Inventory ทำรับผิด Store จะปรับปรุงข้อมูลให้ถูกต้องได้อยางไร
## ตัวอย่างเคส
จะซื้อของเข้า Store IT แต่รับผิดเข้าไปที่ HK Housekeeping แทน เอกสาร Receiving Commit แล้ว แก้ไขได้อย่างไร
## สาเหตุ
ทำรับเข้าผิด Store

![img-001.png](/contents/carmen_cloud/faq/_images/receiving-wrong-store-correction/img-001.png)

## วิธีแก้ไข
สามารถแก้ไขได้ 2 วิธี ดังนี้
1. Store Requisition Type Transfer  
1.1.ทำการสร้างเอกสาร SR ในส่วนหัวข้อ Movement Type เลือกเป็นประเภท Transfer  
1.2.เลือก Store ที่ต้องการ  
1.3.เลือกรายการที่ต้องการ  
1.4.เลือกจำนวน Qty ของรายการ
![img-002.png](/contents/carmen_cloud/faq/_images/receiving-wrong-store-correction/img-002.png)

กด Commit เสร็จเรียบร้อย ของก็จะถูกย้ายจาก Store  Housekeeping ไปที่ Store IT เรียบร้อย  
![img-003.png](/contents/carmen_cloud/faq/_images/receiving-wrong-store-correction/img-003.png)
2.Stock in-out 

2.1.ทำ Stock Out ออกจาก Store  Housekeeping เพื่อตัดของออกให้ถูกต้อง  
![img-004.png](/contents/carmen_cloud/faq/_images/receiving-wrong-store-correction/img-004.png)
2.2.ทำ Stock IN เข้าที่ Store IT เพื่อเพิ่มของเข้าไปที่Store ที่ถูกต้อง  
![img-005.png](/contents/carmen_cloud/faq/_images/receiving-wrong-store-correction/img-005.png)
เมื่อดำเนินการเรียบร้อยแล้วของก็จะถูกตัดออกจากStore ที่รับผิดและทำการStock in เข้าในStore ที่ถูกต้อง จากตัวอย่างคือStore IT   

**Tag:** Procurement
