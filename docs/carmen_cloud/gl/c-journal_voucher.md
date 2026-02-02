---
title: Journal Voucher
lang: th-TH
---

# Journal Voucher

Journal Voucher คือ สมุดบัญชีรายวัน มีชื่อคำย่อว่า JV มีไว้สำหรับบันทึกรายการบัญชี รวมถึง Transaction ที่ Post มาจาก Module อื่น ๆ เช่นกัน

## การสร้าง Journal Voucher แบบ Manual

1.1 Click เข้าสู่ General Ledger Module

1.2 เลือกเมนู Journal Voucher

1.3 กดปุ่ม <img src="/public/add_icon.png" style="display: inline-block;" />

![alt text](image-110.png)

1.4 ระบบจะแสดงหน้า Journal Voucher ให้กำหนดข้อมูลดังต่อไปนี้

- Prefix > กำหนด Prefix ของ Journal Voucher
- Date > กำหนดวันที่ของ Journal Voucher
- Description > กำหนดคำอธิบายที่ต้องการให้แสดงในหน้า JV

---

1.5 กดปุ่ม + เพื่อเพิ่มรายการที่จะใช้บันทึกบัญชี

![alt text](image-1.png)

1.6 ระบบจะแสดงหน้าต่างการบันทึกบัญชี ให้ระบุข้อมูลดังต่อไปนี้

**หมายเหตุ** เครื่องหมาย <span class="asterisk">\*</span>
(สัญลักษณ์ \* ช่องที่จำเป็นต้องระบุ)

- <span class="asterisk">\*</span> Department > กำหนด Department Code
- <span class="asterisk">\*</span> Account # > กำหนด Account code
- Comment คำอธิบายรายการ
- <span class="asterisk">\*</span> Currency > กำหนด Currency Code
- <span class="asterisk">\*</span> Rate > กำหนด Currency Rate
- <span class="asterisk">\*</span> Amount Dr / Amount Cr > ใส่ยอดที่ต้องการบันทึก
- Dimension > ใส่ข้อมูล Dimension (ถ้ามี)

---

1.7 ระบุข้อมูลเรียบร้อยแล้ว กด **<span class="btn">OK</span>** เพื่อยืนยัน หรือกด Cancel เพื่อยกเลิก
ถ้าต้องการเพิ่มรายการใน Detail ให้ทำตามขั้นตอน 1.5 และ 1.6 จนครบ

![alt text](image-2.png)

**หมายเหตุ**

- การบันทึกบัญชีจะต้องสร้างรายการบัญชีขึ้นมาอย่างน้อย 2 บรรทัด เพื่อบันทึกรายการ Dr. และ Cr. เสมอ
- Total Dr. Amount และ Total Cr. Amount จะต้องมีจำนวนเท่ากันจึงจะ save ได้

---

1.8 เมื่อเพิ่มรายการจนครบตามที่ต้องการแล้วให้กดปุ่ม **<span class="btn">SAVE</span>** เพื่อบันทึกข้อมูลเข้าระบบ

![alt text](image-3.png)

1.9 กด **<span class="btn">OK</span>** เพื่อเสร็จสิ้นขั้นตอน

<p align="center">
    <img src="./image-4.png"  />
</p>

<p style="margin: 0;">Video ประกอบ</p>
<h3 style="margin: 0;">Journal Voucher | การสร้างใบสำคัญบันทึกบัญชี</h3>

<iframe width="560" height="315" src="https://www.youtube.com/embed/1l56IQeyTPI?si=cprMY0-VDohZqRe3" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

<iframe width="560" height="315" src="https://www.youtube.com/embed/udlQspommVs?si=LAQ1ekfrQGphES0H" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

## การสร้าง Journal Voucher โดย Copy

2.1 Click เข้าสู่ General Ledger Module

2.2 เลือกเมนู Journal Voucher

2.3 Click สัญลักษณ์ <img src="./image-5.png" style="display: inline-block;" /> ใน JV ที่ต้องการจะทำการคัดลอก

![alt text](image-111.png)

2.4 ระบบจะเปิด JV ที่เลือกมา

2.5 Click เมนูคำสั่ง <img src="/public/copy_icon.png" style="display: inline-block;" /> เพื่อทำการคัดลอก JV ใบนั้น

