# MS-08: AI Router Service

A microservice planned to act as a centralized routing and classification manager for AI prompt flows within the **UCE-Nexus** Smart-Campus portal.

> [!NOTE]  
> **Status**: **Skeleton / Placeholder**  
> This directory is currently a placeholder for the AI intent routing component. The active chatbot implementation runs in `ms-08-ai-agent`.

## 🏗️ Architectural Role

The AI Router is designed to sits between the API Gateway (`ms-01-gateway`) and specialized AI model endpoints:
1. **Prompt Classification**: Inspects incoming user prompts to determine the user's intent (e.g., info lookup, booking query, registration error, general chit-chat).
2. **Dynamic LLM Dispatching**: Routes queries to the most efficient LLM provider (e.g., routing complex reasoning to Gemini, fast responses to Groq Llama, and cheap operations to local models) to optimize token costs and speed.
3. **Fallback & Resiliency**: Automatically falls back to secondary AI models if primary LLM services hit rate limits or go offline.

---

## 🛠️ Intended Tech Stack

- **Planned Language**: Python (FastAPI / LangChain) or Go
- **Integration**: LiteLLM / custom model routing libraries
- **Cache Store**: Redis (for prompt caching and token analytics)
