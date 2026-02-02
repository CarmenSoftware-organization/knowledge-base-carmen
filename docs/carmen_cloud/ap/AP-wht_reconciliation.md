---
title: Withholding Tax Reconciliation
lang: th-TH
---
# Withholding Tax Reconciliation

ขั้นตอนการกระทบยอดหรือยันยันยอดภาษีหัก ณ ที่จ่าย

Function นี้ใช้สำหรับตรวจสอบรายการภาษีหัก ณ ที่จ่าย จากเอกสาร Payment และใช้ในกรณีที่ต้องการเพิ่มรายการภาษีหัก ณ ที่จ่าย ที่เกิดจากการซื้อด้วย Petty Cash (เงินสดย่อย) และการบันทึกจาก module อื่น ๆ ในระบบ สามารถนำมาบันทึกเพื่อนำส่ง และ ออกรายงานภาษีหัก ณ ที่จ่าย เป็นชุดเดียวกัน

Withholding Tax Reconciliation จะประกอบด้วย function การทำงาน 5 ส่วน

A การตรวจสอบรายการภาษีหัก ณ ที่จ่าย (1-6)

B การบันทึกรายการภาษีหัก ณ ที่จ่ายจาก module อื่นๆ ในระบบ (7)

C การ Print แบบฟอร์มภาษีหัก ณ ที่จ่าย (8-12)

D การ Print ใบแนบภาษีหัก ณ ที่จ่ายประเภท 3 และ 53 (13-16)

E การ Export ข้อมูลภาษีหัก ณ ที่จ่าย เป็น text file เพื่อ upload เข้าระบบ RDPrep (17-22)

## A การตรวจสอบรายการภาษีหัก ณ ที่จ่าย จากระบบมีวิธี ดังต่อไปนี้ (1-6)

1.	คลิกเข้าสู่ Account Payable Module
2.	เลือกฟังก์ชัน Procedure ส่วนของ Withholding Tax Reconciliation
3.	ไปที่เมนูคำสั่ง Withholding Tax Reconciliation
![alt text](image-163.png)
ระบบจะเข้าสู่หน้าจอ  Withholding Tax Reconciliation



4.	ให้ระบุ เดือน และปี ในช่อง Month และ Year เพื่อดูข้อมูลภาษีหัก ณ ที่จ่ายของเดือนและปีที่ต้องการ
![alt text](image-164.png)
5.	ระบบจะนำรายการ ภาษีหัก ณ ที่จ่าย จากการทำ Payment มาแสดง ตามตัวอย่างจากภาพด้านล่าง
หมายเหตุ * รายการภาษีหัก ณ ที่จ่าย จะแสดงวันที่ ตาม Payment Date หรือ Cheque Date ขึ้นอยู่กับการตั้งค่า
![alt text](image-165.png)
6.	ในระบบจะแบ่งข้อมูลออกเป็น 2 Source โดยแต่ละ Source จะมีที่มาและรายละเอียดดังนี้
หมายเหตุ * Source ใช้ในการระบุแหล่งที่มาของรายการภาษีหัก ณ ที่จ่าย แต่ละใบโดยแบ่งเป็น 2 ประเภทดังนี้

6.1	Exported คือ รายการที่ Export มาจาก AP Payment ไม่สามารถลบรายการออกไปได้ แต่สามารถแก้ไขข้อมูลได้บางส่วน ได้แก่ Payee, 
Address, Tax ID, Branch No โดยวิธีการแก้ไข ดังนี้

-	กดปุ่ม <img src="/public/edit_icon.svg" style="display: inline-block;" />หน้ารายการที่ต้องการแก้ไข 
-	ระบบจะแสดงหน้าต่าง ให้แก้ไขข้อมูลได้บางส่วน ได้แก่ Payee ,Address, Tax ID, Branch No
-	กดปุ่ม<img src="./image-180.png" style="height: 1.8em; vertical-align: middle; display: inline;" />เพื่อบันทึกรายการ
![alt text](image-166.png)

6.2	User คือ รายการที่ ผู้ใช้งาน ทำการเพิ่มเองในระบบ 

