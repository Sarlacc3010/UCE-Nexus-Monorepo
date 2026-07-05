"""
JWT Authentication Middleware — Validates local tokens and extracts user role.

Roles:
  - "public"  → No token provided (or invalid)
  - "user"    → Valid token with 'user' role
  - "admin"   → Valid token with 'admin' role
"""
import os
import logging
from fastapi import Request
import jwt
from jwt import PyJWTError

logger = logging.getLogger("auth")

JWT_SECRET = os.getenv("JWT_SECRET", "supersecrettokenkey123!")


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
    Validates the Bearer token from the Authorization header using JWT_SECRET.
    Returns an AuthContext with the appropriate role.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return AuthContext(role="public", user_id="", username="", token="")

    token = authorization.split(" ", 1)[1]

    try:
        # Verify and decode local HS256 JWT
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )

        user_id = payload.get("sub", "")
        username = payload.get("username", payload.get("email", ""))
        user_roles = payload.get("roles", [])

        # Determine role (admin > user > public)
        if "admin" in user_roles:
            role = "admin"
        elif "user" in user_roles:
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
