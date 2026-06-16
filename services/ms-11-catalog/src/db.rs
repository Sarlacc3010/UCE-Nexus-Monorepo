use sqlx::postgres::PgPoolOptions;
use sqlx::{Pool, Postgres};
use std::env;

#[derive(Clone)]
pub struct Db {
    pub pool: Pool<Postgres>,
}

impl Db {
    pub async fn connect() -> Result<Self, sqlx::Error> {
        let database_url = env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgres://catalog_user:catalog_password@postgres-catalog:5432/uce_catalog_dev".to_string());
        
        println!("🟢 Connecting to database: {}", database_url);
        
        let pool = PgPoolOptions::new()
            .max_connections(5)
            .connect(&database_url)
            .await?;
            
        Ok(Self { pool })
    }

    pub async fn init_db(&self) -> Result<(), sqlx::Error> {
        // Create table for laboratory infrastructure
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS laboratories (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                code VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(100) NOT NULL,
                location VARCHAR(150) NOT NULL,
                capacity INT NOT NULL,
                equipment TEXT[] NOT NULL,
                is_active BOOLEAN DEFAULT TRUE
            );
            "#
        )
        .execute(&self.pool)
        .await?;

        // Seed initial laboratories if table is empty
        let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM laboratories")
            .fetch_one(&self.pool)
            .await?;

        if count.0 == 0 {
            println!("🌱 Seeding default university laboratory data...");
            sqlx::query(
                r#"
                INSERT INTO laboratories (code, name, location, capacity, equipment, is_active)
                VALUES 
                ('LAB-Cisco-01', 'Laboratorio de Cisco & Redes', 'Bloque B, Piso 3, Aula 302', 30, ARRAY['Routers Cisco 2911', 'Switches Catalyst 2960', 'Servidor Rack TFTP'], true),
                ('LAB-Comp-02', 'Laboratorio de Cómputo General', 'Bloque A, Piso 1, Aula 105', 40, ARRAY['PCs Intel i7', 'Proyector EPSON', 'Pizarra Interactiva'], true),
                ('AUD-Principal', 'Auditorio General', 'Edificio Central, Piso 1', 150, ARRAY['Sistema de Audio Surround', 'Proyector Láser 4K', 'Micrófonos Inalámbricos'], true),
                ('LAB-Comp-01', 'Laboratorio de Computación 1', 'Edificio de Laboratorios FICA, Piso 3', 45, ARRAY['PCs Intel Core i5', 'Proyector', 'Pizarra'], true),
                ('LAB-Comp-03', 'Laboratorio de Computación 3', 'Edificio de Laboratorios FICA, Piso 3', 35, ARRAY['PCs Intel Core i5', 'Proyector'], true),
                ('LAB-Comp-04', 'Laboratorio de Computación 4', 'Edificio de Laboratorios FICA, Piso 3', 50, ARRAY['PCs Intel Core i7', 'Proyector'], true),
                ('LAB-Comp-05', 'Laboratorio de Computación 5', 'Edificio de Laboratorios FICA, Piso 3', 30, ARRAY['PCs Intel Core i5', 'Proyector'], true),
                ('LAB-Comp-06', 'Laboratorio de Computación 6', 'Edificio de Laboratorios FICA, Piso 3', 55, ARRAY['PCs Intel Core i7', 'Proyector'], true),
                ('LAB-Comp-07', 'Laboratorio de Computación 7', 'Edificio de Laboratorios FICA, Piso 3', 60, ARRAY['PCs Intel Core i7', 'Proyector'], true),
                ('LAB-Comp-08', 'Laboratorio de Computación 8', 'Edificio de Laboratorios FICA, Piso 3', 45, ARRAY['PCs Intel Core i5', 'Proyector'], true),
                ('LAB-Redes', 'Laboratorio de Redes', 'Edificio de Laboratorios FICA, Piso 3', 40, ARRAY['Cisco Routers', 'Switches Catalyst', 'Servidores rack'], true),
                ('LAB-Civil-02', 'Laboratorio de Civil 2', 'Edificio de Laboratorios FICA, Piso 2', 40, ARRAY['Estaciones de Trabajo CAD', 'Plotter', 'Proyector'], true);
                "#
            )
            .execute(&self.pool)
            .await?;
        }

        Ok(())
    }
}
