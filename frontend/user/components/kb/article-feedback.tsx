"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export function ArticleFeedback() {
  const [feedback, setFeedback] = useState<"helpful" | "not-helpful" | null>(
    null
  );
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleFeedback = (type: "helpful" | "not-helpful") => {
    setFeedback(type);
    if (type === "not-helpful") {
      setShowComment(true);
    }
  };

  const handleSubmit = () => {
    // Here you would send the feedback to your backend
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-6 text-center">
          <p className="text-primary font-medium">
            ขอบคุณสำหรับความคิดเห็นของคุณ!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-6">
        <div className="text-center">
          <p className="text-foreground font-medium mb-4">
            บทความนี้มีประโยชน์หรือไม่?
          </p>
          <div className="flex justify-center gap-3">
            <Button
              variant={feedback === "helpful" ? "default" : "outline"}
              size="lg"
              className="gap-2"
              onClick={() => handleFeedback("helpful")}
            >
              <ThumbsUp className="h-4 w-4" />
              มีประโยชน์
            </Button>
            <Button
              variant={feedback === "not-helpful" ? "default" : "outline"}
              size="lg"
              className="gap-2"
              onClick={() => handleFeedback("not-helpful")}
            >
              <ThumbsDown className="h-4 w-4" />
              ไม่มีประโยชน์
            </Button>
          </div>

          {showComment && (
            <div className="mt-6 text-left max-w-md mx-auto">
              <label className="block text-sm font-medium text-foreground mb-2">
                <MessageSquare className="h-4 w-4 inline mr-2" />
                ช่วยบอกเราว่าเราจะปรับปรุงได้อย่างไร
              </label>
              <Textarea
                placeholder="พิมพ์ความคิดเห็นของคุณที่นี่..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="mb-3"
                rows={3}
              />
              <Button onClick={handleSubmit} className="w-full">
                ส่งความคิดเห็น
              </Button>
            </div>
          )}

          {feedback === "helpful" && (
            <p className="mt-4 text-sm text-muted-foreground">
              ขอบคุณที่แจ้งให้เราทราบ!
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
