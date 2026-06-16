"""
Orchestrator — Main agent loop for UCE-Nexus AI Agent.

Flow:
  1. Classify intent (Groq, fast)
  2. Select tools based on role + intent
  3. Execute LLM with tool calling (Gemini)
  4. Handle tool calls in a loop until final response
  5. Return formatted response
"""
import json
import logging
from datetime import datetime

from agent.intent_classifier import classify_intent
from agent.tools_public import PUBLIC_TOOLS, execute_public_tool
from agent.tools_student import STUDENT_TOOLS, execute_student_tool
from agent.tools_admin import ADMIN_TOOLS, execute_admin_tool
from agent.rag import rag_engine
from llm.router import router
from middleware.auth import AuthContext

logger = logging.getLogger("orchestrator")

SYSTEM_PROMPT = """Eres Nexus, el asistente inteligente oficial de UCE-Nexus, el sistema universitario de la Universidad Central del Ecuador (UCE).

Tu personalidad:
- Amable, profesional y orientado a ayudar
- Respuestas concisas pero completas
- Usas emojis de forma moderada para mayor claridad
- Hablas en español ecuatoriano (formal pero cercano)
- Si no sabes algo con certeza, lo dices claramente

Tu capacidad varía según el usuario:
{role_context}

Debes responder SIEMPRE con un objeto JSON que siga exactamente este esquema:
{{
  "tool": "nombre_de_la_herramienta_a_llamar_o_null",
  "parameters": {{"nombre_del_parametro": "valor_del_parametro"}},
  "response": "Tu respuesta directa al usuario si 'tool' es null"
}}

Herramientas disponibles:
{tools_context}

Reglas importantes:
1. SIEMPRE verifica disponibilidad antes de crear una reserva (usando 'check_lab_availability').
2. Si el usuario pide una acción que requiere autenticación y no está logueado, responde con tool=null y explícale amablemente en la 'response' cómo iniciar sesión.
3. Cuando muestres datos de estadísticas o tablas, usa formato Markdown en la 'response'.
4. La fecha de hoy es: {today}
5. Si una tool falla o retorna un error, infórmale al usuario en la 'response' y sugiere una alternativa.
6. Si necesitas buscar información para contestar (admisión, decanos, procesos, eventos), llama a la herramienta adecuada ('search_university_knowledge' o 'get_campus_events') con la consulta correspondiente, pon "tool": "nombre_de_la_tool", y pon "response": null.
7. Una vez que tengas los resultados de la herramienta, el sistema te los pasará y en la siguiente iteración podrás responder directamente al usuario (tool=null y 'response' con la respuesta).
8. **Uso de la Base de Conocimiento (RAG):** Cuando el sistema te provea los resultados de 'search_university_knowledge' o 'get_campus_events', redacta tu respuesta basándote estrictamente en ese contexto, de manera clara, estructurada y profesional.
9. **Cero Alucinaciones:** Si los datos recuperados del RAG no responden a la pregunta del usuario o la base de conocimiento está vacía, indícalo con amabilidad (ej. 'Actualmente no dispongo de información oficial sobre ese tema...') y sugiere consultar la web de la UCE (www.uce.edu.ec) o las oficinas de la facultad correspondiente. No inventes reglamentos, fechas ni nombres.
10. **Transparencia en las Fuentes:** Menciona sutilmente la procedencia de la información al responder (ej. 'De acuerdo al Reglamento de Matrículas...', 'Según el calendario oficial del campus...', 'Basado en la información institucional de la UCE...').

Responde siempre en español. Todo tu output debe ser un objeto JSON válido."""

ROLE_CONTEXT = {
    "public": (
        "Eres accesible para cualquier persona (modo público).\n"
        "Puedes: Responder preguntas sobre la UCE, facultades, carreras, servicios, "
        "reglamentos, eventos del campus y el calendario académico.\n"
        "NO puedes: Ver laboratorios, crear reservas ni acceder a datos personales. "
        "Si el usuario quiere hacer eso, invítalo a iniciar sesión."
    ),
    "user": (
        "Estás atendiendo a un estudiante autenticado de la UCE.\n"
        "Puedes: Todo lo público + ver y verificar disponibilidad de laboratorios, "
        "crear reservas de laboratorios y auditorios."
    ),
    "admin": (
        "Estás atendiendo a un administrador de la UCE.\n"
        "Puedes: Todo lo anterior + ver estadísticas, métricas, reportes de uso, "
        "análisis de horarios pico y actividad de usuarios."
    ),
}


