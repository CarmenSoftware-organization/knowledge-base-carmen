---
title: 7.Receiving รับเกินราคาPO ไม่ได้ ระบบแจ้ง Warning
description: 
published: true
date: 2026-03-24T20:41:47.857Z
tags: 
editor: markdown
dateCreated: 2026-03-24T20:41:47.857Z
---

---
title: 7.Receiving รับเกินราคาPO ไม่ได้ ระบบแจ้ง Warning
published: true
tags: carmen_cloud,faq,documentation
editor: markdown
---

# Receiving รับเกินราคาจาก PO ไม่ได้ ระบบแจ้ง Warning
## ตัวอย่างเคส
ต้องการแก้ไขรายการ 10000005  ให้ราคามากกว่าที่ Po คือ Price 20

![img-001.png](/contents/carmen_cloud/faq/_images/receiving-exceeds-po-price-warning/img-001.png)
## สาเหตุ
กรอกราคาสินค้าเกินกว่า PO ซึ่งข้อมูลส่วนนี้มาจาก Price Deviation(%) ในตัวProduct
Solution ไปที่ Product ที่ติดปัญหา ทำการแก้ไขในส่วนของช่อง __Price Deviation(%)__   
![img-002.png](/contents/carmen_cloud/faq/_images/receiving-exceeds-po-price-warning/img-002.png)
1.ไปที่ Product 10000005   ทำการแก้ไข Price Deviation(%) ส่วนของราคา เป็น 100% กด Save
![img-003.png](/contents/carmen_cloud/faq/_images/receiving-exceeds-po-price-warning/img-003.png)

2.กลับไปที่เอกสาร Receiving ใส่ราคาที่ต้องการ กด Save ตามปกติ
![img-004.png](/contents/carmen_cloud/faq/_images/receiving-exceeds-po-price-warning/img-004.png)

3.ดำเนินการทำ Receiving  ได้เสร็จเรียบร้อย
![img-005.png](/contents/carmen_cloud/faq/_images/receiving-exceeds-po-price-warning/img-005.png)
