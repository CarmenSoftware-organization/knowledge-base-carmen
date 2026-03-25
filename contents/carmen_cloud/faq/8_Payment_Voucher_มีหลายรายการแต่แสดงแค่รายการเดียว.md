---
title: 8.Payment Voucher มีหลายรายการแต่แสดงแค่รายการเดียว
description: 
published: true
date: 2026-03-25T02:48:26.167Z
tags: 
editor: markdown
dateCreated: 2026-03-25T02:48:24.016Z
---

---
title: 8.Payment Voucher มีหลายรายการแต่แสดงแค่รายการเดียว
published: true
tags: carmen_cloud,faq,documentation
editor: markdown
---

# Payment มี detail ของ invoice หลายรายการแต่ Print Payment voucher แล้ว รายการเดียว เกิดจากอะไร และ จะแก้ไขอย่างไร
## สาเหตุ
การตั้งค่าหัวข้อ Payment Voucher Print Format ไม่ได้กำหนดเอาไว้แบบ Detail
## ตัวอย่างเคส
Print Payment แสดงแค่ 1 รายการใน Invoice มี 3 รายการ แก้ไขอย่างไร

![img-001.png](/contents/carmen_cloud/faq/_images/payment-voucher-print-single-line/img-001.png)

![img-002.png](/contents/carmen_cloud/faq/_images/payment-voucher-print-single-line/img-002.png)

## วิธีแก้ไข
ไปที่หัวข้อ Setting > Account Payable > Payment Voucher Print Format  กด Edit
เลือกหัวข้อ View by ตั้งค่าให้เป็นแบบ Detail เพื่อแสดงรายละเอียดของรายการใน Payment  กด Save   

![img-003.png](/contents/carmen_cloud/faq/_images/payment-voucher-print-single-line/img-003.png)

![img-004.png](/contents/carmen_cloud/faq/_images/payment-voucher-print-single-line/img-004.png)

กลับไปที่รายการ Payment ดังกล่าว และทดลองกด Print อีกครั้ง ระบบจะแสดงรายการแบบ Detail เรียบร้อย

![img-005.png](/contents/carmen_cloud/faq/_images/payment-voucher-print-single-line/img-005.png)
