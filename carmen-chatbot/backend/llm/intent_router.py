import re
import os
import time
import yaml
import asyncio
import logging
import requests
import numpy as np
from typing import Tuple, List
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from ..core.config import settings

logger = logging.getLogger(__name__)

# Path to intents configuration
INTENTS_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "config", "intents.yaml"))
CACHE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "config", "intents_cache.npz"))

# Load tuning parameters from core/tuning.yaml (via settings.TUNING)
# Edit tuning.yaml to adjust thresholds — no code changes needed.
_intent_tuning = settings.TUNING.get("intent", {})

_CATEGORY_THRESHOLDS: dict[str, float] = _intent_tuning.get("category_thresholds", {
    "greeting":     0.90,
    "thanks":       0.90,
    "company_info": 0.82,
    "capabilities": 0.88,
    "out_of_scope": 0.88,
    "confusion":    0.92,
})
_DEFAULT_THRESHOLD    = float(_intent_tuning.get("default_threshold",    0.90))
_SOFT_ZONE_MIN        = float(_intent_tuning.get("soft_zone_min",        0.75))
_SOFT_ZONE_VOTES      = int(  _intent_tuning.get("soft_zone_votes",      2))
_MTIME_CHECK_INTERVAL = float(_intent_tuning.get("mtime_check_interval", 30.0))

# Fast-track Regex for immediate common cases (Negative Filtering)
DIRECT_MATCHES = {
    "greeting": [r"^(สวัสดี|hello|hi|hey|good\s?(morning|afternoon|evening)|yo|sup|ทักทาย|ทัก|เฮลโล|หวัดดี|ดี)(ครับ|ค่ะ|คร้า|คับ|นะ|จ๊ะ|จ๋า|!)?$"],
    "thanks": [r"^(ขอบคุณ|thank\s?you|thanks|thx|ขอบใจ|เยี่ยม|ดีมาก|ขอบพระคุณ|แต๊ง|กราบ|awesome|perfect)(ครับ|ค่ะ|คร้า|คับ|นะ|จ๊ะ|จ๋า|!)?$"],
    "capabilities": [r"^(ทำอะไรได้บ้าง|ช่วยอะไรได้บ้าง|ช่วยยังไง|มึความสามารถอะไร|what can you do|how can you help|features|capabilities)$"],
    "confusion": [r"^(อะไรนะ|งง|ไม่เข้าใจ|พูดไรนะ|ไม่รู้เรื่อง|ห๊ะ|ฮะ|what\??|confused|huh\??|eh\??)$"],
}


