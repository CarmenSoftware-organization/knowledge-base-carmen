---
title: 7.สร้าง PR แล้วไม่พบ Product ที่ต้องการ
description: 
published: true
date: 2026-03-24T20:13:49.291Z
tags: 
editor: markdown
dateCreated: 2026-03-24T20:13:47.166Z
---

---
title: 7.สร้าง PR แล้วไม่พบ Product ที่ต้องการ
published: true
tags: carmen_cloud,faq,documentation
editor: markdown
---

# สร้าง PR แล้วไม่พบ Product ที่ต้องการ
## ตัวอย่างเคส
ต้องการเลือก Product __10000002__   สั่งซื้อเข้าที่ Store 1GR01 แต่เมื่อสร้าง PR แล้วไม่พบรายการสินค้า

![img-001.png](/contents/carmen_cloud/faq/_images/pr-product-not-found/img-001.png)

## สาเหตุ
เกิดจาก 2 ส่วน ดังนี้
1. Product ไม่ได้อยู่ใน Category Type ของ PR ที่สร้าง  
2. Product ไม่ได้ถูก Assign to Store/Location  
## วิธีแก้ไข
- Product ไม่ได้อยู่ใน Category Type ของ PR ที่สร้าง สามารถตรวจสอบได้ดังนี้  
1. เข้าเมนู Procurement   
2. Configuration  
3. Category   
![img-002.png](/contents/carmen_cloud/faq/_images/pr-product-not-found/img-002.png)

1.1. เลือก Category >Sub Category>Item Group  
จากตัวอย่างคือ   
1. Category (Food)  
2. Sub Category (Meat)  
3. Item Group (Beef)  
จากตัวอย่าง Product 10000002  อยู่ใน Category Type Market List หากสร้าง PR Type General ก็จะไม่พบ Product ตัวนี้  
![img-003.png](/contents/carmen_cloud/faq/_images/pr-product-not-found/img-003.png)
- ตรวจสอบว่า Product นี้ถูก Assign to Store/     Location ไว้ที่ 1GR01 แล้วหรือยัง  
## วิธีแก้ไข
1. ไปที่เมนู Procurement  
2. Product  
![img-004.png](/contents/carmen_cloud/faq/_images/pr-product-not-found/img-004.png)
3.คลิกเลือก Product 10000002 หรือพิมพ์ Product Code 10000002 หรือตาม Product ที่ต้องการ ในช่องค้นหา  
![img-005.png](/contents/carmen_cloud/faq/_images/pr-product-not-found/img-005.png)

4. ดูในช่อง Assign to Store/Location ว่า Store 1GR01หรือ Store ที่ต้องการ ถูกติ๊กเลือกไว้หรือไม่  
![img-006.png](/contents/carmen_cloud/faq/_images/pr-product-not-found/img-006.png)

5. หากยังไม่ได้ assign ให้ทำการ Assign to Store/Location ที่ 1GR01 หรือ Store ที่ต้องการและกด Assign และกด Save  
![img-007.png](/contents/carmen_cloud/faq/_images/pr-product-not-found/img-007.png)

6. กลับไปที่ PR จะปรากฏรายการ Product __10000002__  และสามารถดำเนินการทำเอกสาร PR ได้ตามปกติ   
![img-008.png](/contents/carmen_cloud/faq/_images/pr-product-not-found/img-008.png)

**Tag:** Procurement
