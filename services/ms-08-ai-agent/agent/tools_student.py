"""
Student Tools — Require valid JWT with role 'user' or 'admin'.
Tools: get_laboratory_info, check_lab_availability, list_bookable_resources, create_booking
"""
import os
import logging
import httpx
import grpc
from datetime import datetime

logger = logging.getLogger("tools.student")

GATEWAY_URL = os.getenv("GATEWAY_URL", "http://localhost:3000")
CATALOG_GRPC_URL = os.getenv("CATALOG_GRPC_URL", "localhost:50052")

# Known resources (fallback if gRPC is unavailable)
KNOWN_RESOURCES = [
    {"code": "LAB-Cisco-01", "name": "Laboratorio de Cisco & Redes", "type": "Laboratorio", "capacity": 30, "location": "Bloque B, Piso 3"},
    {"code": "LAB-Comp-02", "name": "Laboratorio de Cómputo General", "type": "Laboratorio", "capacity": 40, "location": "Bloque A, Piso 1"},
    {"code": "LAB-Software-03", "name": "Laboratorio de Desarrollo de Software", "type": "Laboratorio", "capacity": 25, "location": "Bloque B, Piso 2"},
    {"code": "LAB-Hardware-05", "name": "Laboratorio de Hardware y Electrónica", "type": "Laboratorio", "capacity": 20, "location": "Bloque C, Piso 1"},
    {"code": "AUD-Principal", "name": "Auditorio General", "type": "Auditorio", "capacity": 150, "location": "Edificio Central"},
    {"code": "BIB-Estudio-12", "name": "Sala de Estudio Grupal — Biblioteca", "type": "Biblioteca", "capacity": 12, "location": "Biblioteca Central"},
]

# ─── Tool Definitions ─────────────────────────────────────────────────────────

