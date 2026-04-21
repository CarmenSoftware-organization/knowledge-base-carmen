---
title: Commit เอกสาร Store Requisition ไม่ได้ระบบแสดงข้อความ “Please closing period before issue this document”
description: 
published: true
date: 2026-04-15T20:57:42Z
tags: blueledgers,faq,documentation
editor: markdown
dateCreated: 2026-04-15T20:57:42Z
faq_module: Material
faq_submodule: Store Requisition
faq_category: General
---

# Commit เอกสาร Store Requisition ไม่ได้ระบบแสดงข้อความ “Please closing period before issue this document”

## Sample case

ต้องการCommit SR25080001 ระบบแจ้ง “The document is not allowed to issue\. \.\.Please closing period before issue this document”  
![](_images/material-store-requisition-commit-เอกสาร-store-requisition-ไมไดระบบแสดงขอความ-please-closing-period-before-issue-this-document/img-001.png)

## Cause of problems

เกิดจาก Period ยังไม่ได้ปิด ระบบจึงแจ้งให้ปิด Period เดือน 3 ให้เสร็จสิ้นก่อน จากตัวอย่างคือ Store Requisition จะ issue ในเดือน 4 แต่ Period ในระบบคือ Period 31/03/2025 ทำให้ไม่สามารถ Approve ใน Period อนาคตได้

## Solution

ปิด Period เดือน 3 ให้เสร็จสิ้นก่อน แล้วจึงทำการ Approve เอกสาร Store Requisition ในขั้นตอน Issue อีกครั้ง ตามขั้นตอนดังนี้  
1\. ไปที่หัวข้อ Material>Procedure> Period End ระบบจะแสดงเอกสาร Receiving ที่ยัง Commit ไม่เสร็จสิ้น และแสดง Store ที่ยังไม่ได้ทำการ Physical Count \(Closing Balance\) 

2\. ดำเนินการ Commit เอกสาร Receiving ให้เรียบร้อย

3\. ดำเนินการทำ Physical Count \(Closing Balance\) ให้เรียบร้อยทุก location

4\. ไปที่หัวข้อ Material>Procedure> Period End  
![](_images/material-store-requisition-commit-เอกสาร-store-requisition-ไมไดระบบแสดงขอความ-please-closing-period-before-issue-this-document/img-002.png)  
5\. หลังจากดำเนินการจัดการเอกสารที่ค้างในระบบเรียบร้อยแล้วให้ทำการกดปุ่ม Closed Period  
![](_images/material-store-requisition-commit-เอกสาร-store-requisition-ไมไดระบบแสดงขอความ-please-closing-period-before-issue-this-document/img-003.png)  
  
  
จะปรากฏเป็นข้อมูล Period 30/04/2025![](_images/material-store-requisition-commit-เอกสาร-store-requisition-ไมไดระบบแสดงขอความ-please-closing-period-before-issue-this-document/img-004.png)  
6\. กลับไปที่เอกสาร SR25080001 กด Approve ก็สามารถกด Commit เอกสารได้แล้ว![](_images/material-store-requisition-commit-เอกสาร-store-requisition-ไมไดระบบแสดงขอความ-please-closing-period-before-issue-this-document/img-005.png)  
![](_images/material-store-requisition-commit-เอกสาร-store-requisition-ไมไดระบบแสดงขอความ-please-closing-period-before-issue-this-document/img-006.png)

## Tags

Related topics:
