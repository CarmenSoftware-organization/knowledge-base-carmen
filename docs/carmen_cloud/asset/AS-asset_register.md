---
title: Asset Register
lang: th-TH
---


# Asset Register

Function นี้ใช้สำหรับบันทึกสินทรัพย์ลงในระบบเพื่อใช้ในการคำนวณค่าเสื่อมราคา และค่าเสื่อมราคาสะสม
การบันทึกสินทรัพย์ในระบบทำได้ 3 วิธี คือ
1. การบันทึกสินทรัพย์ด้วยตนเอง (Asset Register Manually)

1.1 Click “Asset Module”

1.2 Click “Asset Register”

1.3 Click “Add” เพื่อเพิ่มสินทรัพย์ใหม่ลงระบบ
![alt text](image-46.png) 

1.4 ระบบจะแสดงหน้าต่าง Asset Register จากตัวอย่างภาพด้านล่าง ให้ระบุข้อมูลต่อไปนี้

รายละเอียดการบันทึกข้อมูลสินทรัพย์
Asset Register
* Asset No.  	รหัสสินทรัพย์ และเลขลำดับที่ (ในกรณีที่มีการ copy สินทรัพย์)
สามารถกำหนดเอง หรือ ตั้งค่าให้ระบบ Auto Generate Asset ID
* Asset Name	ระบุชื่อสินทรัพย์ สามารถกำหนดชื่อสินทรัพย์ได้ทั้งภาษาไทยและภาษาอังกฤษ
Barcode	ใส่รหัส Barcode ของสินทรัพย์ (หากมี)
* Input Date	ระบุวันที่บันทึกสินทรัพย์เข้าระบบ หรือวันที่ที่ให้ระบบ Carmen เริ่มคำนวณค่าเสื่อมราคาของสินทรัพย์
* Acquire Date	ระบุวันที่เริ่มคำนวณค่าเสื่อมราคาของสินทรัพย์จริง เช่น สินทรัพย์ถูกคำนวณค่าเสื่อมราคาจากระบบอื่น มาก่อน ให้ระบุวันที่ที่เริ่มคำนวณค่าเสื่อมราคาจากระบบดังกล่าว
Acquire Date จะมีผลต่อการคำนวณวันหมดอายุของสินทรัพย์
* Category* 	ระบุรหัสประเภทสินทรัพย์ เพื่อแบ่งหมวดหมู่ของสินทรัพย์ให้สัมพันธ์กับผังบัญชี
* Department	ระบุรหัสแผนกที่เป็นเจ้าของสินทรัพย์
Invoice # 	ระบุเลขที่เอกสารที่ซื้อสินทรัพย์
Transfer Date	ระบุวันที่โอนย้ายสินทรัพย์	
* Location 	ระบุรหัสสถานที่ตั้งสินทรัพย์
Vendor		ระบุรหัสร้านค้าที่ซื้อสินทรัพย์
Serial No.	ระบุหมายเลข Serial ของสินทรัพย์
Specification	ระบุรายละเอียดสินทรัพย์
Remark	ระบุหมายเหตุ หรือ ข้อมูลเพิ่มเติมสำหรับสินทรัพย์
Register Value
* Currency	เลือกสกุลเงินที่ใช้ในการบันทึกสินทรัพย์
* Rate		ระบุอัตราการแลกเปลี่ยนสกุลเงิน	
* Amount/Unit	ระบุราคาสินทรัพย์ต่อหน่วย / ไม่รวมภาษี
* Unit		เลือกหน่วยของสินทรัพย์
* Qty.	 	ระบุจำนวนสินทรัพย์
Salvage Value/Unit ระบุค่าซากต่อหน่วย (ปกติเป็น 1 บาท)
* Asset Life	 ระบุประเภทอายุของการคำนวณ เช่น Year, Month, Day 
* Asset Life	ระบุอายุที่จะให้คำนวณสินทรัพย์
Ini. Accu. Depre. ระบุค่าเสื่อมราคาสะสมยกมา กรณีสินทรัพย์มีการคำนวณค่าเสื่อมมาแล้ว
![alt text](image-56.png)

* Asset Account กำหนดรหัส Department Code และ Account Code ในการบันทึกบัญชี ดังต่อไปนี้

Cost Account

Cost Dept	กำหนด Department Code ที่จะใช้บันทึกบัญชีตามประเภทสินทรัพย์

Cost Account	กำหนด Account Code ที่จะใช้บันทึกบัญชีตามประเภทสินทรัพย์

Accu. Depreciation 

Accu. Dept	กำหนด Department Code ที่จะใช้บันทึกค่าเสื่อมราคาสะสม

Accu. Account กำหนด Account Code ที่จะใช้บันทึกค่าเสื่อมราคาสะสมตาม

Depreciation Account