class IntentRouter:
    def __init__(self):
        self.intent_config = {}
        self.canned_responses = {}

        # Vectorized storage
        self.vector_matrix = None  # NumPy matrix of all example embeddings
        self.vector_labels = []    # List of category labels corresponding to rows in matrix
        self.all_examples = []     # List of raw example strings for debugging

        # Cosine similarity threshold for intent matching
        self.threshold = 0.90

        # Small LLM for final fallback — uses active provider's intent model
        self.small_llm = ChatOpenAI(
            model=settings.active_intent_model,
            openai_api_key=settings.active_api_key,
            openai_api_base=settings.active_api_base,
            temperature=0.0,
            max_tokens=20
        )

        self.intents_file = INTENTS_PATH
        self.last_load_time = 0
        self._last_mtime_check = 0.0  # time.monotonic() timestamp of last mtime check

        # At init: load from cache only — no API calls, safe at import time
        # Full (re-)indexing via async_init() called from app lifespan
        self._bootstrap_from_cache()

    # ------------------------------------------------------------------
    # Cache helpers
    # ------------------------------------------------------------------
    def _try_load_from_cache(self, mtime: float) -> bool:
        """Attempt to load vector data from disk cache.

        Returns True if the cache was valid and loaded successfully.
        Does NOT load canned responses — call _load_only_canned_responses() separately.
        """
        if not os.path.exists(CACHE_PATH):
            return False
        try:
            cache_data = np.load(CACHE_PATH, allow_pickle=True)
            cached_mtime = float(cache_data.get('mtime', 0))
            cached_model = str(cache_data.get('model', ''))

            if cached_mtime != mtime or cached_model != settings.LLM_EMBED_MODEL:
                return False

            vm = cache_data['vector_matrix']
            if vm.shape[1] != settings.VECTOR_DIMENSION:
                logger.warning(f"⚠️ Cache dim ({vm.shape[1]}) != {settings.VECTOR_DIMENSION} — will re-index.")
                return False

            self.vector_matrix = vm
            self.vector_labels = list(cache_data['vector_labels'])
            self.all_examples = list(cache_data.get('all_examples', []))
            self.last_load_time = mtime
            logger.info(f"🚀 Loaded {len(self.vector_labels)} intent embeddings from cache.")
            return True
        except Exception as e:
            logger.warning(f"⚠️ Cache load failed: {e}")
            return False

    # ------------------------------------------------------------------
    # Bootstrap: cache-only load (no network) — called at import time
    # ------------------------------------------------------------------
    def _bootstrap_from_cache(self):
        """Load YAML config + try disk cache. Makes no API calls."""
        try:
            if not os.path.exists(self.intents_file):
                logger.warning(f"⚠️ intents.yaml not found at {self.intents_file}")
                return

            with open(self.intents_file, 'r', encoding='utf-8') as f:
                self.intent_config = yaml.safe_load(f) or {}
            self._load_only_canned_responses()

            if not os.path.exists(CACHE_PATH):
                logger.info("📂 No intent cache found — will index on startup.")
                return

            mtime = os.path.getmtime(self.intents_file)
            if not self._try_load_from_cache(mtime):
                logger.info("📂 Intent cache is stale — will re-index on startup.")
        except Exception as e:
            logger.warning(f"⚠️ Bootstrap cache load failed: {e}")

    # ------------------------------------------------------------------
    # Embedding helpers
    # ------------------------------------------------------------------
    def _raw_embed(self, texts: List[str]) -> tuple[List[List[float]], int]:
        """Direct OpenRouter API call for embeddings (bypassing LangChain).

        Returns (vectors, prompt_tokens).
        """
        try:
            url = f"{settings.LLM_API_BASE}/embeddings"
            headers = {
                "Authorization": f"Bearer {settings.LLM_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://github.com/new-carmen",
                "X-Title": "Carmen Chatbot Intent Indexer"
            }
            payload = {
                "model": settings.LLM_EMBED_MODEL,
                "input": texts
            }
            for attempt in range(3):
                resp = requests.post(url, headers=headers, json=payload, timeout=60)
                if resp.status_code == 429 and attempt < 2:
                    time.sleep(2 ** attempt)
                    continue
                resp.raise_for_status()
                break
            res_json = resp.json()

            embed_tokens = res_json.get("usage", {}).get("prompt_tokens", 0)

            if "data" not in res_json:
                raise ValueError(f"OpenRouter response missing data: {res_json}")

            dim = settings.VECTOR_DIMENSION
            results = []
            for item in res_json["data"]:
                vector = item["embedding"]
                truncated = vector[:dim]
                norm = np.linalg.norm(truncated)
                if norm > 1e-9:
                    truncated = (np.array(truncated) / norm).tolist()
                results.append(truncated)
            return results, embed_tokens
        except Exception as e:
            logger.error(f"❌ IntentRouter Raw Embedding Error: {e}")
            raise

    def _embed_query(self, text: str) -> tuple[List[float], int]:
        results, tokens = self._raw_embed([text])
        return results[0], tokens

    # ------------------------------------------------------------------
    # Full index: batched embedding + cache save
    # ------------------------------------------------------------------
    def _load_and_index_intents(self):
        """Load intents from YAML and vectorize all examples in a single batch API call."""
        try:
            if not os.path.exists(self.intents_file):
                logger.warning(f"⚠️ intents.yaml not found at {self.intents_file}")
                return

            with open(self.intents_file, 'r', encoding='utf-8') as f:
                self.intent_config = yaml.safe_load(f) or {}

            mtime = os.path.getmtime(self.intents_file)

            # --- Try loading from cache ---
            if self._try_load_from_cache(mtime):
                self._load_only_canned_responses()
                return

            self.last_load_time = mtime
            logger.info(f"📂 Loading intents from {self.intents_file} (Modified: {time.ctime(self.last_load_time)})")

            if not settings.LLM_API_KEY:
                logger.warning("⚠️ LLM_API_KEY missing. Skipping vectorized indexing.")
                self._load_only_canned_responses()
                return

            # Collect ALL examples across ALL categories in one pass
            all_texts: List[str] = []
            all_cats: List[str] = []
            self.canned_responses = {}

            for category, data in self.intent_config.items():
                if isinstance(data, dict):
                    self.canned_responses[category] = data.get("responses", {})
                    examples = data.get("examples", [])
                    all_texts.extend(examples)
                    all_cats.extend([category] * len(examples))

            if not all_texts:
                logger.warning("⚠️ No examples found in intents.yaml")
                return

            # Single batch API call instead of one call per category
            logger.info(f"🧠 Embedding {len(all_texts)} examples across {len(self.canned_responses)} categories (single batch)...")
            try:
                all_vectors, index_tokens = self._raw_embed(all_texts)
                logger.info(f"📊 Startup indexing used {index_tokens} embed tokens ({len(all_texts)} examples)")
            except Exception as e:
                logger.error(f"❌ Failed to embed intent examples: {e}")
                return

            self.vector_matrix = np.array(all_vectors)
            norms = np.linalg.norm(self.vector_matrix, axis=1, keepdims=True)
            self.vector_matrix = self.vector_matrix / (norms + 1e-9)
            self.vector_labels = all_cats
            self.all_examples = all_texts

            try:
                np.savez(
                    CACHE_PATH,
                    vector_matrix=self.vector_matrix,
                    vector_labels=self.vector_labels,
                    all_examples=self.all_examples,
                    mtime=mtime,
                    model=settings.LLM_EMBED_MODEL
                )
                logger.info("💾 Intent embeddings saved to cache.")
            except Exception as e:
                logger.warning(f"⚠️ Failed to save cache: {e}")

            logger.info(f"✅ Indexed {len(self.vector_labels)} examples across {len(self.canned_responses)} categories.")

        except Exception as e:
            logger.error(f"❌ Failed to load/index intents: {e}")

    def _load_only_canned_responses(self):
        """Helper to load responses even if embedding fails/is skipped."""
        self.canned_responses = {}
        for category, data in self.intent_config.items():
            if isinstance(data, dict):
                self.canned_responses[category] = data.get("responses", {})

    # ------------------------------------------------------------------
    # Async init — called from app lifespan (non-blocking startup)
    # ------------------------------------------------------------------
    async def async_init(self):
        """Trigger full intent indexing in a thread. Call once from app lifespan."""
        if self.vector_matrix is None and settings.LLM_API_KEY:
            logger.info("🔄 IntentRouter: starting async full index...")
            await asyncio.to_thread(self._load_and_index_intents)

    # ------------------------------------------------------------------
    # Input sanitization
    # ------------------------------------------------------------------
    def _sanitize_input(self, text: str) -> str:
        """Strip XML-like tags to prevent prompt injection tag breakout."""
        if not text:
            return ""
        return re.sub(r'</?(user_input|context|history|chat_history|manual|system_instruction)[^>]*>', '', text, flags=re.IGNORECASE)

    # ------------------------------------------------------------------
    # Main detection pipeline
    # ------------------------------------------------------------------
    async def detect_intent(self, message: str, lang: str = "th", have_history: bool = False) -> Tuple[str, str, Tuple[int, int], int]:
        """Analyze the intent of a user message.

        Returns (intent, canned_response, (llm_input_tokens, llm_output_tokens), embed_tokens)
        """

        # Throttled mtime check — file I/O at most once every 30s
        now = time.monotonic()
        if now - self._last_mtime_check >= _MTIME_CHECK_INTERVAL:
            self._last_mtime_check = now
            try:
                current_mtime = os.path.getmtime(self.intents_file)
                if current_mtime > self.last_load_time:
                    logger.info("🔄 intents.yaml changed, reloading...")
                    await asyncio.to_thread(self._load_and_index_intents)
                elif self.vector_matrix is None and settings.LLM_API_KEY:
                    logger.info("🔄 OpenRouter API Key now available. Retrying intent indexing...")
                    await asyncio.to_thread(self._load_and_index_intents)
            except Exception as e:
                logger.error(f"⚠️ Error checking intents.yaml mtime: {e}")

        logger.info(f"🔍 Intent Routing: Input='{message}' (History: {have_history})")
        msg_lower = message.strip().lower()

        # --- 1. Regex Fast-Track ---
        for intent, patterns in DIRECT_MATCHES.items():
            # Skip confusion detection when there's active conversation history
            if intent == "confusion" and have_history:
                continue
            for pattern in patterns:
                if re.search(pattern, msg_lower, re.IGNORECASE):
                    logger.info(f"🎯 Noise Detected (Regex): {intent}")
                    return intent, self.canned_responses.get(intent, {}).get(lang, ""), (0, 0), 0

        # --- 2. Vectorized Semantic Similarity ---
        intent_embed_tokens = 0
        # Track best vector result so LLM fallback can use it as a hint
        vec_best_score: float = 0.0
        vec_best_intent: str = ""

        if self.vector_matrix is not None:
            try:
                query_vector, intent_embed_tokens = await asyncio.to_thread(self._embed_query, message)
                query_vector = np.array(query_vector)
                query_norm = np.linalg.norm(query_vector)

                if query_norm > 1e-9:
                    query_vector = query_vector / query_norm
                    scores = np.dot(self.vector_matrix, query_vector)

                    # Top-5: top-3 for logging, extra 2 for soft-zone consensus
                    top_n = min(5, len(scores))
                    top_indices = np.argsort(scores)[-top_n:][::-1]
                    top_info = [
                        (self.vector_labels[i], f"{scores[i]:.4f}",
                         self.all_examples[i] if i < len(self.all_examples) else "???")
                        for i in top_indices[:3]
                    ]
                    logger.info(f"📊 Vector Top-3: {top_info}")

                    best_idx = int(top_indices[0])
                    best_score = float(scores[best_idx])
                    best_intent = self.vector_labels[best_idx]
                    vec_best_score = best_score
                    vec_best_intent = best_intent

                    cat_threshold = _CATEGORY_THRESHOLDS.get(best_intent, _DEFAULT_THRESHOLD)

                    # Context-aware: confusion with active history = real question
                    if best_intent == "confusion" and have_history:
                        logger.info("📊 Confusion with history — fall through to TECH_SUPPORT.")
                    elif best_score >= cat_threshold:
                        # Hard match — confident enough to return without LLM
                        logger.info(f"📊 Noise Detected (Vector Hard): {best_intent} ({best_score:.4f} >= {cat_threshold})")
                        return best_intent, self.canned_responses.get(best_intent, {}).get(lang, ""), (0, 0), intent_embed_tokens
                    elif best_score >= _SOFT_ZONE_MIN:
                        # Soft zone: check if top-K examples reach consensus
                        vote_counts: dict[str, int] = {}
                        for i in top_indices:
                            s = float(scores[i])
                            if s >= _SOFT_ZONE_MIN:
                                lbl = self.vector_labels[i]
                                vote_counts[lbl] = vote_counts.get(lbl, 0) + 1

                        if vote_counts:
                            top_cat = max(vote_counts, key=vote_counts.get)
                            top_cnt = vote_counts[top_cat]
                            # Never promote confusion in soft-zone — too risky
                            # Also skip confusion-with-history case handled above
                            if top_cat != "confusion" and top_cnt >= _SOFT_ZONE_VOTES:
                                logger.info(f"📊 Noise Detected (Vector Soft, votes={top_cnt}): {top_cat} ({best_score:.4f})")
                                return top_cat, self.canned_responses.get(top_cat, {}).get(lang, ""), (0, 0), intent_embed_tokens
            except Exception as e:
                logger.error(f"⚠️ Semantic matching failed: {e}")

        # --- 3. LLM Fallback ---
        try:
            logger.info(f"🤖 Intent Routing: Falling back to LLM ({settings.active_intent_model})")

            context_instruction = (
                "NOTE: An ongoing conversation exists. Classify based on the query itself — "
                "COMPANY_INFO still applies for contact/address questions regardless of history. "
                "Use TECH_SUPPORT for ambiguous/confused messages when history is present."
                if have_history else
                "Treat ambiguous or confused messages (งง, huh?) without context as OUT_OF_SCOPE."
            )

            # Pass vector hint to guide LLM when we have a soft-zone signal
            vector_hint = ""
            if vec_best_score >= _SOFT_ZONE_MIN:
                vector_hint = (
                    f"\n[Semantic hint: vector analysis suggests {vec_best_intent.upper()} "
                    f"(score={vec_best_score:.2f}) — confirm or override if clearly wrong.]"
                )

            sanitized_message = self._sanitize_input(message)
            prompt = f"""Classify this user query for a hotel accounting software support chatbot.
Reply with ONE WORD only — the category name.

Categories:
- GREETING    : casual hello/greeting  (สวัสดี / hello / hi / good morning)
- THANKS      : appreciation or done   (ขอบคุณ / thank you / great / awesome)
- COMPANY_INFO: contact info, address, phone, email, Line ID, website, or how to reach support/sales/team
- CAPABILITIES: asking what the AI assistant can do  (ทำอะไรได้บ้าง / what can you help with)
- OUT_OF_SCOPE: completely unrelated topics — weather, food, news, sports, jokes, general chat
- CONFUSION   : vague/meaningless message with no specific topic  (งง / อะไรนะ / huh? / ???)
- TECH_SUPPORT: system how-to, troubleshooting, feature usage — DEFAULT for any software question
{vector_hint}
Query: "{sanitized_message}"
{context_instruction}

ONE word:"""

            response = await self.small_llm.ainvoke([HumanMessage(content=prompt)])
            raw_content = response.content.strip() if response.content else ""

            keywords = ["GREETING", "THANKS", "COMPANY_INFO", "CAPABILITIES", "OUT_OF_SCOPE", "CONFUSION", "TECH_SUPPORT"]
            intent_raw = ""
            for word in re.split(r'[\s\n\.,!?\-]+', raw_content.upper()):
                if word in keywords:
                    intent_raw = word
                    break

            usage = getattr(response, 'usage_metadata', {})
            tokens = (usage.get('input_tokens', 0), usage.get('output_tokens', 0))

            if intent_raw:
                logger.info(f"🤖 Intent LLM: '{intent_raw}'")
            else:
                logger.warning(f"⚠️ Could not parse LLM result: '{raw_content}'. Defaulting to TECH_SUPPORT.")
                return "tech_support", "", tokens, intent_embed_tokens

            return intent_raw.lower(), self.canned_responses.get(intent_raw.lower(), {}).get(lang, ""), tokens, intent_embed_tokens
        except Exception as e:
            logger.error(f"⚠️ LLM Fallback failed: {e}")
            return "tech_support", "", (0, 0), intent_embed_tokens


# Singleton instance
intent_router = IntentRouter()
