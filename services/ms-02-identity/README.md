# MS-02: Identity & Access Management (IAM) Service

A microservice planned to host custom extensions, authentication flows, theme templates, and helper utilities for **Keycloak**, the centralized IAM provider of the **UCE-Nexus** Smart-Campus portal.

> [!NOTE]  
> **Status**: **Skeleton / Placeholder**  
> This directory is currently a placeholder for future IAM customization assets.

## 🏗️ Architectural Role

In the UCE-Nexus architecture, identity validation is federated:
1. **Single Sign-On (SSO)**: Provides unified login for students, teachers, and administrators.
2. **Access Control**: Issues JWT tokens signed via RS256 that contain user details and role profiles (realms).
3. **BFF Integration**: Validated on the client-side, and proxies auth requests through the gateway (`ms-01-gateway`).

---

## 🛠️ Intended Tech Stack

- **Core Engine**: Keycloak (Docker image `quay.io/keycloak/keycloak`)
- **Database Backend**: PostgreSQL (`postgres-iam` database)
- **Integration Protocols**: OpenID Connect (OIDC), OAuth2, SAML 2.0
- **Token Format**: JSON Web Tokens (JWT)
