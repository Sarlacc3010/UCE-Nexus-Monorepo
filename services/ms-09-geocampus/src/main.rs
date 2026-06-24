mod graph;
mod db;

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State, Query,
    },
    routing::get,
    Router,
    response::Json,
};
use futures::{sink::SinkExt, stream::StreamExt};
use rumqttc::{AsyncClient, MqttOptions, QoS};
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, sync::Arc};
use tokio::sync::{broadcast, Mutex};
use tower_http::cors::CorsLayer;
use crate::graph::{CampusGraph, NodeInfo};

#[derive(Clone)]
struct AppState {
    heatmap: Arc<Mutex<HashMap<String, u32>>>,
    tx: broadcast::Sender<String>,
    graph: Arc<CampusGraph>,
}

#[derive(Serialize, Deserialize, Debug)]
struct HeatmapEvent {
    ap_id: String,
    clients: u32,
}

#[derive(Deserialize)]
struct RouteQuery {
    start: String,
    end: String,
}

#[derive(Serialize)]
struct RouteResponse {
    path: Vec<String>,
    coordinates: Vec<NodeInfo>,
    distance: u32,
}

#[tokio::main]
async fn main() {
    let (tx, _rx) = broadcast::channel(100);
    
    let db_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| "postgres://geocampus_user:geocampus_password@localhost:5435/uce_geocampus_dev".to_string());
    let pool = db::init_db(&db_url).await;
    
    // Load campus graph from DB
    let graph_data = db::load_graph_from_db(&pool).await;
    let campus_graph = CampusGraph::new(graph_data);

    let state = AppState {
        heatmap: Arc::new(Mutex::new(HashMap::new())),
        tx: tx.clone(),
        graph: Arc::new(campus_graph),
    };

    let mqtt_state = state.clone();
    tokio::spawn(async move {
        run_mqtt_client(mqtt_state).await;
    });

    let app = Router::new()
        .route("/ws", get(ws_handler))
        .route("/api/route", get(route_handler))
        .route("/api/faculties", get(faculties_handler))
        .route("/api/heatmap", get(heatmap_handler))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let addr = "0.0.0.0:8009";
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    println!("GeoCampus MS-09 listening on {}", addr);
    axum::serve(listener, app).await.unwrap();
}

async fn route_handler(
    State(state): State<AppState>,
    Query(query): Query<RouteQuery>,
) -> Json<Option<RouteResponse>> {
    if let Some((distance, path)) = state.graph.shortest_path(&query.start, &query.end) {
        let mut coordinates = Vec::new();
        for node_id in &path {
            if let Some(info) = state.graph.data.nodes.get(node_id) {
                coordinates.push(info.clone());
            }
        }
        Json(Some(RouteResponse { path, coordinates, distance }))
    } else {
        Json(None)
    }
}

async fn faculties_handler(State(state): State<AppState>) -> Json<HashMap<String, NodeInfo>> {
    Json(state.graph.data.nodes.clone())
}

async fn heatmap_handler(State(state): State<AppState>) -> Json<HashMap<String, u32>> {
    let map = state.heatmap.lock().await;
    Json(map.clone())
}

async fn run_mqtt_client(state: AppState) {
    let mqtt_host = std::env::var("MQTT_HOST").unwrap_or_else(|_| "localhost".to_string());
    let mqtt_port = std::env::var("MQTT_PORT").unwrap_or_else(|_| "1883".to_string()).parse().unwrap_or(1883);

    let mut mqttoptions = MqttOptions::new("geocampus_service", mqtt_host, mqtt_port);
    mqttoptions.set_keep_alive(std::time::Duration::from_secs(5));

    let (client, mut eventloop) = AsyncClient::new(mqttoptions, 10);
    client.subscribe("campus/heatmap", QoS::AtMostOnce).await.unwrap();
    println!("Subscribed to MQTT topic: campus/heatmap");

    loop {
        if let Ok(notification) = eventloop.poll().await {
            if let rumqttc::Event::Incoming(rumqttc::Packet::Publish(publish)) = notification {
                if let Ok(event) = serde_json::from_slice::<HeatmapEvent>(&publish.payload) {
                    let mut map = state.heatmap.lock().await;
                    map.insert(event.ap_id.clone(), event.clients);
                    let json = serde_json::to_string(&*map).unwrap();
                    let _ = state.tx.send(json);
                }
            }
        }
    }
}

async fn ws_handler(ws: WebSocketUpgrade, State(state): State<AppState>) -> axum::response::Response {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: AppState) {
    let (mut sender, mut _receiver) = socket.split();
    let mut rx = state.tx.subscribe();

    let initial_map = state.heatmap.lock().await;
    let initial_json = serde_json::to_string(&*initial_map).unwrap();
    if sender.send(Message::Text(initial_json.into())).await.is_err() { return; }
    drop(initial_map);

    while let Ok(msg) = rx.recv().await {
        if sender.send(Message::Text(msg.into())).await.is_err() { break; }
    }
}
