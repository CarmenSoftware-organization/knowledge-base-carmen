import Link from "next/link";
import { MessageCircle, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function QuickHelp() {
  return (
    <section className="py-16 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Card className="bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5 border-primary/20">
          <CardContent className="p-8 sm:p-12">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              {/* Left Content */}
              <div>
                <h2 className="text-3xl font-bold text-foreground">
                  ต้องการความช่วยเหลือเพิ่มเติม?
                </h2>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  หากคุณไม่พบคำตอบที่ต้องการในคู่มือ
                  ทีมสนับสนุนของเราพร้อมช่วยเหลือคุณตลอด 24 ชั่วโมง
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button size="lg" className="gap-2">
                    <MessageCircle className="h-4 w-4" />
                    แชทกับเรา
                  </Button>
                  <Button size="lg" variant="outline" className="gap-2 bg-transparent">
                    <Mail className="h-4 w-4" />
                    ส่งอีเมล
                  </Button>
                </div>
              </div>

              {/* Right Content - Quick Links */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-card border border-border">
                  <Phone className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-semibold text-foreground">โทรหาเรา</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    02-xxx-xxxx
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    จ-ศ 9:00-18:00 น.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-card border border-border">
                  <Mail className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-semibold text-foreground">อีเมล</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    support@jupyter.company
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ตอบกลับภายใน 24 ชม.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick FAQ */}
        <div className="mt-12 text-center">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            คำถามด่วน
          </h3>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { q: "ลืมรหัสผ่าน?", href: "/categories/faq/reset-password" },
              { q: "Bot ไม่ตอบ?", href: "/categories/faq/bot-not-responding" },
              { q: "เพิ่มผู้ใช้ใหม่?", href: "/categories/user-management/add-user" },
              { q: "ดู API Docs?", href: "/categories/advanced/api-integration" },
            ].map((item) => (
              <Link key={item.q} href={item.href}>
                <Button variant="outline" size="sm">
                  {item.q}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