Depre Dept 	กำหนด Department Code ที่จะใช้บันทึกค่าเสื่อมราคา

Depre Account กำหนด Account Code ที่จะใช้บันทึกค่าเสื่อมราคา

ตรวจสอบความถูกต้องของข้อมูล เมื่อเรียบร้อยแล้วกดปุ่ม               เพื่อบันทึกข้อมูลเข้าระบบ

เมื่อ save แล้ว ระบบจะทำการคำนวณค่าเสื่อมราคาเอาไว้ให้ล่วงหน้า ตั้งแต่วันเริ่มต้น จนสิ้นสุด

หมายเหตุ: หัวข้อทีมีเครื่องหมาย * อยู่ด้านหน้าคือข้อมูลที่จำเป็นต้องระบุ
![alt text](image-57.png)

วิธีคำนวณค่าเสื่อมราคา

เมื่อสร้างสินทรัพย์สำเร็จ ระบบจะทำการคำนวณค่าเสื่อมราคาตั้งแต่เดือนเริ่มต้น จนถึงเดือนที่สิ้นสุด ตามวิธีคำนวณค่าเสื่อมราคาแบบเส้นตรง

ระบบจะคำนวณด้วยการนำราคาต้นทุนของอุปกรณ์ ลบด้วยมูลค่าซาก และลบด้วยค่าเสื่อมราคาสะสมยกมา 

หารด้วยจำนวนวันของอายุสินทรัพย์ เพื่อจะได้ค่าเสื่อมราคาต่อวันของสินทรัพย์

นำค่าเสื่อมราคาต่อวัน คูณด้วยจำนวนของแต่ละเดือน จะทำให้ค่าเสื่อมราคาแต่ละเดือนอาจต่างกันได้เล็กน้อย 

***ค่าเสื่อมราคา = ( (ราคาต้นทุน – ค่าเสื่อมราคาสะสม – มูลค่าซาก) / อายุการใช้งานทั้งหมด (วัน) ) *จำนวนวันของแต่ละเดือน

<img src="/public/add_icon.png" style="display: inline-block;" /> ใช้ในกรณีต้องการจะสร้างเอกสารบันทึกข้อมูล Assets Details ใหม่ <br/>
<img src="/public/edit_icon.png" style="display: inline-block;" /> ใช้ในกรณีต้องการแก้ไขข้อมูลในเอกสารที่ทำการบันทึกไปเรียบร้อยแล้ว <br/>
<img src="/public/del_icon.png" style="display: inline-block;" /> ใช้ในกรณีต้องการลบเอกสารที่ได้บันทึกไปแล้ว <span style="color:red">(สินทรัพย์ที่อยู่ใน Period ที่ปิดไปแล้วจะไม่สามารถลบข้อมูล และแก้ไขได้เพียง account code เท่านั้น)</span> <br/>
<img src="/public/copy_icon.png" style="display: inline-block;" /> ใช้ในกรณีต้องการคัดลอกข้อมูลจากประเภทสินทรัพย์ชนิดเดียวกัน มีข้อมูลเหมือนกัน เพื่อต้องการแตก
รายการสินทรัพย์ให้มีจำนวนมากกว่า 1 รายการ
<br/>
<img src="/public/disposal_icon.png" style="display: inline-block;" /> ใช้ในกรณีต้องการทราบรายละเอียดการตัดจำหน่ายสินทรัพย์ <br/>
<img src="/public/preasset_icon.png" style="display: inline-block;" /> ใช้ในกรณีต้องการสร้างทะเบียนสินทรัพย์จาก Pre-Register Asset <br/>
<img src="/public/print_icon.png" style="display: inline-block;" /> ใช้ในกรณีพิมพ์ Register Asset Form <br/>
<img src="/public/print_barcode_icon.png" style="display: inline-block;" /> ใช้ในกรณีพิมพ์ Barcode <br/>

2. การบันทึกสินทรัพย์ด้วยการ Copy จากสินทรัพย์ที่มีอยู่ในระบบ

2.1 CLICK เข้าสู่ Asset Module

2.2 กดปุ่ม Asset Register

2.3 Click เครื่องหมาย      เลือกรายการสินทรัพย์ที่ต้องการจะทำการ Copy รายการสินค้า
![alt text](image-58.png) 

เมื่อเข้าสู่หน้าต่างรายการสินทรัพย์ที่เลือกไว้แล้ว ให้ทำการClick เมนู Copy
![alt text](image-59.png)

ระบบจะแสดงหน้าต่าง Copy Asset เพื่อให้ระบุจำนวนสินทรัพย์ที่ต้องการจะคัดลอกข้อมูล และเมื่อกำหนดข้อมูลเสร็จเรียบร้อยแล้ว ให้ Click                 

