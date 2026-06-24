use serde::{Deserialize, Serialize};
use std::collections::{HashMap, BinaryHeap};
use std::cmp::Ordering;
use std::fs;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct NodeInfo {
    pub lat: f64,
    pub lng: f64,
    pub name: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Edge {
    pub from: String,
    pub to: String,
    pub weight: u32,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CampusGraphData {
    pub nodes: HashMap<String, NodeInfo>,
    pub edges: Vec<Edge>,
}

#[derive(Copy, Clone, Eq, PartialEq)]
struct State {
    cost: u32,
    position: usize,
}

impl Ord for State {
    fn cmp(&self, other: &Self) -> Ordering {
        other.cost.cmp(&self.cost).then_with(|| self.position.cmp(&other.position))
    }
}

impl PartialOrd for State {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

pub struct CampusGraph {
    pub data: CampusGraphData,
    adj_list: HashMap<String, Vec<(String, u32)>>,
}

impl CampusGraph {
    pub fn new(data: CampusGraphData) -> Self {
        let mut adj_list: HashMap<String, Vec<(String, u32)>> = HashMap::new();
        for edge in &data.edges {
            adj_list.entry(edge.from.clone()).or_insert_with(Vec::new).push((edge.to.clone(), edge.weight));
            // Undirected graph assumption:
            adj_list.entry(edge.to.clone()).or_insert_with(Vec::new).push((edge.from.clone(), edge.weight));
        }

        CampusGraph { data, adj_list }
    }

    pub fn shortest_path(&self, start: &str, goal: &str) -> Option<(u32, Vec<String>)> {
        let mut distances: HashMap<String, u32> = HashMap::new();
        let mut previous: HashMap<String, String> = HashMap::new();
        let mut heap = BinaryHeap::new();

        for node in self.data.nodes.keys() {
            distances.insert(node.clone(), u32::MAX);
        }

        *distances.get_mut(start)? = 0;
        heap.push(State { cost: 0, position: 0 }); // Note: We'll just push costs and use a parallel string tracker

        // Actually, let's use a simpler Dijkstra for string keys
        let mut pq: BinaryHeap<(std::cmp::Reverse<u32>, String)> = BinaryHeap::new();
        pq.push((std::cmp::Reverse(0), start.to_string()));

        while let Some((std::cmp::Reverse(cost), current_node)) = pq.pop() {
            if current_node == goal {
                // Reconstruct path
                let mut path = Vec::new();
                let mut curr = goal.to_string();
                while let Some(prev) = previous.get(&curr) {
                    path.push(curr.clone());
                    curr = prev.clone();
                }
                path.push(start.to_string());
                path.reverse();
                return Some((cost, path));
            }

            if cost > *distances.get(&current_node).unwrap_or(&u32::MAX) {
                continue;
            }

            if let Some(neighbors) = self.adj_list.get(&current_node) {
                for (next_node, weight) in neighbors {
                    let next_cost = cost + weight;
                    let current_best = *distances.get(next_node).unwrap_or(&u32::MAX);

                    if next_cost < current_best {
                        distances.insert(next_node.clone(), next_cost);
                        previous.insert(next_node.clone(), current_node.clone());
                        pq.push((std::cmp::Reverse(next_cost), next_node.clone()));
                    }
                }
            }
        }
        None
    }
}
