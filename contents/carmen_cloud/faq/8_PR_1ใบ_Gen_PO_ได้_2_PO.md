---
title: 8.PR 1ใบ Gen PO ได้ 2 PO
description: 
published: true
date: 2026-03-25T02:52:28.729Z
tags: 
editor: markdown
dateCreated: 2026-03-25T02:52:26.551Z
---

---
title: 8.PR 1ใบ Gen PO ได้ 2 PO
published: true
tags: carmen_cloud,faq,documentation
editor: markdown
---

# PR 1ใบ Gen PO ได้ 2 PO

PR 1ใบ มี 1 vendor ทำไมระบบสร้าง PO 2 ใบ  
ตัวอย่าง PR25080007 Gen แล้วได้PO 2ใบ คือ PO25080001และ PO25080002  

![img-001.png](/contents/carmen_cloud/faq/_images/one-pr-two-purchase-orders/img-001.png)

สาเหตุเกิดจาก มี Delivery on 2 วัน คือ 20/08/2025 และ 21/08/2025 ทำให้ระบบแยกเป็น2PO  
ระบบจับจาก Vendor และ Delivery on   

![img-002.png](/contents/carmen_cloud/faq/_images/one-pr-two-purchase-orders/img-002.png)

## วิธีแก้ไข
ไม่สามารถรวมเป็น1POได้เนื่องจากระบบจับจาก Vendor และ Delivery on หากต้องการรวมต้องทำPRใบใหม่ และ แก้ไข Delivery on ให้เป็นวันที่เดียวกัน

สำหรับ PO ที่ออกไปแล้ว ให้ทำการ Close PO
