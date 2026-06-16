# MS-06: Booking Engine

A high-performance booking engine written in **Go** that exposes a **gRPC** interface. It manages concurrent reservation requests for university resources (like laboratories and auditoriums) in the **UCE-Nexus** Smart-Campus ecosystem.

## 🏗️ Architecture Role

This service handles the core reservation business logic, ensuring reliability and data consistency under high demand:
1. **Concurrency Control (Distributed Lock)**: Utilizes **Redis** to create a distributed lock during booking creation. This prevents race conditions and double-booking of a resource for the same date/time.
2. **Asynchronous Event Publishing**: Upon a successful booking, it publishes a `BookingEvent` to **RabbitMQ** (on the `booking_events` queue) so downstream services (such as notification agents) can handle follow-up actions without blocking the booking pipeline.

---

## 🛠️ Tech Stack

- **Language**: Go (`go.mod` included)
- **Communication Protocol**: gRPC (with gRPC Reflection enabled in development)
- **Cache / Lock Store**: Redis
- **Message Broker**: RabbitMQ (AMQP 0-9-1)

---

## 🔌 gRPC Services

The service compiles proto files using `google.golang.org/protobuf` and exposes the following service defined in `packages/proto-contracts/booking.proto`:

### `BookingService`
* **`CreateBooking(BookingRequest) returns (BookingResponse)`**
  * **Request Parameters**:
    * `user_id` (string): ID of the student booking the resource.
    * `resource_type` (string): e.g., "Laboratorio", "Auditorio".
    * `resource_id` (string): e.g., "LAB-Cisco-01".
    * `date` (string): Target ISO date.
  * **Response Parameters**:
    * `success` (bool): True if reservation succeeds.
    * `message` (string): Status description (e.g. error if resource is locked).
    * `booking_id` (string): Generated booking identifier.

---

## 🔒 Concurrency Logic (Distributed Mutex)

1. When `CreateBooking` is called, the service computes a lock key: `lock:<resource_type>:<resource_id>:<date>`.
2. It calls Redis `SETNX` (Set if Not eXists) on the key with the `user_id` as the value and a **5-second Time-to-Live (TTL)**.
3. If the lock is acquired:
   * The service simulates processing (writes to DB, databases validation).
   * It publishes the booking event to RabbitMQ.
   * It deletes the Redis key to release the lock and returns `success: true`.
4. If the lock cannot be acquired:
   * It immediately returns `success: false` with a concurrency conflict warning message.

---

## ⚙️ Configuration (Environment Variables)

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | gRPC TCP port to listen on | `50051` |
| `ENV` | Environment identifier | `development` |
| `REDIS_ADDR` | Redis cache and lock host connection address | `redis-cache:6379` |
| `RABBITMQ_URI` | AMQP broker connection URI | `amqp://guest:guest@rabbitmq:5672/` |
| `DB_HOST` / `DB_PORT` | PostgreSQL host and port configurations | `postgres-app` / `5432` |
| `DB_USER` / `DB_PASSWORD` | PostgreSQL credentials | `uce` / `password` |
| `DB_NAME` | Target database | `uce_nexus_dev` |
| `MONGO_URI` | MongoDB connection URI | `mongodb://admin:password@mongodb:27017/` |
| `KAFKA_BROKERS` | Kafka connection brokers | `kafka:29092` |

---

## 🚀 How to Run & Test

### Run Locally (Development)
1. Ensure Redis and RabbitMQ are running locally.
2. Run the main Go entrypoint:
   ```bash
   go run main.go
   ```

### Run Tests
```bash
go test -v ./...
```

### Run with Docker
Build the Docker image:
```bash
docker build -t nexus-ms-06-booking .
```
