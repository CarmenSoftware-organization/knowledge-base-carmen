---
title: 9.มีรายการปรากฏที่ Inventory Balance แต่ไม่การ Assign Item ไว้ที่Store นั้นแล้ว
description: 
published: true
date: 2026-03-25T02:58:21.692Z
tags: 
editor: markdown
dateCreated: 2026-03-25T02:58:19.533Z
---

---
title: 9.มีรายการปรากฏที่ Inventory Balance แต่ไม่การ Assign Item ไว้ที่Store นั้นแล้ว
published: true
tags: carmen_cloud,faq,documentation
editor: markdown
---

# มีรายการปรากฏที่ Inventory Balance แต่ไม่มีการ Assign Item ไว้ที่ Store นั้นแล้ว เกิดจากอะไร และจะปรับปรุงไม่ให้แสดง On hand ในรายงาน อย่างไร
## ตัวอย่างเคส
Product 10030002 ปรากฏที่รายงาน Inventory Balance แม้จะมีการนำสินค้าออกจาก Store 1FB05 : F&B Main Kitchen แล้ว
Casuse of Problems: ยังมีข้อมูลคงค้างในระบบก่อนจะทำการนำออกจาก Store   

![img-001.png](/carmen_cloud/faq/_images/inventory-balance-without-store-assign/img-001.png)

## วิธีแก้ไข
1.กลับไปที่ Product 10030002 ทำการ Assign to Store/Location Store 1FB05 : F&B Main Kitchen อีกครั้ง เพื่อให้สามารถมองเห็น Product นี้เพื่อทำ Stock Out ออกให้เป็น 0 หากไม่ทำจะมองไม่เห็นรายการเวลาทำเอกสาร Stock Out

![img-002.png](/carmen_cloud/faq/_images/inventory-balance-without-store-assign/img-002.png)

2.ทำเอกสาร Stock Out ออกให้เป็น 0 โดยตรวจสอบยอดของคงค้างด้วย Report  Inventory Balance จากตัวอย่าง คือ Qty คงค้าง 10 Kg  

![img-003.png](/carmen_cloud/faq/_images/inventory-balance-without-store-assign/img-003.png)

3.นำการ Assign to Store/Location Store 1FB05 ออกจาก Product 10030002 แล้วทดลองเรียก Report  Inventory Balance ว่ายังมี Qty คงเหลืออีกหรือไม่  
จากตัวอย่างก็จะไม่พบสินค้าคงเหลือแล้ว  

![img-004.png](/carmen_cloud/faq/_images/inventory-balance-without-store-assign/img-004.png)