## B การบันทึกรายการภาษีหัก ณ ที่จ่ายจาก module อื่นๆ ในระบบ (7)

ใช้สำหรับการบันทึกรายการภาษีหัก ณ ที่จ่าย ที่เกิดจากการซื้อด้วย Petty Cash (เงินสดย่อย) และการบันทึกจาก module อื่น ๆ ในระบบ สามารถนำมาบันทึกเพื่อนำส่ง และ ออกรายงานภาษีหัก ณ ที่จ่าย เป็นชุดเดียวกัน

7.	ขั้นตอนการบันทึกรายการภาษีหัก ณ ที่จ่ายเพิ่มเติมมีดังนี้

7.1	กดปุ่ม + เพื่อเพิ่มรายการ
 ![alt text](image-167.png)
7.2	ระบบจะแสดงหน้าต่างให้ระบุข้อมูล ดังต่อไปนี้

หมายเหตุ : เครื่องหมาย *  คือช่องที่จำเป็นต้องกรอกข้อมูล 
-	Payment Ref. No	เลขที่ Payment หรือเลขที่ถูกระบุด้วยตนเอง หรือเลขที่ที่เกิดจากระบบสร้างอัตโนมัติ
-	Vendor		ระบุ Vendor Code (ใส่หรือไม่ใส่ก็ได้)
-	*Payee		ระบุชื่อ ที่จะใช้แสดงในรายงาน และ แบบฟอร์มภาษีหัก ณ ที่จ่าย
-	*Address	ระบุที่อยู่ที่จะใช้แสดงในรายงาน และ แบบฟอร์มภาษีหัก ณ ที่จ่าย
-	*Tax ID		ระบุหมายเลขประจำตัวผู้เสียภาษีอากร (13 หลัก) ของผู้ที่ถูกหัก
-	*Branch No.	ระบุรหัสสาขา (5 หลัก) เช่น 00000 (รหัสสาขาของสำนักงานใหญ่) ของผู้ที่ถูกหัก
-	*Withholding Tax Date	ระบุวันที่ หัก ณ ที่จ่าย
-	WHT. No	ระบุเลขที่ หัก ณ ที่จ่าย โดยระบุจะคำนวณให้อัตโนมัติ
-	*WHT. Form		ระบุประเภท หัก ณ ที่จ่าย ว่าเป็น ภ.ง.ด. 3 หรือ ภ.ง.ด. 53 
-	*WHT Service Type	ระบุประเภทค่าบริการที่ถูกหักภาษี ณ ที่จ่าย
-	*WHT Rate %		ระบุจำนวนร้อยละที่หัก (เปอร์เซ็นต์) (ระบบจะแสดง % ตามที่ตั้งค่าใน WHT Service Type)
-	WHT Condition		ระบุเงื่อนไขในการหักภาษี 

o	หัก ณ ที่จ่าย

o	ออกให้ตลอดไป

o	ออกให้ครั้งเดียว

-	*Payment Amount	ระบุจำนวนเงินที่จะนำมาคำนวณภาษี หัก ณ ที่จ่าย
-	*WHT. Amount		ระบบคำนวนให้อัตโนมัติ (ผู้ใช้งานสามารถคีย์ยอดที่หัก ได้เอง)

เมื่อใส่ข้อมูลครบถ้วน ถูกต้อง เรียบร้อยแล้ว กดที่ปุ่ม<img src="./image-180.png" style="height: 1.8em; vertical-align: middle; display: inline;" />เพื่อบันทึกรายการ หรือกด “Cancel” เพื่อยกเลิก โดยรายการที่เพิ่มด้วยตนเองจะแสดง Source = “User”
![alt text](image-168.png)
## C การ Print แบบฟอร์มภาษีหัก ณ ที่จ่าย (8-12)

