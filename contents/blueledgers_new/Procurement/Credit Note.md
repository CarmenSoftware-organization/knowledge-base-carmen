---
title: Credit Note
weight: 4
published: true
---

**Credit Note**

การทำลดหนี้ (Credit Note) คือ การลดหนี้จากการซื้อสินค้า ซึ่งเกิดขึ้นได้หลายกรณี เช่น การลดหนี้โดยการคืนสินค้าชำรุดเสียหายจากการขนส่งของ หรือมีการปรับปรุงราคาของสินค้า หรือนำมาใช้บันทึกลดหนี้จากสัญญาสินค้าฝากขาย (Consignment) เป็นต้น

**ขั้นตอนการทำเอกสารลดหนี้ในระบบ (Credit Note Process)**

1.  **สามารถเข้าถึง “Function” นี้โดยไปที่ Procurement จากนั้น Click “Credit Note”**

<img src="assets/4_Credit_Note_Revised/media/image1.png" style="width:6.69306in;height:2.35278in" />

2.  **Click “New” เพื่อทำการสร้างเอกสารลดหนี้**

<img src="assets/4_Credit_Note_Revised/media/image2.png" style="width:6.69306in;height:2.20764in" />

3.  **ในหน้าต่าง Credit Note ให้บันทึกข้อมูลดังนี้**

3.1 Date ระบบจะ Default เป็นวันที่ปัจจุบัน

3.2 Doc date ให้ระบุวันที่ใบลดหนี้

3.3 Doc no. ให้ระบุเลขที่ใบลดหนี้

3.4 Vendor ให้ระบุร้านค้าตามเอกสารลดหนี้

3.5 Currency กำหนดสกุลเงินตามเอกสารใบลดหนี้

3.6 Rate Currency ระบบจะแสดงค่าเงิน (Rate Currency) ตามสกุลเงิน (Currency) ที่เลือกใช้

3.7 Description ให้ระบุรายละเอียดของเหตุในการลดหนี้

<img src="assets/4_Credit_Note_Revised/media/image3.png" style="width:6.69306in;height:3.23264in" />

4.  **ให้ Click “Add” เพื่อทำการ Add Item สำหรับลดหนี้**

    1.  เลือกเอกสารรับสินค้าที่ต้องการจะทำลดหนี้ (Receiving no.)

<img src="assets/4_Credit_Note_Revised/media/image4.png" style="width:6.69306in;height:1.60069in" />

2.  เลือกประเภทเอกสารลดหนี้ โดยจะมีให้เลือก 2 ประเภทเอกสาร คือ

- Quantity คือ การลดหนี้จากจำนวนสินค้า (หากต้องการให้จำนวนสินค้าในระบบ Inventory ลดตามเอการลดหนี้ให้เลือกหัวข้อนี้)

- Amount คือ การลดหนี้จากยอดเงินรวม

<img src="assets/4_Credit_Note_Revised/media/image5.png" style="width:4.77991in;height:1.56966in" />

**ขั้นตอนการลดหนี้ประเภท Quantity (ลดหนี้จากจำนวนสินค้า)**

1.  Qty. ระบุจำนวนสินค้าที่ต้องการทำลดหนี้

> (\* ระบบ จะไม่ให้บันทึก Qty ที่มากกว่า Receiving ได้)
>
> Unit ในกรณีที่เป็นการรับคืนสินค้าด้วย หน่วยที่ต่างจาก Receiving
>
> สามารถเปลี่ยนเป็นหน่วยอื่นได้ และสามารถแก้ไข Net และ Tax ให้ตรงกับเอกสาร CN ได้

2.  Adjust Net/Tax ในกรณี Tax ในระบบไม่ตรงกับใบกำกับภาษี สามารถทำการแก้ไข Tax โดยClick เครื่องหมาย √ ที่ Check Box และทำการแก้ไขยอด Tax ให้ถูกต้อง

3.  Click “Select” เมื่อตรวจสอบความถูกต้องเรียบร้อยแล้ว

<img src="assets/4_Credit_Note_Revised/media/image6.png" style="width:4.86015in;height:2.06398in" />

**ขั้นตอนการลดหนี้ประเภท Amount (ลดหนี้จากยอดเงินรวม)**

4.  เลือกประเภทเอกสารเป็น “Amount”

5.  ระบุจำนวนเงินก่อนภาษี ในช่อง “Net”

6.  ระบุยอดภาษีในช่อง “Tax”

7.  Click “Select” เมื่อข้อมูลครบถ้วน

<img src="assets/4_Credit_Note_Revised/media/image6.png" style="width:4.82884in;height:2.05068in" />

8.  Click เครื่องหมาย “X” เพื่อกลับสู่หน้าหลัก และ Click “Save” เพื่อบันทึกเอกสาร

<img src="assets/4_Credit_Note_Revised/media/image7.png" style="width:6.69306in;height:1.38264in" />

4.  **การแก้ไขรายการลดหนี้**

    1.  Click “+” หน้ารายการลดหนี้

    2.  จากนั้น Click “Edit”

<img src="assets/4_Credit_Note_Revised/media/image8.png" style="width:6.69306in;height:0.92153in" />

3.  จากนั้นในช่อง “Qty.” หรือ “Amount” ให้ทำการแก้ไขจำนวนสินค้าให้ถูกต้อง

4.  เมื่อตรวจสอบความถูกต้องเรียบร้อยแล้ว ให้ทำการ Click “Save”

<img src="assets/4_Credit_Note_Revised/media/image9.png" style="width:2.09407in;height:1.26403in" />

5.  หากตรวจสอบแล้วว่าเอกสารถูกต้องและครบถ้วน ให้ทำการ Click “Commit” ยืนยันการทำรายการ (เมื่อทำการ Commit เอกสารไปแล้วจะไม่สามารถแก้ไขข้อมูลใดๆได้อีก)

<img src="assets/4_Credit_Note_Revised/media/image10.png" style="width:6.69306in;height:3.49306in" />
