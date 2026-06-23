"""
Rate Limiter — Redis-based rate limiting per IP (public) and user_id (authenticated).
"""
import os
import logging
import redis.asyncio as aioredis

logger = logging.getLogger("rate_limiter")

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
RATE_LIMIT_PUBLIC = int(os.getenv("RATE_LIMIT_PUBLIC", "20"))    # per hour
RATE_LIMIT_STUDENT = int(os.getenv("RATE_LIMIT_STUDENT", "100"))  # per hour
WINDOW_SECONDS = 3600  # 1 hour

# Redis client (lazy initialized)
_redis_client: aioredis.Redis | None = None


async def _get_redis() -> aioredis.Redis | None:
    global _redis_client
    if _redis_client is None:
        try:
            _redis_client = await aioredis.from_url(REDIS_URL, decode_responses=True)
            await _redis_client.ping()
        except Exception as e:
            logger.warning(f"Redis unavailable for rate limiting: {e}. Rate limiting disabled.")
            _redis_client = None
    return _redis_client


async def check_rate_limit(identifier: str, role: str) -> tuple[bool, int, int]:
    """
    Check if the identifier has exceeded the rate limit.

    Args:
        identifier: IP address (public) or user_id (authenticated)
        role: "public", "user", or "admin"

    Returns:
        (is_allowed: bool, current_count: int, limit: int)
    """
    # Admins have no rate limit
    if role == "admin":
        return True, 0, 999999

    limit = RATE_LIMIT_PUBLIC if role == "public" else RATE_LIMIT_STUDENT
    key = f"rl:{role}:{identifier}"

    r = await _get_redis()
    if r is None:
        # No Redis → allow all (graceful degradation)
        return True, 0, limit

    try:
        current = await r.incr(key)
        if current == 1:
            # First request — set expiration
            await r.expire(key, WINDOW_SECONDS)

        remaining_ttl = await r.ttl(key)
        is_allowed = current <= limit
        return is_allowed, current, limit

    except Exception as e:
        logger.error(f"Rate limit check error: {e}")
        return True, 0, limit  # Fail open


async def get_rate_limit_headers(identifier: str, role: str) -> dict:
    """Generate rate limit response headers."""
    is_allowed, current, limit = await check_rate_limit.__wrapped__(identifier, role) \
        if hasattr(check_rate_limit, '__wrapped__') else (True, 0, limit if role != 'admin' else 999999)

    r = await _get_redis()
    ttl = WINDOW_SECONDS
    if r:
        try:
            key = f"rl:{role}:{identifier}"
            ttl = await r.ttl(key) or WINDOW_SECONDS
        except Exception:
            pass

    return {
        "X-RateLimit-Limit": str(limit),
        "X-RateLimit-Remaining": str(max(0, limit - current)),
        "X-RateLimit-Reset": str(ttl),
    }