8.	ทำตามขั้นตอนที่ 1 – 4 
9.	ติ๊กถูก ☑️ รายการภาษีหัก ณ ที่จ่ายเพื่อกำหนดข้อมูลที่ต้องการ print 
10.	ปุ่ม Print Form <img src="./image-177.png" style="height: 1.8em; vertical-align: middle; display: inline;" />	เพื่อแสดงแบบฟอร์มหนังสือรับรอง หัก ณ ที่จ่าย
![alt text](image-169.png)
11.	จากนั้นสามารถเลือกว่าต้องการ print พร้อมสำเนาหรือไม่ 
12.	กด Print  เพื่อพิมพ์แบบฟอร์ม หรือ กด Cancel เพื่อยกเลิก
![alt text](image-178.png)

ตัวอย่างแบบฟอร์มภาษีหัก ณ ที่จ่ายในระบบ
![alt text](image-171.png)
## D การ Print ใบแนบภาษีหัก ณ ที่จ่ายประเภท 3 และ 53 (13-16)
13.	ทำตามขั้นตอน 1 – 4
14.	กดปุ่ม Print Report <img src="./image-179.png" style="height: 1.8em; vertical-align: middle; display: inline;" />เพื่อพิมพ์ใบแนบที่ต้องการ
![alt text](image-172.png)
15.	สามารถเลือก ประเภทรายงาน  ภ.ง.ด. 3 หรือ ภ.ง.ด. 53 เพื่อ print
16.	กดปุ่ม <img src="./image-180.png" style="height: 1.8em; vertical-align: middle; display: inline;" />เพื่อยืนยัน หรือ Cancel เพื่อยกเลิก
 ![alt text](image-173.png)
 
ตัวอย่างใบแนบ ภ.ง.ด. 3
![alt text](image-174.png)

ตัวอย่างใบแนบ ภ.ง.ด. 53
![alt text](image-175.png)

## E การ Export ข้อมูลภาษีหัก ณ ที่จ่าย เป็น text file เพื่อ upload เข้าระบบ RDPrep (17-22)
17.	ทำตามขั้นตอน 1 – 4
18.	ติ๊กถูก ☑️ รายการภาษีหัก ณ ที่จ่ายเพื่อกำหนดข้อมูลที่ต้องการ export

19.	กดปุ่ม ที่<img src="./image-181.png" style="height: 3em; vertical-align: middle; display: inline;" />อยู่ด้านบนขวา
20.	เพื่อ export text file<img src="./image-182.png" style="height: 4em; vertical-align: middle; display: inline;" />โดยสามารถดูได้ที่ function Download ของ Browser ที่ใช้งาน
![alt text](image-176.png)
21.	ระบบจะทำการ Export ไฟล์ข้อมูล เมื่อเรียบร้อยแล้วจะจัดเก็บอยู่ที่ Folder Download (folder อาจเก็บที่อื่นตามการตั้งค่าของ Browser ที่ใช้งาน และ User สามารถย้ายไฟล์ไปเก็บไว้ที่ Drive ที่ต้องการได้ในภายหลัง) 
22.	นำไฟล์ที่ได้ไปอัพโหลดเข้าสู่โปรแกรมโอนย้ายข้อมูล (RDPrep) ของสรรพกร
23.	เมื่อเสร็จสิ้นกระบวนการให้กดปุ่มกากบาท<img src="./image-183.png" style="height: 2.5em; vertical-align: middle; display: inline;" />ด้านบนขวามือเพื่อออกจากหน้า Withholding Tax Reconciliation

หมายเหตุ : 
รายการที่เพิ่มเข้ามาจากฟังก์ชันนี้ เพื่อให้แสดงรายการใน แบบฟอร์ม รายงานภาษี หัก ณ ที่จ่ายเท่านั้น ไม่มีส่วนที่เกี่ยวข้องกับ Payment ในระบบ และไม่เกี่ยวข้องกับการบันทึกบัญชีใน General Ledger Module

<p style="margin: 0;">Video ประกอบ</p>
<h3 style="margin: 0;">Withholding Tax Reconciliation | การตรวจสอบภาษีหัก ณ ที่จ่าย</h3>

<iframe width="560" height="315" src="https://www.youtube.com/embed/0sT1E-a-yGQ?si=hJrJv1bhSRzmHRSo" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

