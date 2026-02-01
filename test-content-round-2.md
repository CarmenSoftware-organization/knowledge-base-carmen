---
title: Test Auto Sync
description: Test page for auto sync workflow 
published: true
date: 2026-01-27T06:28:57.899Z
tags: test, sync, documentation
editor: markdown
dateCreated: 2026-01-27T06:28:55.731Z
---

# Test Content Round 2

## เนื้อหาทดสอบรอบที่ 2

นี่คือหน้า test สำหรับทดสอบ auto sync จาก Wiki.js ไป Git และ ChromaDB รอบที่ 2

### ส่วนที่ 1: ข้อมูลทั่วไป

- **ชื่อโปรเจ็กต์:** RAG Chatbot Carmen
- **เทคโนโลยีที่ใช้:** Wiki.js, Git, ChromaDB, Ollama
- **วัตถุประสงค์:** ทดสอบการ sync อัตโนมัติ

### ส่วนที่ 2: Workflow

1. **Wiki.js → Git**
   - Auto sync ทุก 5 นาที
   - หรือ Force Sync ได้ทันที

2. **Git → ChromaDB**
   - ChromaDB sync จาก GitHub อัตโนมัติ
   - ใช้เวลา 5-30 นาที

3. **ChromaDB → RAG API**
   - Backend เชื่อมต่อ ChromaDB
   - พร้อมใช้งาน

### ส่วนที่ 3: การทดสอบ

**สิ่งที่ต้องทดสอบ:**
- ✅ Sync จาก Wiki.js ไป Git
- ✅ Sync จาก Git ไป ChromaDB
- ✅ ตรวจสอบ logs ใน Backend
- ✅ ทดสอบ RAG system

### สรุป

หน้า test นี้ใช้สำหรับทดสอบ workflow รอบที่ 2:
1. Wiki.js → Git (auto sync)
2. Git → ChromaDB (auto sync)
3. ChromaDB → RAG API