![alt text](image-7.png)

2.6 โดยมีรูปแบบการคัดลอกข้อมูลอยู่ 4 ประเภท ดังนี้

- Copy to new Journal Voucher > คือ การคัดลอก JV พร้อมรายละเอียดเพื่อสร้างเป็นเอกสารสมุดบัญชีขึ้นมาใหม่
- Copy and reverse transaction > คือ การคัดลอก JV ขึ้นใหม่พร้อมกลับขาบัญชีให้อัตโนมัติ
- Copy to new Journal Voucher with zero amount > คือ การคัดลอก JV โดยปรับ Dr. Amount และ Cr. Amount ให้เป็น 0
- Copy to Template > คือ การคัดลอก JV ไปสร้างเป็นเอกสารแม่แบบ

<p align="center">
    <img src="./image-8.png"  />
</p>

## การ Copy JV แบบ Copy to new Journal Voucher

ใช้ในกรณีต้องการสร้าง JV ขึ้นใหม่โดยรายละเอียดใน JV มีข้อมูลใกล้เคียงกับเอกสารต้นฉบับ เพื่อลดขั้นตอนในการทำงาน

2.6.1.1.เปิดเอกสาร JV ที่ต้องการ copy

2.6.1.2 Click เลือก <img src="/public/copy_icon.png" style="display: inline-block;" /> และเลือก Copy to new Journal Voucher

2.6.1.3 Click **<span class="btn">OK</span>** เพื่อยืนยันการคัดลอก

<p align="center">
    <img src="./image-9.png"  />
</p>

2.6.1.4 ทำการแก้ไขข้อมูลในส่วน Description และ Click เพื่อเข้าไปแก้ไขข้อมูลของแต่ละ Detail

![alt text](image-10.png)

2.6.1.5 สามารถแก้ไขข้อมูลได้ดังนี้

- Department
- Account#
- Comment
- Currency
- Rate
- Amount Debit
- Amount Credit

![alt text](image-11.png)

## การ Copy JV แบบ Copy and reverse transaction

ใช้ในกรณีต้องการกลับขาบัญชีเนื่องจากการบันทึกบัญชีผิดพลาด หรือเป็นการเป็นการกลับขาบัญชีค่าใช้จ่ายที่เกิดขึ้นในงวดบัญชีปัจจุบันแล้ว แต่กิจการยังไม่ได้จ่ายเงินจึงยังไม่ได้บัญชีทึกบัญชี (Accrued Expenses)

![alt text](image-12.png)

2.6.1.6 เปิดเอกสาร JV ที่ต้องการคัดลอก

2.6.1.7 Click เลือก <img src="/public/copy_icon.png" style="display: inline-block;" /> และเลือก Copy and reverse transaction

2.6.1.8 Click **<span class="btn">OK</span>** เพื่อยืนยันการคัดลอก

<p align="center">
    <img src="./image-13.png"  />
</p>

2.6.1.9 ระบบจะสร้างเอกสาร JV ขึ้นใหม่ โดยมีข้อมูลเดิมจากเอกสารต้นฉบับแต่จะกลับขาบัญชี Debit และ Credit ที่ต่างจากเอกสารต้นฉบับ

2.6.1.10 หากแก้ไขข้อมูลส่วนอื่นเสร็จเรียบร้อยแล้วให้กด **<span class="btn">SAVE</span>**

![alt text](image-14.png)

2.6.1.11 กด **<span class="btn">OK</span>** เพื่อเสร็จสิ้นขั้นตอนการทำงาน

<p align="center">
    <img src="./image-15.png"  />
</p>

## การ Copy JV แบบ Copy to new Journal Voucher with zero amount

ใช้ในกรณีที่ต้องการคัดลอก JV แต่ไม่ต้องการจำนวนเงินในช่องเดบิต และเครดิต

![alt text](image-16.png)

2.6.1.12 Click เลือก <img src="/public/copy_icon.png" style="display: inline-block;" /> และเลือก Copy to new Journal Voucher with zero amount

<p align="center">
    <img src="./image-17.png"  />
</p>
 
