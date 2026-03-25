---
title: 9.ต้องการ clear ให้ Product on hand เป็น 0 ก่อน ยกเลิกใช้งานใน location ที่ต้องการ
description: 
published: true
date: 2026-03-25T02:54:28.479Z
tags: 
editor: markdown
dateCreated: 2026-03-25T02:54:26.315Z
---

---
title: 9.ต้องการ clear ให้ Product on hand เป็น 0 ก่อน ยกเลิกใช้งานใน location ที่ต้องการ จะต้องทำอย่างไร
published: true
tags: carmen_cloud,faq,documentation
editor: markdown
---

# ต้องการ clear ให้ Product on hand เป็น 0 ก่อน ยกเลิกใช้งานใน location ที่ต้องการ จะต้องทำอย่างไร
## ตัวอย่างเคส
Product 10030002 ปรากฏ on hand ที่รายงาน Inventory Balance ที่ location 1FB05 : F&B Main Kitchen แต่ต้องการจะเยิกเลิกการใช้สินค้าใน location นี้แล้ว
## สาเหตุ
ยังมีข้อมูล On hand ค้างอยู่

![img-001.png](/contents/carmen_cloud/faq/_images/clear-on-hand-before-disable-location/img-001.png)

## วิธีแก้ไข
1.ทำเอกสาร Stock Out ออกให้เป็น 0 โดยตรวจสอบยอดของคงค้างด้วย Report  Inventory Balance จากตัวอย่าง คือ Qty คงค้าง 10 Kg 

![img-002.png](/contents/carmen_cloud/faq/_images/clear-on-hand-before-disable-location/img-002.png)

2.นำการ Assign to Store/Location Store 1FB05 ออกจาก Product 10030002 แล้วทดลองเรียก Report  Inventory Balance ว่ายังมี Qty คงเหลืออีกหรือไม่  
จากตัวอย่างก็จะไม่พบสินค้าคงเหลือแล้ว  

![img-003.png](/contents/carmen_cloud/faq/_images/clear-on-hand-before-disable-location/img-003.png)
