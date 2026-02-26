from pydantic import BaseModel
from typing import Optional 

class ChatRequest(BaseModel):
    text: str
    bu: str
    username: str
    session_id: Optional[str] = None
    image: Optional[str] = None 
    theme: Optional[str] = None
    title: Optional[str] = None
    model: Optional[str] = None
    prompt_extend: Optional[str] = None
    room_id: str 