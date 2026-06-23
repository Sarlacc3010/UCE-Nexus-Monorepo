"""
LLM Providers configuration using LiteLLM.
Supports Groq, Gemini, and OpenRouter as fallback.
"""
import os
import litellm
from dotenv import load_dotenv

load_dotenv()

# Silence verbose litellm logs in production
litellm.set_verbose = False

# ─── API Keys ────────────────────────────────────────────────────────────────
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")

# ─── Model names ─────────────────────────────────────────────────────────────
INTENT_MODEL = os.getenv("INTENT_MODEL", "groq/llama-3.3-70b-versatile")
RAG_MODEL = os.getenv("RAG_MODEL", "gemini/gemini-2.0-flash")
ACTION_MODEL = os.getenv("ACTION_MODEL", "gemini/gemini-2.0-flash")
FALLBACK_MODEL = os.getenv("FALLBACK_MODEL", "openrouter/meta-llama/llama-3.1-8b-instruct:free")

# ─── Environment variables for LiteLLM providers ────────────────────────────
if GROQ_API_KEY:
    os.environ["GROQ_API_KEY"] = GROQ_API_KEY
if GEMINI_API_KEY:
    os.environ["GEMINI_API_KEY"] = GEMINI_API_KEY
if OPENROUTER_API_KEY:
    os.environ["OPENROUTER_API_KEY"] = OPENROUTER_API_KEY

# Provider availability
PROVIDERS_AVAILABLE = {
    "groq": bool(GROQ_API_KEY),
    "gemini": bool(GEMINI_API_KEY),
    "openrouter": bool(OPENROUTER_API_KEY),
}


def get_available_model(preferred: str, fallback: str | None = None) -> str:
    """
    Returns the preferred model if its provider is configured,
    otherwise returns the fallback or raises an error.
    """
    provider = preferred.split("/")[0]
    if PROVIDERS_AVAILABLE.get(provider, False):
        return preferred

    if fallback:
        fb_provider = fallback.split("/")[0]
        if PROVIDERS_AVAILABLE.get(fb_provider, False):
            return fallback

    # Last resort: try any available provider
    for prov, available in PROVIDERS_AVAILABLE.items():
        if available:
            defaults = {
                "groq": "groq/llama-3.3-70b-versatile",
                "gemini": "gemini/gemini-2.0-flash",
                "openrouter": "openrouter/meta-llama/llama-3.1-8b-instruct:free",
            }
            return defaults[prov]

    raise RuntimeError("No LLM provider configured. Set at least one API key in .env")
