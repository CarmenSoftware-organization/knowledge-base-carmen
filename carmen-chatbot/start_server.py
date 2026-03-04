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
        base_url = os.environ.get("OPENROUTER_BASE_URL", "https://openrouter.ai")
        resp = requests.get(f"{base_url}/api/v1/models", timeout=10)
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

def fetch_zai_models():
    print("Fetching Z.ai models...")
    try:
        base_url = os.environ.get("ZAI_API_BASE", "https://api.z.ai/api/coding/paas/v4")
        api_key = os.environ.get("ZAI_API_KEY")
        if not api_key:
            print("⚠️ ZAI_API_KEY not found in .env, cannot fetch models.")
            return []
            
        headers = {"Authorization": f"Bearer {api_key}"}
        endpoint = f"{base_url.rstrip('/')}/models"
        resp = requests.get(endpoint, headers=headers, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        models = data.get("data", [])
        return [Choice(value=m["id"], name=m["id"]) for m in models]
    except Exception as e:
        print(f"Error fetching Z.ai models: {e}")
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
            base_url = os.environ.get("OPENROUTER_BASE_URL", "https://openrouter.ai")
            resp = requests.post(f"{base_url}/api/v1/chat/completions", headers=headers, json=data, timeout=10)
            if resp.status_code == 200:
                print("✅ Health check passed! Model responded successfully.")
                return True
            else:
                print(f"❌ Health check failed with HTTP {resp.status_code}: {resp.text}")
                return False
                
        elif provider == "zai":
            api_key = os.environ.get("ZAI_API_KEY")
            if not api_key:
                print("❌ ERROR: ZAI_API_KEY is not set in .env")
                return False
            
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            data = {
                "model": model,
                "messages": [{"role": "user", "content": "Hello"}],
                "max_tokens": 5
            }
            base_url = os.environ.get("ZAI_API_BASE", "https://api.z.ai/api/coding/paas/v4")
            endpoint = f"{base_url.rstrip('/')}/chat/completions"
            resp = requests.post(endpoint, headers=headers, json=data, timeout=10)
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
    # 🌟 Check Environment Mode
    env_mode = os.environ.get("ENVIRONMENT", "development").lower()
    
    if env_mode == "production":
        print("\n🚀 [PRODUCTION MODE] Skipping Interactive Prompts 🚀\n")
        provider = os.environ.get("ACTIVE_LLM_PROVIDER", "openrouter")
        
        if provider == "openrouter":
            model = os.environ.get("OPENROUTER_CHAT_MODEL", "stepfun/step-3.5-flash:free")
        elif provider == "zai":
            model = os.environ.get("ZAI_CHAT_MODEL", "gpt-4o")
        else:
            provider = "ollama" # fallback
            model = os.environ.get("OLLAMA_CHAT_MODEL", "gemma3:1b")
            
        print(f"📌 Using Provider: {provider.upper()}")
        print(f"📌 Using Model: {model}\n")
        
        # Pre-Flight Health Check (Non-blocking in Production)
        print("⏳ Running pre-flight health check...")
        is_healthy = check_llm_health(provider, model)
        if not is_healthy:
            print("⚠️ WARNING: Health check failed, but forcing start in PRODUCTION mode...")
            
    else:
        # 💻 Development Mode (Interactive)
        print("\n🤖 Welcome to Carmen LLM Configurator (Development Mode) 🤖\n")
        
        while True:
            provider = inquirer.select(
                message="Which LLM Provider would you like to use today?",
                choices=[
                    Choice(value="openrouter", name="OpenRouter (Cloud API)"),
                    Choice(value="ollama", name="Ollama (Local Server)"),
                    Choice(value="zai", name="Z.ai (Cloud API)")
                ],
                default=os.environ.get("ACTIVE_LLM_PROVIDER", "openrouter")
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
                
            elif provider == "zai":
                choices = fetch_zai_models()
                if not choices:
                    model = inquirer.text(
                        message="Enter the Z.ai model name (failed to fetch list):",
                        default=os.environ.get("ZAI_CHAT_MODEL", "gpt-4o")
                    ).execute()
                else:
                    model = inquirer.fuzzy(
                        message="Search and select a Z.ai model:",
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
                
            save_env = inquirer.confirm(
                message="Do you want to save this configuration to .env as the new default?",
                default=True
            ).execute()
            
            # Apply configurations ONLY in memory for this run session
            os.environ["ACTIVE_LLM_PROVIDER"] = provider
            if save_env:
                set_key(ENV_PATH, "ACTIVE_LLM_PROVIDER", provider)
            
            if provider == "openrouter":
                os.environ["OPENROUTER_CHAT_MODEL"] = model
                if save_env:
                    set_key(ENV_PATH, "OPENROUTER_CHAT_MODEL", model)
            elif provider == "zai":
                os.environ["ZAI_CHAT_MODEL"] = model
                if save_env:
                    set_key(ENV_PATH, "ZAI_CHAT_MODEL", model)
            else:
                os.environ["OLLAMA_CHAT_MODEL"] = model
                if save_env:
                    set_key(ENV_PATH, "OLLAMA_CHAT_MODEL", model)
                
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
    # Use reload=True only in development mode
    should_reload = (env_mode != "production")
    if should_reload:
        print("🔄 Hot-reload is ENABLED (Development Mode)")
        uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
    else:
        print("⏩ Hot-reload is DISABLED, starting with multiple workers (Production Mode)")
        uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=False, workers=4)

if __name__ == "__main__":
    main()
