package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log/slog"
	"net"
	"os"
	"time"

	pb "uce-nexus/ms-06-booking/pb"

	"github.com/go-redis/redis/v8"
	_ "github.com/lib/pq"
	amqp "github.com/rabbitmq/amqp091-go"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
)

// Variable global para nuestro cliente de Redis
var rdb *redis.Client
var db *sql.DB

// Variables globales para RabbitMQ
var mqConn *amqp.Connection
var mqChannel *amqp.Channel

const queueName = "booking_events"

type server struct {
	pb.UnimplementedBookingServiceServer
}

func (s *server) CreateBooking(ctx context.Context, req *pb.BookingRequest) (*pb.BookingResponse, error) {
	slog.Info("[gRPC] Petición de reserva iniciada", "user_id", req.GetUserId())

	// 1. Definimos una llave única para el Lock basada en el recurso y la fecha
	// Ejemplo: lock:Laboratorio:LAB-Cisco-01:2026-05-31
	lockKey := fmt.Sprintf("lock:%s:%s:%s", req.GetResourceType(), req.GetResourceId(), req.GetDate())

	// 2. Intentamos adquirir el Mutex Lock (SETNX - Set if Not eXists)
	// Le damos un TTL (Tiempo de vida) de 5 segundos para evitar Deadlocks si el servidor se cae
	locked, err := rdb.SetNX(ctx, lockKey, req.GetUserId(), 5*time.Second).Result()
	if err != nil {
		slog.Error("Error al conectar con Redis", "error", err)
		return nil, fmt.Errorf("error interno del servidor")
	}

	// 3. Evaluamos si logramos obtener el bloqueo
	if !locked {
		slog.Warn("CONFLICTO: El recurso está siendo reservado", "resource_id", req.GetResourceId())
		return &pb.BookingResponse{
			Success:   false,
			Message:   "El recurso está temporalmente bloqueado. Otro estudiante está finalizando su reserva.",
			BookingId: "",
		}, nil
	}

	slog.Info("Lock adquirido exitosamente", "resource_id", req.GetResourceId())

	var bookingID int
	query := `
		INSERT INTO reservations (user_id, resource_type, resource_id, start_date, end_time, subject_id, reason, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id
	`
	err = db.QueryRowContext(ctx, query, 
		req.GetUserId(), 
		req.GetResourceType(), 
		req.GetResourceId(), 
		req.GetDate(), 
		req.GetEndTime(), 
		req.GetSubjectId(), 
		req.GetReason(), 
		"CONFIRMED",
	).Scan(&bookingID)

	if err != nil {
		slog.Error("Error al guardar reserva en BD", "error", err)
		rdb.Del(ctx, lockKey)
		return nil, fmt.Errorf("error al procesar reserva")
	}

	generatedBookingID := fmt.Sprintf("BKG-%d", bookingID)
	slog.Info("Reserva confirmada en base de datos. Liberando Lock...", "booking_id", generatedBookingID)

	// 5. Liberamos el Lock para que otros puedan usar el recurso
	rdb.Del(ctx, lockKey)

	// --- PUBLICACIÓN DE EVENTO EN RABBITMQ ---
	type BookingEvent struct {
		BookingID    string `json:"booking_id"`
		UserID       string `json:"user_id"`
		ResourceType string `json:"resource_type"`
		ResourceID   string `json:"resource_id"`
		Date         string `json:"date"`
	}

	event := BookingEvent{
		BookingID:    generatedBookingID,
		UserID:       req.GetUserId(),
		ResourceType: req.GetResourceType(),
		ResourceID:   req.GetResourceId(),
		Date:         req.GetDate(),
	}

	eventBytes, err := json.Marshal(event)
	if err != nil {
		slog.Error("Error al serializar evento de reserva", "error", err)
	} else {
		err = mqChannel.PublishWithContext(
			ctx,
			"",        // exchange
			queueName, // routing key
			false,     // mandatory
			false,     // immediate
			amqp.Publishing{
				ContentType: "application/json",
				Body:        eventBytes,
			},
		)
		if err != nil {
			slog.Error("Error al publicar evento en RabbitMQ", "error", err)
		} else {
			slog.Info("[RabbitMQ] Evento publicado con éxito", "event", string(eventBytes))
		}
	}
	// -----------------------------------------

	return &pb.BookingResponse{
		Success:   true,
		Message:   "¡Reserva procesada exitosamente con control de concurrencia y persistencia!",
		BookingId: generatedBookingID,
	}, nil
}

