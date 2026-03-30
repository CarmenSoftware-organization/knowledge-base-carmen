import logging
import os
import re
import asyncio
import time
import requests
import numpy as np
from sqlalchemy import text
from langchain_openai import OpenAIEmbeddings
from langchain_core.documents import Document

from ..core.config import settings
from ..core.database import AsyncSessionLocal

logger = logging.getLogger(__name__)


def _sql_like_to_regex(pattern: str) -> str:
    """Convert SQL LIKE pattern to a file-path-safe regex.

    Rules:
    - % → .* (any sequence of characters)
    - _ is treated as a literal underscore (NOT a single-char wildcard),
      because file paths commonly contain underscores in names like user_guide.md.
    - All other regex special characters are escaped.
    """
    # Split on % first, escape each part, then join with .*
    # (re.escape no longer escapes % in Python 3.7+, so can't rely on \% replacement)
    parts = pattern.split('%')
    return '.*'.join(re.escape(part) for part in parts)


class RetrievalService:
    def __init__(self):
        # Load tuning parameters from core/tuning.yaml — edit that file to adjust.
        _rt = settings.TUNING.get("retrieval", {})
        self.TOP_K          = int(  _rt.get("top_k",          4))
        self.MAX_DISTANCE   = float(_rt.get("max_distance",   0.45))
        self.PATH_BOOST_RRF = float(_rt.get("path_boost_rrf", 0.02))
        self.FETCH_K        = int(  _rt.get("fetch_k",        20))
        self.RRF_K          = int(  _rt.get("rrf_k",          60))

        self.embeddings = None
        self.initialize_brain()

    def initialize_brain(self):
        try:
            logger.info(f"🧠 Initializing AI Brain using {settings.LLM_EMBED_MODEL}")
            self.embeddings = OpenAIEmbeddings(
                model=settings.LLM_EMBED_MODEL,
                openai_api_key=settings.LLM_API_KEY,
                openai_api_base=settings.LLM_API_BASE,
            )
        except Exception as e:
            logger.error(f"❌ Error Initializing AI Brain: {e}")

    async def get_embedding(self, query: str) -> tuple[list[float], int]:
        """Generate an embedding via OpenRouter API and truncate/normalize it.

        Returns (vector, prompt_tokens).
        """
        try:
            url = f"{settings.LLM_API_BASE}/embeddings"
            headers = {
                "Authorization": f"Bearer {settings.LLM_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://github.com/new-carmen",
                "X-Title": "Carmen Chatbot"
            }
            data = {
                "model": settings.LLM_EMBED_MODEL,
                "input": [query]
            }

            def call_api():
                for attempt in range(3):
                    resp = requests.post(url, headers=headers, json=data, timeout=30)
                    if resp.status_code == 429 and attempt < 2:
                        time.sleep(2 ** attempt)
                        continue
                    resp.raise_for_status()
                    return resp.json()

            res_json = await asyncio.to_thread(call_api)

            embed_tokens = res_json.get("usage", {}).get("prompt_tokens", 0)

            if "data" not in res_json or not res_json["data"]:
                raise ValueError(f"OpenRouter embedding failed: {res_json}")

            vector = res_json["data"][0]["embedding"]

            dim = settings.VECTOR_DIMENSION
            truncated = vector[:dim]
            norm = np.linalg.norm(truncated)
            if norm > 1e-9:
                truncated = (np.array(truncated) / norm).tolist()

            return truncated, embed_tokens
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

        for rule in settings.PATH_RULES:
            keywords = rule.get("keywords", [])
            patterns = rule.get("patterns", [])

            for kw in keywords:
                if kw.lower() in q_lower:
                    matched_keywords.append(kw)
                    for p in patterns:
                        if p not in all_patterns:
                            all_patterns.append(p)
                    break  # Move to next rule once one keyword matches

        # If too many rules match, it's likely a generic query — skip boosting
        if len(matched_keywords) >= 5:
            return []

        return all_patterns

    # Strict schema name validation: lowercase alphanumeric + underscores, 2-63 chars
    SAFE_SCHEMA_PATTERN = re.compile(r'^[a-z][a-z0-9_]{1,62}$')

    async def search(self, query: str, db_schema: str = "carmen") -> tuple[list, list, int, float | None]:
        """Hybrid search. Returns (docs, source_debug, embed_tokens, avg_similarity_score)."""
        passed_docs = []
        source_debug = []
        embed_tokens = 0
        selected_vec_distances: list[float] = []

        if not db_schema or not self.SAFE_SCHEMA_PATTERN.match(db_schema):
            logger.warning(f"🛡️ Security: Invalid or suspicious schema name blocked: '{db_schema}'")
            return passed_docs, source_debug, 0, None

        if not self.embeddings:
            logger.error("Embeddings not initialized")
            return passed_docs, source_debug, 0, None

        try:
            query_embedding, embed_tokens = await self.get_embedding(query)
            emb_str = self.format_pgvector(query_embedding)
            boost_patterns = self.get_path_boost_patterns(query)

            async with AsyncSessionLocal() as db:

                # --- 1. Vector Search ---
                vector_sql = text(f"""
                    SELECT
                        d.path,
                        d.title,
                        dc.content,
                        (dc.embedding <=> CAST(:emb AS vector)) AS distance
                    FROM {db_schema}.document_chunks dc
                    JOIN {db_schema}.documents d ON dc.document_id = d.id
                    WHERE (dc.embedding <=> CAST(:emb AS vector)) < :max_dist
                      AND d.path NOT LIKE '%index.md'
                    ORDER BY distance
                    LIMIT :fetch_limit
                """)
                vector_rows = (await db.execute(vector_sql, {
                    "emb": emb_str,
                    "max_dist": self.MAX_DISTANCE,
                    "fetch_limit": self.FETCH_K,
                })).fetchall()

                # --- 2. Keyword Search (PostgreSQL Full-Text Search / BM25-like) ---
                # Works well for English terms, codes, product names.
                # Thai-only queries may return fewer hits but won't break anything.
                keyword_rows = []
                try:
                    keyword_sql = text(f"""
                        SELECT
                            d.path,
                            d.title,
                            dc.content,
                            ts_rank_cd(
                                to_tsvector('simple', dc.content),
                                plainto_tsquery('simple', :query)
                            ) AS kw_score
                        FROM {db_schema}.document_chunks dc
                        JOIN {db_schema}.documents d ON dc.document_id = d.id
                        WHERE to_tsvector('simple', dc.content) @@ plainto_tsquery('simple', :query)
                          AND d.path NOT LIKE '%index.md'
                        ORDER BY kw_score DESC
                        LIMIT :fetch_limit
                    """)
                    keyword_rows = (await db.execute(keyword_sql, {
                        "query": query,
                        "fetch_limit": self.FETCH_K,
                    })).fetchall()
                    logger.debug(f"🔍 Keyword search: {len(keyword_rows)} hits")
                except Exception as e:
                    logger.warning(f"⚠️ Keyword search failed, using vector-only: {e}")

            # --- 3. Reciprocal Rank Fusion (RRF) ---
            # Merges vector and keyword rankings into a single score.
            # rrf_score = 1/(k+rank_vector) + 1/(k+rank_keyword)
            rrf_map: dict[int, dict] = {}  # keyed by content hash

            for rank, row in enumerate(vector_rows, 1):
                key = hash(row.content)
                if key not in rrf_map:
                    rrf_map[key] = {
                        "path": row.path,
                        "title": row.title or os.path.basename(row.path),
                        "content": row.content,
                        "vector_dist": float(row.distance),
                        "rrf": 0.0,
                    }
                rrf_map[key]["rrf"] += 1.0 / (self.RRF_K + rank)

            for rank, row in enumerate(keyword_rows, 1):
                key = hash(row.content)
                if key not in rrf_map:
                    rrf_map[key] = {
                        "path": row.path,
                        "title": row.title or os.path.basename(row.path),
                        "content": row.content,
                        "vector_dist": 1.0,   # not from vector search
                        "rrf": 0.0,
                    }
                rrf_map[key]["rrf"] += 1.0 / (self.RRF_K + rank)

            # --- 4. Path Boost on RRF Score ---
            candidates = []
            for item in rrf_map.values():
                path = item["path"]
                is_boosted = False
                if boost_patterns:
                    for pattern in boost_patterns:
                        if re.search(_sql_like_to_regex(pattern), path, re.IGNORECASE):
                            is_boosted = True
                            break

                effective_rrf = item["rrf"] + (self.PATH_BOOST_RRF if is_boosted else 0.0)
                if is_boosted:
                    logger.debug(
                        f"🚀 [Path Boost] {path} | RRF: {item['rrf']:.4f} → {effective_rrf:.4f}"
                    )
                candidates.append({**item, "effective_rrf": effective_rrf, "is_boosted": is_boosted})

            # Sort descending (higher RRF = better)
            candidates.sort(key=lambda x: x["effective_rrf"], reverse=True)

            # --- 5. Deduplicate and build result ---
            seen_hashes: set[int] = set()
            for item in candidates:
                if len(passed_docs) >= self.TOP_K:
                    break

                content_hash = hash(item["content"])
                if content_hash in seen_hashes:
                    continue
                seen_hashes.add(content_hash)

                if item["vector_dist"] < 1.0:
                    selected_vec_distances.append(item["vector_dist"])

                content = item["content"]
                path = item["path"]
                base_dir = os.path.dirname(path).replace("\\", "/")

                # Convert Thai plain-text image references to markdown before URL resolution
                # e.g. "(รูป image-91.png)" or "(ตามรูป image-92.png)" → "![](image-91.png)"
                content = re.sub(
                    r'\((?:ตามรูป|รูป)\s+([\w][^\s)]+\.(?:png|jpe?g|gif|webp|svg))\)',
                    r'![](\1)',
                    content,
                    flags=re.IGNORECASE
                )

                def resolve_src(src):
                    clean_src = src.lstrip("/")
                    if clean_src.startswith("./"):
                        clean_src = clean_src[2:]
                    # Strip leading ../ sequences that cannot be resolved without full tree
                    while clean_src.startswith("../"):
                        clean_src = clean_src[3:]
                    if clean_src.startswith("http") or clean_src.startswith("data:"):
                        return src
                    if clean_src.startswith("images/"):
                        clean_src = clean_src[len("images/"):]
                    if "/" not in clean_src:
                        clean_src = f"{base_dir}/{clean_src}" if base_dir else clean_src
                    return f"/images/{clean_src.lstrip('/')}"

                def fix_img_tag(match):
                    full_tag = match.group(0)
                    src_match = re.search(r'src=["\']([^"\']+)["\']', full_tag)
                    if not src_match:
                        return full_tag
                    new_src = resolve_src(src_match.group(1))
                    return re.sub(r'src=["\']([^"\']+)["\']', f'src="{new_src}"', full_tag)

                content = re.sub(r'<img\s+[^>]*src=["\']([^"\']+)["\'][^>]*>', fix_img_tag, content)
                content = re.sub(r'!\[([^\]]*)\]\(([^)]+)\)',
                    lambda m: f"![{m.group(1)}]({resolve_src(m.group(2))})", content)

                score_label = f"rrf={item['rrf']:.4f}"
                if item["vector_dist"] < 1.0:
                    score_label += f" | vec={item['vector_dist']:.4f}"
                if item["is_boosted"]:
                    score_label += " (boosted)"

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
            embed_tokens = 0
            err_s = str(e).lower()
            if "different vector dimensions" in err_s:
                logger.error(
                    "Vector dimension mismatch: set VECTOR_DIMENSION on the chatbot to match "
                    "carmen.document_chunks.embedding (e.g. 2000 after migration 0006_vector_2000.sql, or 1536 otherwise)."
                )

        avg_sim_score: float | None = None
        if selected_vec_distances:
            avg_sim_score = round(
                1.0 - sum(selected_vec_distances) / len(selected_vec_distances), 4
            )

        return passed_docs, source_debug, embed_tokens, avg_sim_score


# Singleton instance
retrieval_service = RetrievalService()