รายละเอียดในการบันทึกข้อมูล มีดังนี้
Item to Copy 	คือ จำนวนที่ต้องการสร้างสินทรัพย์เพิ่ม เช่นต้องการเพิ่ม 4 ชิ้น ให้กรอกช่อง Item to Copy = 4 ชิ้น
Asset No.	คือ เลขที่สินทรัพย์ที่ระบบจะทำการสร้างให้อัตโนมัติ
* Input Date	ระบุวันที่บันทึกสินทรัพย์เข้าระบบ หรือวันที่ที่ให้ระบบ Carmen เริ่มคำนวณค่าเสื่อมราคาของสินทรัพย์
* Acquire Date	ระบุวันที่เริ่มคำนวณค่าเสื่อมราคาของสินทรัพย์จริง เช่น สินทรัพย์ถูกคำนวณค่าเสื่อมราคาจากระบบอื่น มาก่อน ให้ระบุวันที่ที่เริ่มคำนวณค่าเสื่อมราคาจากระบบดังกล่าว

Acquire Date สามารถระบุวันที่ก่อน หรือ เท่ากับ Input date เท่านั้น แบะ Acquire Date จะใช้ในการคำนวณวันหมดอายุของสินทรัพย์
![alt text](image-60.png)

หมายเหตุ สำหรับสินทรัพย์ที่สามารถแยกแยะความแตกต่างกันได้ เช่น โทรทัศน์ Computer ขอแนะนำให้ใช้ Copy เพื่อบันทึกสินทรัพย์เป็นรายตัว เพื่อใส่ข้อมูลเพิ่มเติมแตกต่างกันได้เช่น Serial no.
จากนั้นระบบจะแสดงผลการบันทึกข้อมูล และเมื่อ Click               อีกครั้ง 
![alt text](image-61.png)
ระบบแสดงรายการสินทรัพย์ที่ทำการคัดลอกสำเร็จ จากหน้าจอหนี้สามารถ Click เครื่องหมาย เพื่อทำการแก้ไขข้อมูลต่อไป
![alt text](image-62.png)
3. การบันทึกสินทรัพย์โดยใช้ข้อมูลจาก Pre-Register Asset

3.1 CLICK เข้าสู่ Asset Module

3.2 กดปุ่ม Asset Register

3.3 กดปุ่ม<img src="/public/add_icon.png" style="display: inline-block;" />เพื่อเพิ่มสินทรัพย์ใหม่ลงระบบ
![alt text](image-63.png)

จากรูปด้านล่างให้ CLICK <img src="/public/preasset_icon.png" style="display: inline-block;" /> เลือกเมนู
![alt text](image-64.png)

ระบบจะแสดงรายการสินทรัพย์ที่ได้จากการดึงข้อมูลจากระบบ AP หรือระบบ Receiving ให้ Double Click ที่รายการสินทรัพย์เพื่อดึงข้อมูลเข้าสู่ระบบบันทึกสินทรัพย์

ทำการบันทึกข้อมูลสินทรัพย์ตามขั้นตอนที่ 1.4
![alt text](image-65.png)

การดูประวัติการคำนวณค่าเสื่อมราคา History Depreciation 

เมื่อสร้างสินทรัพย์สำเร็จ ระบบจะทำการคำนวณค่าเสื่อมราคาตั้งแต่เดือนเริ่มต้น จนถึงเดือนที่สิ้นสุด ตามวิธีคำนวณค่าเสื่อมราคาแบบเส้นตรงระบบจะคำนวณด้วยการนำราคาต้นทุนของอุปกรณ์ ลบด้วยมูลค่าซาก และละด้วยค่าเสื่อมราคาสะสมยกมา หารด้วยจำนวนวันของอายุสินทรัพย์ เพื่อจะได้ค่าเสื่อมราคาต่อวันของสินทรัพย์นำค่าเสื่อมราคาต่อวัน คูณด้วยจำนวนของแต่ละเดือน จะทำให้ค่าเสื่อมราคาแต่ละเดือนอาจต่างกันได้เล็กน้อย 

ค่าเสื่อมราคา = ( (ราคาต้นทุน – ค่าเสื่อมราคาสะสม – มูลค่าซาก) ÷ อายุการใช้งานทั้งหมด ) *จำนวนวันของแต่ละเดือน

ค่าเสื่อมราคาจะแสดงข้อมูลใน Tab : History Depreciation ตามตัวอย่างจากรูปข้างล่างนี้
![alt text](image-66.png)

4. การดูประวัติการขายสินทรัพย์ History Disposal 

เมื่อมีการขาย หรือตัดจำหน่ายสินทรัพย์ด้วย function : Disposal ระบบจะแสดงประวัติการขายหรือตัดจำหน่าย โดยแสดงข้อมูลวันที่ ประเภทการตัดจำหน่าย มูลค่าต้นทุน และมูลค่าที่ขายสินทรัพย์

