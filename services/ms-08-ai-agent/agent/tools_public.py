"""
Public Tools — Available to ALL users (no JWT required).
Tools: search_university_knowledge, get_campus_events, get_platform_status
"""
import os
import logging
import httpx
from agent.rag import rag_engine

logger = logging.getLogger("tools.public")

GATEWAY_URL = os.getenv("GATEWAY_URL", "http://localhost:3000")

# ─── Tool Definitions (OpenAI function-calling schema) ───────────────────────

PUBLIC_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_university_knowledge",
            "description": (
                "Busca información en la base de conocimiento de la UCE: "
                "historia, misión/visión, facultades, carreras, autoridades, "
                "procesos académicos (matrícula, titulación), servicios del campus, "
                "reglamentos y normativas. Úsala para responder preguntas generales sobre la universidad."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "La pregunta o tema a buscar en la base de conocimiento de la UCE",
                    }
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_campus_events",
            "description": (
                "Obtiene información sobre eventos del campus universitario: "
                "eventos académicos, culturales, deportivos, talleres, conferencias, "
                "ferias, conciertos y el calendario académico del semestre."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Tipo de evento o período de interés (ej: 'esta semana', 'eventos culturales', 'talleres de programación')",
                    }
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_platform_status",
            "description": (
                "Verifica el estado operativo de la plataforma UCE-Nexus y sus microservicios. "
                "Retorna si el sistema está activo y funcionando correctamente."
            ),
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
]


# ─── Tool Executors ───────────────────────────────────────────────────────────

async def search_university_knowledge(query: str) -> str:
    """Search the RAG knowledge base for UCE general information."""
    try:
        hits = rag_engine.search(query, n_results=15)
        if not hits:
            return "No encontré información específica sobre ese tema en mi base de conocimiento. Te recomiendo visitar www.uce.edu.ec para información oficial."

        context = rag_engine.format_context(hits)
        return f"Información encontrada:\n\n{context}"
    except Exception as e:
        logger.error(f"RAG search error: {e}")
        return "Hubo un error al buscar la información. Por favor intenta de nuevo."


async def get_campus_events(query: str) -> str:
    """Search for campus events in the RAG knowledge base."""
    try:
        # Search specifically in events document
        hits = rag_engine.search(f"eventos campus {query}", n_results=6)
        if not hits:
            return "No encontré eventos programados relacionados con tu consulta."

        context = rag_engine.format_context(hits)
        return f"Eventos encontrados:\n\n{context}"
    except Exception as e:
        logger.error(f"Events search error: {e}")
        return "No pude obtener la información de eventos en este momento."


async def get_platform_status() -> str:
    """Check the health of the UCE-Nexus platform."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{GATEWAY_URL}/health")
            if response.status_code == 200:
                data = response.json()
                return (
                    f"✅ La plataforma UCE-Nexus está operativa.\n"
                    f"- Gateway: {data.get('status', 'OK')}\n"
                    f"- Ambiente: {data.get('ambiente', 'producción')}\n"
                    f"- Versión: {data.get('gateway', 'MS-01')}"
                )
            else:
                return "⚠️ El gateway de UCE-Nexus está respondiendo con errores. Intenta más tarde."
    except httpx.ConnectError:
        return "⚠️ No se pudo conectar con la plataforma UCE-Nexus en este momento."
    except Exception as e:
        logger.error(f"Platform status check error: {e}")
        return "No pude verificar el estado de la plataforma."


# ─── Tool dispatcher ─────────────────────────────────────────────────────────

async def execute_public_tool(tool_name: str, arguments: dict) -> str:
    """Dispatch tool calls to the appropriate function."""
    if tool_name == "search_university_knowledge":
        return await search_university_knowledge(arguments.get("query", ""))
    elif tool_name == "get_campus_events":
        return await get_campus_events(arguments.get("query", ""))
    elif tool_name == "get_platform_status":
        return await get_platform_status()
    else:
        return f"Tool '{tool_name}' not found in public tools."
