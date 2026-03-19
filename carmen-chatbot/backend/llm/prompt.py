from ..core.config import settings

# ==========================================
# 📝 PROMPT TEMPLATES (Externalized)
# ==========================================
# All prompts are now loaded from core/prompts.json via settings

BASE_PROMPT = settings.PROMPTS.get("BASE_PROMPT", "")
REWRITE_PROMPT = settings.PROMPTS.get("REWRITE_PROMPT", "")

if not BASE_PROMPT:
    print("⚠️ WARNING: BASE_PROMPT not found in prompts.json")
if not REWRITE_PROMPT:
    print("⚠️ WARNING: REWRITE_PROMPT not found in prompts.json")
