import os
import sys
import json
import requests
import uvicorn
import time
from pathlib import Path
from dotenv import set_key, load_dotenv

from InquirerPy import inquirer
from InquirerPy.base.control import Choice
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.live import Live
from rich.progress import Progress, SpinnerColumn, TextColumn

# Paths
BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"

# Initialize Rich Console
console = Console()

# Load current env context
load_dotenv(ENV_PATH)

def fetch_openrouter_models():
    console.print("[yellow]Fetching OpenRouter models...[/yellow]")
    try:
        base_url = os.environ.get("OPENROUTER_BASE_URL", "https://openrouter.ai")
        resp = requests.get(f"{base_url}/api/v1/models", timeout=10)
        resp.raise_for_status()
        data = resp.json()
        models = data.get("data", [])
        return [Choice(value=m["id"], name=f"{m['id']} ({m.get('name', 'N/A')})") for m in models]
    except Exception as e:
        console.print(f"[red]Error fetching OpenRouter models: {e}[/red]")
        return []

def fetch_ollama_models():
    console.print("[yellow]Fetching local Ollama models...[/yellow]")
    ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434")
    try:
        resp = requests.get(f"{ollama_url}/api/tags", timeout=5)
        resp.raise_for_status()
        data = resp.json()
        models = data.get("models", [])
        return [Choice(value=m["name"], name=m["name"]) for m in models]
    except Exception as e:
        console.print(f"[red]Error fetching Ollama models at {ollama_url}: {e}[/red]")
        return []

