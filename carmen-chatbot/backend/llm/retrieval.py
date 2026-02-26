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

    def __init__(self):
        self.embeddings = None
        self.initialize_brain()

    def initialize_brain(self):
        try:
            self.embeddings = OllamaEmbeddings(
                base_url=settings.OLLAMA_URL,
                model=settings.OLLAMA_EMBED_MODEL
            )
            print(f"✅ AI Brain Initialization Complete (PostgreSQL/pgvector) using {settings.OLLAMA_EMBED_MODEL}.")
        except Exception as e:
            print(f"❌ Error Initializing AI Brain: {e}")

    def format_pgvector(self, vector_list: list[float]) -> str:
        """Convert python list of floats to string format required by pgvector [1.0, 2.0, ...]"""
        return "[" + ",".join(str(v) for v in vector_list) + "]"

    def search(self, query: str):
        passed_docs = []
        source_debug = []
        
        if not self.embeddings:
            return passed_docs, source_debug

        unique_contents = set()

        try:
            # Generate embedding for the query
            query_embedding = self.embeddings.embed_query(query)
            emb_str = self.format_pgvector(query_embedding)

            # Raw SQL Query — filter out index files and duplicate carmen_cloud/ paths
            sql_query = text("""
                SELECT d.path, d.title, dc.content, (dc.embedding <=> CAST(:emb AS vector)) as distance
                FROM document_chunks dc
                JOIN documents d ON dc.document_id = d.id
                WHERE (dc.embedding <=> CAST(:emb AS vector)) < :max_dist
                  AND d.path NOT LIKE '%index.md'
                  AND d.path NOT LIKE 'carmen_cloud/%'
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
                    base_dir = os.path.dirname(path)
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
