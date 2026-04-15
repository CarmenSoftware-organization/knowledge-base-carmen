---
title: ใน View ไม่พบขั้นตอนการ Approve PR ที่ต้องการเกิดจากอะไร
description: 
published: true
date: 2026-04-15T20:37:14Z
tags: blueledgers,faq,documentation
editor: markdown
dateCreated: 2026-04-15T20:37:14Z
faq_module: Procurement
faq_submodule: Purchase Request
faq_category: General
---

# ใน View ไม่พบขั้นตอนการ Approve PR ที่ต้องการเกิดจากอะไร

## Sample case

ต้องการ approve PR24050002 ที่ Step Approved By HOD แต่ที่ View ไม่พบ “Approved By HOD”

## Cause of problems

User ที่ติดปัญหา ไม่ได้ถูก Assign เอาไว้ที่หัวข้อ Step Approved By HOD ใน Workflow Configuration ส่วนของ Purchase Request ![](_images/procurement-purchase-request-ใน-view-ไมพบขนตอนการ-approve-pr-ทตองการเกดจากอะไร/img-001.png) ![](_images/procurement-purchase-request-ใน-view-ไมพบขนตอนการ-approve-pr-ทตองการเกดจากอะไร/img-002.png)

## Solution

Assign user ที่ต้องการลงใน approval step ที่ต้องการ

<a id="_heading=h.cy8v51lyzvpc"></a>ไปที่เมนู   
1\.Options  
2\. Administrator  
3\. Workflow Configuration  
![](_images/procurement-purchase-request-ใน-view-ไมพบขนตอนการ-approve-pr-ทตองการเกดจากอะไร/img-003.png)  
4\.ไปที่ Step Approved By HOD ใน Workflow Configuration จากตัวอย่างคือ \(2\) Approved By HOD  
5\.กดปุ่ม Edit Approval   
![](_images/procurement-purchase-request-ใน-view-ไมพบขนตอนการ-approve-pr-ทตองการเกดจากอะไร/img-004.png)  
  
  
  
  
  
6\.ทำการเลือก User ที่ต้องการเปิดสิทธิ์การ Approved By HOD จากตัวอย่าง คือ User:Support  
หมายเหตุ:การเลือกสามารถเลือกได้ทั่ง2แบบ คือ 1\.Role\(s\) 2\.User\(s\)  
7\.กด Save  
![](_images/procurement-purchase-request-ใน-view-ไมพบขนตอนการ-approve-pr-ทตองการเกดจากอะไร/img-005.png)  
กลับไปที่ หัวข้อ PR คลิก View จะปรากฏ View ของ Approved By HOD เรียบร้อย   
ทำการคลิก Approved By HOD จะพบเอกสาร กด PR24050002 ที่ Step Approved By HOD เรียบร้อย   
สามารถดำเนินการ Approved เอกสารได้ตามปกติ  
\(หากไม่พบ ไปที่หัวข้อ \#Required Head of Department \(HOD\)\)  
![](_images/procurement-purchase-request-ใน-view-ไมพบขนตอนการ-approve-pr-ทตองการเกดจากอะไร/img-006.png)

## Tags

Related topics:
