"""
MS-08 AI Agent — FastAPI Application Entry Point
UCE-Nexus Intelligent Orchestrator
"""
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from dotenv import load_dotenv
load_dotenv()

from agent.orchestrator import run_agent
from agent.rag import rag_engine
from agent.b2_sync import B2SyncService
from middleware.auth import extract_auth_context
from middleware.rate_limiter import check_rate_limit

# ─── Logging ─────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("ms-08-ai-agent")


# ─── Lifespan ─────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("🚀 Starting MS-08 AI Agent...")

    # Sync from Backblaze B2 first if configured
    b2_service = B2SyncService()
    if b2_service.enabled:
        try:
            downloaded = b2_service.sync_bucket_to_local()
            logger.info(f"📥 Sync from Backblaze B2 complete: {downloaded} files downloaded")
        except Exception as e:
            logger.error(f"⚠️ Backblaze B2 sync failed: {e}")

    # Index knowledge base on startup in a background thread to prevent blocking port listening
    import asyncio

    def run_background_indexing():
        try:
            logger.info("📚 Indexing knowledge base in ChromaDB in background...")
            new_chunks = rag_engine.index_documents()
            if new_chunks > 0:
                logger.info(f"✅ Knowledge base indexed: {new_chunks} new chunks added")
            else:
                logger.info("✅ Knowledge base is up to date (no changes detected)")
        except Exception as e:
            logger.warning(f"⚠️ Knowledge base indexing failed: {e}. RAG will use cached data if available.")

    asyncio.create_task(asyncio.to_thread(run_background_indexing))

    logger.info("🤖 UCE-Nexus AI Orchestrator is ready!")
    yield

    logger.info("👋 Shutting down MS-08 AI Agent...")


# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="UCE-Nexus AI Agent",
    description="Intelligent orchestrator agent for UCE-Nexus: multi-LLM, RAG + tool calling",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Models ───────────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None
    history: list[dict] | None = None  # Previous messages: [{role, content}]


class ChatResponse(BaseModel):
    response: str
    role: str
    conversation_id: str | None = None
    model_used: str | None = None


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "ms-08-ai-agent",
        "version": "1.0.0",
        "providers": {
            "groq": bool(os.getenv("GROQ_API_KEY")),
            "gemini": bool(os.getenv("GEMINI_API_KEY")),
            "openrouter": bool(os.getenv("OPENROUTER_API_KEY")),
        },
        "rag": "ready" if rag_engine._indexed else "indexing",
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(request: Request, body: ChatRequest):
    """
    Public chat endpoint — no JWT required.
    Handles public users (info, events) and authenticated users (labs, booking).
    The JWT is optional: if present and valid, unlocks more capabilities.
    """
    # Rate limiting
    client_ip = request.client.host if request.client else "unknown"
    authorization = request.headers.get("Authorization")

    # Extract auth context (optional JWT)
    auth = extract_auth_context(authorization)

    # Rate limit identifier
    identifier = auth.user_id if auth.is_authenticated else client_ip
    is_allowed, current, limit = await check_rate_limit(identifier, auth.role)

    if not is_allowed:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "Límite de mensajes alcanzado",
                "message": f"Has superado el límite de {limit} mensajes por hora. Por favor espera antes de continuar.",
                "limit": limit,
                "current": current,
            }
        )

    # Validate message
    message = body.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="El mensaje no puede estar vacío.")
    if len(message) > 2000:
        raise HTTPException(status_code=400, detail="El mensaje es demasiado largo (máximo 2000 caracteres).")

    logger.info(f"Chat request: role={auth.role}, user={auth.username or client_ip}, msg='{message[:60]}'")

    # Run the agent
    try:
        response_text = await run_agent(
            message=message,
            auth=auth,
            conversation_history=body.history,
        )
    except Exception as e:
        logger.error(f"Agent error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="El agente tuvo un problema procesando tu consulta. Por favor intenta de nuevo."
        )

    return ChatResponse(
        response=response_text,
        role=auth.role,
        conversation_id=body.conversation_id,
    )


@app.post("/chat/secure", response_model=ChatResponse)
async def chat_secure(request: Request, body: ChatRequest):
    """
    Secure chat endpoint — JWT required.
    Returns 401 if no valid token provided.
    """
    authorization = request.headers.get("Authorization")
    auth = extract_auth_context(authorization)

    if not auth.is_authenticated:
        raise HTTPException(
            status_code=401,
            detail="Se requiere autenticación. Por favor inicia sesión en UCE-Nexus."
        )

    # Delegate to the same handler
    return await chat(request, body)


@app.get("/rag/reindex")
async def reindex_rag(request: Request):
    """Force re-index of the knowledge base (admin only via internal call)."""
    # Simple check: only allow from localhost
    client_ip = request.client.host if request.client else ""
    if client_ip not in ("127.0.0.1", "::1", "localhost"):
        raise HTTPException(status_code=403, detail="Acceso denegado")

    new_chunks = rag_engine.index_documents(force=True)
    return {"message": f"Knowledge base reindexed: {new_chunks} chunks", "status": "ok"}


@app.post("/rag/sync")
async def force_sync_rag(request: Request):
    """Sync documents from Backblaze B2 and re-index ChromaDB."""
    client_ip = request.client.host if request.client else ""
    # Allow from localhost and internal Docker network IPs (172.x.x.x)
    if client_ip not in ("127.0.0.1", "::1", "localhost") and not client_ip.startswith("172."):
        raise HTTPException(status_code=403, detail="Acceso denegado")

    b2_service = B2SyncService()
    downloaded = b2_service.sync_bucket_to_local()
    new_chunks = rag_engine.index_documents(force=True)

    return {
        "status": "ok",
        "downloaded_files": downloaded,
        "indexed_chunks": new_chunks
    }
