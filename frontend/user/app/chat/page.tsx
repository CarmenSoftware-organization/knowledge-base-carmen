"use client";

import { useState } from "react";
import { askChat, type ChatAskResponse } from "@/lib/wiki-api";
import { KBHeader } from "@/components/kb/header";
import { KBFooter } from "@/components/kb/footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ChatPage() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ChatAskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastQuestion, setLastQuestion] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const q = question.trim();
      setLastQuestion(q);
      const data = await askChat(q);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <KBHeader />
      <main className="flex-1 container max-w-3xl py-8 px-4">
        <h1 className="text-2xl font-semibold mb-2">ถามจากคู่มือ Carmen</h1>
        <p className="text-muted-foreground mb-6">
          พิมพ์คำถามด้านล่าง แล้วกดส่ง — ระบบจะค้นจากคู่มือแล้วตอบให้ (ใช้แทนการเทสใน Postman)
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            placeholder="เช่น ตามคู่มือ AP Vendor มี field อะไรบ้างที่บังคับ?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
            className="resize-none"
            disabled={loading}
          />
          <Button type="submit" disabled={loading}>
            {loading ? "กำลังค้นและตอบ..." : "ส่งคำถาม"}
          </Button>
        </form>

        {error && (
          <Card className="mt-6 border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {result && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>คำตอบ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* กรณีคำถามกำกวม ให้ผู้ใช้เลือกตัวเลือกก่อน */}
              {result.needDisambiguation && result.options && result.options.length > 0 && (
                <div className="space-y-2 border-b pb-4">
                  <p className="text-sm font-medium">
                    คำถามนี้อาจหมายถึงหลายหัวข้อ เลือกหัวข้อที่ต้องการ:
                  </p>
                  <div className="flex flex-col gap-2">
                    {result.options.map((opt, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        className="justify-start text-left"
                        disabled={loading}
                        onClick={async () => {
                          if (!lastQuestion) return;
                          setLoading(true);
                          setError(null);
                          try {
                            const data = await askChat(lastQuestion, opt.path);
                            setResult(data);
                          } catch (err) {
                            setError(
                              err instanceof Error ? err.message : "เกิดข้อผิดพลาด"
                            );
                          } finally {
                            setLoading(false);
                          }
                        }}
                      >
                        <span className="font-medium">
                          {opt.title || opt.path}
                        </span>
                        {opt.reason && (
                          <span className="block text-xs text-muted-foreground">
                            {opt.reason}
                          </span>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {result.answer && (
                <div className="whitespace-pre-wrap text-sm">
                  {result.answer}
                </div>
              )}
              {result.sources && result.sources.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1">อ้างอิงจาก:</p>
                  <ul className="text-xs text-muted-foreground list-disc list-inside">
                    {result.sources.map((s, i) => (
                      <li key={i}>{s.title || s.articleId || "(ไม่มีชื่อ)"}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
      <KBFooter />
    </div>
  );
}
