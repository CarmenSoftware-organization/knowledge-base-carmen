import logging
from rich.console import Console
from rich.logging import RichHandler
from rich.table import Table
from rich.panel import Panel
from rich.text import Text
from .pii import mask_pii

# Initialize Rich Console
console = Console()

def setup_logging():
    """Configure standard Python logging to use RichHandler."""
    logging.basicConfig(
        level="INFO",
        format="%(message)s",
        datefmt="[%X]",
        handlers=[RichHandler(rich_tracebacks=True, console=console, show_path=False)]
    )

    # Silence noisy third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("openai").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)


def log_startup(provider: str, chat_model: str, intent_model: str, embed_model: str):
    """Display active provider and model configuration at startup."""
    provider_color = "deep_sky_blue1" if provider == "openrouter" else "chartreuse3"
    table = Table(
        title=f"[bold {provider_color}]Carmen Chatbot — Active Config[/bold {provider_color}]",
        show_header=True,
        header_style=f"bold {provider_color}",
        border_style=provider_color,
    )
    table.add_column("Component", style="bold")
    table.add_column("Model / Value")
    table.add_row("Provider",     f"[bold]{provider.upper()}[/bold]")
    table.add_row("Chat Model",   chat_model)
    table.add_row("Intent Model", intent_model)
    table.add_row("Embed Model",  embed_model)
    console.print(table)

# --- Premium Logging Helpers ---

def log_query(message: str, history_count: int = 0):
    """Log the incoming user query in a clean panel (PII masked)."""
    console.print("\n")
    console.print(Panel(
        Text(mask_pii(message), style="bold white"),
        title=f"💬 [bold steel_blue1]User Query[/bold steel_blue1] (History: {history_count})",
        border_style="steel_blue1",
        expand=False
    ))

def log_intent(intent: str, model: str, tokens: tuple[int, int] | int = 0):
    """Log intent analysis results in a table."""
    table = Table(title="🎯 Intent Analysis", show_header=True, header_style="bold slate_blue1", border_style="slate_blue1")
    table.add_column("Category", style="bold")
    table.add_column("Model")
    table.add_column("Tokens (In/Out)", justify="right")
    
    color = "forest_green" if intent == "tech_support" else "dark_orange"
    
    if isinstance(tokens, tuple):
        tokens_str = f"{tokens[0]} / {tokens[1]}"
    else:
        tokens_str = str(tokens)
        
    table.add_row(Text(intent.upper(), style=color), model, tokens_str)
    console.print(table)

def log_search(query: str, results: list):
    """Log RAG search results and scores in a table (PII masked in query preview)."""
    if not results:
        console.print(Panel("⚠️ [bold red]No matching documents found in knowledge base.[/bold red]", border_style="red"))
        return

    safe_query = mask_pii(query)
    table = Table(title=f"🔍 Knowledge Retrieval (Query: {safe_query[:40]}...)", show_header=True, header_style="bold deep_sky_blue1", border_style="deep_sky_blue1")
    table.add_column("Rank", justify="center", width=4)
    table.add_column("Score", justify="right")
    table.add_column("Document Title", style="italic")
    table.add_column("Source Path", style="dim")

    for i, doc in enumerate(results, 1):
        score = doc.metadata.get("score", "N/A")
        title = doc.metadata.get("title", "Untitled")
        path = doc.metadata.get("source", "Unknown")
        table.add_row(str(i), score, title, path)
    
    console.print(table)

def log_performance(tokens_map: dict, ttft: float, total_time: float):
    """Log performance metrics with a detailed breakdown."""
    # Handle both single int and (in, out) tuple for backward compatibility
    def get_in_out(val):
        if isinstance(val, tuple): return val
        return (val, 0)

    intent_in, intent_out = get_in_out(tokens_map.get("intent", 0))
    rewrite_in, rewrite_out = get_in_out(tokens_map.get("rewrite", 0))
    chat_in, chat_out = get_in_out((tokens_map.get("chat_input", 0), tokens_map.get("chat_output", 0)))
    
    total_t = intent_in + intent_out + rewrite_in + rewrite_out + chat_in + chat_out
    
    table = Table(title="📊 Performance & Usage", show_header=True, header_style="bold chartreuse3", border_style="chartreuse3")
    table.add_column("Metric", style="bold")
    table.add_column("Detail", justify="right")
    
    table.add_row("Total Time", f"{total_time:.2f}s")
    table.add_row("TTFT", f"{ttft:.2f}s")
    table.add_section()
    table.add_row("Intent Tokens (In/Out)", f"{intent_in} / {intent_out}")
    table.add_row("Rewrite Tokens (In/Out)", f"{rewrite_in} / {rewrite_out}")
    table.add_row("Chat Tokens (In/Out)", f"{chat_in} / {chat_out}")
    table.add_row("Total Tokens", f"[bold cyan]{total_t}[/bold cyan]")
    
    console.print(table)
    console.print("═" * console.width, style="dim")
