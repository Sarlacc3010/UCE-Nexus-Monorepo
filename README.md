# UCE-Nexus Monorepo 🚀

Integrated University System (SIU) based on a modern **Polyglot Microservices** and **Micro-Frontends** architecture.

This project has been designed with a focus on scalability, high availability, centralized JWT security, and separation of concerns through automated deployments on AWS.

## 🏗️ Project Architecture

The repository is managed as a monorepo using **Turborepo** for efficient script orchestration and local caching.

### Micro-Frontends (MFE)
Developed in **React.js + Vite** integrating Module Federation:
- `web-host` (Shell): Master shell of the portal. Controls the main layout (Sidebar, SIU Header) and dynamic routing of remote modules. Runs on port `5000`.
- `web-academic` (Academic Module): Contains the main student Dashboard (Schedule, Progress, Tasks) and the Laboratory Booking system. Runs on port `5001`.
- `web-campus` (Gateway Module): Contains the service health monitoring view and active JWT token inspector. Runs on port `5002`.

### Microservices (Backend)
Developed in multiple languages to leverage the strengths of each ecosystem:
- **`ms-01-gateway` (Node.js/Express):** API Edge Gateway acting as a reverse proxy and JWT validation Middleware (Keycloak) before requests reach internal services.
- **`ms-06-booking` (Go/gRPC):** Ultra-fast booking engine designed for high performance.
- **`ms-07-notifications` (Python/FastAPI):** Service responsible for asynchronous alerts and email delivery.
- **`ms-04-payment` / `ms-05-payment` (Rust):** Catalog and payment microservices oriented towards read/write operations (CQRS pattern).

## 🌩️ Infrastructure & Deployment (AWS)
All infrastructure is declared as code (IaC) using **Terraform** (`infra/terraform`).

**Key Features:**
- **High Availability:** Use of `aws_autoscaling_group` and `aws_lb` (Application Load Balancer) across public subnets A and B to mitigate availability zone failures.
- **Zero-Downtime Deployments:** Terraform lifecycle policies configured for Blue/Green deployments (`create_before_destroy = true`).
- **Native CI/CD without Ansible:** We do not rely on third-party provisioning tools. Terraform injects a `user_data.sh` script during EC2 instance startup to prepare the Docker environment. Deployments are executed directly via SSH connections tunneled through a Bastion Host using **GitHub Actions**.

## 🚀 How to Run Locally

1. **Install global dependencies:**
   ```bash
   npm install
   ```

2. **Start all micro-frontends simultaneously:**
   Thanks to Turborepo, you can spin up the entire development environment with:
   ```bash
   npx turbo run dev
   ```

3. **Access the application:**
   Open your browser at `http://localhost:5000`.

## 🛡️ Unit Testing
Each microservice maintains its own testing suites. To cascade tests across the entire monorepo:
```bash
npx turbo run test
```
