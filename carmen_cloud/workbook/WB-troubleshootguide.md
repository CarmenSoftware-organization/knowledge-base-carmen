---
title: Troubleshoot Guide
description: Troubleshoot Guide
published: true
date: 2026-02-23T04:57:10.063Z
tags: carmen_cloud,documentation
editor: markdown
dateCreated: 2026-02-02T06:56:11.722Z
---

---
title: "Troubleshoot Guide"
weight: 13
---



## Require web api version
Require Web API version >=3.146
<p align="center">
    <img src="./image-40.png"  />
</p>
สาเหตุที่เกิดขึ้น

Antivirus ไป Block Add In Version ใหม่ที่ติดตั้งไป (อาจจะมองว่าเป็นความเสี่ยง) ทำให้ Workbook ยังถามหา Add In Version เก่าอยู่ครับ 

วิธีแก้ไขปัญหาเบื้องต้น

ปิดAntivirus ในส่วนที่ Block File Add In ออก

## ปุ่มกดไม่ได้
<img src="./image-41.png"  />

### วิธีแก้ไข

เปิด ที่อยู่ของFile Woorbook และทำการคลิกขวาเลือกProperties
<img src="./image-42.png"  />

1. ทำการติ๊กช่อง Unblock
2. กด **Apply**
3. กด **OK**
<img src="./image-43.png"  />
## ถอดการติดตั้งAddin 
เปิดExcel แล้วไปที่ File>Excel Options>Add-ins 
1. กดไปที่หัวข้อ Add-ins
2. หัวข้อManage กด GO
<img src="./image-44.png"  />
3. เลือก Add in ที่ลูกค้าจะใช้งานนำ Carmen Add in ออก
<img src="./image-45.png"  />
4. กด **OK**