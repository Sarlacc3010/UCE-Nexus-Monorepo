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
    {
        "type": "function",
        "function": {
            "name": "get_campus_route",
            "description": (
                "Obtiene la ruta más corta (caminando) entre dos puntos del campus universitario (Geocampus). "
                "Utiliza esto cuando el usuario pregunte cómo llegar de una facultad a otra."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "start": {
                        "type": "string",
                        "description": "El punto de origen (ej: 'fica', 'filosofia', 'psicologia', 'plaza_central', 'entrada_principal'). Si el usuario dice 'ingenieria', usa 'fica'.",
                    },
                    "end": {
                        "type": "string",
                        "description": "El punto de destino (ej: 'fica', 'filosofia', 'psicologia', 'plaza_central', 'entrada_principal').",
                    }
                },
                "required": ["start", "end"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_building_live_status",
            "description": (
                "Obtiene la concurrencia o estado en vivo de una facultad o edificio usando datos de sensores MQTT (Heatmap). "
                "Úsala cuando el usuario pregunte si hay mucha gente, qué tan lleno está, o cuál es el estado de ocupación actual de un lugar."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "building_id": {
                        "type": "string",
                        "description": "El ID del edificio (ej: 'biblioteca_general', 'fica', 'comedor'). Si no estás seguro, usa el nombre corto.",
                    }
                },
                "required": ["building_id"],
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


async def get_building_live_status(building_id: str) -> str:
    """Check the live occupancy from the heatmap API in geocampus."""
    try:
        GEOCAMPUS_URL = "http://localhost:8009"
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{GEOCAMPUS_URL}/api/heatmap")
            if response.status_code == 200:
                data = response.json()
                # data is a dict of {"ap_biblioteca": 45, "ap_fica": 12}
                # Let's do a loose match
                clients = 0
                found = False
                for key, val in data.items():
                    if building_id.lower() in key.lower() or key.lower() in building_id.lower():
                        clients += val
                        found = True
                
                if found:
                    return f"Actualmente hay aproximadamente {clients} personas/dispositivos conectados en {building_id} o sus alrededores."
                else:
                    return f"No hay datos de sensores en vivo para '{building_id}' en este momento. Puede que la ocupación sea muy baja o no tenga sensores."
            else:
                return "Hubo un error consultando los sensores en vivo."
    except Exception as e:
        logger.error(f"Heatmap check error: {e}")
        return "No pude conectar con el sistema de sensores del campus."

async def get_campus_route(start: str, end: str) -> str:
    """Check the shortest route via ms-09-geocampus API and emit UI command."""
    try:
        # Emit the command so the UI draws the route automatically
        ui_command = f"[MAP_ROUTE_TO:{end}]"
        
        # Asume que geocampus corre en el puerto 8009 internamente
        GEOCAMPUS_URL = "http://localhost:8009"
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{GEOCAMPUS_URL}/api/route?start={start}&end={end}")
            if response.status_code == 200:
                data = response.json()
                if data and "path" in data:
                    route_path = " -> ".join(data["path"])
                    return (
                        f"Ruta calculada. Distancia: {data['distance']} metros. "
                        f"Dile al usuario amigablemente que le has trazado la ruta en el mapa hacia su destino. "
                        f"IMPORTANTE: Debes incluir el comando {ui_command} literalmente en tu respuesta final para que la interfaz trace la ruta."
                    )
                else:
                    return f"No se pudo calcular una ruta directa entre esos puntos. Aún así, incluye {ui_command} en tu respuesta para que el mapa muestre el destino."
            else:
                return f"Hubo un error calculando la ruta exacta. Incluye {ui_command} en tu respuesta para que el mapa marque el destino de todos modos."
    except Exception as e:
        logger.error(f"Routing check error: {e}")
        return f"No pude calcular distancias. Sin embargo, incluye {ui_command} en tu respuesta para activar la navegación visual en el mapa."


# ─── Tool dispatcher ─────────────────────────────────────────────────────────

async def execute_public_tool(tool_name: str, arguments: dict) -> str:
    """Dispatch tool calls to the appropriate function."""
    if tool_name == "search_university_knowledge":
        return await search_university_knowledge(arguments.get("query", ""))
    elif tool_name == "get_campus_events":
        return await get_campus_events(arguments.get("query", ""))
    elif tool_name == "get_platform_status":
        return await get_platform_status()
    elif tool_name == "get_campus_route":
        return await get_campus_route(arguments.get("start", "mi_ubicacion"), arguments.get("end", ""))
    elif tool_name == "get_building_live_status":
        return await get_building_live_status(arguments.get("building_id", ""))
    else:
        return f"Tool '{tool_name}' not found in public tools."
