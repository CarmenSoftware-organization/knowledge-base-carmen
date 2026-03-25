import re
import os
import time
import json
import yaml
import asyncio
import logging
import requests
import numpy as np
from typing import Tuple, Dict, List
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_core.messages import HumanMessage
from backend.core.config import settings
from langchain_ollama import OllamaEmbeddings

logger = logging.getLogger(__name__)
from pathlib import Path

# Path to intents configuration
INTENTS_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "intents.yaml"))
CACHE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "intents_cache.npz"))

# Fast-track Regex for immediate common cases (Negative Filtering)
DIRECT_MATCHES = {
    "greeting": [r"^(สวัสดี|hello|hi|hey|good\s?(morning|afternoon|evening)|yo|sup|ทักทาย|ทัก|เฮลโล|หวัดดี|ดี)(ครับ|ค่ะ|คร้า|คับ|นะ|จ๊ะ|จ๋า|!)?$"],
    "thanks": [r"^(ขอบคุณ|thank\s?you|thanks|thx|ขอบใจ|เยี่ยม|ดีมาก|ขอบพระคุณ|แต๊ง|กราบ|awesome|perfect)(ครับ|ค่ะ|คร้า|คับ|นะ|จ๊ะ|จ๋า|!)?$"],
    "capabilities": [r"^(ทำอะไรได้บ้าง|ช่วยอะไรได้บ้าง|ช่วยยังไง|มึความสามารถอะไร|what can you do|how can you help|features|capabilities)$"],
    "confusion": [r"^(อะไรนะ|งง|ไม่เข้าใจ|พูดไรนะ|ไม่รู้เรื่อง|ห๊ะ|ฮะ|what\??|confused|huh\??|eh\??)$"],
}

