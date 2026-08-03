// frontend/configs/locales.ts

export type LocaleKey = "th";

export interface LocaleStrings {
  welcome: {
    title: string;
    desc: string;
    new_chat: string;
    default_suggestions: string[];
  };
  chat: {
    placeholder: string;
    status_thinking: string;
    status_analyzing: string;
    status_searching: string;
    status_composing: string;
    status_waiting: string;
    status_processing: string;
    status_stopped: string;
    error_title: string;
    error_retry: string;
    error_connection: string;
    retry: string;
    queued: string;
    new_chat_block: string;
    switch_room_block: string;
    delete_room_block: string;
    clear_history_block: string;
    stop_generation: string;
  };
  header: {
    history: string;
    expand: string;
    collapse: string;
    clear: string;
    close: string;
    status_online: string;
  };
  modal: {
    delete_title: string;
    delete_desc: string;
    delete_confirm: string;
    clear_title: string;
    clear_desc: string;
    clear_confirm: string;
    cancel: string;
    ok: string;
  };
  tools: {
    copy: string;
    copied: string;
    helpful: string;
    incorrect: string;
    scroll_down: string;
    attach: string;
    send: string;
  }
}

export const locales: Record<LocaleKey, LocaleStrings> = {
  th: {
    welcome: {
      title: "สวัสดีค่ะ Carmen พร้อมช่วย!",
      desc: "สอบถามข้อมูลจากคู่มือบริษัท หรือเริ่มบทสนทนาใหม่ได้ทันทีด้านล่างนี้ค่ะ",
      new_chat: "แชทใหม่",
      default_suggestions: [
        "กดปุ่ม refresh ใน workbook ไม่ได้ ทำยังไง",
        "บันทึกใบกำกับภาษีซื้อ ใน excel แล้ว import ได้หรือไม่",
        "program carmen สามารถ upload file เข้า program RDPrep ของสรรพากรได้ หรือไม่",
        "ฉันสามารถสร้าง ใบเสร็จรับเงิน โดยไม่เลือก Invoice ได้หรือไม่",
        "ฉันสามารถบันทึก JV โดยที่ debit และ credit ไม่เท่ากันได้หรือไม่",
      ],
    },
    chat: {
      placeholder: "พิมพ์ข้อความที่นี่...",
      status_thinking: "กำลังคิด...",
      status_analyzing: "กำลังวิเคราะห์คำถาม...",
      status_searching: "กำลังค้นหาและคัดกรองข้อมูล...",
      status_composing: "กำลังเรียบเรียงคำตอบ...",
      status_waiting: "รอคิว...",
      status_processing: "กำลังประมวลผล...",
      status_stopped: "[หยุดการสร้างคำตอบแล้ว]",
      error_title: "เกิดข้อผิดพลาดในการเชื่อมต่อ",
      error_retry: "ลองอีกครั้ง",
      error_connection: "เกิดข้อผิดพลาดในการเชื่อมต่อ",
      retry: "ลองอีกครั้ง",
      queued: "รอคิว",
      new_chat_block: "ไม่สามารถสร้างห้องใหม่ได้ขณะระบบกำลังประมวลผล กรุณารอสักครู่",
      switch_room_block: "ไม่สามารถเปลี่ยนห้องได้ขณะระบบกำลังประมวลผล กรุณารอสักครู่",
      delete_room_block: "ไม่สามารถลบห้องได้ขณะระบบกำลังประมวลผล กรุณารอสักครู่",
      clear_history_block: "ไม่สามารถล้างแชทได้ขณะระบบกำลังประมวลผล กรุณารอสักครู่",
      stop_generation: "หยุดการสร้างคำตอบ"
    },
    header: {
      history: "ประวัติการสนทนา",
      expand: "ขยายหน้าจอ",
      collapse: "ย่อหน้าจอ",
      clear: "ล้างแชท",
      close: "ปิด",
      status_online: "คลังความรู้ AI พร้อมบริการ",
    },
    modal: {
      delete_title: "ยืนยันลบห้องแชท?",
      delete_desc: "บทสนทนาที่เลือกจะถูกลบถาวร และไม่สามารถกู้คืนได้",
      delete_confirm: "ลบทิ้ง",
      clear_title: "ล้างประวัติห้องนี้?",
      clear_desc: "ข้อความในห้องนี้จะถูกลบทั้งหมด",
      clear_confirm: "ลบเลย",
      cancel: "ยกเลิก",
      ok: "ตกลง",
    },
    tools: {
      copy: "คัดลอกข้อมูล",
      copied: "คัดลอกแล้ว!",
      helpful: "มีประโยชน์",
      incorrect: "ไม่ถูกต้อง",
      scroll_down: "เลื่อนลงล่างสุด",
      attach: "แนบรูป",
      send: "ส่งข้อความ",
    }
  }
};