<iframe width="560" height="315" src="https://www.youtube.com/embed/MvQBNtYNVkU?si=YcaHroTWfOCIfFnL" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe> 



<!-- # Withholding Tax Reconciliation

ขั้นตอนการกระทบยอดหรือยันยันยอดภาษีหัก ณ ที่จ่าย

Function นี้ใช้สำหรับตรวจสอบรายการภาษีหัก ณ ที่จ่าย จากเอกสาร Payment และใช้ในกรณีที่ต้องการเพิ่มรายการภาษีหัก ณ ที่จ่าย ที่เกิดจากการซื้อด้วย Petty Cash (เงินสดย่อย) และการบันทึกจาก module อื่น ๆ ในระบบ สามารถนำมาบันทึกเพื่อนำส่ง และ ออกรายงานภาษีหัก ณ ที่จ่าย เป็นชุดเดียวกัน
Withholding Tax Reconciliation จะประกอบด้วย function การทำงาน 5 ส่วน

A การตรวจสอบรายการภาษีหัก ณ ที่จ่าย (1-6)

B การบันทึกรายการภาษีหัก ณ ที่จ่ายจาก module อื่นๆ ในระบบ (7)

C การ Print แบบฟอร์มภาษีหัก ณ ที่จ่าย (8-12)

D การ Print ใบแนบภาษีหัก ณ ที่จ่ายประเภท 3 และ 53 (13-16)

E การ Export ข้อมูลภาษีหัก ณ ที่จ่าย เป็น text file เพื่อ upload เข้าระบบ RDPrep (17-22)

## การตรวจสอบรายการภาษีหัก ณ ที่จ่าย

จากระบบมีวิธี ดังต่อไปนี้ (1-6)

1. Click เข้าสู่ Account Payable Module

2. เลือกฟังก์ชัน Procedure ส่วนของ Withholding Tax Reconciliation

3. ไปที่เมนูคำสั่ง Withholding Tax Reconciliation

![alt text](image-51.png)

ระบบจะเข้าสู่หน้าจอ Withholding Tax Reconciliation

4. ให้ระบุ เดือน และปี ในช่อง Month และ Year เพื่อดูข้อมูลภาษีหัก ณ ที่จ่ายของเดือนและปีที่ต้องการ

![alt text](image-52.png)

5. ระบบจะนำรายการ ภาษีหัก ณ ที่จ่าย จากการทำ Payment มาแสดง ตามตัวอย่างจากภาพด้านล่าง
   หมายเหตุ \* รายการภาษีหัก ณ ที่จ่าย จะแสดงวันที่ ตาม Payment Date หรือ Cheque Date ขึ้นอยู่กับการตั้งค่า

![alt text](image-53.png)

6. ในระบบจะแบ่งข้อมูลออกเป็น 2 Source โดยแต่ละ Source จะมีที่มาและรายละเอียดดังนี้
   หมายเหตุ \* Source ใช้ในการระบุแหล่งที่มาของรายการภาษีหัก ณ ที่จ่าย แต่ละใบโดยแบ่งเป็น 2 ประเภทดังนี้

   6.1 Exported คือ รายการที่ Export มาจาก AP Payment ไม่สามารถลบรายการออกไปได้ แต่สามารถแก้ไขข้อมูลได้บางส่วน ได้แก่ Payee, Address, Tax ID, Branch No โดยวิธีการแก้ไข ดังนี้

   - กดปุ่ม <img src="/public/edit_icon.svg" style="display: inline-block;" /> หน้ารายการที่ต้องการแก้ไข
   - ระบบจะแสดงหน้าต่าง ให้แก้ไขข้อมูลได้บางส่วน ได้แก่ Payee ,Address, Tax ID, Branch No
   - กดปุ่ม **<span class="btn">OK</span>** เพื่อบันทึกรายการ
   <p align="center">
    <img src="./image-54.png"  />
   </p>
   6.2 User คือ รายการที่ ผู้ใช้งาน ทำการเพิ่มเองในระบบ

