# MS-01: API Gateway & BFF (Backend-for-Frontend)

An Express-based API Edge Gateway written in **TypeScript** that serves as the entry point and routing manager for the **UCE-Nexus** Smart-Campus ecosystem. It coordinates secure communication between frontends, microservices, and identity providers.

## 🏗️ Architecture Role

This gateway implements the **BFF (Backend-for-Frontend)** pattern to mitigate CORS issues when communicating with Keycloak and coordinates:
1. **Security**: Centralized JWT token verification (using RS256 algorithm via JWKS).
2. **Reverse Proxying**: Forwarding requests to internal microservices via REST or gRPC.
3. **Role-Based Access Control**: Validating client claims and realms before routing downstream.
4. **API Documentation**: Exposing an interactive Swagger UI for development APIs.

```
                  ┌──────────────────────┐
                  │      React MFE       │
                  │   (web-host, etc.)   │
                  └──────────┬───────────┘
                             │ HTTP / JSON
                             ▼
                  ┌──────────────────────┐
                  │    ms-01-gateway     │
                  │      (Port 3000)     │
                  └────┬────────────┬────┘
                       │            │
         gRPC (50051)  │            │ HTTP (3001)
     ┌─────────────────┘            └─────────────────┐
     ▼                                                ▼
┌──────────────┐                               ┌──────────────┐
│ms-06-booking │                               │ms-03-enroll  │
└──────────────┘                               └──────────────┘
```

---

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript (`tsconfig.json` included)
- **Framework**: Express.js
- **Security**: `jsonwebtoken`, `jwks-rsa`
- **gRPC Integration**: `@grpc/grpc-js`, `@grpc/proto-loader`
- **Documentation**: `swagger-ui-express`, `swagger-jsdoc`

---

## 🔌 API Endpoints

### Public Endpoints
* **`GET /health`**: Evaluates gateway status and node environment configuration.
* **`POST /api/login`**: Proxies username and password to Keycloak to obtain JWT access and refresh tokens.
* **`POST /api/refresh`**: Refreshes Keycloak session tokens.
* **`POST /api/chat`**: Proxies prompts to the `ms-08-ai-agent` FastAPI. Includes an optional JWT token (elevates privileges if available).

### Protected Endpoints (JWT Required)
* **`POST /api/chat/secure`**: AI Agent chat query with mandatory JWT validation.
* **`POST /api/reservas`**: Interacts with the Go booking engine `ms-06-booking` using gRPC. Requires the `user` role check.
* **`ANY /api/academic/*`**: Proxies request directly to the Node/Express `ms-03-enrollment` service.

---

## ⚙️ Configuration (Environment Variables)

Create a `.env` file or supply these variables inside the environment:

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | Local port for the gateway server | `3000` |
| `NODE_ENV` | Environment identifier | `development` |
| `KEYCLOAK_JWKS_URI` | Public keys endpoint for validating tokens | `http://keycloak:8080/realms/UCE-Nexus/.../certs` |
| `BOOKING_SERVICE_URL` | gRPC address of the Booking Engine | `ms-06-booking:50051` |
| `ENROLLMENT_SERVICE_URL` | Base HTTP endpoint of the Enrollment service | `http://ms-03-enrollment:3001` |
| `AI_AGENT_URL` | Base HTTP endpoint of the AI agent | `http://ms-08-ai-agent:8001` |

---

## 🚀 How to Run & Test

### Run Locally (Development)
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server with hot reload:
   ```bash
   npm run dev
   ```

### Run with Docker
This service is built automatically as part of the monorepo's docker-compose orchestration:
```bash
docker build -t nexus-ms-01-gateway .
```

### Run Tests
The gateway uses **Jest** and **Supertest** to test routes:
```bash
npm run test
```
