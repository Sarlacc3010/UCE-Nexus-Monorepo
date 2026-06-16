# MS-03: Enrollment & Academic Service

A Node.js and Express microservice written in **TypeScript** that manages student enrollments, professor assignments, subjects, semesters, and class scheduling for the **UCE-Nexus** Smart-Campus ecosystem.

## 🏗️ Architecture Role

This service serves as the core source of truth for university academic records:
1. **Academic Catalog**: Manages metadata for semesters, subjects, and class sections (parallels).
2. **Class Calendars**: Maintains weekly schedules for classes across different campus laboratories.
3. **Schedule Conflict Checking**: Provides endpoints to check for time overlaps, ensuring students cannot book laboratories that are already reserved for scheduled academic classes.
4. **Enrollment Records**: Tracks student enrollments and professor course assignments.

---

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript (`tsconfig.json` included)
- **Framework**: Express.js
- **Database Access**: PostgreSQL connection pooling via `pg` (Node-Postgres)

---

## 💾 Database Schema

The service initializes a schema in PostgreSQL (`postgres-enrollment` DB) on startup if it does not exist:

- **`semesters`**: Academic levels (e.g., Semester 1, Semester 2).
- **`subjects`**: Course curricula linked to specific semesters.
- **`parallels`**: Classroom sections for subjects, referencing a designated teacher.
- **`schedules`**: Day, start time, end time, and assigned laboratory for academic class hours.
- **`student_enrollments`**: Associates student IDs with parallels.
- **`professor_assignments`**: Associates professor IDs with subjects.

---

## 🔌 API Endpoints

All endpoints are hosted relative to `/api` (or proxied via `/api/academic` on the Gateway):

* **`GET /health`**: Returns connection and database status.
* **`GET /api/semesters`**: Fetches all academic semester levels.
* **`GET /api/subjects`**: Fetches all subjects (supports filtering by `semester_id`).
* **`GET /api/parallels`**: Fetches all parallels/sections (supports filtering by `subject_id`).
* **`GET /api/schedules`**: Fetches class schedules (supports filtering by `lab_id` and `dia`).
* **`GET /api/schedules/check-conflict`**: Validates whether a proposed time slot (`lab_id`, `dia`, `hora_inicio`, `hora_fin`) overlaps with a scheduled academic class.
* **`GET /api/students/:id/enrollments`**: Retrieves all parallels a student is currently enrolled in.
* **`GET /api/professors/:id/assignments`**: Retrieves all subject assignments for a professor.

---

## ⚙️ Configuration (Environment Variables)

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | Local HTTP port for the service | `3001` |
| `NODE_ENV` | Environment identifier | `development` |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://enrollment_user:password@postgres-enrollment:5432/uce_enrollment_dev` |

---

## 🚀 How to Run

### Run Locally (Development)
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server (runs with database auto-initialization):
   ```bash
   npm run dev
   ```

### Run with Docker
Build the Docker image using the provided `dockerfile`:
```bash
docker build -t nexus-ms-03-enrollment .
```
