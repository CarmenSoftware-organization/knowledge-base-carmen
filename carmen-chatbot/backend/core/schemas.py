from pydantic import BaseModel, Field
from typing import Optional, Literal


class ChatRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)
    bu: str
    username: str
    room_id: str
    model: Optional[str] = None
    history: Optional[list[dict]] = None
    db_schema: Optional[str] = "carmen"
    lang: Optional[str] = "th"


class FeedbackRequest(BaseModel):
    score: Literal[1, -1]
