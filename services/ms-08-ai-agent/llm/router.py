"""
LLM Router — Selects the optimal model based on the task type.

Task types:
- intent     → fast, cheap (Groq)
- rag        → good context understanding (Gemini)
- action     → precise function calling (Gemini)
- analytics  → complex reasoning (Gemini)
"""
import litellm
import logging
from llm.providers import (
    INTENT_MODEL, RAG_MODEL, ACTION_MODEL, FALLBACK_MODEL,
    get_available_model
)

logger = logging.getLogger("router")


class LLMRouter:
    """Routes LLM calls to the appropriate model based on task type."""

    TASK_MODEL_MAP = {
        "intent": INTENT_MODEL,
        "rag": RAG_MODEL,
        "action": ACTION_MODEL,
        "analytics": ACTION_MODEL,
        "general": RAG_MODEL,
    }

    async def complete(
        self,
        task_type: str,
        messages: list[dict],
        tools: list[dict] | None = None,
        temperature: float = 0.3,
        max_tokens: int = 1024,
        response_format: dict | None = None,
    ) -> litellm.ModelResponse:
        """
        Routes a completion request to the best available model for the task.

        Args:
            task_type: One of 'intent', 'rag', 'action', 'analytics', 'general'
            messages: OpenAI-format message list
            tools: Optional list of tool definitions for function calling
            temperature: Sampling temperature
            max_tokens: Max tokens in response
            response_format: Optional response format (e.g. {"type": "json_object"})

        Returns:
            LiteLLM ModelResponse
        """
        preferred = self.TASK_MODEL_MAP.get(task_type, RAG_MODEL)
        model = get_available_model(preferred, fallback=FALLBACK_MODEL)

        kwargs: dict = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "drop_params": True,  # Silently ignore unsupported params per provider
        }

        if response_format:
            kwargs["response_format"] = response_format

        if tools:
            # Only pass tools if the model supports function calling
            if litellm.supports_function_calling(model=model):
                kwargs["tools"] = tools
                kwargs["tool_choice"] = "auto"
            else:
                # Inject tools as system prompt context if no native support
                tool_descriptions = "\n".join(
                    f"- {t['function']['name']}: {t['function']['description']}"
                    for t in tools
                )
                kwargs["messages"] = [
                    {"role": "system", "content": f"Available tools (describe what you'd call):\n{tool_descriptions}"},
                    *messages,
                ]

        try:
            response = await litellm.acompletion(**kwargs)
            return response
        except litellm.RateLimitError as e:
            fallback_model = get_available_model(FALLBACK_MODEL)
            logger.warning(f"RateLimitError on model {model}. Falling back to {fallback_model}. Error: {e}")
            kwargs["model"] = fallback_model
            if not litellm.supports_function_calling(model=fallback_model):
                kwargs.pop("tools", None)
                kwargs.pop("tool_choice", None)
            return await litellm.acompletion(**kwargs)


# Singleton router instance
router = LLMRouter()
