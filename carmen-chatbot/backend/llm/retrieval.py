import logging
import os
import re
from sqlalchemy import text
from langchain_ollama import OllamaEmbeddings
from langchain_core.documents import Document

from ..core.config import settings
from ..core.database import AsyncSessionLocal

class RetrievalService:
    TOP_K = 4
    MAX_DISTANCE = 0.8

    TOPIC_PATH_RULES = [
        {"keywords": ["vendor", "ap-vendor", "ผู้ขาย", "ร้านค้า"], "patterns": ["%vendor%", "%ผู้ขาย%", "%ร้านค้า%"]},
        {"keywords": ["configuration", "company profile", "chart of account", "department", "currency", "payment type", "permission", "cf-", "สิทธิ์ผู้ใช้", "กำหนดสิทธิ์"], "patterns": ["%configuration%", "%cf-%"]},
        {"keywords": [" ar ", "ar-", "ar invoice", "ar receipt", "ลูกค้า", "receipt", "contract", "folio", "ใบเสร็จ", "ลูกหนี้"], "patterns": ["%ar-%", "%ar\\\\%", "%/ar/%"]},
        {"keywords": [" ap ", "ap-", "ap invoice", "ap payment", "เจ้าหนี้", "cheque", "wht", "หัก ณ ที่จ่าย", "input tax", "ภาษีซื้อ"], "patterns": ["%ap-%", "%ap\\\\%", "%/ap/%"]},
        {"keywords": ["asset", "สินทรัพย์", "as-", "ทะเบียนสินทรัพย์", "asset register", "asset disposal"], "patterns": ["%as-%", "%asset%"]},
        {"keywords": [" gl ", "gl ", "general ledger", "journal voucher", "voucher", "บัญชีแยกประเภท", "ผังบัญชี", "allocation", "amortization", "budget", "recurring"], "patterns": ["%gl%", "%c-%"]},
        {"keywords": ["dashboard", "สถิติ", "revenue", "occupancy", "adr", "revpar", "trevpar", "p&l", "กำไรขาดทุน"], "patterns": ["%dashboard%"]},
        {"keywords": ["workbook", "excel", "refresh", "formula", "function", "add-in"], "patterns": ["%workbook%", "%wb-%", "%excel%"]},
        {"keywords": ["comment", "activity log", "document management", "ไฟล์แนบ", "รูปภาพแนบ", "ประวัติเอกสาร", "คอมเมนต์", "ความคิดเห็น"], "patterns": ["%comment%", "%cm-%"]}
    ]

    def __init__(self):
        self.embeddings = None
        self.initialize_brain()

    def initialize_brain(self):
        try:
            self.embeddings = OllamaEmbeddings(
                model=settings.OLLAMA_EMBED_MODEL,
                base_url=settings.OLLAMA_URL,
                client_kwargs={"timeout": 10.0}
            )
        except Exception as e:
            print(f"❌ Error Initializing AI Brain: {e}")

    def format_pgvector(self, vector_list: list[float]) -> str:
        return "[" + ",".join(str(v) for v in vector_list) + "]"

    PATH_BOOST = 0.08

    def get_path_boost_patterns(self, question: str) -> list[str]:
        """Match applicable path rules from external config."""
        q_lower = question.lower()
        matched_rules_count = 0
        all_patterns = []
        matched_keywords = []
        
        for rule in settings.PATH_RULES:
            for kw in rule["keywords"]:
                if kw.lower() in q_lower:
                    matched_rules_count += 1
                    matched_keywords.append(kw)
                    for p in rule["patterns"]:
                        if p not in all_patterns:
                            all_patterns.append(p)
                    break
        
        if matched_rules_count >= 3:
            return [], matched_keywords
        return all_patterns, matched_keywords

    SAFE_SCHEMA_PATTERN = re.compile(r'^[a-zA-Z_][a-zA-Z0-9_]*$')

    async def search(self, query: str, db_schema: str = "carmen"):
        passed_docs = []
        source_debug = []

        if not self.SAFE_SCHEMA_PATTERN.match(db_schema):
            return passed_docs, source_debug
        
        if not self.embeddings:
            return passed_docs, source_debug

        try:
            # Generate embedding
            query_embedding = await asyncio.to_thread(self.embeddings.embed_query, query)
            emb_str = self.format_pgvector(query_embedding)

            boost_patterns, matched_keywords = self.build_path_boost_from_query(query)

            params = {
                "emb": emb_str,
                "top_k": self.TOP_K * 3,
                "max_dist": self.MAX_DISTANCE,
            }

            if boost_patterns:
                placeholders = " OR ".join(
                    f"d.path ILIKE :bp{i}" for i in range(len(boost_patterns))
                )
                score_expr = f"""
                    (dc.embedding <=> CAST(:emb AS vector))
                    - CASE WHEN ({placeholders}) THEN :path_boost ELSE 0 END
                """
                params["path_boost"] = self.PATH_BOOST
                for i, p in enumerate(boost_patterns):
                    params[f"bp{i}"] = p
            else:
                score_expr = "(dc.embedding <=> CAST(:emb AS vector))"

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
                LIMIT :limit
            """)

            with SessionLocal() as db:
                results = db.execute(sql_query, params).fetchall()
                
                for row in results:
                    # Break when we have enough unique documents
                    if len(passed_docs) >= self.TOP_K:
                        break
                        
                    path = row.path
                    title = row.title.strip() if row.title and row.title.strip() else path
                    content = row.content
                    actual_distance = row.distance
                    effective_dist = row.effective_distance
                    
                unique_contents.add(content)
                title = row.title.strip() if row.title and row.title.strip() else path
                
                # Fix image paths
                base_dir = os.path.dirname(path).replace("\\", "/")
                if base_dir:
                    def resolve_src(src):
                        clean_src = src.lstrip("/")
                        if clean_src.startswith("./"): clean_src = clean_src[2:]
                        if clean_src.startswith("http") or clean_src.startswith("data:"): return src
                        if "/" not in clean_src: clean_src = f"{base_dir}/{clean_src}"
                        return clean_src

                    content = re.sub(r'!\[([^\]]*)\]\(([^)]+)\)', 
                        lambda m: f"![{m.group(1)}]({resolve_src(m.group(2))})", content)
                    content = re.sub(r'<img\s+[^>]*src=["\']([^"\']+)["\'][^>]*>', 
                        lambda m: m.group(0).replace(f'"{m.group(1)}"', f'"{resolve_src(m.group(1))}"'), content)

                score_label = f"{row.distance:.4f}"
                if item["is_boosted"]:
                    score_label += f" (Boosted → {item['effective_dist']:.4f})"

                passed_docs.append(Document(page_content=content, metadata={"source": path, "title": title}))
                source_debug.append({"source": path, "title": title, "score": score_label})

        except Exception as e:
            logging.getLogger(__name__).error("Search error: %s", e)
        return passed_docs, source_debug

# Singleton instance
retrieval_service = RetrievalService()
