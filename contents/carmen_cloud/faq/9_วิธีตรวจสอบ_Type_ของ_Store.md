---
title: 9.วิธีตรวจสอบ Type ของ Store
description: 
published: true
date: 2026-03-25T05:12:02.158Z
tags: 
editor: markdown
dateCreated: 2026-03-25T05:11:59.969Z
---

---
title: 9.วิธีตรวจสอบ Type ของ Store
published: true
tags: carmen_cloud,faq,documentation
editor: markdown
---

# รายงานเกี่ยวกับ Inventory ไม่แสดง Location ที่ต้องการเกิดจากอะไร
## ตัวอย่างเคส
เรียก Report ในระบบแล้วไม่พบข้อมูล Store
ที่ Report Inventory Balance  
## สาเหตุ
เนื่องจากรายงานในส่วนของ Inventory จะแสดงเฉพาะ Store ที่มี EOP Type ประเภท Inventory เท่านั้น โดย EOP type ประเภท Inventory ประกอบด้วย
1. EOP : Enter Counted Stock	  
2. EOP :  Default System  
นั้นแสดงว่า Store ที่ไม่พบที่ Report คือ Store ประเภทค่าใช้จ่าย หรือ EOP : Default Zero  
![img-001.png](/contents/carmen_cloud/faq/_images/check-store-type/img-001.png)
## วิธีแก้ไข
ตรวจสอบว่า Store มี EOP type อะไร

- เข้าไปที่ Procurement > Configuration > Store/Location
- เลือก Store ที่ต้องการตรวจสอบ จากตัวอย่าง คือ Store IT  
- ดูในช่อง EOP จะแสดงข้อมูล Type Store ดังกล่าว  
จากตัวอย่าง Store IT คือ Store Type Default Zero   
ระบบจึงไม่แสดงข้อมูล Inventory ของ Store นี้
![img-002.png](/contents/carmen_cloud/faq/_images/check-store-type/img-002.png)

**Tag:** Procurement
