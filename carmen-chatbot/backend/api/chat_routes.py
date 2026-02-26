from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from ..core.schemas import ChatRequest
from ..llm.chat_service import chat_service

router = APIRouter(
    prefix="/api/chat",
    tags=["Chat Operations"],
    responses={404: {"description": "Not found"}},
)

# ==========================================
# 🌊 1. STREAMING CHAT (Widget ใหม่ใช้ตัวนี้)
# ==========================================
@router.post("/stream", summary="Stream chat response")
async def chat_stream_endpoint(req: ChatRequest):
    return StreamingResponse(
        chat_service.stream_chat(
            message=req.text, bu=req.bu, room_id=req.room_id, username=req.username,
            model_name=req.model, prompt_extend=req.prompt_extend
        ),
        media_type="application/x-ndjson"
    )

# ==========================================
# 💬 2. STANDARD CHAT (Legacy & General Use)
# ==========================================
# ✅ เพิ่มบรรทัดนี้กลับมา เพื่อแก้ Error 405 ของ /chat
@router.post("/", summary="Standard chat response (Invoke)")
async def chat_endpoint(req: ChatRequest):
    return await chat_service.invoke_chat(
        message=req.text, bu=req.bu, room_id=req.room_id, username=req.username,
        model_name=req.model, prompt_extend=req.prompt_extend
    )

# ==========================================
# 🧹 3. CLEAR CHAT HISTORY (In-Memory)
# ==========================================
@router.delete("/clear/{room_id}", summary="Clear in-memory chat history for a room")
async def clear_chat_history(room_id: str):
    chat_service.clear_history(room_id)
    return {"status": "ok", "room_id": room_id}

