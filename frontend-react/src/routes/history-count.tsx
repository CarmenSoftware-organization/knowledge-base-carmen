import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { fetchChatHistoryCount, SupabaseCheckError } from "@/lib/supabase-check";

type State =
  | { status: "loading" }
  | { status: "success"; count: number }
  | { status: "error"; message: string };

export default function HistoryCount() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let active = true;
    fetchChatHistoryCount()
      .then((count) => {
        if (active) setState({ status: "success", count });
      })
      .catch((err: unknown) => {
        if (!active) return;
        const message =
          err instanceof SupabaseCheckError
            ? err.message
            : "เกิดข้อผิดพลาดที่ไม่รู้จักในการเชื่อมต่อ Supabase";
        setState({ status: "error", message });
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Supabase connectivity test</CardTitle>
          <CardDescription>
            จำนวนแถวใน public.chat_history (ยิงตรงจาก browser ไป Supabase)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state.status === "loading" && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Spinner /> กำลังเชื่อมต่อ Supabase…
            </div>
          )}
          {state.status === "success" && (
            <p className="text-lg">
              chat_history มี{" "}
              <span className="font-semibold tabular-nums">{state.count}</span>{" "}
              แถว
            </p>
          )}
          {state.status === "error" && (
            <p className="text-destructive">เกิดข้อผิดพลาด: {state.message}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
