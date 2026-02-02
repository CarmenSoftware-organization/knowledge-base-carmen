---
title: Invoice
lang: th-TH
---

# Invoice

ขั้นตอนการสร้างใบแจ้งหนี้ (invoice)
Function นี้ใช้สำหรับการสร้างใบแจ้งหนี้ในระบบ
การสร้าง A/R Invoice สามารถสร้างได้ 3 วิธี ดังต่อไปนี้

## การสร้าง AR Invoice ด้วยตนเอง

1.1 Click เข้าสู่ Account Receivable Module

1.2 เลือกเมนู Invoice จะเข้าสู่หน้า A/R Invoice

![alt text](image-2.png)

1.3 กดปุ่ม <img src="/public/add_icon.png" style="display: inline-block;" /> ระบบจะแสดงหน้า A/R Invoice

1.4 ให้ผู้ใช้งานระบุข้อมูลของ A/R Invoice Header ดังต่อไปนี้

**หมายเหตุ** เครื่องหมาย <span class="asterisk">\*</span>
(สัญลักษณ์ \* ช่องที่จำเป็นต้องระบุ)

- <span class="asterisk">\*</span> Invoice No > กำหนดเลขที่ Invoice No. โดยในระบบสามารถเลือกใช้งานได้ 2 แบบ คือ
  - ให้ระบบกำหนดให้อัตโนมัติ โดยการติ๊กเครื่องหมายถูกที่ช่อง
  - ผู้ใช้กำหนดเอง โดยติ๊กเอาเครื่องหมายติ๊กถูกที่ช่อง ออก และพิมพ์เลขที่ Invoice ในช่อง Invoice No. ด้วยตนเอง
- <span class="asterisk">\*</span> A/R No > กำหนดรหัสลูกหนี้ที่ต้องการตั้งหนี้
- <span class="asterisk">\*</span> Currency > กำหนดสกุลเงิน
- <span class="asterisk">\*</span> Rate > อัตราแลกเปลี่ยนเงินตรา
- Prefix > รหัสเอกสารใช้ในกรณีที่ต้องการออกใบกำกับภาษีขาย
- Tax Invoice No > ระบบจะสร้างให้อัตโนมัติหากเลือก Tax Status เป็น Output Vat
- Tax Status > สามารถเลือกได้ 2 แบบ
  - None > ไม่ออกใบกำกับภาษีขายบน Invoice
  - Output Vat > ออกใบกำกับภาษีขายบน Invoice โดยจะใช้สำหรับการขายสินค้าเท่านั้น
    สำหรับการขายประเภทบริการ จะต้องออกใบกำกับภาษีบนใบเสร็จรับเงิน (Receipt) เท่านั้น
- <span class="asterisk">\*</span> Date > กำหนดวันที่ใบแจ้งหนี้
- <span class="asterisk">\*</span> Due Date > กำหนดวันที่ครบกำหนดชำระ (ระบบจะคำนวณให้อัตโนมัติโดยอ้างอิงจาก Credit Term ที่ตั้งค่าเอาไว้ใน A/R Profile)
- Description > ระบุรายละเอียดของใบแจ้งหนี้ (Invoice)

![alt text](image-3.png)

1.5 กดปุ่ม + เพื่อเพิ่มข้อมูลในส่วนของ Invoice Detail ระบบจะแสดงหน้าต่างขึ้นมาให้ระบุข้อมูลดังต่อไปนี้

- <span class="asterisk">\*</span> Department > กำหนด Department Code ที่จะใช้ในการบันทึกบัญชีที่ GL
- Comment > ใส่รายละเอียดรายการสินค้า หรือ บริการ
- Reference > ใส่รายละเอียดเพิ่มเติม
- Group No > ใช้ในกรณีที่มี Invoice Detail หลายรายการ แต่เมื่อพิมพ์ใบแจ้งหนี้ต้องการให้
  - แสดงรายละเอียดเฉพาะรายการแรกและ Group Summary Amount รวมกัน
