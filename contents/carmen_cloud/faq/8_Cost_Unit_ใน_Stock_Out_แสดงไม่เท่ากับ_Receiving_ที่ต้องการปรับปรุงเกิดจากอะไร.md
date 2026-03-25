---
title: 8.Cost_Unit ใน Stock Out แสดงไม่เท่ากับ Receiving ที่ต้องการปรับปรุงเกิดจากอะไร
description: 
published: true
date: 2026-03-25T02:45:41.688Z
tags: 
editor: markdown
dateCreated: 2026-03-25T02:45:41.688Z
---

---
title: 8.Cost_Unit ใน Stock Out แสดงไม่เท่ากับ Receiving ที่ต้องการปรับปรุงเกิดจากอะไร
published: true
tags: carmen_cloud,faq,documentation
editor: markdown
---

# Cost/Unit ใน Stock Out แสดงไม่เท่ากับ Receiving ที่ต้องการปรับปรุงเกิดจากอะไร
## ตัวอย่างเคส
ต้องการทำStock Out รายการ 10010004  Store 1FB05 ด้วยCost 40 ตามเอกสาร RC25080003
## สาเหตุ
วิธีการคำนวณ Cost ของระบบ

![img-001.png](/contents/carmen_cloud/faq/_images/stock-out-cost-unit-not-match-receiving/img-001.png)

![img-002.png](/contents/carmen_cloud/faq/_images/stock-out-cost-unit-not-match-receiving/img-002.png)
## วิธีแก้ไข
ไม่สามารถแก้ไขให้ Stock Out ออกตาม Cost/Unit ของเอกสาร RC ได้เนื่องจาก Cost/Unit จะคำนวณตามวิธีการคำนวณ Cost ที่ตั้งค่าเอาไว้
1.วิธีการคำนวณ Cost แบบ Average  
2.วิธีการคำนวณ Cost แบบ Fifo
