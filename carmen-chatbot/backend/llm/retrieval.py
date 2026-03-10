import os
import re
from sqlalchemy import text
from langchain_ollama import OllamaEmbeddings
from langchain_core.documents import Document

# Internal Imports
from ..core.config import settings
from ..core.database import SessionLocal

# ==========================================
# 🛡️ HYBRID SEARCH SETUP
# ==========================================
class RetrievalService:
    # 🎛️ Tunable Parameters
    TOP_K = 4                # จำนวนผลลัพธ์สูงสุดที่จะดึงมา
    MAX_DISTANCE = 0.5       # Cosine distance threshold (0=เหมือนกัน, 1=ต่างสุด)

    # Path Filtering Rules (Ported from Go)
    TOPIC_PATH_RULES = [
        {"keywords": ["vendor", "ap-vendor", "ผู้ขาย", "ร้านค้า"], "patterns": ["%vendor%", "%ผู้ขาย%", "%ร้านค้า%"]},
        {"keywords": ["configuration", "company profile", "chart of account", "department", "currency", "payment type", "permission", "cf-", "ตั้งค่า", "ผู้ใช้", "user"], "patterns": ["%configuration%", "%cf-%"]},
        {"keywords": [" ar ", "ar-", "ar invoice", "ar receipt", "ลูกค้า", "receipt", "contract", "folio", "ใบเสร็จ", "ลูกหนี้"], "patterns": ["%ar-%", "%ar\\\\%", "%/ar/%"]},
        {"keywords": [" ap ", "ap-", "ap invoice", "ap payment", "เจ้าหนี้", "cheque", "wht", "หัก ณ ที่จ่าย", "input tax", "ภาษีซื้อ"], "patterns": ["%ap-%", "%ap\\\\%", "%/ap/%"]},
        {"keywords": ["asset", "สินทรัพย์", "as-", "ทะเบียนสินทรัพย์", "asset register", "asset disposal"], "patterns": ["%as-%", "%asset%"]},
        {"keywords": [" gl ", "gl ", "general ledger", "journal voucher", "voucher", "บัญชีแยกประเภท", "ผังบัญชี", "allocation", "amortization", "budget", "recurring"], "patterns": ["%gl%", "%c-%"]},
        {"keywords": ["dashboard", "สถิติ", "revenue", "occupancy", "adr", "revpar", "trevpar", "p&l", "กำไรขาดทุน"], "patterns": ["%dashboard%"]},
        {"keywords": ["workbook", "excel", "security", "formula", "function"], "patterns": ["%workbook%", "%wb-%", "%excel%"]},
        {"keywords": ["comment", "activity log", "document management", "ไฟล์แนบ", "รูปภาพแนบ", "ประวัติเอกสาร", "คอมเมนต์", "ความคิดเห็น"], "patterns": ["%comment%", "%cm-%"]}
    ]

    def __init__(self):
        self.embeddings = None
        self.initialize_brain()

    def initialize_brain(self):
        try:
            self.embeddings = OllamaEmbeddings(
                model=settings.OLLAMA_EMBED_MODEL,
                base_url=settings.OLLAMA_URL
            )
        except Exception as e:
            print(f"❌ Error Initializing AI Brain: {e}")

    def format_pgvector(self, vector_list: list[float]) -> str:
        """Convert python list of floats to string format required by pgvector [1.0, 2.0, ...]"""
        return "[" + ",".join(str(v) for v in vector_list) + "]"

    def build_path_filter_from_query(self, question: str) -> str:
        q_lower = question.lower()
        for rule in self.TOPIC_PATH_RULES:
            for kw in rule["keywords"]:
                if kw.lower() in q_lower:
                    parts = []
                    for p in rule["patterns"]:
                        # SQL injection safe (escaping single quotes)
                        safe_p = p.replace("'", "''")
                        parts.append(f"d.path ILIKE '{safe_p}'")
                    return "AND (" + " OR ".join(parts) + ")"
        return ""

    def search(self, query: str, db_schema: str = "carmen"):
        passed_docs = []
        source_debug = []
        
        if not self.embeddings:
            return passed_docs, source_debug

        unique_contents = set()

        try:
            # Generate embedding for the query
            query_embedding = self.embeddings.embed_query(query)
            emb_str = self.format_pgvector(query_embedding)

            # Apply Path Routing
            path_filter_sql = self.build_path_filter_from_query(query)
            if path_filter_sql:
                print(f"🚦 Vector Search Path Filter Applied: {path_filter_sql}")

            # Raw SQL Query
            sql_query = text(f"""
                SELECT d.path, d.title, dc.content, (dc.embedding <=> CAST(:emb AS vector)) as distance
                FROM {db_schema}.document_chunks dc
                JOIN {db_schema}.documents d ON dc.document_id = d.id
                WHERE (dc.embedding <=> CAST(:emb AS vector)) < :max_dist
                  AND d.path NOT LIKE '%index.md'
                  {path_filter_sql}
                ORDER BY dc.embedding <=> CAST(:emb AS vector)
                LIMIT :top_k
            """)

            with SessionLocal() as db:
                results = db.execute(sql_query, {
                    "emb": emb_str, 
                    "top_k": self.TOP_K, 
                    "max_dist": self.MAX_DISTANCE
                }).fetchall()
                
                for row in results:
                    path = row.path
                    title = row.title.strip() if row.title and row.title.strip() else path
                    content = row.content
                    score = row.distance
                    
                    # Fix image paths by prepending subdirectories based on markdown file path
                    base_dir = os.path.dirname(path).replace("\\", "/")
                    if base_dir:
                        def resolve_src(src):
                            clean_src = src.lstrip("/")
                            if clean_src.startswith("./"):
                                clean_src = clean_src[2:]
                            if clean_src.startswith("http") or clean_src.startswith("data:"):
                                return src
                            if "/" not in clean_src:
                                clean_src = f"{base_dir}/{clean_src}"
                            return clean_src

                        def replace_md_img(match):
                            alt = match.group(1)
                            src = resolve_src(match.group(2))
                            return f"![{alt}]({src})"
                            
                        def replace_html_img(match):
                            full_tag = match.group(0)
                            src = match.group(1)
                            new_src = resolve_src(src)
                            return full_tag.replace(f'"{src}"', f'"{new_src}"').replace(f"'{src}'", f"'{new_src}'")

                        content = re.sub(r'!\[([^\]]*)\]\(([^)]+)\)', replace_md_img, content)
                        content = re.sub(r'<img\s+[^>]*src=["\']([^"\']+)["\'][^>]*>', replace_html_img, content)
                    
                    if content not in unique_contents:
                        # Append as Langchain Document for compatibility
                        passed_docs.append(Document(
                            page_content=content, 
                            metadata={"source": path, "title": title}
                        ))
                        unique_contents.add(content)
                        source_debug.append({
                            "source": path,
                            "title": title,
                            "score": f"{score:.4f} (Vector Distance)"
                        })

        except Exception as e:
            print(f"❌ Search Error (PostgreSQL/pgvector): {e}")
            
        return passed_docs, source_debug

# Singleton instance
retrieval_service = RetrievalService()