## การบันทึกรายการภาษีหัก ณ ที่จ่ายจาก module อื่นๆ ในระบบ (7)

ใช้สำหรับการบันทึกรายการภาษีหัก ณ ที่จ่าย ที่เกิดจากการซื้อด้วย Petty Cash (เงินสดย่อย) และการบันทึกจาก module อื่น ๆ ในระบบ สามารถนำมาบันทึกเพื่อนำส่ง และ ออกรายงานภาษีหัก ณ ที่จ่าย เป็นชุดเดียวกัน

7. ขั้นตอนการบันทึกรายการภาษีหัก ณ ที่จ่ายเพิ่มเติมมีดังนี้

   7.1 กดปุ่ม + เพื่อเพิ่มรายการ
   <p align="center">
    <img src="./image-55.png"  />
   </p>
    7.2	ระบบจะแสดงหน้าต่างให้ระบุข้อมูล ดังต่อไปนี้

   **หมายเหตุ** เครื่องหมาย <span class="asterisk">\*</span> คือช่องที่จำเป็นต้องระบุ

   - Payment Ref. No > เลขที่ Payment หรือเลขที่ถูกระบุด้วยตนเอง หรือเลขที่ที่เกิดจากระบบสร้างอัตโนมัติ
   - Vendor > ระบุ Vendor Code (ใส่หรือไม่ใส่ก็ได้)
   - <span class="asterisk">\*</span> Payee > ระบุชื่อ ที่จะใช้แสดงในรายงาน และ แบบฟอร์มภาษีหัก ณ ที่จ่าย
   - <span class="asterisk">\*</span> Address > ระบุที่อยู่ที่จะใช้แสดงในรายงาน และ แบบฟอร์มภาษีหัก ณ ที่จ่าย
   - <span class="asterisk">\*</span> Tax ID > ระบุหมายเลขประจำตัวผู้เสียภาษีอากร (13 หลัก) ของผู้ที่ถูกหัก
   - <span class="asterisk">\*</span> Branch No. > ระบุรหัสสาขา (5 หลัก) เช่น 00000 (รหัสสาขาของสำนักงานใหญ่) ของผู้ที่ถูกหัก
   - <span class="asterisk">\*</span> Withholding Tax Date > ระบุวันที่ หัก ณ ที่จ่าย
   - WHT. No > ระบุเลขที่ หัก ณ ที่จ่าย โดยระบุจะคำนวณให้อัตโนมัติ
   - <span class="asterisk">\*</span> WHT. Form > ระบุประเภท หัก ณ ที่จ่าย ว่าเป็น ภ.ง.ด. 3 หรือ ภ.ง.ด. 53
   - <span class="asterisk">\*</span> WHT Service Type > ระบุประเภทค่าบริการที่ถูกหักภาษี ณ ที่จ่าย
   - <span class="asterisk">\*</span> WHT Rate % > ระบุจำนวนร้อยละที่หัก (เปอร์เซ็นต์) (ระบบจะแสดง % ตามที่ตั้งค่าใน WHT Service Type)
   - WHT Condition > ระบุเงื่อนไขในการหักภาษี
     - หัก ณ ที่จ่าย
     - ออกให้ตลอดไป
     - ออกให้ครั้งเดียว
   - <span class="asterisk">\*</span> Payment Amount > ระบุจำนวนเงินที่จะนำมาคำนวณภาษี หัก ณ ที่จ่าย
   - <span class="asterisk">\*</span> WHT. Amount > ระบบคำนวนให้อัตโนมัติ (ผู้ใช้งานสามารถคีย์ยอดที่หัก ได้เอง)

เมื่อใส่ข้อมูลครบถ้วน ถูกต้อง เรียบร้อยแล้ว กดที่ปุ่ม **<span class="btn">OK</span>** เพื่อบันทึกรายการ

![alt text](image-56.png)

## การ Print แบบฟอร์มภาษีหัก ณ ที่จ่าย (8-12)

ทำตามขั้นตอนที่ 1 – 4

9. ติ๊กถูก ☑️ รายการภาษีหัก ณ ที่จ่ายเพื่อกำหนดข้อมูลที่ต้องการ print