ขั้นตอนการดูข้อมูล

4.1 เลือกสินทรัพย์ที่ต้องการดูข้อมูล

4.2 เลือก Tab : History Disposal

4.3 ระบบจะแสดงประวัติ Disposal ในระบบ
![alt text](image-67.png)

จากข้อมูลการตัดจำหน่ายสินทรัพย์ตามภาพด้านบนนี้ ผู้ใช้งานสามารถกดปุ่มเพื่อดาวน์โหลด  ข้อมูลเป็น Excel file เพื่อนำไปใช้งานในรูปแบบอื่นที่ต้องการต่อไปได้

5. การบันทึกโอนย้ายทรัพย์สินระหว่างแผนก

ขั้นตอนการโอนย้ายสินทรัพย์ระหว่างแผนก

5.1 เลือกรายการสินทรัพย์ที่ต้องการโอนย้าย Click ที่เครื่องหมาย<img src="./image-15.png" style="display: inline-block;" />เพื่อดูข้อมูลสินทรัพย์
![alt text](image-68.png) 

5.2 Click Edit เพื่อทำการแก้ไขข้อมูล เปลี่ยน Location จาก FO OFFICE ไปยัง HR OFFICE และ Click “Save” ตามตัวอย่างภาพด้านล่าง
![alt text](image-69.png)

5.3 หลังจากกด Save เรียบร้อยแล้วระบบจะแสดงหน้าต่างว่าบันทึกข้อมูลสำเร็จแล้ว หลังจากนั้นกด OK
![alt text](image-70.png) 

6. การดูประวัติโอนย้ายสินทรัพย์ History Location 

ประวัติการย้าย แผนก หรือ Transfer location ในระบบ หลังจากบันทึก Asset Register เรียบร้อยแล้ว หากมีการโอนย้ายสินทรัพย์นั้นจาก Location A ไปยัง Location B ระบบจะทำการบันทึกประวัติการโอนย้ายแผนกและสถานที่จัดเก็บสินทรัพย์นั้นให้ทราบ 

•	ทำการเปิดสินทรัพย์ที่ต้องการดูประวัติการโอนย้าย

•	เปิด tab : History Location

•	ระบบจะแสดงประวัติการโอนย้ายแผนกหรือสถานที่เก็บสินทรัพย์
![alt text](image-71.png)

7. การแก้ไขสินทรัพย์ใน Period ที่ได้ทำการ Close Period ไปแล้ว

7.1 Click “ Asset Register”

7.2 Click เลือกวันที่เพื่อค้นหาเอกสาร

7.3 Click สัญลักษณ์<img src="./image-15.png" style="display: inline-block;" />เพื่อแก้ไขเอกสาร
![alt text](image-72.png)

7.4 Click “Edit” ในหน้าต่าง Asset Management 
![alt text](image-73.png) 

7.4.1 ระบบแจ้งให้ทราบว่ารายการทรัพย์สินนี้ได้ทำการ Close Period ไปแล้ว หากต้องการดำเนินการแก้ไขให้ Click “Yes”
![alt text](image-74.png)

7.4.2 ระบบแสดงหน้าต่าง Edit เพื่อให้แก้ไขข้อมูล โดยข้อมูลที่สามารถแก้ไขได้ คือ

•	Department

•	Location

•	Transfer Date

Asset Mapping Acc. Code

•	Department Code

•	Account Code 

Accumulated depreciation Mapping Acc. Code

•	Department Code

•	Account Code 

Depreciation Mapping Acc. Code

•	Department Code

•	Account Code 
7.4.3 Click “Ok” เมื่อแก้ไขข้อมูลเสร็จสิ้น
![alt text](image-75.png)

7.4.4 ระบบจะแสดงข้อความยืนยัน “Success”
![alt text](image-76.png)

ตัวอย่าง JV สำหรับการบันทึกบัญชีค่าเสื่อมราคาจากการ Posting Asset to GL
![alt text](image-77.png)

<p style="margin: 0;">Video ประกอบ</p>
<h3 style="margin: 0;">Asset Registration | การลงทะเบียนสินทรัพย์</h3>

<iframe width="560" height="315" src="https://www.youtube.com/embed/hnREj9whgUc?si=MqybJ9QImp5b_-g9" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

<iframe width="560" height="315" src="https://www.youtube.com/embed/p0GvQwEjajU?si=1rd57v3N4-jWAk50" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>



<!-- # Asset Register

Function นี้ใช้สำหรับบันทึกสินทรัพย์ลงในระบบเพื่อใช้ในการคำนวณค่าเสื่อมราคา และค่าเสื่อมราคาสะสม
การบันทึกสินทรัพย์ในระบบทำได้ 3 วิธี คือ

