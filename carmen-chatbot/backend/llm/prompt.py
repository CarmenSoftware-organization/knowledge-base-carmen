import logging
from ..core.config import settings

logger = logging.getLogger(__name__)

# ==========================================
# 📝 PROMPT TEMPLATES (Externalized)
# ==========================================
# All prompts are now loaded from core/prompts.json via settings

BASE_PROMPT = settings.PROMPTS.get("BASE_PROMPT", "")
REWRITE_PROMPT = settings.PROMPTS.get("REWRITE_PROMPT", "")
TRANSLATE_PROMPT = settings.PROMPTS.get("TRANSLATE_PROMPT", "")

if not BASE_PROMPT:
    logger.warning("BASE_PROMPT not found in prompts.yaml")
if not REWRITE_PROMPT:
    logger.warning("REWRITE_PROMPT not found in prompts.yaml")
if not TRANSLATE_PROMPT:
    logger.warning("TRANSLATE_PROMPT not found in prompts.yaml")