def fetch_zai_models():
    console.print("[yellow]Fetching Z.ai models...[/yellow]")
    try:
        base_url = os.environ.get("ZAI_API_BASE", "https://api.z.ai/api/coding/paas/v4")
        api_key = os.environ.get("ZAI_API_KEY")
        if not api_key:
            console.print("⚠️ [bold yellow]ZAI_API_KEY not found in .env, cannot fetch models.[/bold yellow]")
            return []
            
        headers = {"Authorization": f"Bearer {api_key}"}
        endpoint = f"{base_url.rstrip('/')}/models"
        resp = requests.get(endpoint, headers=headers, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        models = data.get("data", [])
        return [Choice(value=m["id"], name=m["id"]) for m in models]
    except Exception as e:
        console.print(f"[red]Error fetching Z.ai models: {e}[/red]")
        return []

def check_llm_health(label: str, provider: str, model: str) -> bool:
    console.print(f"🩺 Checking [bold cyan]{label}[/bold cyan] ({provider}/{model})...", end=" ")
    try:
        if provider == "openrouter":
            api_key = os.environ.get("OPENROUTER_API_KEY")
            if not api_key:
                console.print("[red]FAILED (Missing API Key)[/red]")
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
            resp = requests.post(f"{base_url}/api/v1/chat/completions", headers=headers, json=data, timeout=15)
            if resp.status_code == 200:
                console.print("[green]PASSED[/green]")
                return True
            else:
                console.print(f"[red]FAILED (HTTP {resp.status_code})[/red]")
                return False
                
        elif provider == "zai":
            api_key = os.environ.get("ZAI_API_KEY")
            if not api_key:
                console.print("[red]FAILED (Missing API Key)[/red]")
                return False
            
            headers = { "Authorization": f"Bearer {api_key}", "Content-Type": "application/json" }
            data = { "model": model, "messages": [{"role": "user", "content": "Hello"}], "max_tokens": 5 }
            base_url = os.environ.get("ZAI_API_BASE", "https://api.z.ai/api/coding/paas/v4")
            endpoint = f"{base_url.rstrip('/')}/chat/completions"
            resp = requests.post(endpoint, headers=headers, json=data, timeout=15)
            if resp.status_code == 200:
                console.print("[green]PASSED[/green]")
                return True
            else:
                console.print(f"[red]FAILED (HTTP {resp.status_code})[/red]")
                return False
                
        elif provider == "ollama":
            ollama_url = os.environ.get("OLLAMA_URL", "http://localhost:11434")
            data = { "model": model, "prompt": "Hello", "stream": False, "options": {"num_predict": 5} }
            resp = requests.post(f"{ollama_url}/api/generate", json=data, timeout=15)
            if resp.status_code == 200:
                console.print("[green]PASSED[/green]")
                return True
            else:
                console.print(f"[red]FAILED (HTTP {resp.status_code})[/red]")
                return False
                
    except Exception as e:
        console.print(f"[red]ERROR ({e})[/red]")
        return False
        
    return False

def main():
    # 🌟 Check Environment Mode
    env_mode = os.environ.get("ENVIRONMENT", "development").lower()
    
    console.print(Panel.fit(
        "[bold cyan]CARMEN CHATBOT - SYSTEM STARTUP[/bold cyan]",
        subtitle=f"[dim]Mode: {env_mode.upper()}[/dim]",
        border_style="cyan"
    ))

    if env_mode == "production":
        provider = os.environ.get("ACTIVE_LLM_PROVIDER", "openrouter")
        chat_model = os.environ.get("OPENROUTER_CHAT_MODEL", "stepfun/step-3.5-flash:free")
        intent_model = os.environ.get("OPENROUTER_INTENT_MODEL", "google/gemini-2.5-flash-lite")
    else:
        # Development Mode (Interactive)
        provider = inquirer.select(
            message="Which LLM Provider?",
            choices=[Choice("openrouter", "OpenRouter"), Choice("ollama", "Ollama"), Choice("zai", "Z.ai")],
            default=os.environ.get("ACTIVE_LLM_PROVIDER", "openrouter")
        ).execute()

        while True:
            if provider == "openrouter":
                p_models = fetch_openrouter_models()
                chat_model = inquirer.fuzzy(message="Select Chat Model (RAG):", choices=p_models, default=os.environ.get("OPENROUTER_CHAT_MODEL", "stepfun/step-3.5-flash:free")).execute()
                intent_model = inquirer.fuzzy(message="Select Intent Model (Small):", choices=p_models, default=os.environ.get("OPENROUTER_INTENT_MODEL", "google/gemini-2.5-flash-lite")).execute()
            elif provider == "zai":
                p_models = fetch_zai_models() or [Choice("gpt-4o", "gpt-4o")]
                chat_model = inquirer.fuzzy(message="Select Z.ai Model:", choices=p_models).execute()
                intent_model = chat_model # Z.ai usually uses same for now
            else:
                p_models = fetch_ollama_models()
                chat_model = inquirer.fuzzy(message="Select Ollama Model:", choices=p_models).execute()
                intent_model = chat_model

            # Health Check
            chat_ok = check_llm_health("Chat Model", provider, chat_model)
            intent_ok = check_llm_health("Intent Model", provider, intent_model) if provider == "openrouter" else True
            
            if not chat_ok or not intent_ok:
                ans = inquirer.select(message="Health checks failed. Continue?", choices=[Choice("retry", "Select different models"), Choice("force", "Force start anyway"), Choice("abort", "Exit")], default="retry").execute()
                if ans == "retry": continue
                if ans == "abort": sys.exit(1)
            break

        save = inquirer.confirm(message="Save to .env?", default=True).execute()
        if save:
            set_key(ENV_PATH, "ACTIVE_LLM_PROVIDER", provider)
            if provider == "openrouter":
                set_key(ENV_PATH, "OPENROUTER_CHAT_MODEL", chat_model)
                set_key(ENV_PATH, "OPENROUTER_INTENT_MODEL", intent_model)
            elif provider == "zai": set_key(ENV_PATH, "ZAI_CHAT_MODEL", chat_model)
            else: set_key(ENV_PATH, "OLLAMA_CHAT_MODEL", chat_model)

    # Final Summary Table
    table = Table(title="[bold green]Active Configuration[/bold green]", show_header=True, header_style="bold green")
    table.add_column("Key", style="dim")
    table.add_column("Value", style="bold white")
    table.add_row("Provider", provider.upper())
    table.add_row("Chat Model", chat_model)
    table.add_row("Intent Model", intent_model if provider == "openrouter" else "N/A (Provider Default)")
    console.print(table)

    # Start Uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=(env_mode != "production"))

if __name__ == "__main__":
    main()
