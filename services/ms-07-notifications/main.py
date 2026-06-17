import json
import os
import threading
import time
import logging
import pika
import smtplib
import httpx
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from fastapi import FastAPI
from contextlib import asynccontextmanager
from dotenv import load_dotenv

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("notifications")

# Cargar variables de entorno
load_dotenv()
RABBITMQ_URI = os.getenv("RABBITMQ_URI", "amqp://guest:guest@rabbitmq:5672/")
QUEUE_NAME = "booking_events"

# Configuración de Correo Institucional (SMTP)
SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "UCE-Nexus Alertas")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", SMTP_USER)
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "True").lower() in ("true", "1", "yes")
SMTP_OVERRIDE_RECIPIENT = os.getenv("SMTP_OVERRIDE_RECIPIENT")

# Configuración de WhatsApp (Meta Cloud API)
WHATSAPP_TOKEN = os.getenv("WHATSAPP_TOKEN")
WHATSAPP_PHONE_ID = os.getenv("WHATSAPP_PHONE_ID")
WHATSAPP_TEMPLATE_NAME = os.getenv("WHATSAPP_TEMPLATE_NAME", "hello_world")
WHATSAPP_DEFAULT_RECIPIENT = os.getenv("WHATSAPP_DEFAULT_RECIPIENT")

app = FastAPI(title="UCE-Nexus Notifications Service", version="1.0.0")