func initDB() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://booking_user:booking_password@localhost:5435/uce_booking_dev?sslmode=disable"
	}
	var err error
	for i := 0; i < 5; i++ {
		db, err = sql.Open("postgres", dbURL)
		if err == nil {
			err = db.Ping()
			if err == nil {
				break
			}
		}
		slog.Warn("No se pudo conectar a PostgreSQL", "intento", i+1, "error", err)
		time.Sleep(3 * time.Second)
	}
	if err != nil {
		slog.Error("Error fatal: No se pudo conectar a PostgreSQL", "error", err)
		os.Exit(1)
	}

	createTableQuery := `
	CREATE TABLE IF NOT EXISTS reservations (
		id SERIAL PRIMARY KEY,
		user_id VARCHAR(100) NOT NULL,
		resource_type VARCHAR(50) NOT NULL,
		resource_id VARCHAR(50) NOT NULL,
		start_date VARCHAR(50) NOT NULL,
		end_time VARCHAR(50),
		subject_id VARCHAR(50),
		reason TEXT,
		status VARCHAR(20) DEFAULT 'PENDING',
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`
	_, err = db.Exec(createTableQuery)
	if err != nil {
		slog.Error("Error al crear tabla reservations", "error", err)
		os.Exit(1)
	}
	slog.Info("Conexión a PostgreSQL establecida y tabla verificada")
}

func initRabbitMQ() {
	mqURI := os.Getenv("RABBITMQ_URI")
	if mqURI == "" {
		mqURI = "amqp://guest:guest@localhost:5672/"
	}

	var err error
	for i := 0; i < 5; i++ {
		mqConn, err = amqp.Dial(mqURI)
		if err == nil {
			break
		}
		slog.Warn("No se pudo conectar a RabbitMQ", "intento", i+1, "error", err)
		time.Sleep(3 * time.Second)
	}
	if err != nil {
		slog.Error("Error fatal: No se pudo conectar a RabbitMQ", "error", err)
		os.Exit(1)
	}

	mqChannel, err = mqConn.Channel()
	if err != nil {
		slog.Error("Error fatal: No se pudo crear el canal de RabbitMQ", "error", err)
		os.Exit(1)
	}

	_, err = mqChannel.QueueDeclare(
		queueName, // name
		true,      // durable
		false,     // delete when unused
		false,     // exclusive
		false,     // no-wait
		nil,       // arguments
	)
	if err != nil {
		slog.Error("Error fatal: No se pudo declarar la cola de RabbitMQ", "error", err)
		os.Exit(1)
	}

	slog.Info("Conexión a RabbitMQ establecida exitosamente y cola de eventos lista", "queue", queueName)
}

func main() {
	// Configure slog to output JSON
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "localhost:6379" // Respaldo para cuando corres en local sin Docker
	}

	rdb = redis.NewClient(&redis.Options{
		Addr: redisAddr,
	})

	// Verificamos que Redis responda (Ping)
	if err := rdb.Ping(context.Background()).Err(); err != nil {
		slog.Error("Error fatal: No se pudo conectar a Redis", "error", err)
		os.Exit(1)
	}
	slog.Info("Conexión a Redis establecida exitosamente")

	// Inicializamos Base de Datos y RabbitMQ
	initDB()
	initRabbitMQ()
	defer func() {
		if mqChannel != nil {
			mqChannel.Close()
		}
		if mqConn != nil {
			mqConn.Close()
		}
	}()

	lis, err := net.Listen("tcp", ":50051")
	if err != nil {
		slog.Error("Fallo al abrir el puerto", "error", err)
		os.Exit(1)
	}

	slog.Info("🚀 MS-06 Booking Engine encendido", "port", 50051)

	s := grpc.NewServer()
	pb.RegisterBookingServiceServer(s, &server{})
	
	// Habilitar gRPC Reflection
	reflection.Register(s)

	if err := s.Serve(lis); err != nil {
		slog.Error("Fallo al servir gRPC", "error", err)
		os.Exit(1)
	}
}
