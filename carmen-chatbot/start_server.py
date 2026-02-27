import os
import sys
import json
import requests
import uvicorn
from pathlib import Path
from dotenv import set_key, load_dotenv

from InquirerPy import inquirer
from InquirerPy.base.control import Choice

# Paths
BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR.parent / ".env"

# Load current env context
load_dotenv(ENV_PATH)

def fetch_openrouter_models():
    print("Fetching OpenRouter models...")
    try:
        resp = requests.get("https://openrouter.ai/api/v1/models", timeout=10)
        resp.raise_for_status()
        data = resp.json()
        models = data.get("data", [])
        return [Choice(value=m["id"], name=f"{m['id']} ({m.get('name', 'N/A')})") for m in models]
    except Exception as e:
        print(f"Error fetching OpenRouter models: {e}")
        return []

def fetch_ollama_models():
    print("Fetching local Ollama models...")
    ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434")
    try:
        resp = requests.get(f"{ollama_url}/api/tags", timeout=5)
        resp.raise_for_status()
        data = resp.json()
        models = data.get("models", [])
        return [Choice(value=m["name"], name=m["name"]) for m in models]
    except Exception as e:
        print(f"Error fetching Ollama models at {ollama_url}: {e}")
        return []

def check_llm_health(provider: str, model: str) -> bool:
    print(f"\n🩺 Performing health check for {provider.upper()} model '{model}'...")
    try:
        if provider == "openrouter":
            api_key = os.environ.get("OPENROUTER_API_KEY")
            if not api_key:
                print("❌ ERROR: OPENROUTER_API_KEY is not set in .env")
                return False
            
            headers = {
                "Authorization": f"Bearer {api_key}",
                "HTTP-Referer": "http://localhost:8000",
                "X-Title": "Carmen Chatbot"
            }
            data = {
                "model": model,
                "messages": [{"role": "user", "content": "Hello"}],
                "max_tokens": 5
            }
            resp = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=data, timeout=10)
            if resp.status_code == 200:
                print("✅ Health check passed! Model responded successfully.")
                return True
            else:
                print(f"❌ Health check failed with HTTP {resp.status_code}: {resp.text}")
                return False
                
        elif provider == "ollama":
            ollama_url = os.environ.get("OLLAMA_URL", "http://localhost:11434")
            data = {
                "model": model,
                "prompt": "Hello",
                "stream": False,
                "options": {"num_predict": 5}
            }
            resp = requests.post(f"{ollama_url}/api/generate", json=data, timeout=15)
            if resp.status_code == 200:
                print("✅ Health check passed! Model responded successfully.")
                return True
            else:
                print(f"❌ Health check failed with HTTP {resp.status_code}: {resp.text}")
                return False
                
    except Exception as e:
        print(f"❌ Health check exception: {e}")
        return False
        
    return False

def main():
    print("\n🤖 Welcome to Carmen LLM Configurator 🤖\n")
    
    while True:
        provider = inquirer.select(
            message="Which LLM Provider would you like to use today?",
            choices=[
                Choice(value="openrouter", name="OpenRouter (Cloud API)"),
                Choice(value="ollama", name="Ollama (Local Server)")
            ],
            default="openrouter"
        ).execute()
        
        if provider == "openrouter":
            choices = fetch_openrouter_models()
            if not choices:
                print("Failed to load models. Exiting.")
                sys.exit(1)
                
            model = inquirer.fuzzy(
                message="Search and select an OpenRouter model:",
                choices=choices,
                match_exact=True,
            ).execute()
            
        elif provider == "ollama":
            choices = fetch_ollama_models()
            if not choices:
                print("No models found. Please ensure Ollama is running and models are pulled.")
                sys.exit(1)
                
            model = inquirer.fuzzy(
                message="Search and select a local Ollama model:",
                choices=choices,
                match_exact=True,
            ).execute()
            
        # Apply configurations ONLY in memory for this run session
        os.environ["ACTIVE_LLM_PROVIDER"] = provider
        
        if provider == "openrouter":
            os.environ["OPENROUTER_CHAT_MODEL"] = model
        else:
            os.environ["OLLAMA_CHAT_MODEL"] = model
            
        # Pre-Flight Health Check
        is_healthy = check_llm_health(provider, model)
        if not is_healthy:
            action = inquirer.select(
                message="⚠️ The selected model failed the health check or is unreachable. What would you like to do?",
                choices=[
                    Choice(value="retry", name="Select a different model"),
                    Choice(value="force", name="Force start the server anyway"),
                    Choice(value="abort", name="Abort and exit")
                ],
                default="retry"
            ).execute()
            
            if action == "retry":
                print("\nRestarting selection process...\n")
                continue
            elif action == "abort":
                print("\n🛑 Server startup aborted by user.")
                sys.exit(1)
            # if "force", it just breaks out of the loop and starts
            
        break # Exit loop if healthy or if user chose "force"
        
    print(f"\n🚀 Starting Backend Server with [{provider.upper()}] -> [{model}]...\n")
    
    # Start Uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)

if __name__ == "__main__":
    main()
