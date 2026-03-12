import asyncio
import os
import sys
import traceback
from sqlalchemy import text

# Add project root to path
sys.path.append(os.getcwd())

from backend.core.database import AsyncSessionLocal

async def check_db():
    print("📋 Checking Database Contents...")
    db_schema = "carmen"
    
    try:
        async with AsyncSessionLocal() as db:
            print(f"🔗 Session opened for schema '{db_schema}'")
            # Check if schema exists and has documents
            sql = text(f"SELECT COUNT(*) FROM {db_schema}.documents")
            result = await db.execute(sql)
            count = result.scalar()
            print(f"✅ Schema '{db_schema}' has {count} documents.")
            
            if count > 0:
                sql_docs = text(f"SELECT title, path FROM {db_schema}.documents LIMIT 5")
                result_docs = await db.execute(sql_docs)
                rows = result_docs.fetchall()
                print(f"📂 Found {len(rows)} document samples:")
                for row in rows:
                    print(f"   - {row.title} ({row.path})")
            else:
                print("⚠️ No documents found in database.")
                # List available schemas to help debug
                sql_schemas = text("SELECT schema_name FROM information_schema.schemata")
                res_schemas = await db.execute(sql_schemas)
                print("📌 Available schemas:")
                for s in res_schemas.fetchall():
                    print(f"   - {s.schema_name}")
            
    except Exception as e:
        print(f"❌ DB Check Failed: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(check_db())