## การบันทึกสินทรัพย์ด้วยตนเอง (Asset Register Manually)

1.1 CLICK เข้าสู่ Asset Module

1.2 กดปุ่ม Asset Register

1.3 กดปุ่ม <img src="/add_icon.png" style="display: inline-block;" /> เพื่อเพิ่มสินทรัพย์ใหม่ลงระบบ

![alt text](image-11.png)

1.4 ระบบจะแสดงหน้าต่าง Asset Register จากตัวอย่างภาพด้านล่าง ให้ระบุข้อมูลต่อไปนี้

**รายละเอียดการบันทึกข้อมูลสินทรัพย์**

**Asset Register**

**หมายเหตุ** เครื่องหมาย <span class="asterisk">\*</span> คือช่องที่จำเป็นต้องระบุ

- <span class="asterisk">\*</span> Asset No. > รหัสสินทรัพย์ และเลขลำดับที่ (ในกรณีที่มีการ copy สินทรัพย์)
  - สามารถกำหนดเอง หรือ ตั้งค่าให้ระบบ Auto Generate Asset ID
- <span class="asterisk">\*</span> Asset Name > ระบุชื่อสินทรัพย์ สามารถกำหนดชื่อสินทรัพย์ได้ทั้งภาษาไทยและภาษาอังกฤษ
- Barcode ใส่รหัส Barcode ของสินทรัพย์ (หากมี)
- <span class="asterisk">\*</span> Input Date > ระบุวันที่บันทึกสินทรัพย์เข้าระบบ หรือวันที่ที่ให้ระบบ Carmen เริ่มคำนวณค่าเสื่อมราคาของสินทรัพย์
- <span class="asterisk">\*</span> Acquire Date > ระบุวันที่เริ่มคำนวณค่าเสื่อมราคาของสินทรัพย์จริง เช่น สินทรัพย์ถูกคำนวณค่าเสื่อมราคาจากระบบอื่น มาก่อน ให้ระบุวันที่ที่เริ่มคำนวณค่าเสื่อมราคาจากระบบดังกล่าว
   Acquire Date จะมีผลต่อการคำนวณวันหมดอายุของสินทรัพย์
- <span class="asterisk">\*</span> Category > ระบุรหัสประเภทสินทรัพย์ เพื่อแบ่งหมวดหมู่ของสินทรัพย์ให้สัมพันธ์กับผังบัญชี
- <span class="asterisk">\*</span> Department > ระบุรหัสแผนกที่เป็นเจ้าของสินทรัพย์
- Invoice # > ระบุเลขที่เอกสารที่ซื้อสินทรัพย์
- Transfer Date > ระบุวันที่โอนย้ายสินทรัพย์
- <span class="asterisk">\*</span> Location > ระบุรหัสสถานที่ตั้งสินทรัพย์
- Vendor ระบุรหัสร้านค้าที่ซื้อสินทรัพย์
- Serial No. > ระบุหมายเลข Serial ของสินทรัพย์
- Specification > ระบุรายละเอียดสินทรัพย์
- Remark > ระบุหมายเหตุ หรือ ข้อมูลเพิ่มเติมสำหรับสินทรัพย์

**Register Value**

- <span class="asterisk">\*</span> Currency > เลือกสกุลเงินที่ใช้ในการบันทึกสินทรัพย์
- <span class="asterisk">\*</span> Rate > ระบุอัตราการแลกเปลี่ยนสกุลเงิน
- <span class="asterisk">\*</span> Amount/Unit > ระบุราคาสินทรัพย์ต่อหน่วย / ไม่รวมภาษี
- <span class="asterisk">\*</span> Unit > เลือกหน่วยของสินทรัพย์
- <span class="asterisk">\*</span> Qty. > ระบุจำนวนสินทรัพย์
  - Salvage Value/Unit > ระบุค่าซากต่อหน่วย (ปกติเป็น 1 บาท)
- <span class="asterisk">\*</span> Asset Life > ระบุประเภทอายุของการคำนวณ เช่น Year, Month, Day
- <span class="asterisk">\*</span> Asset Life > ระบุอายุที่จะให้คำนวณสินทรัพย์
- Ini. Accu. Depre. ระบุค่าเสื่อมราคาสะสมยกมา กรณีสินทรัพย์มีการคำนวณค่าเสื่อมมาแล้ว

![alt text](image-12.png)

Asset Account กำหนดรหัส Department Code และ Account Code ในการบันทึกบัญชี ดังต่อไปนี้

**Cost Account**

- Cost Account > กำหนด Account Code ที่จะใช้บันทึกบัญชีตามประเภทสินทรัพย์

**Accu. Depreciation**

