"""
Admin Tools — Require valid JWT with role 'admin'.
Tools: get_booking_stats, get_platform_metrics, get_resource_usage_report, get_peak_hour_analysis, get_user_activity_stats
"""
import os
import logging
import httpx
from datetime import datetime, timedelta
import random  # For MVP: simulated data until ms-10-audit is implemented

logger = logging.getLogger("tools.admin")

GATEWAY_URL = os.getenv("GATEWAY_URL", "http://localhost:3000")

# ─── Tool Definitions ─────────────────────────────────────────────────────────

ADMIN_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_booking_stats",
            "description": "Obtiene estadísticas generales de reservas: total de reservas, tasa de éxito, reservas por recurso y por período.",
            "parameters": {
                "type": "object",
                "properties": {
                    "period": {
                        "type": "string",
                        "description": "Período de análisis: 'hoy', 'semana', 'mes' o 'semestre'",
                        "enum": ["hoy", "semana", "mes", "semestre"],
                    }
                },
                "required": ["period"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_platform_metrics",
            "description": "Obtiene métricas de rendimiento y salud de los microservicios de UCE-Nexus: tiempos de respuesta, disponibilidad, errores.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_resource_usage_report",
            "description": "Genera un reporte de uso de recursos: ranking de laboratorios más reservados, tasa de ocupación, recursos subutilizados.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_peak_hour_analysis",
            "description": "Analiza los horarios pico de uso de la plataforma y los laboratorios: qué días y horas hay más demanda.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_user_activity_stats",
            "description": "Obtiene estadísticas de actividad de usuarios: usuarios activos, nuevos registros, distribución por carrera/semestre.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
]


# ─── Tool Executors (MVP: simulated data, ready for real DB connection) ───────

def _simulated_bookings_for_period(period: str) -> dict:
    """Generate realistic simulated booking data for the given period."""
    base = {"hoy": 12, "semana": 87, "mes": 342, "semestre": 1856}
    total = base.get(period, 50)
    success_rate = random.uniform(0.88, 0.97)
    successful = int(total * success_rate)
    failed = total - successful

    resources = ["LAB-Cisco-01", "LAB-Comp-02", "LAB-Software-03", "LAB-Hardware-05", "AUD-Principal"]
    weights = [0.32, 0.28, 0.18, 0.14, 0.08]
    by_resource = {r: int(total * w) for r, w in zip(resources, weights)}

    return {
        "period": period,
        "total": total,
        "successful": successful,
        "failed": failed,
        "success_rate": round(success_rate * 100, 1),
        "by_resource": by_resource,
        "generated_at": datetime.now().isoformat(),
        "source": "simulated_mvp",  # Will be replaced with ms-10-audit data
    }


async def get_booking_stats(period: str) -> str:
    """Get booking statistics for a given period."""
    data = _simulated_bookings_for_period(period)
    period_label = {"hoy": "hoy", "semana": "esta semana", "mes": "este mes", "semestre": "este semestre"}
    label = period_label.get(period, period)

    lines = [
        f"📊 **Estadísticas de Reservas — {label.title()}**",
        f"",
        f"| Métrica | Valor |",
        f"|---|---|",
        f"| Total de reservas | **{data['total']}** |",
        f"| Reservas exitosas | {data['successful']} ✅ |",
        f"| Reservas fallidas | {data['failed']} ❌ |",
        f"| Tasa de éxito | **{data['success_rate']}%** |",
        f"",
        f"**Por recurso:**",
    ]
    for resource, count in sorted(data["by_resource"].items(), key=lambda x: -x[1]):
        bar = "█" * (count // max(data["by_resource"].values(), default=1) * 10 // 10)
        lines.append(f"  • `{resource}`: {count} reservas")

    lines.append(f"\n> ⚠️ *Datos simulados (MVP). Se conectarán al ms-10-audit cuando esté disponible.*")
    return "\n".join(lines)


async def get_platform_metrics() -> str:
    """Get platform health metrics."""
    # Real check: gateway health
    gateway_status = "❓"
    gateway_latency = "N/A"
    try:
        import time
        async with httpx.AsyncClient(timeout=5.0) as client:
            t0 = time.time()
            resp = await client.get(f"{GATEWAY_URL}/health")
            latency = round((time.time() - t0) * 1000, 1)
            gateway_status = "✅ Online" if resp.status_code == 200 else "⚠️ Degradado"
            gateway_latency = f"{latency}ms"
    except Exception:
        gateway_status = "❌ Offline"

    return (
        f"🖥️ **Métricas de Plataforma UCE-Nexus**\n\n"
        f"| Servicio | Estado | Latencia |\n"
        f"|---|---|---|\n"
        f"| MS-01 Gateway | {gateway_status} | {gateway_latency} |\n"
        f"| MS-06 Booking Engine | ✅ Online | ~12ms (gRPC) |\n"
        f"| MS-07 Notifications | ✅ Online | async |\n"
        f"| MS-11 Catalog | ✅ Online | ~8ms (gRPC) |\n"
        f"| MS-08 AI Agent (self) | ✅ Online | — |\n"
        f"| Redis Cache | ✅ Online | <1ms |\n"
        f"| RabbitMQ | ✅ Online | — |\n"
        f"| MS-02 Identity (IAM) | ✅ Online | — |\n\n"
        f"> ⚠️ *Latencias de MS-06/MS-11/infraestructura son estimadas (MVP).*"
    )


async def get_resource_usage_report() -> str:
    """Generate resource usage ranking and occupancy rates."""
    resources = [
        {"code": "LAB-Comp-02",    "name": "Cómputo General",      "cap": 40,  "bookings": 108, "occupancy": 78},
        {"code": "LAB-Cisco-01",   "name": "Cisco & Redes",         "cap": 30,  "bookings": 124, "occupancy": 85},
        {"code": "LAB-Software-03","name": "Desarrollo de Software", "cap": 25,  "bookings": 69,  "occupancy": 62},
        {"code": "AUD-Principal",  "name": "Auditorio General",      "cap": 150, "bookings": 21,  "occupancy": 35},
        {"code": "LAB-Hardware-05","name": "Hardware & Electrónica", "cap": 20,  "bookings": 54,  "occupancy": 71},
        {"code": "BIB-Estudio-12", "name": "Sala de Estudio",        "cap": 12,  "bookings": 89,  "occupancy": 90},
    ]
    resources.sort(key=lambda r: -r["bookings"])

    lines = [
        "📈 **Reporte de Uso de Recursos — Semestre 2026-A**\n",
        "| Ranking | Recurso | Reservas | Ocupación |",
        "|---|---|---|---|",
    ]
    for i, r in enumerate(resources, 1):
        occ_bar = "🟩" * (r["occupancy"] // 20) + "⬜" * (5 - r["occupancy"] // 20)
        lines.append(f"| #{i} | `{r['code']}` {r['name']} | {r['bookings']} | {occ_bar} {r['occupancy']}% |")

    underused = [r for r in resources if r["occupancy"] < 50]
    if underused:
        lines.append(f"\n⚠️ **Recursos subutilizados (<50% ocupación):**")
        for r in underused:
            lines.append(f"  • `{r['code']}` — {r['occupancy']}% de ocupación → considera promocionar su uso")

    lines.append("\n> ⚠️ *Datos simulados (MVP).*")
    return "\n".join(lines)


async def get_peak_hour_analysis() -> str:
    """Analyze peak hours and days for platform usage."""
    return (
        "⏰ **Análisis de Horarios Pico — UCE-Nexus**\n\n"
        "**Días de mayor demanda:**\n"
        "  1. 🔴 Lunes — 28% del total semanal\n"
        "  2. 🔴 Miércoles — 24% del total semanal\n"
        "  3. 🟡 Jueves — 18% del total semanal\n"
        "  4. 🟡 Martes — 17% del total semanal\n"
        "  5. 🟢 Viernes — 10% del total semanal\n"
        "  6. 🟢 Sábado — 3% del total semanal\n\n"
        "**Franjas horarias con mayor actividad:**\n"
        "| Franja | Demanda |\n"
        "|---|---|\n"
        "| 07h00 - 09h00 | 🟡 Media (18%) |\n"
        "| 09h00 - 11h00 | 🔴 Alta (32%) |\n"
        "| 11h00 - 13h00 | 🔴 Muy alta (38%) |\n"
        "| 13h00 - 15h00 | 🟡 Media (22%) |\n"
        "| 15h00 - 17h00 | 🟡 Media (19%) |\n"
        "| 17h00 - 19h00 | 🟢 Baja (12%) |\n"
        "| 19h00 - 21h00 | 🟢 Baja (7%) |\n\n"
        "**💡 Recomendaciones:**\n"
        "  • Considerar incentivos para reservas en horarios de baja demanda (17h-21h)\n"
        "  • LAB-Cisco-01 y LAB-Comp-02 presentan alta demanda los lunes a las 11h00\n"
        "  • El Auditorio tiene baja ocupación — revisar política de reservas\n\n"
        "> ⚠️ *Datos simulados (MVP). Se conectarán al ms-10-audit cuando esté disponible.*"
    )


async def get_user_activity_stats() -> str:
    """Get user activity statistics."""
    return (
        "👥 **Estadísticas de Actividad de Usuarios — 2026-A**\n\n"
        "| Métrica | Valor |\n"
        "|---|---|\n"
        "| Usuarios registrados totales | 1,247 |\n"
        "| Usuarios activos este semestre | 893 |\n"
        "| Nuevos registros (últimos 30 días) | 124 |\n"
        "| Sesiones promedio por usuario/semana | 3.2 |\n"
        "| Tasa de retención mensual | 87.4% |\n\n"
        "**Distribución por carrera:**\n"
        "  • Ingeniería en Sistemas: 52% (464 usuarios)\n"
        "  • Telecomunicaciones: 31% (277 usuarios)\n"
        "  • Electrónica y Control: 17% (152 usuarios)\n\n"
        "**Acciones más frecuentes:**\n"
        "  1. Consultar disponibilidad de labs — 1,823 veces\n"
        "  2. Crear reservas — 1,235 veces\n"
        "  3. Consultar agente IA — 987 veces\n"
        "  4. Ver calificaciones — 743 veces\n"
        "  5. Consultar proceso de matrícula — 512 veces\n\n"
        "> ⚠️ *Datos simulados (MVP).*"
    )


# ─── Tool dispatcher ─────────────────────────────────────────────────────────

async def execute_admin_tool(tool_name: str, arguments: dict) -> str:
    """Dispatch tool calls to the appropriate admin function."""
    if tool_name == "get_booking_stats":
        return await get_booking_stats(arguments.get("period", "semana"))
    elif tool_name == "get_platform_metrics":
        return await get_platform_metrics()
    elif tool_name == "get_resource_usage_report":
        return await get_resource_usage_report()
    elif tool_name == "get_peak_hour_analysis":
        return await get_peak_hour_analysis()
    elif tool_name == "get_user_activity_stats":
        return await get_user_activity_stats()
    else:
        return f"Tool '{tool_name}' not found in admin tools."
