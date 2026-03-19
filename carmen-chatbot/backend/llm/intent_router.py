import re
import os
import time
import json
import yaml
import asyncio
import logging
import numpy as np
from typing import Tuple, Dict, List
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from backend.core.config import settings
from langchain_ollama import OllamaEmbeddings

logger = logging.getLogger(__name__)
from pathlib import Path

# Path to intents configuration
INTENTS_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "intents.yaml"))

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
        self.threshold = 0.75 
        
        # Initialize small LLM for final fallback
        self.small_llm = ChatOpenAI(
            model=settings.OPENROUTER_INTENT_MODEL,
            openai_api_key=settings.OPENROUTER_API_KEY,
            openai_api_base="https://openrouter.ai/api/v1",
            temperature=0.0,
            max_tokens=20
        )
        
        # Initialize Ollama Embeddings
        self.embeddings = OllamaEmbeddings(
            model=settings.OLLAMA_EMBED_MODEL,
            base_url=settings.OLLAMA_URL
        )
        
        self.intents_file = INTENTS_PATH
        self.last_load_time = 0 # To store the last modification time of intents.yaml
        
        self._load_and_index_intents()

    def _load_and_index_intents(self):
        """Load intents from YAML and vectorize embeddings."""
        try:
            if not os.path.exists(self.intents_file):
                logger.warning(f"⚠️ intents.yaml not found at {self.intents_file}")
                return

            with open(self.intents_file, 'r', encoding='utf-8') as f:
                self.intent_config = yaml.safe_load(f) or {}
            
            self.last_load_time = os.path.getmtime(self.intents_file)
            logger.info(f"📂 Loading intents from {self.intents_file} (Modified: {time.ctime(self.last_load_time)})")
            
            all_vectors = []
            self.vector_labels = []
            self.canned_responses = {}

            logger.info("🧠 Indexing Noise Filters (Vectorized)...")
            for category, data in self.intent_config.items():
                if isinstance(data, dict):
                    # Load Canned Responses
                    self.canned_responses[category] = data.get("responses", {})
                    
                    # Load and Embed Examples
                    examples = data.get("examples", [])
                    if examples:
                        vectors = [self.embeddings.embed_query(ex) for ex in examples]
                        all_vectors.extend(vectors)
                        self.vector_labels.extend([category] * len(vectors))
            
            if all_vectors:
                self.vector_matrix = np.array(all_vectors)
                # Pre-normalize for faster cosine similarity
                norms = np.linalg.norm(self.vector_matrix, axis=1, keepdims=True)
                self.vector_matrix = self.vector_matrix / (norms + 1e-9)
            
            logger.info(f"✅ Indexed {len(self.vector_labels)} examples across {len(self.canned_responses)} categories.")
            
        except Exception as e:
            logger.error(f"❌ Failed to load/index noise filters: {e}")

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
                query_vector = await asyncio.to_thread(self.embeddings.embed_query, message)
                query_vector = np.array(query_vector)
                query_norm = np.linalg.norm(query_vector)
                
                if query_norm > 1e-9:
                    query_vector = query_vector / query_norm
                    # Calculate all cosine similarities in one dot product
                    scores = np.dot(self.vector_matrix, query_vector)
                    best_idx = np.argmax(scores)
                    best_score = scores[best_idx]
                    best_intent = self.vector_labels[best_idx]
                    
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

            prompt = f"""Categorize this user query into ONE of these:
- GREETING: Hello/Hi.
- THANKS: Thank you.
- COMPANY_INFO: Address, phone, email, website, OR HOW TO CONTACT SUPPORT/TEAM/SALES.
- CAPABILITIES: What can you do?
- OUT_OF_SCOPE: Irrelevant (weather/food/general talk).
- CONFUSION: What?/Huh?/Not clear (Ambiguous).
- TECH_SUPPORT: Troubleshooting, technical help, "How to use [Feature]".

Query: '{message}'
{context_instruction}

Decision (ONE word only):"""
            
            response = await self.small_llm.ainvoke([HumanMessage(content=prompt)])
            raw_content = response.content.strip() if response.content else ""
            
            # Extract first word and clean it
            intent_raw = raw_content.split('\n')[0].split(' ')[-1].upper().replace('.', '').replace('!', '').replace('-', '').strip()
            
            usage = getattr(response, 'usage_metadata', {})
            tokens = (usage.get('input_tokens', 0), usage.get('output_tokens', 0))
            
            if intent_raw:
                logger.info(f"🤖 Intent LLM: '{intent_raw}'")
            
            # Use safety default for unrecognized results
            if intent_raw not in ["GREETING", "THANKS", "COMPANY_INFO", "CAPABILITIES", "OUT_OF_SCOPE", "CONFUSION", "TECH_SUPPORT"]:
                logger.warning(f"⚠️ Unrecognized LLM result '{intent_raw}'. Defaulting to TECH_SUPPORT.")
                return "tech_support", "", tokens
            
            # Map result to category
            return intent_raw.lower(), self.canned_responses.get(intent_raw.lower(), {}).get(lang, ""), tokens
        except Exception as e:
            logger.error(f"⚠️ LLM Fallback failed: {e}")
            return "tech_support", "", (0, 0)

# Singleton instance
intent_router = IntentRouter()