10. ปุ่ม Print Form <img src="./image-57.png" style="display: inline-block;" /> เพื่อแสดงแบบฟอร์มหนังสือรับรอง หัก ณ ที่จ่าย

![alt text](image-58.png)

11. จากนั้นสามารถเลือกว่าต้องการ print พร้อมสำเนาหรือไม่

12. กด **<span class="btn">PRINT</span>** เพื่อพิมพ์แบบฟอร์ม หรือ กด Cancel เพื่อยกเลิก

<p align="center">
    <img src="./image-59.png"  />
</p>

## ตัวอย่างแบบฟอร์มภาษีหัก ณ ที่จ่ายในระบบ

![alt text](image-60.png)

## การ Print ใบแนบภาษีหัก ณ ที่จ่ายประเภท 3 และ 53 (13-16)

13. ทำตามขั้นตอน 1 – 4

14. กดปุ่ม Print Report <img src="./image-61.png" style="display: inline-block;" /> เพื่อพิมพ์ใบแนบที่ต้องการ

![alt text](image-62.png)

15. สามารถเลือก ประเภทรายงาน ภ.ง.ด. 3 หรือ ภ.ง.ด. 53 เพื่อ print
16. กดปุ่ม **<span class="btn">OK</span>** เพื่อยืนยัน หรือ Cancel เพื่อยกเลิก

<p align="center">
    <img src="./image-63.png"  />
</p>

## ตัวอย่างใบแนบ ภ.ง.ด. 3

![alt text](image-64.png)

## ตัวอย่างใบแนบ ภ.ง.ด. 53

![alt text](image-65.png)

## การ Export ข้อมูลภาษีหัก ณ ที่จ่าย เป็น text file เพื่อ upload เข้าระบบ RDPrep (17-22)

17. ทำตามขั้นตอน 1 – 4

18. ติ๊กถูก ☑️ รายการภาษีหัก ณ ที่จ่ายเพื่อกำหนดข้อมูลที่ต้องการ export

19. กดปุ่ม <img src="./image-66.png" style="display: inline-block;" /> ที่อยู่ด้านบนขวา

20. เพื่อ export text file โดย <img src="./image-67.png" style="display: inline-block;" /> สามารถดูได้ที่ function Download ของ Browser ที่ใช้งาน

![alt text](image-68.png)

21. ระบบจะทำการ Export ไฟล์ข้อมูล เมื่อเรียบร้อยแล้วจะจัดเก็บอยู่ที่ Folder Download (folder อาจเก็บที่อื่นตามการตั้งค่าของ Browser ที่ใช้งาน และ User สามารถย้ายไฟล์ไปเก็บไว้ที่ Drive ที่ต้องการได้ในภายหลัง)

22. นำไฟล์ที่ได้ไปอัพโหลดเข้าสู่โปรแกรมโอนย้ายข้อมูล (RDPrep) ของสรรพกร

23. เมื่อเสร็จสิ้นกระบวนการให้กดปุ่มกากบาท X ด้านบนขวามือเพื่อออกจากหน้า Withholding Tax Reconciliation

**หมายเหตุ :**

รายการที่เพิ่มเข้ามาจากฟังก์ชันนี้ เพื่อให้แสดงรายการใน แบบฟอร์ม รายงานภาษี หัก ณ ที่จ่ายเท่านั้น ไม่มีส่วนที่เกี่ยวข้องกับ Payment ในระบบ และไม่เกี่ยวข้องกับการบันทึกบัญชีใน General Ledger Module

<p style="margin: 0;">Video ประกอบ</p>
<h3 style="margin: 0;">Withholding Tax Reconciliation | การตรวจสอบภาษีหัก ณ ที่จ่าย</h3>

<iframe width="560" height="315" src="https://www.youtube.com/embed/0sT1E-a-yGQ?si=hJrJv1bhSRzmHRSo" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

<iframe width="560" height="315" src="https://www.youtube.com/embed/MvQBNtYNVkU?si=YcaHroTWfOCIfFnL" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe> -->