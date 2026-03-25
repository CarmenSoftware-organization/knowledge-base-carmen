import time
import logging
import requests
from decimal import Decimal
from sqlalchemy import text

from ..core.database import AsyncSessionLocal
from ..core.config import settings

logger = logging.getLogger(__name__)

# ==========================================
# 💰 MODEL PRICING — sync + cost calculation
# ==========================================

# In-memory cache: model_name -> (input_price_per_1m, output_price_per_1m)
_price_cache: dict = {}
_cache_built_at: float = 0.0
_CACHE_TTL = 3600.0  # refresh ทุก 1 ชั่วโมง


async def _get_prices() -> dict:
    """Load pricing from DB into memory cache (TTL = 1 hour)."""
    global _cache_built_at
    if time.monotonic() - _cache_built_at < _CACHE_TTL and _price_cache:
        return _price_cache
    try:
        async with AsyncSessionLocal() as db:
            rows = (await db.execute(
                text("SELECT model_name, input_price_per_1m, output_price_per_1m FROM public.model_pricing")
            )).fetchall()
        _price_cache.clear()
        for row in rows:
            _price_cache[row[0]] = (row[1], row[2])
        _cache_built_at = time.monotonic()
    except Exception as e:
        logger.warning(f"⚠️ Could not load model pricing from DB: {e}")
    return _price_cache


def invalidate_cache():
    """Force price cache refresh on next request."""
    global _cache_built_at
    _cache_built_at = 0.0


async def calculate_request_cost(
    *,
    embed_tokens: int = 0,
    intent_input: int = 0,
    intent_output: int = 0,
    rewrite_input: int = 0,
    rewrite_output: int = 0,
    chat_input: int = 0,
    chat_output: int = 0,
    chat_model: str = "",
    embed_model: str = "",
    intent_model: str = "",
) -> Decimal | None:
    """คำนวณ cost รวม (USD) ของ 1 request ทุก operation

    Returns None ถ้า model ใดไม่มีราคาใน DB
    (ดีกว่าเก็บค่าผิด — DS/DA สามารถ filter IS NOT NULL ได้)
    """
    prices = await _get_prices()

    def _cost(model: str, inp: int, out: int) -> Decimal | None:
        if not model:
            return Decimal("0")
        if model not in prices:
            return None  # ไม่รู้ราคา
        in_p, out_p = prices[model]
        if in_p is None:
            return None
        return (
            Decimal(inp or 0) * Decimal(str(in_p))
            + Decimal(out or 0) * Decimal(str(out_p or 0))
        ) / Decimal(1_000_000)

    parts = [
        _cost(embed_model,  embed_tokens,  0),
        _cost(intent_model, intent_input,  intent_output),
        _cost(intent_model, rewrite_input, rewrite_output),
        _cost(chat_model,   chat_input,    chat_output),
    ]

    if any(p is None for p in parts):
        return None  # ราคาไม่ครบ — ไม่คำนวณ

    return sum(parts, Decimal("0"))


async def sync_pricing_from_openrouter() -> int:
    """ดึงราคา model ทั้งหมดจาก OpenRouter API แล้ว upsert ลง model_pricing table
    และลบ model ที่ถูก discontinue (source='openrouter_api' แต่ไม่มีใน response ล่าสุด)

    Returns จำนวน model ที่ sync สำเร็จ
    """
    if not settings.LLM_API_KEY:
        logger.warning("⚠️ Cannot sync pricing: LLM_API_KEY not set")
        return 0
    try:
        resp = requests.get(
            f"{settings.LLM_API_BASE}/models",
            headers={"Authorization": f"Bearer {settings.LLM_API_KEY}"},
            timeout=15,
        )
        resp.raise_for_status()
        models = resp.json().get("data", [])

        updated = 0
        active_model_ids: list[str] = []
        async with AsyncSessionLocal() as db:
            for m in models:
                mid = m.get("id", "")
                pr  = m.get("pricing", {})
                if not mid:
                    continue
                # OpenRouter: price per token → convert to per 1M
                inp  = Decimal(str(pr.get("prompt",     0))) * 1_000_000
                out_ = Decimal(str(pr.get("completion", 0))) * 1_000_000
                # Skip invalid placeholder prices (OpenRouter uses -1 for unavailable models)
                if inp < 0 or out_ < 0:
                    continue
                await db.execute(text("""
                    INSERT INTO public.model_pricing
                        (model_name, input_price_per_1m, output_price_per_1m,
                         source, price_verified_at, updated_at)
                    VALUES (:mid, :inp, :out, 'openrouter_api', now(), now())
                    ON CONFLICT (model_name) DO UPDATE SET
                        input_price_per_1m  = EXCLUDED.input_price_per_1m,
                        output_price_per_1m = EXCLUDED.output_price_per_1m,
                        source              = 'openrouter_api',
                        price_verified_at   = now(),
                        updated_at          = now()
                """), {"mid": mid, "inp": inp, "out": out_})
                active_model_ids.append(mid)
                updated += 1

            # ลบ model ที่ไม่มีใน response ล่าสุด (discontinued)
            # เก็บ source='manual' ไว้เสมอ — ลบเฉพาะ openrouter_api
            if active_model_ids:
                result = await db.execute(text("""
                    DELETE FROM public.model_pricing
                    WHERE source = 'openrouter_api'
                      AND model_name != ALL(:active_ids)
                """), {"active_ids": active_model_ids})
                removed = result.rowcount
                if removed:
                    logger.info(f"🗑️ Removed {removed} discontinued models from pricing table")

            await db.commit()

        invalidate_cache()
        logger.info(f"✅ Synced pricing for {updated} models from OpenRouter")
        return updated
    except Exception as e:
        logger.error(f"❌ Failed to sync pricing from OpenRouter: {e}")
        return 0