- Accu. Dept > กำหนด Department Code ที่จะใช้บันทึกค่าเสื่อมราคาสะสม
- Accu. Account > กำหนด Account Code ที่จะใช้บันทึกค่าเสื่อมราคาสะสมตาม

**Depreciation Account**

- Depre Dept > กำหนด Department Code ที่จะใช้บันทึกค่าเสื่อมราคา
- Depre Account > กำหนด Account Code ที่จะใช้บันทึกค่าเสื่อมราคา

  1.5 ตรวจสอบความถูกต้องของข้อมูล เมื่อเรียบร้อยแล้วกดปุ่ม **<span class="btn">SAVE</span>** เพื่อบันทึกข้อมูลเข้าระบบ

  1.6 เมื่อ save แล้ว ระบบจะทำการคำนวณค่าเสื่อมราคาเอาไว้ให้ล่วงหน้า ตั้งแต่วันเริ่มต้น จนสิ้นสุด
  หมายเหตุ: หัวข้อที่มีเครื่องหมาย \* อยู่ด้านหน้าคือข้อมูลที่จำเป็นต้องระบุ

<p align="center">
    <img src="./image-13.png" />
</p>

<p style="margin: 0;">Video ประกอบ</p>
<h3 style="margin: 0;">Asset Registration | การลงทะเบียนสินทรัพย์</h3>

<iframe width="560" height="315" src="https://www.youtube.com/embed/hnREj9whgUc?si=MqybJ9QImp5b_-g9" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

<iframe width="560" height="315" src="https://www.youtube.com/embed/p0GvQwEjajU?si=1rd57v3N4-jWAk50" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>




## วิธีคำนวณค่าเสื่อมราคา

เมื่อสร้างสินทรัพย์สำเร็จ ระบบจะทำการคำนวณค่าเสื่อมราคาตั้งแต่เดือนเริ่มต้น จนถึงเดือนที่สิ้นสุด ตามวิธีคำนวณค่าเสื่อมราคาแบบเส้นตรง
ระบบจะคำนวณด้วยการนำราคาต้นทุนของอุปกรณ์ ลบด้วยมูลค่าซาก และลบด้วยค่าเสื่อมราคาสะสมยกมา
หารด้วยจำนวนวันของอายุสินทรัพย์ เพื่อจะได้ค่าเสื่อมราคาต่อวันของสินทรัพย์
นำค่าเสื่อมราคาต่อวัน คูณด้วยจำนวนของแต่ละเดือน จะทำให้ค่าเสื่อมราคาแต่ละเดือนอาจต่างกันได้เล็กน้อย
*\*\*ค่าเสื่อมราคา = ( (ราคาต้นทุน – ค่าเสื่อมราคาสะสม – มูลค่าซาก) / อายุการใช้งานทั้งหมด (วัน) ) *จำนวนวันของแต่ละเดือน

เมนูสำหรับใช้งานอื่นๆที่เกี่ยวข้อง

<img src="/public/add_icon.png" style="display: inline-block;" /> ใช้ในกรณีต้องการจะสร้างเอกสารบันทึกข้อมูล Assets Details ใหม่ <br/>
<img src="/public/edit_icon.png" style="display: inline-block;" /> ใช้ในกรณีต้องการแก้ไขข้อมูลในเอกสารที่ทำการบันทึกไปเรียบร้อยแล้ว <br/>
<img src="/public/del_icon.png" style="display: inline-block;" /> ใช้ในกรณีต้องการลบเอกสารที่ได้บันทึกไปแล้ว <span style="color:red">(สินทรัพย์ที่อยู่ใน Period ที่ปิดไปแล้วจะไม่สามารถลบข้อมูล และแก้ไขได้เพียง account code เท่านั้น)</span> <br/>
<img src="/public/copy_icon.png" style="display: inline-block;" /> ใช้ในกรณีต้องการคัดลอกข้อมูลจากประเภทสินทรัพย์ชนิดเดียวกัน มีข้อมูลเหมือนกัน เพื่อต้องการแตก
รายการสินทรัพย์ให้มีจำนวนมากกว่า 1 รายการ
<br/>
<img src="/public/disposal_icon.png" style="display: inline-block;" /> ใช้ในกรณีต้องการทราบรายละเอียดการตัดจำหน่ายสินทรัพย์ <br/>
<img src="/public/preasset_icon.png" style="display: inline-block;" /> ใช้ในกรณีต้องการสร้างทะเบียนสินทรัพย์จาก Pre-Register Asset <br/>
<img src="/public/print_icon.png" style="display: inline-block;" /> ใช้ในกรณีพิมพ์ Register Asset Form <br/>
<img src="/public/print_barcode_icon.png" style="display: inline-block;" /> ใช้ในกรณีพิมพ์ Barcode <br/>

## การบันทึกสินทรัพย์ด้วยการ Copy จากสินทรัพย์ที่มีอยู่ในระบบ