2.6.1.13 Click **<span class="btn">OK</span>**   เพื่อยืนยันการคัดลอก ระบบจะสร้างเอกสาร JV ขึ้นใหม่ โดยมีข้อมูลเดิมจากเอกสารต้นฉบับแต่จะเปลี่ยนจำนวนเงินในช่องเดบิต และเครดิต ให้เป็นศูนย์

![alt text](image-18.png)

2.6.1.14 กรอกข้อมูลตัวเลขที่ถูกต้องทั้งเดบิต และเครดิต แล้วกด **<span class="btn">SAVE</span>** เพื่อบันทึกข้อมูล (หากไม่กรอกตัวเลขใหม่จะไม่สามารถบันทึกข้อมูลได้)

<p align="center">
    <img src="./image-15.png"  />
</p>
<p style="margin: 0;">Video ประกอบ</p>
<h3 style="margin: 0;">Copy Function on JV | การใช้คำสั่ง Copy ในการสร้างใบสำคัญบันทึกบัญชี</h3>

<iframe width="560" height="315" src="https://www.youtube.com/embed/G2GIeVFl_h4?si=EFRHIwDQ-bdRBJ3e" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

<iframe width="560" height="315" src="https://www.youtube.com/embed/BRHHf8oPddk?si=-FDUaNTyTworhkBe" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

## การสร้าง Journal Voucher จาก Template

3.1 Click เข้าสู่ General Ledger Module

3.2 Click เลือกเมนู Journal Voucher

3.3 กดปุ่ม <img src="/public/add_icon.png" style="display: inline-block;" /> ระบบจะแสดงหน้าต่างการสร้าง Journal Voucher

![alt text](image-112.png)

3.4 กดปุ่ม <img src="./template_btn.png" style="display: inline-block;" /> เพื่อเลือก Template

![alt text](image-20.png)

3.5 ระบบจะแสดงหน้าต่าง Select Template ให้Click เลือก Select from template และกด **<span class="btn">NEXT</span>**

![alt text](image-21.png)

3.6 ระบบจะนำ Template ที่ได้ถูกสร้างไว้มาแสดง

3.7 Click เลือก ☑️ Template ที่ต้องการนำไปบันทึกบัญชี และกด **<span class="btn">NEXT</span>**

![alt text](image-22.png)

3.8 ระบบแสดงรายละเอียดการบันทึกบัญชีของ Template ที่เลือกและสามารถแก้ไขข้อมูลได้อีกครั้ง เมื่อเสร็จแล้วให้กด **<span class="btn">FINISH</span>**

![alt text](image-23.png)

3.9 ระบบสร้าง JV ที่ได้จาก Template ให้ผู้ใช้งานตรวจสอบข้อมูล หรือเปลี่ยนแปลงแก้ไขข้อมูลได้ตามที่ต้องการแล้วกด **<span class="btn">SAVE</span>**

![alt text](image-24.png)

3.10 Click **<span class="btn">OK</span>** เพื่อยืนยันการคัดลอก ระบบจะสร้างเอกสาร JV ขึ้นเป็นแม่แบบ

<p align="center">
    <img src="./image-4.png"  />
</p>

## การใช้งานปุ่มอื่น ๆ หน้าจอ

1.1. กดปุ่ม <img src="/public/edit_icon.png" style="display: inline-block;" /> เพื่อแก้ไขเอกสาร JV ที่เปิดขึ้นมา

1.2. กดปุ่ม <img src="/public/void_icon.png" style="display: inline-block;" /> เพื่อยกเลิกเอกสาร JV ที่เปิดขึ้นมา

1.3. กดปุ่ม <img src="/public/print_icon.svg" style="display: inline-block;" /> เพื่อพิมพ์เอกสาร Journal Voucher

<p style="margin: 0;">Video ประกอบ</p>
<h5 style="margin: 0;">Create and Apply Template Voucher | การสร้างเทมเพลทใบสำคัญบันทึกบัญชีและการนำไปใช้
</h5>

<iframe width="560" height="315" src="https://www.youtube.com/embed/8Ns4pX7l-JI?si=UTR98KtbWwuBCwdK" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

<iframe width="560" height="315" src="https://www.youtube.com/embed/GepvvkmLdkM?si=KfrNyft48yzSU5Wc" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

