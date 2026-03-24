import json

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse, JSONResponse

from ..core.schemas import ChatRequest, FeedbackRequest
from ..llm.chat_service import chat_service
from ..core.rate_limit import limiter
from ..core.config import settings
from ..core.budget import check_and_increment

_BUDGET_MSG = {
    "th": "_(ขออภัยครับ ระบบมีการใช้งานเกินกำหนดสำหรับวันนี้ กรุณาลองใหม่ในวันพรุ่งนี้)_",
    "en": "_(Daily request limit reached. Please try again tomorrow.)_",
}

router = APIRouter(
    prefix="/api/chat",
    tags=["Chat Operations"],
    responses={404: {"description": "Not found"}},
)

# ==========================================
# 🌊 1. STREAMING CHAT (Widget ใหม่ใช้ตัวนี้)
# ==========================================
@router.post("/stream", summary="Stream chat response")
@limiter.limit(settings.RATE_LIMIT_PER_MINUTE)
async def chat_stream_endpoint(request: Request, req: ChatRequest):
    if not await check_and_increment(settings.DAILY_REQUEST_LIMIT):
        lang = req.lang or "th"
        msg = _BUDGET_MSG.get(lang, _BUDGET_MSG["th"])

        async def _budget_exceeded():
            yield json.dumps({"type": "chunk", "data": msg}) + "\n"
            yield json.dumps({"type": "done", "id": 0}) + "\n"

        return StreamingResponse(
            _budget_exceeded(),
            media_type="application/x-ndjson",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    return StreamingResponse(
        chat_service.stream_chat(
            message=req.text, bu=req.bu, room_id=req.room_id, username=req.username,
            model_name=req.model, history=req.history,
            db_schema=req.db_schema, lang=req.lang, request=request
        ),
        media_type="application/x-ndjson",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )

# ==========================================
# 💬 2. STANDARD CHAT (Legacy & General Use)
# ==========================================
@router.post("/", summary="Standard chat response (Invoke)")
@limiter.limit(settings.RATE_LIMIT_PER_MINUTE)
async def chat_endpoint(request: Request, req: ChatRequest):
    if not await check_and_increment(settings.DAILY_REQUEST_LIMIT):
        lang = req.lang or "th"
        msg = _BUDGET_MSG.get(lang, _BUDGET_MSG["th"])
        return JSONResponse(
            status_code=429,
            content={"reply": msg, "sources": [], "room_id": req.room_id, "message_id": 0}
        )

    return await chat_service.invoke_chat(
        message=req.text, bu=req.bu, room_id=req.room_id, username=req.username,
        model_name=req.model, history=req.history,
        db_schema=req.db_schema, lang=req.lang
    )

# ==========================================
# 🧹 3. CLEAR CHAT HISTORY (In-Memory)
# ==========================================
@router.delete("/clear/{room_id}", summary="Clear in-memory chat history for a room")
@limiter.limit(settings.RATE_LIMIT_PER_MINUTE)
async def clear_chat_history(request: Request, room_id: str):
    chat_service.clear_history(room_id)
    return {"status": "ok", "room_id": room_id}


# ==========================================
# 👍 4. FEEDBACK (Thumbs up / down)
# ==========================================
@router.post("/feedback/{message_id}", summary="Save user feedback on a bot message")
@limiter.limit(settings.RATE_LIMIT_PER_MINUTE)
async def save_feedback(request: Request, message_id: int, body: FeedbackRequest):
    from sqlalchemy import text
    from ..core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(
                text("""
                    UPDATE public.chat_history
                    SET metrics = jsonb_set(COALESCE(metrics, '{}'), '{feedback}', to_jsonb(:score::int))
                    WHERE extract(epoch FROM created_at)::bigint BETWEEN :mid - 3 AND :mid + 3
                """),
                {"mid": message_id, "score": body.score},
            )
            await db.commit()
            print(f"[feedback] Updated {result.rowcount} row(s) message_id={message_id} score={body.score}")
        except Exception as e:
            await db.rollback()
            print(f"[feedback] Save failed: {e}")

    return {"status": "ok"}