2.1 CLICK เข้าสู่ Asset Module

2.2 กดปุ่ม Asset Register

2.3 Click เครื่องหมาย <img src="./image-15.png" style="display: inline-block;" /> เลือกรายการสินทรัพย์ที่ต้องการจะทำการ Copy รายการสินค้า

![alt text](image-16.png)

2.4 เมื่อเข้าสู่หน้าต่างรายการสินทรัพย์ที่เลือกไว้แล้ว ให้ทำการClick เมนู Copy

![alt text](image-17.png)

2.5 ระบบจะแสดงหน้าต่าง Copy Asset เพื่อให้ระบุจำนวนสินทรัพย์ที่ต้องการจะคัดลอกข้อมูล และเมื่อกำหนดข้อมูลเสร็จเรียบร้อยแล้ว ให้ Click **<span class="btn">OK</span>**

รายละเอียดในการบันทึกข้อมูล มีดังนี้

- Item to Copy > คือ จำนวนที่ต้องการสร้างสินทรัพย์เพิ่ม เช่นต้องการเพิ่ม 4 ชิ้น ให้กรอกช่อง Item to Copy = 4 ชิ้น
- Asset No. > คือ เลขที่สินทรัพย์ที่ระบบจะทำการสร้างให้อัตโนมัติ
- <span class="asterisk">\*</span> Input Date > ระบุวันที่บันทึกสินทรัพย์เข้าระบบ หรือวันที่ที่ให้ระบบ Carmen เริ่มคำนวณค่าเสื่อมราคาของสินทรัพย์
- <span class="asterisk">\*</span> Acquire Date > ระบุวันที่เริ่มคำนวณค่าเสื่อมราคาของสินทรัพย์จริง เช่น สินทรัพย์ถูกคำนวณค่าเสื่อมราคาจากระบบอื่น มาก่อน ให้ระบุวันที่ที่เริ่มคำนวณค่าเสื่อมราคาจากระบบดังกล่าว Acquire Date สามารถระบุวันที่ก่อน หรือ เท่ากับ Input date เท่านั้น และ Acquire Date จะใช้ในการคำนวณวันหมดอายุของสินทรัพย์

<p align="center">
    <img src="./image-18.png"  />
</p>

**หมายเหตุ** สำหรับสินทรัพย์ที่สามารถแยกแยะความแตกต่างกันได้ เช่น โทรทัศน์ Computer ขอแนะนำให้ใช้ Copy เพื่อบันทึกสินทรัพย์เป็นรายตัว เพื่อใส่ข้อมูลเพิ่มเติมแตกต่างกันได้เช่น Serial no.

2.6 จากนั้นระบบจะแสดงผลการบันทึกข้อมูล และเมื่อ Click **<span class="btn">OK</span>** อีกครั้ง

![alt text](image-19.png)

2.7 ระบบแสดงรายการสินทรัพย์ที่ทำการคัดลอกสำเร็จ จากหน้าจอหนี้สามารถ Click เครื่องหมาย <img src="/public/edit_icon.svg" style="display: inline-block;" /> เพื่อทำการแก้ไขข้อมูลต่อไป

<p align="center">
    <img src="./image-20.png" />
</p>

<p style="margin: 0;">Video ประกอบ</p>
<h3 style="margin: 0;">Asset Registration | การลงทะเบียนสินทรัพย์หลายชิ้นในคราวเดียว</h3>

<iframe width="560" height="315" src="https://www.youtube.com/embed/2T6wIdPu_Kg?si=oGA4fRIEoMjna4iM" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

<iframe width="560" height="315" src="https://www.youtube.com/embed/gqy1ZRfSOEI?si=Gnf2EctmQcBytItX" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>


## การบันทึกสินทรัพย์โดยใช้ข้อมูลจาก Pre-Register Asset

3.1 CLICK เข้าสู่ Asset Module

3.2 กดปุ่ม Asset Register

3.3 กดปุ่ม <img src="/public/add_icon.png" style="display: inline-block;" /> เพื่อเพิ่มสินทรัพย์ใหม่ลงระบบ

![alt text](image-21.png)

3.4 จากรูปด้านล่างให้ CLICK <img src="/public/preasset_icon.png" style="display: inline-block;" /> เลือกเมนู

![alt text](image-22.png)

3.5 ระบบจะแสดงรายการสินทรัพย์ที่ได้จากการดึงข้อมูลจากระบบ AP หรือระบบ Receiving ให้ Double Click ที่รายการสินทรัพย์เพื่อดึงข้อมูลเข้าสู่ระบบบันทึกสินทรัพย์