- Date > วันที่ ที่ทำรายการ เช่น Folio Date, Bill Date
- <span class="asterisk">\*</span> Unit > ระบุหน่วย
- <span class="asterisk">\*</span> Qty. > ระบุจำนวน
- <span class="asterisk">\*</span> Price/Unit > ระบุราคาต่อหน่วย
- <span class="asterisk">\*</span> Dr Acc Code > กำหนดรหัสบัญชีที่จะบันทึกบัญชีด้าน Dr. เช่น รหัสบัญชีลูกหนี้
- <span class="asterisk">\*</span> Cr Acc. Code > กำหนดรหัสบัญชีที่จะบันทึกบัญชีด้าน Cr. เช่นรหัสบัญชีรายได้

**Tax Amount 1**

\*Tax Type 1 > กำหนดประเภทภาษีมูลค่าเพิ่ม ได้แก่

1. None ไม่มีภาษีมูลค่าเพิ่มในราคาสินค้า หรือ บริการ

2. Add บวกภาษีมูลค่าเพิ่ม ในราคาสินค้า หรือ บริการ

3. Include มีภาษีมูลค่าเพิ่มรวมอยู่ในราคาสินค้า หรือ บริการแล้ว

Tax Rate 1 > ระบุเปอร์เซ็นต์ร้อยละของฐานภาษีมูลค่าเพิ่ม

Dr. Acc. Code (Tax 1) > ระบุรหัสบัญชีสำหรับการบันทึกบัญชีภาษีมูลค่าเพิ่ม

Overwrite > ใช้ในกรณีต้องการแก้ไข ภาษีมูลค่าเพิ่ม ให้ติ๊กเครื่องหมายถูกที่ช่องนี้

**Tax Amount 2**

เป็นการบันทึกภาษีที่เกี่ยวกับต่างประเทศ การกรอกข้อมูลเหมือนกันกับ Tax Amount 1

1.6 เมื่อทำการเพิ่มข้อมูลเรียบร้อยแล้วให้ กดปุ่ม **<span class="btn">OK</span>** ด้านล่าง หรือกดปุ่ม Cancel เพื่อยกเลิก

![alt text](image-4.png)

1.7 หากมีมากกว่า 1 รายการ ให้ทำตามขั้นตอน ข้อที่ 1.5-1.6 ซ้ำอีกครั้ง จนครบรายการ

1.8 ตรวจสอบข้อมูลเรียบร้อยแล้ว ให้กดปุ่ม **<span class="btn">SAVE</span>** ด้านล่างขวามือเพื่อบันทึกข้อมูลใบแจ้งหนี้ หรือกด Cancel เพื่อยกเลิก

![alt text](image-5.png)

1.9 เมื่อระบบทำการบันทึกข้อมูลเรียบร้อยแล้ว จะขึ้นหน้าต่างแสดงข้อความ Success ให้กดปุ่ม **<span class="btn">OK</span>**

<p align="center">
    <img src="./image-6.png"  />
    ภาพตัวอย่าง A/R Invoice หลังจาก Save ข้อมูล
</p>

![alt text](image-7.png)

## การสร้าง A/R Invoice โดยการ Copy

Function นี้ใช้ในกรณีที่ต้องการคัดลอก A/R Invoice ที่เคยมีอยู่ในระบบ มาสร้างเป็น Invoice จะช่วยให้ผู้ใช้ ทำงานสะดวกและรวดเร็วมากขึ้น โดยในระบบมีวิธีการดังต่อไปนี้

2.1 Click ที่เมนู Accounts Receivable

2.2 Click ที่ Invoice

2.3 Click ที่ A/R Invoice ที่ต้องการจะคัดลอก

![alt text](image-8.png)

2.4 กดปุ่ม <img src="/public/copy_icon.png" style="display: inline-block;" /> ด้านบนขวามือ

![alt text](image-9.png)

2.5 ระบบจะทำการคัดลอกใบแจ้งหนี้เดิม และสร้างเป็นเอกสารใหม่เพื่อให้ทำการแก้ไขข้อมูล ทั้งนี้ผู้ใช้งานสามารถแก้ไขข้อมูลได้ตามต้องการ หลังจากแก้ไขข้อมูลสำเร็จแล้วให้กด **<span class="btn">SAVE</span>** เอกสาร เพียงเท่านี้ก็จะได้ A/R Invoice ใบใหม่ หรือ Cancel เพื่อยกเลิก

![alt text](image-10.png)

