# MS-08: AI Agent & Orchestrator

An intelligent orchestrator microservice written in **Python** using **FastAPI** that coordinates multi-LLM reasoning, vector-based RAG (Retrieval-Augmented Generation), and role-based tool execution for the **UCE-Nexus** Smart-Campus portal.

## 🏗️ Architecture Role

This service functions as the intelligent chat backend for the web portal:
1. **Multi-LLM Routing**: Support for multiple API providers (Groq, Google Gemini, OpenRouter) to balance latency, capabilities, and costs.
2. **Retrieval-Augmented Generation (RAG)**: Indexes university regulations, enrollment procedures, and campus maps inside **ChromaDB** to answer user queries with accurate, context-bound information.
3. **Cloud Document Synchronization**: Connects to **Backblaze B2** to sync updated knowledge files directly into the local agent directory.
4. **Tool Calling & Agent Workflows**: Executes specialized Python tools to fetch real-time academic records or manage bookings on behalf of the student.
5. **Security & Rate Limiting**: Validates JWT tokens and implements role-based throttling (higher message limits for students and admins vs public visitors).

---

## 🛠️ Tech Stack

- **Language**: Python (3.10+)
- **Framework**: FastAPI
- **Vector Database**: ChromaDB
- **LLM APIs**: Groq, Gemini, OpenRouter
- **Cloud Storage**: Backblaze B2 (using `b2sdk`)

---

## 📂 Project Structure

- **`agent/`**: Core agent logic.
  - `orchestrator.py`: Message dispatch, intent classification, and tool-calling execution.
  - `rag.py`: Tokenizes and indexes markdown files in the `knowledge_base/` directory into ChromaDB.
  - `b2_sync.py`: Service wrapper to synchronize documents from a Backblaze B2 bucket.
  - `tools_*.py`: Modular tool kits (public, student, and admin tools).
- **`llm/`**: Routing configuration for AI providers.
- **`middleware/`**: Auth token extraction and rate limiting handlers.
- **`knowledge_base/`**: Local cache of markdown documents used by the RAG system.

---

## 🔌 API Endpoints

* **`GET /health`**: Returns system status, available LLM providers, and RAG status.
* **`POST /chat`**: Public chat handler. Evaluates query, checks optional JWT token, executes rate checks, and calls the orchestrator.
* **`POST /chat/secure`**: Requires a valid Bearer JWT. Unlocks student and admin tools.
* **`GET /rag/reindex`**: Re-reads all local files in `knowledge_base/` and indexes them into ChromaDB (restricted to local connection).
* **`POST /rag/sync`**: Connects to Backblaze B2, downloads any modified files, and executes a full RAG re-index.

---

## ⚙️ Configuration (Environment Variables)

Create a `.env` file inside the service folder:

| Variable | Description |
| :--- | :--- |
| `PORT` | Local FastAPI HTTP port (default: `8001`) |
| `ENV` | Environment context (e.g. `development`) |
| `REDIS_URL` | Redis URL for rate limiting records (`redis://redis-cache:6379`) |
| `GATEWAY_URL` | Base endpoint of the Gateway |
| `CATALOG_GRPC_URL` | gRPC address of the Catalog service (`ms-11-catalog:50052`) |
| `DATABASE_URL` | Business PostgreSQL database connection string |
| `GROQ_API_KEY` | (Optional) API key for Groq LLM services |
| `GEMINI_API_KEY` | (Optional) API key for Google Gemini services |
| `OPENROUTER_API_KEY` | (Optional) API key for OpenRouter models |
| `B2_APPLICATION_KEY_ID`| (Optional) Backblaze B2 access key ID |
| `B2_APPLICATION_KEY`   | (Optional) Backblaze B2 access key secret |
| `B2_BUCKET_NAME`       | (Optional) Backblaze B2 bucket name |

---

## 🚀 How to Run & Test

### Run Locally (Development)

1. Create a python virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Start the FastAPI development server:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8001 --reload
   ```

### Run Tests
```bash
pytest
```

### Run with Docker
```bash
docker build -t nexus-ms-08-ai-agent .
```
