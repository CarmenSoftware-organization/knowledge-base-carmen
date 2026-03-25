---
title: 8.Physical Count ไม่เจอStore ที่ต้องการนับ
description: 
published: true
date: 2026-03-25T02:50:38.562Z
tags: 
editor: markdown
dateCreated: 2026-03-25T02:50:36.396Z
---

---
title: 8.Physical Count ไม่เจอStore ที่ต้องการนับ
published: true
tags: carmen_cloud,faq,documentation
editor: markdown
---

# Physical Count ไม่แสดง Store ที่ต้องการนับ
## ตัวอย่างเคส
ต้องการ Physical Count Store “IT” แต่เมื่อกด Create แล้วไม่พบ Store ดังกล่าว

![img-001.png](/contents/carmen_cloud/faq/_images/physical-count-store-not-found/img-001.png)

## สาเหตุ
ไม่มีการเปิดสิทธิ์การมองเห็น Store ใน User หรือ Type ของStep ไม่เป็น Type Enter Counted Stock

## วิธีแก้ไข
ตรวจสอบข้อมูล2 ส่วน ดังนี้
1.ตรวจสอบว่าStore ดังกล่าวเป็น EOP Type Enter Counted Stock หรือไม่  

![img-002.png](/contents/carmen_cloud/faq/_images/physical-count-store-not-found/img-002.png)

2.ตรวจสอบสิทธิ์ในการเข้าถึง Store ของ User   
ไปที่  Options > Administrator > User ยังไม่มีการเปิดการมองเห็นให้ User ดำเนินการให้เรียบร้อย  

![img-003.png](/contents/carmen_cloud/faq/_images/physical-count-store-not-found/img-003.png)

![img-004.png](/contents/carmen_cloud/faq/_images/physical-count-store-not-found/img-004.png)

กด Create อีกครั้ง จะปรากฏ Store IT ขึ้นมาเรียบร้อย ดำเนินการ Physical Count ได้ตามปกติ  

![img-005.png](/contents/carmen_cloud/faq/_images/physical-count-store-not-found/img-005.png)