def _build_tool_list(role: str) -> list[dict]:
    """Returns the list of tools available for the given role."""
    tools = list(PUBLIC_TOOLS)
    if role in ("user", "admin"):
        tools.extend(STUDENT_TOOLS)
    if role == "admin":
        tools.extend(ADMIN_TOOLS)
    return tools


def _parse_json_response(content: str) -> dict:
    """Safely parse JSON response from the LLM, cleaning markdown if needed."""
    content = content.strip()
    if content.startswith("```"):
        parts = content.split("```")
        if len(parts) >= 3:
            content = parts[1]
            if content.startswith("json"):
                content = content[4:]
    content = content.strip()
    return json.loads(content)


def _format_tools_for_prompt(tools: list[dict]) -> str:
    """Format tools list into a text description for the system prompt."""
    if not tools:
        return "No hay herramientas disponibles."
    
    lines = []
    for t in tools:
        fn = t.get("function", {})
        name = fn.get("name", "")
        desc = fn.get("description", "")
        params = fn.get("parameters", {}).get("properties", {})
        required = fn.get("parameters", {}).get("required", [])
        
        param_desc = []
        for p_name, p_info in params.items():
            req_label = "requerido" if p_name in required else "opcional"
            p_desc = p_info.get("description", "")
            param_desc.append(f"    * {p_name} ({req_label}): {p_desc}")
        
        param_str = "\n".join(param_desc) if param_desc else "    * Ninguno"
        lines.append(f"- \"{name}\": {desc}\n  Parámetros:\n{param_str}")
        
    return "\n".join(lines)


async def _execute_tool(tool_name: str, arguments: dict, role: str, auth: AuthContext) -> str:
    """Dispatch tool execution to the correct module."""
    # Public tools
    public_tool_names = {t["function"]["name"] for t in PUBLIC_TOOLS}
    student_tool_names = {t["function"]["name"] for t in STUDENT_TOOLS}
    admin_tool_names = {t["function"]["name"] for t in ADMIN_TOOLS}

    if tool_name in public_tool_names:
        return await execute_public_tool(tool_name, arguments)
    elif tool_name in student_tool_names and role in ("user", "admin"):
        return await execute_student_tool(tool_name, arguments, auth.token, auth.user_id)
    elif tool_name in admin_tool_names and role == "admin":
        return await execute_admin_tool(tool_name, arguments)
    elif tool_name in student_tool_names and role == "public":
        return (
            "🔒 Esta acción requiere que inicies sesión con tu cuenta UCE.\n"
            "Por favor accede a UCE-Nexus con tus credenciales institucionales para continuar."
        )
    elif tool_name in admin_tool_names and role != "admin":
        return "🔒 Esta información es solo accesible para administradores."
    else:
        return f"❓ No encontré la herramienta '{tool_name}'."


