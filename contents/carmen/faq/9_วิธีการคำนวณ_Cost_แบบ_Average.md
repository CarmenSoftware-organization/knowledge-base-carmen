---
title: 9.วิธีการคำนวณ Cost แบบ Average
description: 
published: true
date: 2026-03-25T05:08:59.889Z
tags: 
editor: markdown
dateCreated: 2026-03-25T05:08:57.591Z
---

---
title: 9.วิธีการคำนวณ Cost แบบ Average
published: true
tags: carmen_cloud,faq,documentation
editor: markdown
---

# วิธีการคำนวณ Cost แบบ Average
## ตัวอย่างเคส
ต้องการทราบว่า Cost/Unit ของรายการ 22020001 เป็นเท่าใด ณ เดือน 11
## สาเหตุ
## วิธีแก้ไข
เรียก Report Inventory Movement Detailed By Product
โดยให้ทำการเลือก Period ที่ต้องการ  
และเรียกทุก Store/Location   

![img-001.png](/carmen_cloud/faq/_images/average-cost-calculation/img-001.png)

วิธีคำนวณหา average cost นำเอา total amount และ total qty มาคำนวณ

(1 + 2 + 3 + 4 – 5) / (6 + 7 + 8 + 9 – 10)  
(199413.99+798785.03+0+0-0) / (77+4.50+5.10+5+7+7+420-0)  
(998199.02) / (525.6)  
Cost/Unit = 1899.16

![img-001.png](/carmen_cloud/faq/_images/average-cost-calculation/img-001.png)

