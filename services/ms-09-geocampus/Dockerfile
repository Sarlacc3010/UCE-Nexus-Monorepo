FROM rust:slim AS builder

WORKDIR /usr/src/app
COPY Cargo.toml Cargo.lock ./

# Pre-build deps for cache
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
RUN rm -rf src

# Build the real app
COPY src src
COPY campus_graph.json campus_graph.json
RUN touch src/main.rs && cargo build --release

# ─── Runtime: mismo GLIBC que el builder ─────────────────────────────────────
# Usamos rust:slim como base para que glibc sea exactamente el mismo.
# El binario es pequeño (~10MB) y no trae el compilador (lo dejamos como layer).
FROM rust:slim AS runner

RUN apt-get update \
    && apt-get install -y --no-install-recommends libssl3 ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /usr/src/app/target/release/ms-09-geocampus /usr/local/bin/ms-09-geocampus
COPY campus_graph.json campus_graph.json

EXPOSE 8009
CMD ["ms-09-geocampus"]