def get_email_template(booking_id: str, user_id: str, resource_id: str, date: str) -> str:
    """Genera una plantilla HTML premium con los colores institucionales de la UCE (Azul y Oro)"""
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Confirmación de Reserva - UCE Nexus</title>
  <style>
    body {{
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background-color: #f4f6f9;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }}
    .container {{
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      overflow: hidden;
      border: 1px solid #e1e8ed;
    }}
    .header {{
      background-color: #002F6C;
      padding: 30px;
      text-align: center;
      border-bottom: 4px solid #D4AF37;
    }}
    .header h1 {{
      color: #ffffff;
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }}
    .content {{
      padding: 40px 30px;
      color: #333333;
      line-height: 1.6;
    }}
    .welcome {{
      font-size: 18px;
      font-weight: bold;
      color: #002F6C;
      margin-top: 0;
      margin-bottom: 20px;
    }}
    .details-box {{
      background-color: #f8fafc;
      border-left: 4px solid #002F6C;
      padding: 20px;
      margin: 25px 0;
      border-radius: 0 8px 8px 0;
    }}
    .details-box table {{
      width: 100%;
      border-collapse: collapse;
    }}
    .details-box td {{
      padding: 8px 0;
      vertical-align: top;
    }}
    .details-label {{
      font-weight: bold;
      color: #4a5568;
      width: 150px;
    }}
    .details-value {{
      color: #1a202c;
    }}
    .footer {{
      background-color: #f8fafc;
      padding: 20px 30px;
      text-align: center;
      font-size: 12px;
      color: #718096;
      border-top: 1px solid #edf2f7;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>UCE Nexus</h1>
    </div>
    <div class="content">
      <p class="welcome">¡Hola, {user_id}!</p>
      <p>Te informamos que tu reserva en la plataforma UCE-Nexus ha sido confirmada con éxito. A continuación, encontrarás los detalles de tu reserva:</p>
      
      <div class="details-box">
        <table>
          <tr>
            <td class="details-label">ID de Reserva:</td>
            <td class="details-value"><strong>{booking_id}</strong></td>
          </tr>
          <tr>
            <td class="details-label">Laboratorio/Recurso:</td>
            <td class="details-value">{resource_id}</td>
          </tr>
          <tr>
            <td class="details-label">Fecha:</td>
            <td class="details-value">{date}</td>
          </tr>
          <tr>
            <td class="details-label">Estado:</td>
            <td class="details-value" style="color: #2f855a; font-weight: bold;">✓ Confirmada</td>
          </tr>
        </table>
      </div>
      
      <p>Recuerda asistir puntualmente y respetar las normas de uso del laboratorio. Si necesitas cancelar o modificar tu reserva, hazlo a través del portal UCE-Nexus.</p>
    </div>
    <div class="footer">
      <p>Este es un mensaje automático generado por el sistema de reservas, por favor no respondas a este correo.<br>
      © 2026 Universidad Central del Ecuador. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>
"""

def send_email_smtp(recipient_email: str, subject: str, body_html: str, booking_id: str, resource_id: str, date: str) -> bool:
    """Envía un correo institucional usando SMTP, o simula el envío si faltan credenciales"""
    actual_recipient = SMTP_OVERRIDE_RECIPIENT if SMTP_OVERRIDE_RECIPIENT else recipient_email

    if not all([SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD]):
        logger.warning("⚠️ [SMTP] Configuración incompleta. SIMULANDO envío de correo institucional:")
        logger.warning(f"   📧 [Simulado] Para: {actual_recipient} (Original: {recipient_email})")
        logger.warning(f"   📧 [Simulado] Asunto: {subject}")
        logger.warning(f"   📧 [Simulado] Cuerpo: ¡Reserva {booking_id} para {resource_id} confirmada exitosamente!")
        return True

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
        msg['To'] = actual_recipient

        text_fallback = f"Hola!\nTu reserva {booking_id} para el laboratorio {resource_id} el día {date} ha sido confirmada con éxito.\nGracias,\nUCE-Nexus"
        msg.attach(MIMEText(text_fallback, 'plain', 'utf-8'))
        msg.attach(MIMEText(body_html, 'html', 'utf-8'))

        logger.info(f"📧 Conectando a servidor SMTP {SMTP_HOST}:{SMTP_PORT}...")
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.ehlo()
        if SMTP_USE_TLS:
            server.starttls()
            server.ehlo()
            
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_FROM_EMAIL, [actual_recipient], msg.as_string())
        server.quit()
        
        logger.info(f"✅ [SMTP] Correo enviado exitosamente a {actual_recipient}")
        return True
    except Exception as e:
        logger.error(f"❌ [SMTP] Error al enviar correo a {actual_recipient}: {e}")
        return False

def send_whatsapp_notification(recipient_phone: str, booking_id: str, resource_id: str, date: str) -> bool:
    """Envía una notificación de WhatsApp usando Meta Cloud API, o la simula si faltan credenciales"""
    actual_phone = recipient_phone if recipient_phone else WHATSAPP_DEFAULT_RECIPIENT

    if not actual_phone:
        logger.warning("⚠️ [WhatsApp] No se especificó teléfono de destino y no existe teléfono por defecto configurado. Saltando WhatsApp.")
        return False

    cleaned_phone = "".join(filter(str.isdigit, str(actual_phone)))

    if not all([WHATSAPP_TOKEN, WHATSAPP_PHONE_ID]):
        logger.warning("⚠️ [WhatsApp] Configuración incompleta. SIMULANDO envío por WhatsApp:")
        logger.warning(f"   📱 [Simulado] Para: {cleaned_phone}")
        logger.warning(f"   📱 [Simulado] Mensaje: Reserva {booking_id} para {resource_id} confirmada para el {date}.")
        return True

    try:
        url = f"https://graph.facebook.com/v18.0/{WHATSAPP_PHONE_ID}/messages"
        headers = {
            "Authorization": f"Bearer {WHATSAPP_TOKEN}",
            "Content-Type": "application/json"
        }

        if WHATSAPP_TEMPLATE_NAME == "hello_world":
            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": cleaned_phone,
                "type": "template",
                "template": {
                    "name": "hello_world",
                    "language": {
                        "code": "en_US"
                    }
                }
            }
        else:
            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": cleaned_phone,
                "type": "template",
                "template": {
                    "name": WHATSAPP_TEMPLATE_NAME,
                    "language": {
                        "code": "es"
                    },
                    "components": [
                        {
                            "type": "body",
                            "parameters": [
                                {"type": "text", "text": booking_id},
                                {"type": "text", "text": resource_id},
                                {"type": "text", "text": date}
                            ]
                        }
                    ]
                }
            }

        logger.info(f"📱 Enviando petición HTTP a la API de WhatsApp de Meta para {cleaned_phone}...")
        with httpx.Client() as client:
            response = client.post(url, headers=headers, json=payload, timeout=10.0)
            
        if response.status_code in (200, 201):
            logger.info(f"✅ [WhatsApp] Mensaje enviado exitosamente. Response: {response.json()}")
            return True
        else:
            logger.error(f"❌ [WhatsApp] Error devuelto por la API de Meta ({response.status_code}): {response.text}")
            return False
    except Exception as e:
        logger.error(f"❌ [WhatsApp] Excepción al enviar mensaje a {cleaned_phone}: {e}")
        return False

def process_message(ch, method, properties, body):
    """Callback ejecutado cuando llega un nuevo mensaje de reserva desde RabbitMQ"""
    try:
        event = json.loads(body.decode('utf-8'))
        logger.info(f"📥 [RabbitMQ] Evento de reserva recibido: {event}")
        
        booking_id = event.get("booking_id", "N/A")
        user_id = event.get("user_id", "N/A")
        resource_id = event.get("resource_id", "N/A")
        date = event.get("date", "N/A")
        phone = event.get("phone") or event.get("phone_number") or event.get("user_phone")
        
        recipient_email = user_id
        if "@" not in recipient_email:
            recipient_email = f"{user_id}@uce.edu.ec"
            
        email_html = get_email_template(booking_id, user_id, resource_id, date)
        subject = f"Confirmación de Reserva {booking_id} - UCE-Nexus"
        
        def run_notifications():
            send_email_smtp(recipient_email, subject, email_html, booking_id, resource_id, date)
            send_whatsapp_notification(phone, booking_id, resource_id, date)
            
        threading.Thread(target=run_notifications, daemon=True).start()
        
        ch.basic_ack(delivery_tag=method.delivery_tag)
        logger.info("✅ [RabbitMQ] Mensaje confirmado (ACK). Proceso de notificaciones lanzado en segundo plano.")
    except Exception as e:
        logger.error(f"❌ Error procesando el mensaje: {e}")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

def start_rabbitmq_consumer():
    """Bucle de consumo RabbitMQ con auto-reconexión robusta"""
    while True:
        try:
            logger.info(f"🔌 Intentando conectar a RabbitMQ en: {RABBITMQ_URI}")
            params = pika.URLParameters(RABBITMQ_URI)
            connection = pika.BlockingConnection(params)
            channel = connection.channel()
            
            # Asegurar que la cola existe y es durable
            channel.queue_declare(queue=QUEUE_NAME, durable=True)
            
            # Cargar un solo mensaje a la vez para balanceo justo
            channel.basic_qos(prefetch_count=1)
            
            # Suscribir callback
            channel.basic_consume(queue=QUEUE_NAME, on_message_callback=process_message)
            
            logger.info(f"🚀 Suscrito a la cola '{QUEUE_NAME}'. Esperando eventos de reservas...")
            channel.start_consuming()
        except pika.exceptions.AMQPConnectionError as e:
            logger.warning(f"⚠️ Conexión perdida o fallida con RabbitMQ. Reintentando en 5 segundos... (Detalle: {e})")
            time.sleep(5)
        except Exception as e:
            logger.error(f"❌ Error no esperado en el loop del consumidor: {e}. Reintentando...")
            time.sleep(5)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Iniciar el consumidor RabbitMQ en un hilo de fondo para no bloquear el hilo de ejecución principal de FastAPI
    consumer_thread = threading.Thread(target=start_rabbitmq_consumer, daemon=True)
    consumer_thread.start()
    yield
    # Detalle de apagado (opcional)
    logger.info("👋 Apagando el microservicio de Notificaciones...")

# Registrar el ciclo de vida en FastAPI
app.router.lifespan_context = lifespan

@app.get("/health")
def health_check():
    """Endpoint de monitoreo y Health Check"""
    return {"status": "healthy", "service": "ms-07-notifications"}