class IntentRouter:
    def __init__(self):
        self.provider = settings.ACTIVE_LLM_PROVIDER.lower()
        self.intent_config = {}
        self.canned_responses = {}
        
        # Vectorized storage
        self.vector_matrix = None # NumPy matrix of all example embeddings
        self.vector_labels = []   # List of category labels corresponding to rows in matrix
        self.all_examples = []    # List of raw example strings for debugging
        
        # Threshold: OpenRouter (Qwen) space is more dense. 0.85 was still too low.
        self.threshold = 0.90 if self.provider == "openrouter" else 0.75 
        
        # Initialize small LLM for final fallback
        self.small_llm = ChatOpenAI(
            model=settings.OPENROUTER_INTENT_MODEL,
            openai_api_key=settings.OPENROUTER_API_KEY,
            openai_api_base="https://openrouter.ai/api/v1",
            temperature=0.0,
            max_tokens=20
        )
        
        # Initialize Embeddings
        if self.provider == "openrouter":
            logger.info(f"🧠 IntentRouter: Using OpenRouter Embeddings ({settings.OPENROUTER_EMBED_MODEL})")
            self.embeddings = OpenAIEmbeddings(
                model=settings.OPENROUTER_EMBED_MODEL,
                openai_api_key=settings.OPENROUTER_API_KEY,
                openai_api_base="https://openrouter.ai/api/v1",
            )
        else:
            logger.info(f"🧠 IntentRouter: Using Ollama Embeddings ({settings.OLLAMA_EMBED_MODEL})")
            self.embeddings = OllamaEmbeddings(
                model=settings.OLLAMA_EMBED_MODEL,
                base_url=settings.OLLAMA_URL
            )
        
        self.intents_file = INTENTS_PATH
        self.last_load_time = 0 # To store the last modification time of intents.yaml
        
        # Initial attempt at indexing (Non-blocking if it fails)
        self._load_and_index_intents()

    def _raw_embed(self, texts: List[str]) -> List[List[float]]:
        """Direct OpenRouter API call for embeddings (Bypassing LangChain)."""
        try:
            url = "https://openrouter.ai/api/v1/embeddings"
            headers = {
                "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://github.com/new-carmen",
                "X-Title": "Carmen Chatbot Intent Indexer"
            }
            payload = {
                "model": settings.OPENROUTER_EMBED_MODEL,
                "input": texts
            }
            resp = requests.post(url, headers=headers, json=payload, timeout=60)
            resp.raise_for_status()
            res_json = resp.json()
            
            if "data" not in res_json:
                raise ValueError(f"OpenRouter response missing data: {res_json}")
            
            results = []
            for item in res_json["data"]:
                vector = item["embedding"]
                # Truncate to 2000 and Normalize
                truncated = vector[:2000]
                norm = np.linalg.norm(truncated)
                if norm > 1e-9:
                    truncated = (np.array(truncated) / norm).tolist()
                results.append(truncated)
            return results
        except Exception as e:
            logger.error(f"❌ IntentRouter Raw Embedding Error: {e}")
            raise

    def _embed_query(self, text: str) -> List[float]:
        """Intermediate helper to handle truncation/norm for IntentRouter."""
        return self._raw_embed([text])[0]

    def _embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Intermediate helper to handle truncation/norm for IntentRouter (Batch)."""
        return self._raw_embed(texts)

    def _is_ollama_reachable(self) -> bool:
        """Check if Ollama service is reachable."""
        try:
            # Try to hit the Ollama API with a short timeout
            response = requests.get(settings.OLLAMA_URL, timeout=2)
            return response.status_code == 200
        except Exception:
            return False

    def _load_and_index_intents(self):
        """Load intents from YAML and vectorize embeddings."""
        try:
            if not os.path.exists(self.intents_file):
                logger.warning(f"⚠️ intents.yaml not found at {self.intents_file}")
                return

            with open(self.intents_file, 'r', encoding='utf-8') as f:
                self.intent_config = yaml.safe_load(f) or {}
            
            mtime = os.path.getmtime(self.intents_file)
            
            # --- Try Loading from Cache ---
            if os.path.exists(CACHE_PATH):
                try:
                    cache_data = np.load(CACHE_PATH, allow_pickle=True)
                    # Check if cache is still valid
                    if (cache_data.get('mtime') == mtime and 
                        cache_data.get('provider') == self.provider and 
                        cache_data.get('model') == getattr(self.embeddings, 'model', "")):
                        
                        self.vector_matrix = cache_data['vector_matrix']
                        self.vector_labels = list(cache_data['vector_labels'])
                        self.all_examples = list(cache_data.get('all_examples', []))
                        self.last_load_time = mtime
                        self._load_only_canned_responses()
                        logger.info(f"🚀 Loaded {len(self.vector_labels)} intent embeddings from cache.")
                        # Check dimension consistency
                        if self.vector_matrix is not None and self.vector_matrix.shape[1] != 2000:
                             logger.warning(f"⚠️ Cache dim ({self.vector_matrix.shape[1]}) != 2000, forcing re-index.")
                             # fall through to re-index
                        else:
                             return
                except Exception as e:
                    logger.warning(f"⚠️ Cache load failed, re-indexing: {e}")

            self.last_load_time = mtime
            logger.info(f"📂 Loading intents from {self.intents_file} (Modified: {time.ctime(self.last_load_time)})")
            
            # --- Connectivity / API Safety Checks ---
            if self.provider == "ollama" and not self._is_ollama_reachable():
                logger.warning(f"⚠️ Ollama service unreachable at {settings.OLLAMA_URL}. Skipping vectorized indexing.")
                self._load_only_canned_responses()
                return
                
            if self.provider == "openrouter" and not settings.OPENROUTER_API_KEY:
                logger.warning("⚠️ OPENROUTER_API_KEY missing. Skipping vectorized indexing.")
                self._load_only_canned_responses()
                return

            all_vectors = []
            self.vector_labels = []
            self.all_examples = []
            self.canned_responses = {}

            logger.info(f"🧠 Indexing Noise Filters (Vectorized) using {self.provider}...")
            for category, data in self.intent_config.items():
                if isinstance(data, dict):
                    # Load Canned Responses
                    self.canned_responses[category] = data.get("responses", {})
                    
                    # Load and Embed Examples in BATCHES
                    examples = data.get("examples", [])
                    if examples:
                        try:
                            # Batch embedding (much faster and fewer API calls)
                            vectors = self._embed_documents(examples)
                            all_vectors.extend(vectors)
                            self.vector_labels.extend([category] * len(vectors))
                            self.all_examples.extend(examples)
                        except Exception as e:
                            logger.error(f"❌ Failed to embed examples for {category}: {e}")
            
            if all_vectors:
                self.vector_matrix = np.array(all_vectors)
                # Pre-normalize for faster cosine similarity
                norms = np.linalg.norm(self.vector_matrix, axis=1, keepdims=True)
                self.vector_matrix = self.vector_matrix / (norms + 1e-9)
                
                # --- Save to Cache ---
                try:
                    np.savez(
                        CACHE_PATH, 
                        vector_matrix=self.vector_matrix, 
                        vector_labels=self.vector_labels,
                        all_examples=self.all_examples,
                        mtime=mtime, 
                        provider=self.provider,
                        model=getattr(self.embeddings, 'model', "")
                    )
                    logger.info("💾 Intent embeddings saved to cache.")
                except Exception as e:
                    logger.warning(f"⚠️ Failed to save cache: {e}")
            
            logger.info(f"✅ Indexed {len(self.vector_labels)} examples across {len(self.canned_responses)} categories.")
            
        except Exception as e:
            logger.error(f"❌ Failed to load/index noise filters: {e}")

    def _load_only_canned_responses(self):
        """Helper to load responses even if embedding fails/is skipped."""
        self.canned_responses = {}
        for category, data in self.intent_config.items():
            if isinstance(data, dict):
                self.canned_responses[category] = data.get("responses", {})

    def _sanitize_input(self, text: str) -> str:
        """Strip XML-like tags to prevent prompt injection tag breakout."""
        if not text: return ""
        return re.sub(r'</?(user_input|context|history|chat_history|manual|system_instruction)[^>]*>', '', text, flags=re.IGNORECASE)

    async def detect_intent(self, message: str, lang: str = "th", have_history: bool = False) -> Tuple[str, str, Tuple[int, int]]:
        """
        Analyze the intent of a user message.
        """
        # Check for updates to intents.yaml
        try:
            current_mtime = os.path.getmtime(self.intents_file)
            if current_mtime > self.last_load_time:
                logger.info("🔄 intents.yaml changed, reloading...")
                self._load_and_index_intents()
            elif self.vector_matrix is None:
                # Lazy retry if provider became available
                if self.provider == "ollama" and self._is_ollama_reachable():
                    logger.info("🔄 Ollama is now available. Retrying intent indexing...")
                    self._load_and_index_intents()
                elif self.provider == "openrouter" and settings.OPENROUTER_API_KEY:
                    logger.info("🔄 OpenRouter API Key now available. Retrying intent indexing...")
                    self._load_and_index_intents()
        except Exception as e:
            logger.error(f"⚠️ Error checking intents.yaml mtime: {e}")

        logger.info(f"🔍 Intent Routing (Negative Filter): Input='{message}' (History: {have_history})")
        msg_lower = message.strip().lower()

        # --- 1. Regex Fast-Track ---
        for intent, patterns in DIRECT_MATCHES.items():
            # For ambiguous phrases like "What?", skip regex if there is history
            if intent == "confusion" and have_history:
                continue
                
            for pattern in patterns:
                if re.search(pattern, msg_lower, re.IGNORECASE):
                    logger.info(f"🎯 Noise Detected (Regex): {intent}")
                    return intent, self.canned_responses.get(intent, {}).get(lang, ""), (0, 0)

        # --- 2. Vectorized Semantic Similarity ---
        if self.vector_matrix is not None:
            try:
                query_vector = await asyncio.to_thread(self._embed_query, message)
                query_vector = np.array(query_vector)
                query_norm = np.linalg.norm(query_vector)
                
                if query_norm > 1e-9:
                    query_vector = query_vector / query_norm
                    # Calculate all cosine similarities in one dot product
                    scores = np.dot(self.vector_matrix, query_vector)
                    best_idx = np.argmax(scores)
                    best_score = scores[best_idx]
                    best_intent = self.vector_labels[best_idx]
                    matched_example = self.all_examples[best_idx] if best_idx < len(self.all_examples) else "???"
                    
                    logger.info(f"📊 Vector Match: Intent={best_intent}, Score={best_score:.4f}, Match='{matched_example}'")
                    
                    # Context-aware logic for confusion phrases
                    is_confusion = best_intent == "confusion" and best_score >= self.threshold
                    if is_confusion and have_history:
                        logger.info(f"📊 Ambiguous query detected with History. Falling through to TECH_SUPPORT.")
                    elif best_score >= self.threshold:
                        logger.info(f"📊 Noise Detected (Vectorized): {best_intent} (Score: {best_score:.4f})")
                        return best_intent, self.canned_responses.get(best_intent, {}).get(lang, ""), (0, 0)
            except Exception as e:
                logger.error(f"⚠️ Semantic matching failed: {e}")

        # --- 3. LLM Fallback ---
        try:
            logger.info(f"🤖 Intent Routing: Falling back to LLM ({settings.OPENROUTER_INTENT_MODEL})")
            
            context_instruction = ""
            if have_history:
                context_instruction = "IMPORTANT: A technical conversation is in progress. If user says 'What?' or 'Confused', respond: TECH_SUPPORT."
            else:
                context_instruction = "If user says 'What?' or 'Confused' without context, respond: OUT_OF_SCOPE."

            sanitized_message = self._sanitize_input(message)
            prompt = f"""Categorize this user query into ONE of these:
- GREETING: Hello/Hi.
- THANKS: Thank you.
- COMPANY_INFO: Address, phone, email, website, OR HOW TO CONTACT SUPPORT/TEAM/SALES.
- CAPABILITIES: What can you do?
- OUT_OF_SCOPE: Irrelevant (weather/food/general talk).
- CONFUSION: What?/Huh?/Not clear (Ambiguous).
- TECH_SUPPORT: Troubleshooting, technical help, "How to use [Feature]".

Query: <user_input>'{sanitized_message}'</user_input>
{context_instruction}

Decision (ONE word only):"""
            
            response = await self.small_llm.ainvoke([HumanMessage(content=prompt)])
            raw_content = response.content.strip() if response.content else ""
            
            # Robust extraction: find the line that contains one of the keywords
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
                return "tech_support", "", tokens
            
            # Map result to category
            return intent_raw.lower(), self.canned_responses.get(intent_raw.lower(), {}).get(lang, ""), tokens
        except Exception as e:
            logger.error(f"⚠️ LLM Fallback failed: {e}")
            return "tech_support", "", (0, 0)

# Singleton instance
intent_router = IntentRouter()
