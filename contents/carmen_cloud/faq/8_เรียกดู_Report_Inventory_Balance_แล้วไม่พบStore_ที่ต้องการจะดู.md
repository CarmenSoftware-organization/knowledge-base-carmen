---
title: 8.เรียกดู Report Inventory Balance แล้วไม่พบStore ที่ต้องการจะดู
description: 
published: true
date: 2026-03-24T21:07:57.706Z
tags: 
editor: markdown
dateCreated: 2026-03-24T21:07:55.599Z
---

---
title: 8.เรียกดู Report Inventory Balance แล้วไม่พบStore ที่ต้องการจะดู
published: true
tags: carmen_cloud,faq,documentation
editor: markdown
---

# เรียกดู Report Inventory Balance แล้วไม่พบ Store ที่ต้องการจะดู
## ตัวอย่างเคส
ต้องการเรียกดูStore 2AG03 แต่ไม่พบStore ดังกล่าวตามรูปภาพ
Casuse of Problems: Store เป็น Type แบบค่าใช้จ่าย Default Zero  
![img-001.png](/carmen_cloud/faq/_images/inventory-balance-report-missing-store-v8/img-001.png)

## วิธีแก้ไข
ตรวจสอบว่าStore ดังกล่าวเป็น Enter Counted Stock หรือ Default System หรือไม่
สังเกตุในช่อง EOP ว่าแสดงเป็นประเภทใด   
![img-002.png](/carmen_cloud/faq/_images/inventory-balance-report-missing-store-v8/img-002.png)
หากเป็น Default Zero ระบบจะไม่ปรากฏข้อมูลเนื่องจากเป็นStore ค่าใช้จ่ายครับ   
หากเป็นการทำ Receiving ให้ใช้Report Receiving Detail และเลือกวันที่ทำรับเพื่อดูข้อมูล   
![img-003.png](/carmen_cloud/faq/_images/inventory-balance-report-missing-store-v8/img-003.png)
