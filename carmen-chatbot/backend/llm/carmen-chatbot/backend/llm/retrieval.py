import logging
import os
import re
import asyncio
from sqlalchemy import text
from langchain_ollama import OllamaEmbeddings
from langchain_openai import OpenAIEmbeddings
from langchain_core.documents import Document

from ..core.config import settings
from ..core.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

class RetrievalService:
    TOP_K = 4
    MAX_DISTANCE = 0.75
    PATH_BOOST = 0.08
    FETCH_K = 20  

    def __init__(self):
        self.embeddings = None
        self.initialize_brain()

    def initialize_brain(self):
        try:
            provider = settings.ACTIVE_LLM_PROVIDER.lower()
            if provider == "openrouter":
                logger.info(f"🧠 Initializing AI Brain (OpenRouter) using {settings.OPENROUTER_EMBED_MODEL}")
                self.embeddings = OpenAIEmbeddings(
                    model=settings.OPENROUTER_EMBED_MODEL,
                    openai_api_key=settings.OPENROUTER_API_KEY,
                    openai_api_base="https://openrouter.ai/api/v1",
                )
            else:
                logger.info(f"🧠 Initializing AI Brain (Ollama) using {settings.OLLAMA_EMBED_MODEL}")
                self.embeddings = OllamaEmbeddings(
                    model=settings.OLLAMA_EMBED_MODEL,
                    base_url=settings.OLLAMA_URL,
                    client_kwargs={"timeout": 60.0}
                )
        except Exception as e:
            logger.error(f"❌ Error Initializing AI Brain: {e}")

    async def get_embedding(self, query: str) -> list[float]:
        """Generate an embedding via raw OpenRouter API and truncate/normalize it."""
        try:
            url = "https://openrouter.ai/api/v1/embeddings"
            headers = {
                "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://github.com/new-carmen",
                "X-Title": "Carmen Chatbot"
            }
            data = {
                "model": settings.OPENROUTER_EMBED_MODEL,
                "input": [query]
            }
            
            # Use requests in a thread for sync-to-async compatibility
            import requests
            import numpy as np
            
            def call_api():
                resp = requests.post(url, headers=headers, json=data, timeout=30)
                resp.raise_for_status()
                return resp.json()
                
            res_json = await asyncio.to_thread(call_api)
            
            if "data" not in res_json or not res_json["data"]:
                raise ValueError(f"OpenRouter embedding failed: {res_json}")
                
            vector = res_json["data"][0]["embedding"]
            
            # Truncate and Normalize for Matryoshka
            dim = settings.VECTOR_DIMENSION
            truncated = vector[:dim]
            
            norm = np.linalg.norm(truncated)
            if norm > 1e-9:
                truncated = (np.array(truncated) / norm).tolist()
                
            return truncated
        except Exception as e:
            logger.error(f"❌ Raw Embedding Error: {e}")
            raise

    def format_pgvector(self, vector_list: list[float]) -> str:
        return "[" + ",".join(str(v) for v in vector_list) + "]"

    def get_path_boost_patterns(self, question: str) -> list[str]:
        """Match applicable path rules from external config."""
        q_lower = question.lower()
        all_patterns = []
        matched_keywords = []
        
        # settings.PATH_RULES is loaded from YAML/JSON
        for rule in settings.PATH_RULES:
            keywords = rule.get("keywords", [])
            patterns = rule.get("patterns", [])
            
            for kw in keywords:
                if kw.lower() in q_lower:
                    matched_keywords.append(kw)
                    for p in patterns:
                        if p not in all_patterns:
                            all_patterns.append(p)
                    break # Move to next rule once one keyword matches

        # If too many rules match, it might be a generic query, skip boosting
        if len(matched_keywords) >= 5:
            return []
            
        return all_patterns

    # Stricter pattern: allow only lowercase alphanumeric and underscores, 
    # and limit length to prevent DoS/overflow (e.g., 63 chars for PG identifiers).
    SAFE_SCHEMA_PATTERN = re.compile(r'^[a-z][a-z0-9_]{1,62}$')

    async def search(self, query: str, db_schema: str = "carmen"):
        passed_docs = []
        source_debug = []

        # Validate schema name strictly
        if not db_schema or not self.SAFE_SCHEMA_PATTERN.match(db_schema):
            logger.warning(f"🛡️ Security: Invalid or suspicious schema name blocked: '{db_schema}'")
            return passed_docs, source_debug
        
        if not self.embeddings:
            logger.error("Embeddings not initialized")
            return passed_docs, source_debug

        try:
            # Generate and truncate embedding centralizing logic
            query_embedding = await self.get_embedding(query)
            emb_str = self.format_pgvector(query_embedding)

            boost_patterns = self.get_path_boost_patterns(query)
            
            sql_query = text(f"""
                SELECT 
                    d.path, 
                    d.title, 
                    dc.content, 
                    (dc.embedding <=> CAST(:emb AS vector)) as distance
                FROM {db_schema}.document_chunks dc
                JOIN {db_schema}.documents d ON dc.document_id = d.id
                WHERE (dc.embedding <=> CAST(:emb AS vector)) < :max_dist
                  AND d.path NOT LIKE '%index.md'
                ORDER BY (dc.embedding <=> CAST(:emb AS vector))
                LIMIT :fetch_limit
            """)

            params = {
                "emb": emb_str,
                "max_dist": self.MAX_DISTANCE,
                "fetch_limit": self.FETCH_K
            }

            async with AsyncSessionLocal() as db:
                result = await db.execute(sql_query, params)
                rows = result.fetchall()
                
                # Re-ranking Logic in Python
                candidates = []
                for row in rows:
                    path = row.path
                    actual_dist = float(row.distance)
                    is_boosted = False
                    
                    if boost_patterns:
                        for pattern in boost_patterns:
                            # Convert SQL LIKE pattern to regex
                            regex_pattern = pattern.replace("%", ".*").replace("_", ".")
                            if re.search(regex_pattern, path, re.IGNORECASE):
                                is_boosted = True
                                break
                    
                    effective_dist = actual_dist - (self.PATH_BOOST if is_boosted else 0)
                    
                    if is_boosted:
                        logger.debug(f"🚀 [Path Boost Applied] -> path: {path} | Original: {actual_dist:.4f} | Boosted: {effective_dist:.4f}")

                    candidates.append({
                        "path": path,
                        "title": row.title or os.path.basename(path),
                        "content": row.content,
                        "actual_dist": actual_dist,
                        "effective_dist": effective_dist,
                        "is_boosted": is_boosted
                    })

                # Sort by effective distance
                candidates.sort(key=lambda x: x["effective_dist"])

                unique_contents = set()
                for item in candidates:
                    if len(passed_docs) >= self.TOP_K:
                        break
                    
                    # Deduplicate by content
                    content = item["content"]
                    if content in unique_contents:
                        continue
                    unique_contents.add(content)

                    # Fix image paths in content
                    path = item["path"]
                    base_dir = os.path.dirname(path).replace("\\", "/")
                    
                    if base_dir:
                        def resolve_src(src):
                            # 1. Clean up the source path
                            clean_src = src.lstrip("/")
                            if clean_src.startswith("./"):
                                clean_src = clean_src[2:]
                            
                            # 2. Preserve absolute URLs or data URIs
                            if clean_src.startswith("http") or clean_src.startswith("data:"):
                                return src
                            
                            # 3. Handle paths that already have 'images/' prefix
                            if clean_src.startswith("images/"):
                                clean_src = clean_src[len("images/"):]
                            
                            # 4. Resolve relative path using base_dir
                            if "/" not in clean_src:
                                clean_src = f"{base_dir}/{clean_src}"
                            
                            # 5. Return a full relative-style path (e.g., /images/ap/image.png)
                            # Prepending /images/ makes it unmistakable for the LLM
                            res = clean_src.lstrip("/")
                            return f"/images/{res}"

                        # Fix <img> tags: only replace the src attribute, don't convert to Markdown
                        # This preserves inline styles like height/width
                        def fix_img_tag(match):
                            full_tag = match.group(0)
                            src_match = re.search(r'src=["\']([^"\']+)["\']', full_tag)
                            if not src_match:
                                return full_tag
                            
                            new_src = resolve_src(src_match.group(1))
                            # Use double quotes for the new src
                            return re.sub(r'src=["\']([^"\']+)["\']', f'src="{new_src}"', full_tag)

                        content = re.sub(r'<img\s+[^>]*src=["\']([^"\']+)["\'][^>]*>', fix_img_tag, content)

                        # Fix Markdown images: ![alt](src)
                        content = re.sub(r'!\[([^\]]*)\]\(([^)]+)\)', 
                            lambda m: f"![{m.group(1)}]({resolve_src(m.group(2))})", content)

                    score_label = f"{item['actual_dist']:.4f}"
                    if item["is_boosted"]:
                        score_label += f" (Boosted → {item['effective_dist']:.4f})"

                    passed_docs.append(Document(
                        page_content=content, 
                        metadata={
                            "source": path, 
                            "title": item["title"],
                            "score": score_label
                        }
                    ))
                    source_debug.append({"source": path, "title": item["title"], "score": score_label})

        except Exception as e:
            logger.exception(f"Search error: {e}")
            
        return passed_docs, source_debug

# Singleton instance
retrieval_service = RetrievalService()
