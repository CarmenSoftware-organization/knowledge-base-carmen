import asyncio
import os
import sys
import traceback

# Add project root to path
sys.path.append(os.getcwd())

from backend.llm.retrieval import retrieval_service
from backend.core.config import settings

async def test_search():
    print("🔍 Testing Async Retrieval with Re-ranking...")
    query = "วิธีกาจัดการเจ้าหนี้ (AP)"
    db_schema = "carmen"
    
    try:
        print(f"📡 Searching in schema: {db_schema} for: '{query}'")
        docs, debug = await retrieval_service.search(query, db_schema)
        
        print(f"✅ Search completed. Found {len(docs)} documents.")
        if docs:
            for i, d in enumerate(debug):
                print(f"   {i+1}. {d['source']}")
                print(f"      Score Label: {d['score']}")
        else:
            print("⚠️ No documents returned from search logic.")
            
    except Exception as e:
        print(f"❌ Test Failed: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_search())
