# UCE-Nexus Monorepo 🚀

Sistema Integrado Universitario (SIU) basado en una arquitectura moderna de **Microservicios Políglotas** y **Micro-Frontends**.

Este proyecto ha sido diseñado con enfoque en escalabilidad, alta disponibilidad, seguridad JWT centralizada y separación de responsabilidades a través de despliegues automatizados en AWS.

## 🏗️ Arquitectura del Proyecto

El repositorio está gestionado como un monorepo utilizando **Turborepo** para orquestación eficiente de scripts y cachés locales.

### Micro-Frontends (MFE)
Desarrollados en **React.js + Vite** integrando Module Federation:
- `web-host` (Shell): Caparazón maestro del portal. Controla el layout principal (Sidebar, Header SIU) y el enrutamiento dinámico de los módulos remotos. Corre en el puerto `5000`.
- `web-academic` (Módulo Académico): Contiene el Dashboard principal de los estudiantes (Horario, Progreso, Tareas) y el sistema de Reserva de Laboratorios. Corre en el puerto `5001`.
- `web-campus` (Módulo Gateway): Contiene la vista de monitoreo del estado de los servicios e inspector del token JWT activo. Corre en el puerto `5002`.

### Microservicios (Backend)
Desarrollados en múltiples lenguajes para aprovechar las fortalezas de cada ecosistema:
- **`ms-01-gateway` (Node.js/Express):** API Edge Gateway que actúa como proxy inverso y Middleware de validación JWT (Keycloak) antes de que las peticiones toquen los servicios internos.
- **`ms-06-booking` (Go/gRPC):** Motor de reservas ultra-rápido diseñado para alto rendimiento.
- **`ms-07-notifications` (Python/FastAPI):** Servicio encargado del envío asíncrono de alertas y correos.
- **`ms-04-payment` / `ms-05-payment` (Rust):** Microservicios de catálogo y pagos orientados a lectura/escritura (patrón CQRS).

## 🌩️ Infraestructura y Despliegue (AWS)
Toda la infraestructura está declarada como código (IaC) usando **Terraform** (`infra/terraform`).

**Características Clave:**
- **Alta Disponibilidad:** Uso de `aws_autoscaling_group` y `aws_lb` (Application Load Balancer) a través de subredes públicas A y B para mitigar caídas de zona.
- **Zero-Downtime Deployments:** Políticas de ciclo de vida de Terraform configuradas en Blue/Green (`create_before_destroy = true`).
- **CI/CD Nativo sin Ansible:** No dependemos de herramientas de aprovisionamiento de terceros. Terraform inyecta un script `user_data.sh` en el arranque de las instancias EC2 para preparar el entorno Docker. Los despliegues se ejecutan directamente mediante conexiones SSH tunelizadas por un Bastion Host a través de **GitHub Actions**.

## 🚀 Cómo ejecutar localmente

1. **Instalar dependencias globales:**
   ```bash
   npm install
   ```

2. **Levantar todos los micro-frontends simultáneamente:**
   Gracias a Turborepo, puedes levantar el entorno de desarrollo completo con:
   ```bash
   npx turbo run dev
   ```

3. **Acceder a la aplicación:**
   Abre tu navegador en `http://localhost:5000`.

## 🛡️ Pruebas Unitarias
Cada microservicio mantiene sus propias suites de testing. Para ejecutar las pruebas en cascada en todo el monorepo:
```bash
npx turbo run test
```
