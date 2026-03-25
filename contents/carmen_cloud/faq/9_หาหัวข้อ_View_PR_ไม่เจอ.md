---
title: 9.หาหัวข้อ View PR ไม่เจอ
description: 
published: true
date: 2026-03-25T06:34:28.460Z
tags: 
editor: markdown
dateCreated: 2026-03-25T06:34:26.280Z
---

---
title: 9.หาหัวข้อ View PR ไม่เจอ
published: true
tags: carmen_cloud,faq,documentation
editor: markdown
---

# ใน  View ไม่พบขั้นตอนการ Approve PR ที่ต้องการเกิดจากอะไร
## ตัวอย่างเคส
ต้องการ approve PR24050002 ที่ Step Approved By HOD แต่ที่ View ไม่พบ “Approved By HOD”
## สาเหตุ
User ที่ติดปัญหา ไม่ได้ถูก Assign เอาไว้ที่หัวข้อ Step Approved By HOD ใน Workflow Configuration ส่วนของ Purchase Request
![img-001.png](/contents/carmen_cloud/faq/_images/view-pr-approval-step-not-found/img-001.png)

![img-002.png](/contents/carmen_cloud/faq/_images/view-pr-approval-step-not-found/img-002.png)

## วิธีแก้ไข
Assign user ที่ต้องการลงใน approval step ที่ต้องการ

ไปที่เมนู   
1.Options  
2. Administrator  
3. Workflow Configuration  

![img-003.png](/contents/carmen_cloud/faq/_images/view-pr-approval-step-not-found/img-003.png)
4.ไปที่ Step Approved By HOD ใน Workflow Configuration จากตัวอย่างคือ (2) Approved By HOD  
5.กดปุ่ม Edit Approval   
![img-004.png](/contents/carmen_cloud/faq/_images/view-pr-approval-step-not-found/img-004.png)

6.ทำการเลือก User ที่ต้องการเปิดสิทธิ์การ Approved By HOD จากตัวอย่าง คือ User:Support  
หมายเหตุ:การเลือกสามารถเลือกได้ทั่ง2แบบ คือ 1.Role(s) 2.User(s)  
7.กด Save  
![img-005.png](/contents/carmen_cloud/faq/_images/view-pr-approval-step-not-found/img-005.png)
กลับไปที่ หัวข้อ PR คลิก View จะปรากฏ View ของ Approved By HOD เรียบร้อย   
ทำการคลิก Approved By HOD จะพบเอกสาร กด PR24050002 ที่ Step Approved By HOD เรียบร้อย   
สามารถดำเนินการ Approved เอกสารได้ตามปกติ  
(หากไม่พบ ไปที่หัวข้อ #Required Head of Department (HOD))  
![img-006.png](/contents/carmen_cloud/faq/_images/view-pr-approval-step-not-found/img-006.png)
