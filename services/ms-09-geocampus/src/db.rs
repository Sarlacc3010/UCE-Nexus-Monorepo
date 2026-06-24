use sqlx::{postgres::PgPoolOptions, Pool, Postgres};
use std::fs;
use crate::graph::{CampusGraphData, Edge, NodeInfo};

pub async fn init_db(database_url: &str) -> Pool<Postgres> {
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(database_url)
        .await
        .expect("Failed to connect to Postgres");

    // Create tables if they don't exist
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS nodes (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            lat DOUBLE PRECISION NOT NULL,
            lng DOUBLE PRECISION NOT NULL
        );
        "#
    )
    .execute(&pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS edges (
            id SERIAL PRIMARY KEY,
            source VARCHAR(50) NOT NULL REFERENCES nodes(id),
            target VARCHAR(50) NOT NULL REFERENCES nodes(id),
            weight INTEGER NOT NULL
        );
        "#
    )
    .execute(&pool)
    .await
    .unwrap();

    // Check if empty to seed
    let count: (i64,) = sqlx::query_as("SELECT count(*) FROM nodes")
        .fetch_one(&pool)
        .await
        .unwrap();

    if count.0 == 0 {
        println!("Seeding database from campus_graph.json...");
        seed_db(&pool).await;
    }

    pool
}

async fn seed_db(pool: &Pool<Postgres>) {
    let content = fs::read_to_string("campus_graph.json").expect("Could not read graph json");
    let data: CampusGraphData = serde_json::from_str(&content).unwrap();

    for (id, node) in data.nodes {
        sqlx::query("INSERT INTO nodes (id, name, lat, lng) VALUES ($1, $2, $3, $4)")
            .bind(&id)
            .bind(&node.name)
            .bind(node.lat)
            .bind(node.lng)
            .execute(pool)
            .await
            .unwrap();
    }

    for edge in data.edges {
        sqlx::query("INSERT INTO edges (source, target, weight) VALUES ($1, $2, $3)")
            .bind(&edge.from)
            .bind(&edge.to)
            .bind(edge.weight as i32)
            .execute(pool)
            .await
            .unwrap();
    }
    println!("Seeding completed.");
}

pub async fn load_graph_from_db(pool: &Pool<Postgres>) -> CampusGraphData {
    use sqlx::Row;
    let mut data = CampusGraphData {
        nodes: std::collections::HashMap::new(),
        edges: Vec::new(),
    };

    let nodes = sqlx::query("SELECT id, name, lat, lng FROM nodes")
        .fetch_all(pool)
        .await
        .unwrap();

    for record in nodes {
        let id: String = record.get("id");
        data.nodes.insert(
            id,
            NodeInfo {
                name: record.get("name"),
                lat: record.get("lat"),
                lng: record.get("lng"),
            },
        );
    }

    let edges = sqlx::query("SELECT source, target, weight FROM edges")
        .fetch_all(pool)
        .await
        .unwrap();

    for record in edges {
        let source: String = record.get("source");
        let target: String = record.get("target");
        let weight: i32 = record.get("weight");
        data.edges.push(Edge {
            from: source,
            to: target,
            weight: weight as u32,
        });
    }

    data
}
