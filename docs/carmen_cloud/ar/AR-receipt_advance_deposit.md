---
title: Receipt for Advance Deposit
lang: th-TH
---

# Receipt for Advance Deposit

Function นี้ใช้สำหรับการรับเงินมัดจำจากลูกหนี้ รวมถึงการออกใบเสร็จรับเงิน และใบกำกับภาษีในระบบ

## การรับเงินมัดจำ Advance Deposit

1. Click เข้าสู่ Account Receivable Module

2. เลือกฟังก์ชัน Receipt ระบบจะแสดงหน้าจอ ตามภาพด้านล่าง

3. กดปุ่ม <img src="/public/add_icon.png" style="display: inline-block;" /> ระบบจะแสดงหน้า Receipt

![alt text](image-51.png)

4. ให้ผู้ใช้งาน ระบุข้อมูลของ Receipt ดังต่อไปนี้

**หมายเหตุ** เครื่องหมาย <span class="asterisk">\*</span>
(สัญลักษณ์ \* ช่องที่จำเป็นต้องระบุ)

- <span class="asterisk">\*</span> Receipt Ref. No. > กำหนดเลขที่ใบเสร็จรับเงินโดยในระบบสามารถเลือกใช้งานได้ 2 แบบ คือ
  ให้ระบบกำหนดให้อัตโนมัติ โดยการติ๊กเครื่องหมายถูกที่ช่อง <img src="./image-39.png" style="display: inline-block;" />
  ผู้ใช้กำหนดหนดเอง โดยติ๊กเอาเครื่องหมายติ๊กถูกที่ช่อง <img src="./image-40.png" style="display: inline-block;" /> ออก
  และพิมพ์เลขที่ใบเสร็จรับเงิน ในช่อง Receipt Ref. No.
- <span class="asterisk">\*</span> Receipt Date > กำหนดวันที่ออกใบเสร็จ
- <span class="asterisk">\*</span> A/R No > กำหนดรหัสลูกหนี้
- <span class="asterisk">\*</span> Currency > กำหนดสกุลเงิน
- <span class="asterisk">\*</span> Rate > อัตราแลกเปลี่ยนเงินตรา
- Pay Ref No. > หมาเลขอ้างอิงเกี่ยวกับการรับชำระ เข่นเลขที่เช็ค
- Pay Date > วันที่ได้รับชำระเงิน
- <span class="asterisk">\*</span> Pay Type > กำหนดประเภทการชําระหนี้เช่น Cash, Cheque หรือ Bank Transfer
- Description > ระบุคำอธิบาย รายละเอียดของใบเสร็จ

![alt text](image-52.png)

**กรณีที่ต้องการออกใบกำกับภาษีในใบเสร็จรับเงิน ให้ระบุข้อมูลดังต่อไปนี้**

- Tax Invoice no. > ระบบกำหนดให้อัตโนมัติ โดยการติ๊กเครื่องหมายถูกที่ช่อง Auto <img src="./image-39.png" style="display: inline-block;" />
- Rate (%) > ระบุเปอร์เซ็นต์ร้อยละของฐานภาษีมูลค่าเพิ่ม
- Amount > ยอดภาษีมูลค่าเพิ่ม (ระบบจะคำนวณจาก Paid amount ให้อัตโนมัติ)
  ในกรณีต้องการแก้ไข ภาษีมูลค่าเพิ่ม ให้ติ๊กเครื่องหมายถูกที่ช่อง Overwrite และพิมพ์ยอดภาษีมูลค่าเพิ่มที่ช่อง Amount

  ![alt text](image-53.png)

## การบันทึกภาษีหัก ณ ที่จ่าย

5. ในกรณีต้องการบันทึกรายการภาษี หัก ณ ที่จ่าย Click ที่ช่อง Withholding Tax โดยกรอกรายละเอียดการบันทึกข้อมูล ดังต่อไปนี้

- Dept. > กำหนด Department Code จะใช้บันทึกบัญชี
- Acc. Code > กำหนด Account Code จะใช้บันทึกบัญชีภาษีหัก ณ ที่จ่าย
- Total > ระบุยอดที่จะนำไปคำนวณภาษีหัก ณ ที่จ่าย
- Rate > ระบุเปอร์เซ็นต์ ภาษีหัก ณ ที่จ่าย
- Amount > ยอดภาษี หัก ณ ที่จ่าย ระบบจะคำนวณให้อัตโนมัติ
- Overwrite > ติ๊กเครื่องหมายถูก ☑️ กรณีที่ต้องการแก้ไขยอดภาษีหัก ณ ที่จ่าย แล้วให้ผู้ใช้งานพิมพ์ยอดภาษี หัก ณ ที่จ่าย ที่ช่อง Amount

