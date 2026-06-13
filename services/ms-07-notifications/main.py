import json
import os
import threading
import time
import logging
import pika
from fastapi import FastAPI
from contextlib import asynccontextmanager

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("notifications")

# Cargar variables de entorno (por defecto apunta a nuestro host en Docker-Compose)
RABBITMQ_URI = os.getenv("RABBITMQ_URI", "amqp://guest:guest@rabbitmq:5672/")
QUEUE_NAME = "booking_events"

app = FastAPI(title="UCE-Nexus Notifications Service", version="1.0.0")

def process_message(ch, method, properties, body):
    """Callback ejecutado cuando llega un nuevo mensaje de reserva desde RabbitMQ"""
    try:
        event = json.loads(body.decode('utf-8'))
        logger.info(f"📥 [RabbitMQ] Evento de reserva recibido: {event}")
        
        booking_id = event.get("booking_id", "N/A")
        user_id = event.get("user_id", "N/A")
        resource_id = event.get("resource_id", "N/A")
        date = event.get("date", "N/A")
        
        # Simulación del envío de la notificación (Email, SMS, Push)
        logger.info(f"🔔 [Notificación] Enviando alertas para reserva {booking_id}...")
        logger.info(f"📧 [Email enviado a {user_id}]: ¡Tu reserva para el laboratorio '{resource_id}' el día {date} ha sido confirmada con éxito!")
        
        # Confirmar el mensaje (Acknowledge)
        ch.basic_ack(delivery_tag=method.delivery_tag)
        logger.info("✅ [RabbitMQ] Mensaje confirmado (ACK).")
    except Exception as e:
        logger.error(f"❌ Error procesando el mensaje: {e}")
        # En caso de error de análisis, descartar el mensaje sin reencolar para evitar loops infinitos
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
