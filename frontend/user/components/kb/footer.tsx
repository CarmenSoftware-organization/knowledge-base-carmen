import Link from "next/link";
import { MessageCircle } from "lucide-react";

export function KBFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <MessageCircle className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">Jupyter</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-md">
              ศูนย์รวมความรู้และคู่มือการใช้งานสำหรับ Jupyter Chatbot
              ระบบช่วยตอบคำถามอัจฉริยะสำหรับองค์กรของคุณ
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">ลิงก์ด่วน</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  หน้าหลัก
                </Link>
              </li>
              <li>
                <Link
                  href="/categories"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  หมวดหมู่ทั้งหมด
                </Link>
              </li>
              <li>
                <Link
                  href="/articles/sample"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  บทความล่าสุด
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">ติดต่อเรา</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>support@jupyter.company</li>
              <li>โทร: 02-xxx-xxxx</li>
              <li>เวลาทำการ: จ-ศ 9:00-18:00</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2026 Jupyter. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Powered by Jupyter AI Chatbot
          </p>
        </div>
      </div>
    </footer>
  );
}