2.6 เมื่อระบบทำการบันทึกข้อมูลเรียบร้อยแล้ว จะขึ้นหน้าต่างแสดงข้อความ Success ให้กดปุ่ม **<span class="btn">OK</span>**

<p align="center">
    <img src="./image-6.png"  />
</p>

<p style="margin: 0;">Video ประกอบ</p>
<h3 style="margin: 0;">Invoice | การสร้างใบแจ้งหนี้</h3>

<iframe width="560" height="315" src="https://www.youtube.com/embed/dQvEjdwqyKU?si=mSuRF8mQ1cr1AB-A" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

<iframe width="560" height="315" src="https://www.youtube.com/embed/ZyFCorDnveI?si=VUoY1FpC3d3bMRsc" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

## การสร้าง A/R Invoice จาก Folio

เป็นการสร้างใบแจ้งหนี้ (Invoice) โดยอ้างอิงข้อมูลจาก PMS Interface เพื่อรับรู้ข้อมูลลง AR Aging เท่านั้น ดังนั้นใบแจ้งหนี้ที่บันทึกด้วยรายละเอียดของ Folio จะไม่มีการบันทึกบัญชีลงใน GL อีก เนื่องจากลูกหนี้ City Ledger หรือ Credit Card ได้ทำการบันทึกบัญชีในขั้นตอน interface กับ GL เรียบร้อยแล้ว

**ขั้นตอนการตั้ง A/R invoice (Select from Folio)**

3.1 Click เข้าสู่ Account Receivable Module

3.2 เลือกฟังก์ชัน Invoice จะเข้าสู่หน้า A/R Invoice list

3.3 กดปุ่ม <img src="/public/add_icon.png" style="display: inline-block;" /> ระบบจะแสดงหน้า A/R Invoice

![alt text](image-11.png)

3.4 ให้ผู้ใช้งาน ระบุข้อมูลของ A/R Invoice Header ดังต่อไปนี้ (\* ช่องที่จำเป็นต้องระบุ)

- <span class="asterisk">\*</span> Invoice No > กำหนดเลขที่ Invoice No. โดยในระบบสามารถเลือกใช้งานได้ 2 แบบ คือ
  - ให้ระบบกำหนดให้อัตโนมัติ โดยการติ๊กเครื่องหมายถูกที่ช่อง
  - ผู้ใช้กำหนดเอง โดยติ๊กเอาเครื่องหมายติ๊กถูกที่ช่อง ออก และพิมพ์เลขที่ Invoice ในช่อง Invoice No. ด้วยตนเอง
- <span class="asterisk">\*</span> A/R No > กำหนดรหัสลูกหนี้ที่ต้องการตั้งหนี้
- <span class="asterisk">\*</span> Currency > กำหนดสกุลเงิน
- <span class="asterisk">\*</span> Rate > อัตราแลกเปลี่ยนเงินตรา
- Prefix > รหัสเอกสารใช้ในกรณีที่ต้องการออกใบกำกับภาษีขาย
- Tax Invoice No > ระบบจะสร้างให้อัตโนมัติหากเลือก Tax Status เป็น Output Vat
- Tax Status > สามารถเลือกได้ 2 แบบ
  - None > ไม่ออกใบกำกับภาษีขายบน Invoice
  - Output Vat > ออกใบกำกับภาษีขายบน Invoice โดยจะใช้สำหรับการขายสินค้าเท่านั้น
    สำหรับการขายประเภทบริการ จะต้องออกใบกำกับภาษีบนใบเสร็จรับเงิน (Receipt) เท่านั้น
- <span class="asterisk">\*</span> Date > กำหนดวันที่ใบแจ้งหนี้
- <span class="asterisk">\*</span> Due Date > กำหนดวันที่ครบกำหนดชำระ (ระบบจะคำนวณให้อัตโนมัติโดยอ้างอิงจาก Credit Term ที่ตั้งค่าเอาไว้ใน A/R Profile)
- Description > ระบุรายละเอียดของใบแจ้งหนี้ (Invoice)

![alt text](image-12.png)

3.5 เพิ่มรายละเอียดโดยกดกดปุ่ม <img src="./image-13.png" style="display: inline-block;" />

3.6 ระบบจะแสดงหน้าต่าง A/R Folio list

3.7 ให้ติ๊กเครื่องหมายถูก ☑️ หน้ารายการ Folio ที่ต้องการ นํามาตั้ง Invoice

