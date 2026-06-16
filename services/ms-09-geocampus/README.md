# MS-09: Geocampus Service

A microservice planned to manage interactive maps, physical classroom coordinates, laboratories, and indoor telemetry data for the **UCE-Nexus** Smart-Campus portal.

> [!NOTE]  
> **Status**: **Skeleton / Placeholder**  
> This directory is currently a placeholder for the campus mapping and geolocation features.

## 🏗️ Architectural Role

This service coordinates all geolocation and spatial activities of the Smart-Campus:
1. **Interactive Campus Map**: Manages GPS coordinates, floor plans, and directions for university buildings (FICA, laboratories, administration).
2. **Laboratory Occupancy & Telemetry**: Collects active sensor feeds or WiFi connection stats to track physical room occupancy rates in real-time.
3. **Smart Scheduling Integration**: Syncs with scheduling tools to display visually where a class or laboratory booking is located on the university campus.

---

## 🛠️ Intended Tech Stack

- **Planned Language**: Node.js (Express/NestJS) or Python
- **Database Backend**: PostgreSQL with **PostGIS** extension (for spatial queries)
- **Protocol**: REST API / WebSockets (for active telemetry streams)
