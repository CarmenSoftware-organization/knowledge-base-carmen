---
title: 7.เรียกดูReport Inventory Balance แล้วไม่พบStore
description: 
published: true
date: 2026-03-24T20:04:36.664Z
tags: 
editor: markdown
dateCreated: 2026-03-24T20:04:34.482Z
---

---
title: 7.เรียกดูReport Inventory Balance แล้วไม่พบStore ที่ต้องการจะดู
published: true
tags: carmen_cloud,faq,documentation
editor: markdown
---

# เรียกดูReport Inventory Balance แล้วไม่พบStore ที่ต้องการจะดู

เรียกดูReport Inventory แล้วไม่พบStore ที่ต้องการเกิดจากอะไร  
ตัวอย่าง เรียกดูReport Inventory Balance จะดูสินค้าของ Store 2AG03 แต่ไม่พบStoreให้เลือก  

![img-001.png](/carmen_cloud/faq/_images/inventory-balance-report-missing-store-v7/img-001.png)

สาเหตุ:เกิดจากStore นั้นเป็น Store Default Zero	เป็นสโตร์ค่าใช้จ่าย ไม่ถูกบันทึกเป็นInventory ระบบจึงไม่นำมาบันทึกข้อมูล  
หากเป็นการ Receiving เข้าStore ค่าใช้จ่ายให้เรียกดูReport Receiving Detail เพื่อดูข้อมูลการทำรับ  

**Tag:** Procurement
