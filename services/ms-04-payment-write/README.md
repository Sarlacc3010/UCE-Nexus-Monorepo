# MS-04: Payment Write Service (CQRS - Command)

A microservice planned to handle transaction execution and write requests for university payments in the **UCE-Nexus** Smart-Campus portal.

> [!NOTE]  
> **Status**: **Skeleton / Placeholder**  
> This directory is currently a placeholder for the payment execution component of the CQRS (Command Query Responsibility Segregation) pattern.

## 🏗️ Architectural Role

This service represents the **Command** side of the CQRS pattern for financial transactions:
1. **Transaction Ingestion**: Processes payment intents, fee payments, and semester registration fees.
2. **Gateway Integration**: Interfaces with external payment gateways (e.g. Stripe, PayPal, local bank APIs).
3. **Event Sourcing**: Publishes transaction success/failure events to an event broker (e.g., Kafka) to synchronize read replicas and audit logs.
4. **Data Durability**: Writes transaction logs and commands directly to the payment database.

---

## 🛠️ Intended Tech Stack

- **Planned Language**: Rust (for high reliability) or Go
- **Event Broker**: Apache Kafka
- **Database Backend**: PostgreSQL (Write DB)
- **External Integration**: Payment Gateway SDKs / APIs
