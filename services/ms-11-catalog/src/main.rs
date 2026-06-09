use tonic::{transport::Server, Request, Response, Status};
use std::env;

pub mod db;

// Incluir el código gRPC autogenerado
pub mod catalog {
    tonic::include_proto!("catalog");
}

use catalog::catalog_service_server::{CatalogService, CatalogServiceServer};
use catalog::{
    AvailabilityResponse, CheckAvailabilityRequest, LaboratoryResponse, GetLaboratoryRequest,
};
use db::Db;

pub struct MyCatalogService {
    db: Db,
}

#[tonic::async_trait]
impl CatalogService for MyCatalogService {
    async fn get_laboratory(
        &self,
        request: Request<GetLaboratoryRequest>,
    ) -> Result<Response<LaboratoryResponse>, Status> {
        let req = request.into_inner();
        println!("📥 [gRPC GetLaboratory] Código recibido: {}", req.code);

        let row: Result<(String, String, String, String, i32, Vec<String>, bool), sqlx::Error> = sqlx::query_as(
            r#"
            SELECT id::text, code, name, location, capacity, equipment, is_active 
            FROM laboratories 
            WHERE code = $1
            "#
        )
        .bind(&req.code)
        .fetch_one(&self.db.pool)
        .await;

        match row {
            Ok((id, code, name, location, capacity, equipment, is_active)) => {
                Ok(Response::new(LaboratoryResponse {
                    id,
                    code,
                    name,
                    location,
                    capacity,
                    equipment,
                    is_active,
                }))
            }
            Err(sqlx::Error::RowNotFound) => {
                Err(Status::not_found(format!("Laboratorio '{}' no encontrado", req.code)))
            }
            Err(e) => {
                eprintln!("❌ Error de base de datos: {:?}", e);
                Err(Status::internal("Error interno de base de datos"))
            }
        }
    }

    async fn check_availability(
        &self,
        request: Request<CheckAvailabilityRequest>,
    ) -> Result<Response<AvailabilityResponse>, Status> {
        let req = request.into_inner();
        println!("📥 [gRPC CheckAvailability] Código: {}, Fecha: {}", req.code, req.date);

        let row: Result<(bool,), sqlx::Error> = sqlx::query_as(
            "SELECT is_active FROM laboratories WHERE code = $1"
        )
        .bind(&req.code)
        .fetch_one(&self.db.pool)
        .await;

        match row {
            Ok((is_active,)) => {
                if !is_active {
                    return Ok(Response::new(AvailabilityResponse {
                        code: req.code,
                        date: req.date,
                        is_available: false,
                        message: "El laboratorio está inactivo.".to_string(),
                    }));
                }

                // Simulación inicial de disponibilidad
                Ok(Response::new(AvailabilityResponse {
                    code: req.code,
                    date: req.date,
                    is_available: true,
                    message: "Disponible para reservas".to_string(),
                }))
            }
            Err(sqlx::Error::RowNotFound) => {
                Err(Status::not_found(format!("Laboratorio '{}' no encontrado", req.code)))
            }
            Err(e) => {
                eprintln!("❌ Error de base de datos: {:?}", e);
                Err(Status::internal("Error interno de base de datos"))
            }
        }
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();

    // Intentamos conectar y migrar la base de datos
    let db = Db::connect().await?;
    if let Err(e) = db.init_db().await {
        eprintln!("⚠️ No se pudo inicializar la base de datos: {:?}", e);
    } else {
        println!("🟢 Base de datos inicializada y poblada.");
    }

    let port = env::var("PORT").unwrap_or_else(|_| "50052".to_string());
    let addr = format!("0.0.0.0:{}", port).parse()?;
    
    println!("🚀 MS-11 Catalog encendido en el puerto gRPC: {}", port);

    let service = MyCatalogService { db };

    Server::builder()
        .add_service(CatalogServiceServer::new(service))
        .serve(addr)
        .await?;

    Ok(())
}