3.8 เมื่อเลือกรายการครบถ้วน ตามที่ต้องการแล้วให้ กดปุ่ม **<span class="btn">OK</span>**

![alt text](image-14.png)

3.9 ระบบจะดึงข้อมูลมาแสดงใน Invoice Detail หากตรวจสอบข้อมูลว่าถูกต้องแล้วให้กดปุ่ม **<span class="btn">SAVE</span>** ด้านล่างขวามือเพื่อบันทึกใบแจ้งหนี้ (Invoice)

![alt text](image-15.png)

3.10 กรณีต้องการแก้ไขข้อมูล

3.11 ให้กดปุ่ม <img src="/public/edit_icon.svg" style="display: inline-block;" /> ด้านหน้ารายการ ระบบจะแสดงหน้าต่างให้แก้ไขข้อมูล

3.12 แก้ไขแล้วกดปุ่ม **<span class="btn">OK</span>**

<p align="center">
    <img src="./image-16.png"  />
</p>

3.13 เรียบร้อยแล้วให้กดปุ่ม **<span class="btn">SAVE</span>** ด้านล่างขวามือเพื่อบันทึกใบแจ้งหนี้ (Invoice)

![alt text](image-17.png)

3.14 เมื่อระบบทำการบันทึกข้อมูลเรียบร้อยแล้ว จะขึ้นหน้าต่างแสดงข้อความ Success ให้กดปุ่ม **<span class="btn">OK</span>**

<p align="center">
    <img src="./image-6.png"  />
</p>

<p style="margin: 0;">Video ประกอบ</p>
<h4 style="margin: 0;">Create Invoice from City Ledger Folio | การสร้างใบแจ้งหนี้จาก City Ledger Folio
</h4>

<iframe width="560" height="315" src="https://www.youtube.com/embed/RHG6VKRfZGs?si=QxATeH6P5_NNKvk1" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

<iframe width="560" height="315" src="https://www.youtube.com/embed/CWstCiInqnc?si=tWIQILx343lOSfbV" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

## การสร้างใบลดหนี้ CN

4. การสร้างใบลดหนี้

4.1 ทำการสร้าง Invoice และ บันทึกข้อมูล Debit และ Credit เหมือนกับการสร้าง Invoice ปกติ

4.2 กรอกตัวเลขเป็นติดลบ

<p align="center">
    <img src="./image-18.png"  />
</p>

4.3 และทำการบันทึก Invoice ตามปกติ

![alt text](image-19.png)

เมนูคำสั่งอื่นๆ ที่เกี่ยวข้อง

![alt text](image-20.png)

<img src="/public/add_icon.png" style="display: inline-block;" /> สร้างใบแจ้งหนี้ใหม่

<img src="/public/edit_icon.png" style="display: inline-block;" /> แก้ไขใบแจ้งหนี้ (เมื่อยังไม่ approve หรือ รับชำระแล้ว หรือ ยกเลิกแล้ว หรืออยู่ใน period ที่ปิดไปแล้ว)

<img src="/public/void_icon.png" style="display: inline-block;" /> การยกเลิกใบแจ้งหนี้ (เมื่อยังไม่ approve หรือ รับชำระแล้ว หรืออยู่ใน period ที่ปิดไปแล้ว)

<img src="/public/copy_icon.png" style="display: inline-block;" /> การคัดลอกใบแจ้งหนี้

<img src="/public/print_icon.png" style="display: inline-block;" /> การพิมพ์ใบแจ้งหนี้

<img src="/public/print_voucher_icon.png" style="display: inline-block;" /> การพิมพ์เอกสารบันทึกบัญชีใบแจ้งหนี้

<img src="/public/receipt_icon.png" style="display: inline-block;" /> การตรวจสอบเอกสารชำระเงินที่ได้รับชำระเงินจากใบแจ้งหนี้ใบที่เปิดอยู่

<img src="/public/send_email_icon.png" style="display: inline-block;" /> การส่งใบแจ้งหนี้ไปยังลูกหนี้ในช่องทาง Email (ต้องมีการตั้งค่าก่อนเริ่มใช้งาน)

**ตัวอย่าง A/R Voucher**

![alt text](image-24.png)
