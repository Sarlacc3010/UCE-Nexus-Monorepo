"""
JWT Authentication Middleware — Validates Keycloak tokens and extracts user role.

Roles:
  - "public"  → No token provided (or invalid)
  - "user"    → Valid token with 'user' role
  - "admin"   → Valid token with 'admin' role
"""
import os
import logging
import httpx
from functools import lru_cache

from fastapi import Request
import jwt
from jwt import PyJWK, PyJWTError

logger = logging.getLogger("auth")

KEYCLOAK_JWKS_URI = os.getenv(
    "KEYCLOAK_JWKS_URI",
    "http://localhost:8080/realms/UCE-Nexus/protocol/openid-connect/certs"
)


@lru_cache(maxsize=1)
def _get_cached_jwks() -> dict:
    """Fetch JWKS from Keycloak (cached for the process lifetime)."""
    import requests
    try:
        response = requests.get(KEYCLOAK_JWKS_URI, timeout=5)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.warning(f"Could not fetch JWKS from Keycloak: {e}")
        return {"keys": []}


class AuthContext:
    """Holds the authentication context for a request."""

    def __init__(self, role: str, user_id: str, username: str, token: str):
        self.role = role          # "public", "user", "admin"
        self.user_id = user_id
        self.username = username
        self.token = token
        self.is_authenticated = role in ("user", "admin")
        self.is_admin = role == "admin"

    def __repr__(self):
        return f"AuthContext(role={self.role}, user_id={self.user_id})"


def extract_auth_context(authorization: str | None) -> AuthContext:
    """
    Validates the Bearer token from the Authorization header.
    Returns an AuthContext with the appropriate role.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return AuthContext(role="public", user_id="", username="", token="")

    token = authorization.split(" ", 1)[1]

    try:
        # Decode header to get kid
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")

        # Find matching key in JWKS
        jwks = _get_cached_jwks()
        matching_key = next(
            (k for k in jwks.get("keys", []) if k.get("kid") == kid),
            None
        )

        if not matching_key:
            # JWKS might be stale — clear cache and retry once
            _get_cached_jwks.cache_clear()
            jwks = _get_cached_jwks()
            matching_key = next(
                (k for k in jwks.get("keys", []) if k.get("kid") == kid),
                None
            )

        if not matching_key:
            logger.warning("No matching JWK found for token kid")
            return AuthContext(role="public", user_id="", username="", token="")

        # Verify and decode
        jwk_obj = PyJWK(matching_key)
        public_key = jwk_obj.key
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            options={"verify_aud": False},  # Keycloak may not set aud
        )

        user_id = payload.get("sub", "")
        username = payload.get("preferred_username", payload.get("email", ""))
        realm_roles = payload.get("realm_access", {}).get("roles", [])

        # Determine role (admin > user > public)
        if "admin" in realm_roles:
            role = "admin"
        elif "user" in realm_roles:
            role = "user"
        else:
            role = "public"  # Valid token but no recognized role

        logger.info(f"Authenticated: {username} (role={role})")
        return AuthContext(role=role, user_id=user_id, username=username, token=token)

    except PyJWTError as e:
        logger.warning(f"JWT validation failed: {e}")
        return AuthContext(role="public", user_id="", username="", token="")
    except Exception as e:
        logger.error(f"Unexpected auth error: {e}")
        return AuthContext(role="public", user_id="", username="", token="")