3.6 ระบบทำการดึงข้อมูลจาก Pre-Register Asset มายังหน้าจอหลักเพื่อทำรายการสินทรัพย์ และกำหนดเงื่อนไขในการคำนวณค่าเสื่อมของสินทรัพย์ต่อไป

3.7 ทำการบันทึกข้อมูลสินทรัพย์ตามขั้นตอนที่ 1.4

![alt text](image-23.png)

## การดูประวัติการคำนวณค่าเสื่อมราคา History Depreciation

เมื่อสร้างสินทรัพย์สำเร็จ ระบบจะทำการคำนวณค่าเสื่อมราคาตั้งแต่เดือนเริ่มต้น จนถึงเดือนที่สิ้นสุด ตามวิธีคำนวณค่าเสื่อมราคาแบบเส้นตรง
ระบบจะคำนวณด้วยการนำราคาต้นทุนของอุปกรณ์ ลบด้วยมูลค่าซาก และละด้วยค่าเสื่อมราคาสะสมยกมา
หารด้วยจำนวนวันของอายุสินทรัพย์ เพื่อจะได้ค่าเสื่อมราคาต่อวันของสินทรัพย์
นำค่าเสื่อมราคาต่อวัน คูณด้วยจำนวนของแต่ละเดือน จะทำให้ค่าเสื่อมราคาแต่ละเดือนอาจต่างกันได้เล็กน้อย

ค่าเสื่อมราคา = ( (ราคาต้นทุน – ค่าเสื่อมราคาสะสม – มูลค่าซาก) ÷ อายุการใช้งานทั้งหมด ) \*จำนวนวันของแต่ละเดือน

<p align="center">
    ค่าเสื่อมราคาจะแสดงข้อมูลใน Tab : History Depreciation ตามตัวอย่างจากรูปข้างล่างนี้
    <img src="./image-24.png"  />
</p>

## การดูประวัติการขายสินทรัพย์ History Disposal

เมื่อมีการขาย หรือตัดจำหน่ายสินทรัพย์ด้วย function : Disposal ระบบจะแสดงประวัติการขายหรือตัดจำหน่าย โดยแสดงข้อมูลวันที่ ประเภทการตัดจำหน่าย มูลค่าต้นทุน และมูลค่าที่ขายสินทรัพย์

ขั้นตอนการดูข้อมูล

5.1. เลือกสินทรัพย์ที่ต้องการดูข้อมูล

5.2. เลือก Tab : History Disposal

5.3. ระบบจะแสดงประวัติ Disposal ในระบบ

![alt text](image-25.png)

จากข้อมูลการตัดจำหน่ายสินทรัพย์ตามภาพด้านบนนี้ ผู้ใช้งานสามารถกดปุ่มเพื่อดาวน์โหลด ข้อมูลเป็น Excel file เพื่อนำไปใช้งานในรูปแบบอื่นที่ต้องการต่อไปได้

## การบันทึกโอนย้ายทรัพย์สินระหว่างแผนก

ขั้นตอนการโอนย้ายสินทรัพย์ระหว่างแผนก

6.1 เลือกรายการสินทรัพย์ที่ต้องการโอนย้าย Click ที่เครื่องหมาย <img src="./image-15.png" style="display: inline-block;" /> เพื่อดูข้อมูลสินทรัพย์

![alt text](image-26.png)

6.2 Click Edit เพื่อทำการแก้ไขข้อมูล

6.3 เปลี่ยน Location จาก FO OFFICE ไปยัง HR OFFICE และกด **<span class="btn">SAVE</span>** ตามตัวอย่างภาพด้านล่าง

![alt text](image-27.png)

6.4 หลังจากกด Save เรียบร้อยแล้วระบบจะแสดงหน้าต่างว่าบันทึกข้อมูลสำเร็จแล้ว หลังจากนั้นกด **<span class="btn">OK</span>**

<p align="center">
    <img src="./image-3.png"  />
</p>

## การดูประวัติโอนย้ายสินทรัพย์ History Location 

ประวัติการย้าย แผนก หรือ Transfer location ในระบบ
หลังจากบันทึก Asset Register เรียบร้อยแล้ว หากมีการโอนย้ายสินทรัพย์นั้นจาก Location A ไปยัง Location B ระบบจะทำการบันทึกประวัติการโอนย้ายแผนกและสถานที่จัดเก็บสินทรัพย์นั้นให้ทราบ 

7.1	ทำการเปิดสินทรัพย์ที่ต้องการดูประวัติการโอนย้าย

7.2	เปิด tab : History Location

7.3	ระบบจะแสดงประวัติการโอนย้ายแผนกหรือสถานที่เก็บสินทรัพย์

![alt text](image-28.png)

## ตัวอย่าง JV สำหรับการบันทึกบัญชีค่าเสื่อมราคาจากการ Posting Asset to GL

![alt text](image-29.png)
![alt text](image-30.png) -->