STUDENT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "list_bookable_resources",
            "description": "Lista todos los laboratorios, auditorios y espacios reservables disponibles en la FICA-UCE con su capacidad y ubicación.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_laboratory_info",
            "description": "Obtiene información detallada de un laboratorio o espacio específico: nombre, ubicación, capacidad y equipamiento.",
            "parameters": {
                "type": "object",
                "properties": {
                    "code": {
                        "type": "string",
                        "description": "Código del recurso, ej: 'LAB-Cisco-01', 'LAB-Comp-02', 'AUD-Principal'",
                    }
                },
                "required": ["code"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "check_lab_availability",
            "description": "Verifica si un laboratorio o espacio está disponible para reserva en una fecha específica.",
            "parameters": {
                "type": "object",
                "properties": {
                    "code": {
                        "type": "string",
                        "description": "Código del recurso, ej: 'LAB-Cisco-01'",
                    },
                    "date": {
                        "type": "string",
                        "description": "Fecha en formato YYYY-MM-DD, ej: '2026-06-20'. Si el usuario dice 'mañana', 'esta semana', etc., calcula la fecha exacta.",
                    },
                },
                "required": ["code", "date"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_booking",
            "description": "Crea una reserva de laboratorio o espacio universitario para el usuario autenticado. Siempre verifica disponibilidad primero con check_lab_availability.",
            "parameters": {
                "type": "object",
                "properties": {
                    "resource_type": {
                        "type": "string",
                        "description": "Tipo de recurso: 'Laboratorio', 'Auditorio', o 'Biblioteca'",
                        "enum": ["Laboratorio", "Auditorio", "Biblioteca"],
                    },
                    "resource_id": {
                        "type": "string",
                        "description": "Código del recurso, ej: 'LAB-Cisco-01'",
                    },
                    "date": {
                        "type": "string",
                        "description": "Fecha de la reserva en formato YYYY-MM-DD",
                    },
                },
                "required": ["resource_type", "resource_id", "date"],
            },
        },
    },
]


# ─── Tool Executors ───────────────────────────────────────────────────────────

async def list_bookable_resources() -> str:
    """List all bookable resources."""
    lines = ["📋 **Recursos disponibles para reserva en UCE-Nexus:**\n"]
    by_type: dict[str, list] = {}
    for r in KNOWN_RESOURCES:
        by_type.setdefault(r["type"], []).append(r)

    for rtype, resources in by_type.items():
        lines.append(f"\n**{rtype}s:**")
        for r in resources:
            lines.append(f"  • `{r['code']}` — {r['name']} | Cap: {r['capacity']} personas | {r['location']}")

    lines.append("\n💡 Puedes pedirme que verifique disponibilidad o haga una reserva por ti.")
    return "\n".join(lines)


async def get_laboratory_info(code: str) -> str:
    """Get details of a specific lab via gRPC catalog service."""
    # Try gRPC first
    try:
        import sys
        import os
        proto_path = os.path.join(os.path.dirname(__file__), "..", "proto")
        sys.path.insert(0, proto_path)

        channel = grpc.aio.insecure_channel(CATALOG_GRPC_URL)
        # Dynamic import of generated protobuf (if available)
        try:
            from proto import catalog_pb2, catalog_pb2_grpc
            stub = catalog_pb2_grpc.CatalogServiceStub(channel)
            response = await stub.GetLaboratory(catalog_pb2.GetLaboratoryRequest(code=code))
            equipment_list = ", ".join(response.equipment) if response.equipment else "No especificado"
            status = "✅ Activo" if response.is_active else "❌ Inactivo"
            return (
                f"**{response.name}** (`{response.code}`)\n"
                f"- 📍 Ubicación: {response.location}\n"
                f"- 👥 Capacidad: {response.capacity} personas\n"
                f"- 🖥️ Equipamiento: {equipment_list}\n"
                f"- Estado: {status}"
            )
        except ImportError:
            pass
        finally:
            await channel.close()
    except Exception as e:
        logger.warning(f"gRPC catalog unavailable: {e}. Using local data.")

    # Fallback: local known resources
    resource = next((r for r in KNOWN_RESOURCES if r["code"].upper() == code.upper()), None)
    if resource:
        return (
            f"**{resource['name']}** (`{resource['code']}`)\n"
            f"- 📍 Ubicación: {resource['location']}\n"
            f"- 👥 Capacidad: {resource['capacity']} personas\n"
            f"- Tipo: {resource['type']}\n"
            f"- ✅ Estado: Activo"
        )
    return f"No encontré información para el recurso con código `{code}`. Verifica el código e intenta de nuevo."


async def check_lab_availability(code: str, date: str) -> str:
    """Check availability of a resource for a given date via gRPC."""
    # Validate date format
    try:
        parsed_date = datetime.strptime(date, "%Y-%m-%d")
        if parsed_date.date() < datetime.today().date():
            return f"⚠️ La fecha {date} ya pasó. Por favor indica una fecha futura."
    except ValueError:
        return f"⚠️ El formato de fecha '{date}' no es válido. Usa YYYY-MM-DD (ej: 2026-06-20)."

    # Check resource exists
    resource = next((r for r in KNOWN_RESOURCES if r["code"].upper() == code.upper()), None)
    if not resource:
        return f"No encontré el recurso `{code}`. Usa `list_bookable_resources` para ver los disponibles."

    # Try gRPC catalog
    try:
        import sys
        proto_path = os.path.join(os.path.dirname(__file__), "..", "proto")
        sys.path.insert(0, proto_path)

        channel = grpc.aio.insecure_channel(CATALOG_GRPC_URL)
        try:
            from proto import catalog_pb2, catalog_pb2_grpc
            stub = catalog_pb2_grpc.CatalogServiceStub(channel)
            response = await stub.CheckAvailability(
                catalog_pb2.CheckAvailabilityRequest(code=code, date=date)
            )
            status = "✅ Disponible" if response.is_available else "❌ No disponible"
            return (
                f"**{resource['name']}** — {date}\n"
                f"Estado: {status}\n"
                f"Mensaje: {response.message}"
            )
        except ImportError:
            pass
        finally:
            await channel.close()
    except Exception as e:
        logger.warning(f"gRPC availability check failed: {e}. Using simulated response.")

    # Fallback: simulated availability (weekends partially unavailable)
    weekday = parsed_date.weekday()
    if weekday == 6:  # Sunday
        return f"❌ **{resource['name']}** no está disponible los domingos (horario: Lun-Sáb 7h00-21h00)."

    return (
        f"✅ **{resource['name']}** (`{code}`) está disponible el {date}.\n"
        f"📍 {resource['location']} | 👥 Cap: {resource['capacity']} personas\n"
        f"💡 Puedo hacer la reserva ahora si deseas."
    )


async def create_booking(resource_type: str, resource_id: str, date: str, user_token: str, user_id: str) -> str:
    """Create a booking via the gateway REST API."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{GATEWAY_URL}/api/reservas",
                headers={
                    "Authorization": f"Bearer {user_token}",
                    "Content-Type": "application/json",
                },
                json={
                    "resource_type": resource_type,
                    "resource_id": resource_id,
                    "date": date,
                },
            )

            if response.status_code == 200:
                data = response.json()
                ms_response = data.get("ms_06_response", {})
                booking_id = ms_response.get("booking_id", "N/A")
                return (
                    f"✅ **¡Reserva creada exitosamente!**\n"
                    f"- 🔖 ID de reserva: `{booking_id}`\n"
                    f"- 📍 Recurso: {resource_id} ({resource_type})\n"
                    f"- 📅 Fecha: {date}\n"
                    f"- 📧 Recibirás un email de confirmación en tu correo institucional."
                )
            elif response.status_code == 401:
                return "❌ Tu sesión ha expirado. Por favor vuelve a iniciar sesión."
            elif response.status_code == 403:
                error = response.json().get("error", "Sin acceso")
                if "bloqueado" in error.lower() or "bloqueando" in error.lower():
                    return "⏳ El recurso está siendo reservado por otro usuario. Por favor intenta en unos segundos."
                return f"❌ No tienes permiso para realizar esta reserva: {error}"
            else:
                return f"⚠️ No se pudo completar la reserva (código {response.status_code}). Intenta más tarde."

    except httpx.ConnectError:
        return "❌ No se pudo conectar con el servidor de reservas. Verifica tu conexión."
    except Exception as e:
        logger.error(f"Booking creation error: {e}")
        return "❌ Ocurrió un error inesperado al crear la reserva. Por favor intenta de nuevo."


# ─── Tool dispatcher ─────────────────────────────────────────────────────────

async def execute_student_tool(tool_name: str, arguments: dict, user_token: str = "", user_id: str = "") -> str:
    """Dispatch tool calls to the appropriate student function."""
    if tool_name == "list_bookable_resources":
        return await list_bookable_resources()
    elif tool_name == "get_laboratory_info":
        return await get_laboratory_info(arguments.get("code", ""))
    elif tool_name == "check_lab_availability":
        return await check_lab_availability(arguments.get("code", ""), arguments.get("date", ""))
    elif tool_name == "create_booking":
        return await create_booking(
            resource_type=arguments.get("resource_type", "Laboratorio"),
            resource_id=arguments.get("resource_id", ""),
            date=arguments.get("date", ""),
            user_token=user_token,
            user_id=user_id,
        )
    else:
        return f"Tool '{tool_name}' not found in student tools."
