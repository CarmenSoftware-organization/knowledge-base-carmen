// frontend/user/configs/locales.ts

export type LocaleKey = "th" | "en";

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
    remaining_queue: (count: number) => string;
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
      remaining_queue: (count) => `+ อีก ${count} ข้อความในคิว`,
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
  },
  en: {
    welcome: {
      title: "Hi! Carmen is here to help.",
      desc: "Ask anything about the corporate manual or start a new conversation below.",
      new_chat: "New Chat",
      default_suggestions: [
        "The refresh button in workbook doesn't work, what should I do?",
        "Can I record purchase tax invoices in Excel and then import them?",
        "Can Carmen upload files to the Revenue Department's RDPrep program?",
        "Can I create a receipt without selecting an invoice?",
        "Can I record a JV with unbalanced debit and credit?",
      ],
    },
    chat: {
      placeholder: "Type your message here...",
      status_thinking: "Thinking...",
      status_analyzing: "Analyzing query...",
      status_searching: "Searching knowledge base...",
      status_composing: "Composing answer...",
      status_waiting: "Waiting in queue...",
      status_processing: "Processing...",
      status_stopped: "[Generation stopped]",
      error_title: "Connection error occurred",
      error_retry: "Retry",
      error_connection: "Connection error occurred",
      retry: "Retry",
      queued: "Queued",
      new_chat_block: "Cannot create a new chat while processing. Please wait.",
      switch_room_block: "Cannot switch rooms while processing. Please wait.",
      delete_room_block: "Cannot delete rooms while processing. Please wait.",
      clear_history_block: "Cannot clear chat while processing. Please wait.",
      remaining_queue: (count) => `+ ${count} more in queue`,
      stop_generation: "Stop generation"
    },
    header: {
      history: "Chat History",
      expand: "Expand Window",
      collapse: "Collapse Window",
      clear: "Clear Chat",
      close: "Close",
      status_online: "AI Knowledge Base Online",
    },
    modal: {
      delete_title: "Delete this room?",
      delete_desc: "The selected conversation will be permanently deleted.",
      delete_confirm: "Delete",
      clear_title: "Clear history?",
      clear_desc: "All messages in this room will be removed.",
      clear_confirm: "Clear",
      cancel: "Cancel",
      ok: "OK",
    },
    tools: {
      copy: "Copy content",
      copied: "Copied!",
      helpful: "Helpful",
      incorrect: "Incorrect",
      scroll_down: "Scroll to bottom",
      attach: "Attach image",
      send: "Send message",
    }
  }
};
