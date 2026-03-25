---
title: 8.Commitเอกสาร SR ไม่ได้
description: 
published: true
date: 2026-03-25T02:42:19.860Z
tags: 
editor: markdown
dateCreated: 2026-03-25T02:42:17.684Z
---

---
title: 8.Commitเอกสาร SR ไม่ได้
published: true
tags: carmen_cloud,faq,documentation
editor: markdown
---

# Commitเอกสาร SR ไม่ได้

Commitเอกสาร SR ไม่ได้  
ตัวอย่าง ต้องการCommit SR25080001 ระบบแจ้ง The document is not allowed to issue.  

![img-001.png](/contents/carmen_cloud/faq/_images/cannot-commit-sr/img-001.png)
สาเหตุ เกิดจากPeriod ยังไม่ได้ปิด ระบบจึงฟ้องให้ปิดเพื่อเป็นPeriod เดือน4 จากตัวอย่างคือSR Date เดือน4 แต่Period ในระบบคือ Period 31/03/2025 ทำให้ไม่สามารถCommit ได้  
แก้ไขโดย ไปปิดPeriod ให้เป็นเดือน4 แล้วทดลองกดCommit อีกครั้ง  
ไปที่หัวข้อMaterial>Procedure> Period End ระบบจะแสดงเอกสารRC ที่ค้างและStore ที่ยังไม่ได้ทำการClosing Balance (EOP) จะต้องดำเนินการให้เรียบร้อยจึงจะสามารถกดClosed Period ได้  

![img-002.png](/contents/carmen_cloud/faq/_images/cannot-commit-sr/img-002.png)
หลังจากดำเนินการจัดการเอกสารที่ค้างในระบบเรียบร้อยแล้วให้ทำการกดปุ่ม Closed Period  

![img-003.png](/contents/carmen_cloud/faq/_images/cannot-commit-sr/img-003.png)

จะปรากฏเป็นข้อมูล Period 30/04/2025

![img-004.png](/contents/carmen_cloud/faq/_images/cannot-commit-sr/img-004.png)
กลับไปที่เอกสาร SR25080001 กด Approve ก็สามารถกด Commit เอกสารได้แล้ว

![img-005.png](/contents/carmen_cloud/faq/_images/cannot-commit-sr/img-005.png)

![img-006.png](/contents/carmen_cloud/faq/_images/cannot-commit-sr/img-006.png)
