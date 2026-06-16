# MS-07: Notifications Service

A Python-based service powered by **FastAPI** and **Pika** that acts as an asynchronous consumer of system events for the **UCE-Nexus** Smart-Campus ecosystem.

## 🏗️ Architecture Role

This service runs an independent background thread dedicated to processing notification tasks:
1. **Asynchronous Processing**: Listens to the RabbitMQ queue `booking_events` for booking events.
2. **Notification Dispatching**: Simulates sending out email, SMS, or Push notifications to students once their lab reservations are confirmed by the booking engine.
3. **Reliable Messaging**: Utilizes manual acknowledgements (ACKs) with RabbitMQ. If a message fails to parse, it sends a negative acknowledgement (NACK) without re-queueing to prevent infinite crash loops.
4. **Auto-Reconnection**: Implements connection-retry loops to handle RabbitMQ server restarts or network blips seamlessly.

---

## 🛠️ Tech Stack

- **Language**: Python (3.9+)
- **Framework**: FastAPI
- **Web Server**: Uvicorn
- **RabbitMQ Client**: Pika (BlockingConnection)

---

## 🔌 API Endpoints

While the service operates primarily as a background consumer, it exposes a basic HTTP endpoint for status monitoring:

* **`GET /health`**: Health check endpoint returning the service name and status.

---

## ⚙️ Configuration (Environment Variables)

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `RABBITMQ_URI` | AMQP broker connection URI | `amqp://guest:guest@rabbitmq:5672/` |
| `PYTHONUNBUFFERED` | Ensures python outputs logs immediately | `1` |

---

## 🚀 How to Run & Test

### Run Locally (Development)

1. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
2. Install python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Start the FastAPI application via Uvicorn:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

### Run Tests
This service uses **pytest** for endpoint and queue handler testing:
```bash
pytest
```

### Run with Docker
Build the container:
```bash
docker build -t nexus-ms-07-notifications .
```
