"""
Intent Classifier — Uses Groq (fast) to classify the user's message.

Returns one of:
  - "public_info"     → General info about UCE (RAG, public tools)
  - "public_events"   → Events query (RAG, public)
  - "platform_status" → Health check of platform services
  - "student_labs"    → Lab info / availability (requires JWT)
  - "student_booking" → Create/manage booking (requires JWT)
  - "admin_stats"     → Statistics / analytics (requires admin JWT)
  - "general"         → Fallback for ambiguous queries
"""
import json
import logging
from llm.router import router

logger = logging.getLogger("intent_classifier")

INTENT_SYSTEM_PROMPT = """Eres un clasificador de intenciones para UCE-Nexus, el sistema universitario de la UCE Ecuador.
Tu única tarea es clasificar el mensaje del usuario en UNA de estas categorías y responder SOLO con el JSON indicado.

Categorías disponibles:
- "public_info": El usuario pregunta sobre la UCE, facultades, carreras, historia, contactos, reglamentos, servicios generales, matrícula, procesos administrativos.
- "public_events": El usuario pregunta sobre eventos del campus: ferias, talleres, conciertos, torneos, conferencias, calendario académico.
- "campus_route": El usuario pregunta cómo llegar de un punto a otro dentro de la universidad, pide indicaciones o busca la ruta más corta entre facultades.
- "platform_status": El usuario pregunta sobre el estado o funcionamiento de la plataforma UCE-Nexus.
- "student_labs": El usuario quiere ver información de laboratorios, verificar disponibilidad, o listar recursos reservables.
- "student_booking": El usuario quiere crear, cancelar o gestionar una reserva de laboratorio o auditorio.
- "admin_stats": El usuario pide estadísticas, métricas, reportes de uso, análisis de datos o dashboards.
- "general": No encaja claramente en ninguna categoría anterior (saludo, pregunta muy vaga, off-topic).

Responde ÚNICAMENTE con este JSON (sin markdown, sin explicaciones):
{"intent": "<categoría>", "confidence": <0.0-1.0>, "entities": {"resource_code": "<si se menciona>", "date": "<si se menciona>", "action": "<si se menciona>"}}"""


async def classify_intent(message: str) -> dict:
    """
    Classifies the user message intent using the fast Groq model.

    Returns:
        dict with keys: intent, confidence, entities
    """
    try:
        response = await router.complete(
            task_type="intent",
            messages=[
                {"role": "system", "content": INTENT_SYSTEM_PROMPT},
                {"role": "user", "content": message},
            ],
            temperature=0.0,  # Deterministic for classification
            max_tokens=150,
        )

        raw = response.choices[0].message.content.strip()

        # Clean potential markdown wrapping
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        result = json.loads(raw)
        logger.info(f"Intent classified: {result['intent']} (confidence={result.get('confidence', '?')})")
        return result

    except (json.JSONDecodeError, KeyError, IndexError) as e:
        logger.warning(f"Intent classification failed: {e}. Falling back to 'general'")
        return {"intent": "general", "confidence": 0.5, "entities": {}}
    except Exception as e:
        logger.error(f"Unexpected error in intent classifier: {e}")
        return {"intent": "general", "confidence": 0.0, "entities": {}}