![alt text](image-54.png)

6. ตรวจสอบ ชื่อ และ ที่อยู่ ในการออกใบเสร็จรับเงิน/ใบกำกับภาษี โดยการClick ที่ช่อง Billing to และตรวจสอบข้อมูลดังต่อไปนี้

- Name > ชื่อ สกุล กรณีต้องการออกใบเสร็จรับเงิน หรือ ใบเสร็จรับเงิน/ใบกำกับภาษีในนามบุคคล
- Company > ชื่อบริษัท ที่ต้องการออกใบเสร็จรับเงิน หรือ ใบเสร็จรับเงิน/ใบกำกับภาษี
- Billing To > ระบบจะกำหนดที่อยู่ตามการตั้งค่าเบื้องต้นจาก AR Profile หรือเลือกที่อยู่อื่นมาใช้แทนได้
- Address > ที่อยู่ที่ต้องการออกใบเสร็จรับเงิน หรือ ใบเสร็จรับเงิน/ใบกำกับภาษี โดยระบบจะแสดงที่อยู่ตามที่ตั้งค่าเบื้องต้น

![alt text](image-55.png)

7. กำหนด Account code ในส่วนของ Receipt Account (ในกรณีที่ลูกหนี้ชำระค่าบริการ จำเป็นต้องระบุ Payment Account Code เพื่อส่งขอมูลการชำระเงินในส่วนของ AR ไปยังระบบ General Ledger) โดยมีขั้นตอนดังต่อไปนี้

7.1. Cr. Account กำหนดรหัสผังบัญชี ที่จะใช้บันทึกบัญชีลดลูกหนี้ (Aging) โดยไม่ต้องลงบัญชีเงินมัดจำ

- <span class="asterisk">\*</span> Cr Dept. Code > กำหนด Department Code
- <span class="asterisk">\*</span> Cr Acc. Code > กำหนด Account Code
  7.2. Gain/Loss Account กำหนดรหัสบัญชีที่จะใช้บันทึกกำไรขาดทุนจากอัตราแลกเปลี่ยนเมื่อรับชำระเงินด้วยสกุลเงินอื่น (หากมี ต้องระบุ)
- Dept. Code > กำหนด Department Code จะใช้บันทึกบัญชี
- Acc. Code > กำหนด Account Code จะใช้บันทึกบัญชี
  7.3. Bank Charge Account > กำหนดรหัสบัญชีที่จะใช้บันทึกยอด Bank Charge (หากมี ต้องระบุ)
- <span class="asterisk">\*</span> Dept. Code > กำหนด Department Code จะใช้บันทึกบัญชี
- <span class="asterisk">\*</span> Acc. Code > กำหนด Account Code จะใช้บันทึกบัญชี

8. Dr. Account กำหนดรหัสบัญชีที่จะใช้บันทึกตามวิธีการรับชำระเงินเช่น Cash, Bank หรือ Cheque

- <span class="asterisk">\*</span> Dr Dept. Code > กำหนด Department Code
- <span class="asterisk">\*</span> Dr Acc. Code > กำหนด Account Code

![alt text](image-56.png)

10. ตรวจสอบยอดที่แสดงในส่วนของ Summary ด้านล่าง ขวามือ

- Payment Amount > กรอกจำนวนเงินที่ได้รับเงินมัดจำจากลูกหนี้
- Settlement Base Amount > ยอดเงินรวมที่ได้รับชำระ แปลงตามสกุลเงินหลัก (Base Currency)
  เนื่องจากยังไม่มีการเลือก invoice มารับชำระจึงแสดงเป็น 0
- Gain/Loss > ยอดกำไรขาดทุนจากอัตราแลกเปลี่ยน
- Withholding Tax > ยอดที่ถูกหักภาษีหัก ณ ที่จ่าย
- Bank Charge > ระบุยอด Bank Charge ที่ถูกหัก
- Net Payment > ยอดสุทธิ ที่ได้รับชำระ
- Credit Available > จำนวนเงินคงเหลือในกรณีที่รับชำระเงินล่วงหน้า
  เนื่องจากยังไม่มีการเลือก invoice มาชำระจึงแสดงคงเหลือเท่ากับ Payment Amount

11. กดปุ่ม **<span class="btn">SAVE</span>** เพื่อบันทึกข้อมูล

![alt text](image-57.png)

12. เมื่อระบบทำการบันทึกข้อมูลเรียบร้อยแล้ว จะขึ้นหน้าต่างแสดงข้อความ Success ให้กดปุ่ม **<span class="btn">OK</span>**

<p align="center">
    <img src="./image-6.png"  />
</p>