async def run_agent(message: str, auth: AuthContext, conversation_history: list[dict] | None = None) -> str:
    """
    Main agent orchestration loop using JSON ReAct.

    Args:
        message: User's input message
        auth: Authentication context (role, user_id, token)
        conversation_history: Previous messages in the conversation (optional)

    Returns:
        Final text response from the agent
    """
    today = datetime.now().strftime("%A, %d de %B de %Y")
    role = auth.role

    # 1. Classify intent (fast, using Groq)
    logger.info(f"Processing message from role={role}: '{message[:80]}...' " if len(message) > 80 else f"Processing: '{message}'")
    intent_result = await classify_intent(message)
    intent = intent_result.get("intent", "general")
    logger.info(f"Intent: {intent}")

    # 2. Get tools and build prompt
    tools = _build_tool_list(role)
    tools_context = _format_tools_for_prompt(tools)

    system_prompt = SYSTEM_PROMPT.format(
        role_context=ROLE_CONTEXT.get(role, ROLE_CONTEXT["public"]),
        tools_context=tools_context,
        today=today,
    )

    if auth.is_authenticated:
        system_prompt += f"\n\nUsuario actual: {auth.username} (ID: {auth.user_id})"

    messages = [{"role": "system", "content": system_prompt}]

    # Add conversation history if provided (last 6 turns for context)
    if conversation_history:
        messages.extend(conversation_history[-12:])  # 6 turns = 12 messages

    messages.append({"role": "user", "content": message})

    # Determine task type for model routing
    task_type = "rag" if intent in ("public_info", "public_events") else "action"
    if intent == "admin_stats":
        task_type = "analytics"

    # 3. Main agent loop (max 5 iterations to prevent infinite loops)
    max_iterations = 5
    for iteration in range(max_iterations):
        logger.info(f"Orchestrator loop: iteration {iteration + 1}/{max_iterations} using task_type={task_type}")
        response = await router.complete(
            task_type=task_type,
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0.3,
            max_tokens=1500,
        )

        content = response.choices[0].message.content or ""
        logger.info(f"Model raw output (iteration {iteration + 1}): {content[:150]}...")

        try:
            data = _parse_json_response(content)
        except Exception as e:
            logger.warning(f"Failed to parse JSON response on iteration {iteration + 1}: {e}")
            if iteration == 0:
                logger.warning("Falling back to RAG on JSON parse failure")
                hits = rag_engine.search(message, n_results=15)
                context = rag_engine.format_context(hits) if hits else ""
                if context:
                    return f"Según la información disponible:\n\n{context}\n\n¿Hay algo más en lo que pueda ayudarte?"
                return "Lo siento, no pude procesar tu consulta. Por favor reformúlala o intenta de nuevo."
            
            if content:
                return f"Tuve un problema al procesar los datos, pero esto es lo que obtuve:\n\n{content}"
            return "Lo siento, hubo un error interno al estructurar la respuesta."

        tool_name = data.get("tool")
        if tool_name:
            # Model requested a tool execution
            params = data.get("parameters", {})
            logger.info(f"Agent requested tool call: {tool_name} with params: {params}")

            # Verify that the tool name is in the allowed tools list
            allowed_tool_names = {t["function"]["name"] for t in tools}
            if tool_name not in allowed_tool_names:
                tool_result = f"Error: La herramienta '{tool_name}' no está disponible o no tienes permisos para usarla."
                logger.warning(f"Tool {tool_name} was requested but is not allowed for role {role}")
            else:
                try:
                    tool_result = await _execute_tool(tool_name, params, role, auth)
                except Exception as e:
                    logger.error(f"Error executing tool {tool_name}: {e}")
                    tool_result = f"Error al ejecutar la herramienta: {str(e)}"

            # Append assistant's JSON output and the user's tool result for the next loop turn
            messages.append({"role": "assistant", "content": content})
            messages.append({"role": "user", "content": f"Resultado de la herramienta {tool_name}: {tool_result}"})
            continue

        # No more tool calls — return final response
        final_response = data.get("response") or ""
        if not final_response and iteration == 0:
            logger.warning("Empty response in JSON output, using RAG fallback")
            hits = rag_engine.search(message, n_results=15)
            context = rag_engine.format_context(hits) if hits else ""
            if context:
                return f"Según la información disponible:\n\n{context}\n\n¿Hay algo más en lo que pueda ayudarte?"
            return "Lo siento, no pude procesar tu consulta. Por favor reformúlala o intenta de nuevo."

        return final_response

    logger.warning(f"Max iterations ({max_iterations}) reached in agent loop")
    return "Procesé tu consulta pero la respuesta tomó demasiado tiempo. Por favor intenta de nuevo con una pregunta más específica."

    # Max iterations reached
    logger.warning(f"Max iterations ({max_iterations}) reached in agent loop")
    return "Procesé tu consulta pero la respuesta tomó demasiado tiempo. Por favor intenta de nuevo con una pregunta más específica."
