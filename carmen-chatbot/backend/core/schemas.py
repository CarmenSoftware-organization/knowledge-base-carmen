from pydantic import BaseModel, Field
from typing import Optional, Literal

_SLUG_PATTERN = r"^[a-z][a-z0-9_]{1,62}$"


class ChatHistoryItem(BaseModel):
    id: Optional[str] = None
    sender: Literal["user", "bot"]
    message: str = Field(..., max_length=4000)
    timestamp: str = Field(..., max_length=50)


class ChatRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)
    bu: str = Field(..., pattern=_SLUG_PATTERN)
    username: str = Field(..., max_length=200)
    room_id: str = Field(..., max_length=200)
    model: Optional[str] = Field(None, max_length=200)
    history: Optional[list[ChatHistoryItem]] = None
    db_schema: Optional[str] = Field("carmen", pattern=_SLUG_PATTERN)
    lang: Optional[Literal["th", "en"]] = "th"
    referrer_page: Optional[str] = Field(None, max_length=500)  # หน้า docs ที่ user ถามมาจาก (ส่งจาก frontend)


class FeedbackRequest(BaseModel):
    score: Literal[1, -1]
    bu: str = Field(..., pattern=_SLUG_PATTERN)
    username: str = Field(..., max_length=200)
