import os
import sys
import requests
import uvicorn
from pathlib import Path
from dotenv import set_key, load_dotenv

from InquirerPy import inquirer
from InquirerPy.base.control import Choice
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

# Paths
BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"

console = Console()
load_dotenv(ENV_PATH)

# ---------------------------------------------------------------------------
# Model Fetchers
# ---------------------------------------------------------------------------

def fetch_openrouter_models() -> list[Choice]:
    console.print("[yellow]Fetching OpenRouter models...[/yellow]")
    try:
        base_url = os.environ.get("OPENROUTER_BASE_URL", "https://openrouter.ai")
        resp = requests.get(f"{base_url}/api/v1/models", timeout=10)
        resp.raise_for_status()
        models = resp.json().get("data", [])
        return [Choice(value=m["id"], name=f"{m['id']} ({m.get('name', 'N/A')})") for m in models]
    except Exception as e:
        console.print(f"[red]Error fetching OpenRouter models: {e}[/red]")
        return []


# ---------------------------------------------------------------------------
# Health Check
# ---------------------------------------------------------------------------

def check_embed_health(model: str) -> bool:
    """Check OpenRouter embedding endpoint (always used regardless of chat provider)."""
    console.print(f"🩺 Checking [bold cyan]Embed Model[/bold cyan] (openrouter/{model})...", end=" ")
    try:
        api_key = os.environ.get("OPENROUTER_API_KEY", "")
        if not api_key:
            console.print("[red]FAILED (Missing OPENROUTER_API_KEY)[/red]")
            return False
        base_url = os.environ.get("OPENROUTER_BASE_URL", "https://openrouter.ai")
        url = f"{base_url}/api/v1/embeddings"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "HTTP-Referer": "http://localhost:8000",
            "X-Title": "Carmen Chatbot",
        }
        data = {"model": model, "input": "health check"}
        resp = requests.post(url, headers=headers, json=data, timeout=15)
        if resp.status_code == 200:
            console.print("[green]PASSED[/green]")
            return True
        console.print(f"[red]FAILED (HTTP {resp.status_code})[/red]")
        return False
    except Exception as e:
        console.print(f"[red]ERROR ({e})[/red]")
        return False


def check_llm_health(label: str, model: str) -> bool:
    console.print(f"🩺 Checking [bold cyan]{label}[/bold cyan] (openrouter/{model})...", end=" ")
    try:
        api_key = os.environ.get("OPENROUTER_API_KEY", "")
        if not api_key:
            console.print("[red]FAILED (Missing OPENROUTER_API_KEY)[/red]")
            return False
        base_url = os.environ.get("OPENROUTER_BASE_URL", "https://openrouter.ai")
        url = f"{base_url}/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "HTTP-Referer": "http://localhost:8000",
            "X-Title": "Carmen Chatbot",
        }
        data = {"model": model, "messages": [{"role": "user", "content": "Hi"}], "max_tokens": 5}
        resp = requests.post(url, headers=headers, json=data, timeout=15)
        if resp.status_code == 200:
            console.print("[green]PASSED[/green]")
            return True
        console.print(f"[red]FAILED (HTTP {resp.status_code})[/red]")
        return False
    except Exception as e:
        console.print(f"[red]ERROR ({e})[/red]")
        return False


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    env_mode = os.environ.get("ENVIRONMENT", "development").lower()

    console.print(Panel.fit(
        "[bold cyan]CARMEN CHATBOT — SYSTEM STARTUP[/bold cyan]",
        subtitle=f"[dim]Mode: {env_mode.upper()}[/dim]",
        border_style="cyan"
    ))

    if env_mode == "production":
        chat_model   = os.environ.get("OPENROUTER_CHAT_MODEL", "stepfun/step-3.5-flash:free")
        intent_model = os.environ.get("OPENROUTER_INTENT_MODEL", "google/gemini-2.5-flash-lite")

    else:
        # ── Interactive (development) ──────────────────────────────────────
        intent_model = None
        while True:
            p_models = fetch_openrouter_models()
            if not p_models:
                console.print("[red]No models fetched — check OPENROUTER_API_KEY.[/red]")
                sys.exit(1)
            chat_model   = inquirer.fuzzy(
                message="Select Chat Model (RAG):",
                choices=p_models,
                default=os.environ.get("OPENROUTER_CHAT_MODEL", "stepfun/step-3.5-flash:free"),
            ).execute()
            intent_model = inquirer.fuzzy(
                message="Select Intent Model (small/fast):",
                choices=p_models,
                default=os.environ.get("OPENROUTER_INTENT_MODEL", "google/gemini-2.5-flash-lite"),
            ).execute()

            # Health check
            embed_model = os.environ.get("OPENROUTER_EMBED_MODEL", "qwen/qwen3-embedding-8b").strip("'\"")
            chat_ok   = check_llm_health("Chat Model", chat_model)
            intent_ok = check_llm_health("Intent Model", intent_model)
            embed_ok  = check_embed_health(embed_model)

            if not chat_ok or not intent_ok or not embed_ok:
                ans = inquirer.select(
                    message="Health checks failed. What next?",
                    choices=[
                        Choice("retry", "Select different models"),
                        Choice("force", "Force start anyway"),
                        Choice("abort", "Exit"),
                    ],
                    default="retry",
                ).execute()
                if ans == "retry":
                    continue
                if ans == "abort":
                    sys.exit(1)
            break

        # Save to .env and update os.environ so the spawned worker inherits the new values
        if inquirer.confirm(message="Save selection to .env?", default=True).execute():
            set_key(ENV_PATH, "OPENROUTER_CHAT_MODEL", chat_model)
            os.environ["OPENROUTER_CHAT_MODEL"] = chat_model
            set_key(ENV_PATH, "OPENROUTER_INTENT_MODEL", intent_model)
            os.environ["OPENROUTER_INTENT_MODEL"] = intent_model

    # ── Summary ────────────────────────────────────────────────────────────
    embed_model = os.environ.get("OPENROUTER_EMBED_MODEL", "qwen/qwen3-embedding-8b").strip("'\"")
    table = Table(title="[bold green]Active Configuration[/bold green]", show_header=True, header_style="bold green")
    table.add_column("Key",   style="dim")
    table.add_column("Value", style="bold white")
    table.add_row("Provider",     "OPENROUTER")
    table.add_row("Chat Model",   chat_model)
    table.add_row("Intent Model", intent_model or f"{chat_model} (shared)")
    table.add_row("Embed Model",  f"{embed_model} [dim](openrouter)[/dim]")
    console.print(table)

    # ── Start Server ───────────────────────────────────────────────────────
    uvicorn.run(
        "backend.main:app",
        host="127.0.0.1",
        port=8000,
        reload=(env_mode != "production"),
    )


if __name__ == "__main__":
    main()
