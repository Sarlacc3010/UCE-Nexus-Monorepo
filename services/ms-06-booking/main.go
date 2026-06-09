package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"os"
	"time"

	pb "uce-nexus/ms-06-booking/pb"

	"github.com/go-redis/redis/v8"
	amqp "github.com/rabbitmq/amqp091-go"
	"google.golang.org/grpc"
)

// Variable global para nuestro cliente de Redis
var rdb *redis.Client

// Variables globales para RabbitMQ
var mqConn *amqp.Connection
var mqChannel *amqp.Channel

const queueName = "booking_events"

type server struct {
	pb.UnimplementedBookingServiceServer
}

func (s *server) CreateBooking(ctx context.Context, req *pb.BookingRequest) (*pb.BookingResponse, error) {
	log.Printf("📥 [gRPC] Petición de reserva iniciada por el usuario: %s", req.GetUserId())

	// 1. Definimos una llave única para el Lock basada en el recurso y la fecha
	// Ejemplo: lock:Laboratorio:LAB-Cisco-01:2026-05-31
	lockKey := fmt.Sprintf("lock:%s:%s:%s", req.GetResourceType(), req.GetResourceId(), req.GetDate())

	// 2. Intentamos adquirir el Mutex Lock (SETNX - Set if Not eXists)
	// Le damos un TTL (Tiempo de vida) de 5 segundos para evitar Deadlocks si el servidor se cae
	locked, err := rdb.SetNX(ctx, lockKey, req.GetUserId(), 5*time.Second).Result()
	if err != nil {
		log.Printf("❌ Error al conectar con Redis: %v", err)
		return nil, fmt.Errorf("error interno del servidor")
	}

	// 3. Evaluamos si logramos obtener el bloqueo
	if !locked {
		log.Printf("⚠️ CONFLICTO: El recurso %s está siendo reservado por otra transacción en este momento.", req.GetResourceId())
		return &pb.BookingResponse{
			Success:   false,
			Message:   "El recurso está temporalmente bloqueado. Otro estudiante está finalizando su reserva.",
			BookingId: "",
		}, nil
	}

	log.Printf("🔒 Lock adquirido exitosamente para %s. Procesando...", req.GetResourceId())

	// 4. Simulamos el tiempo de procesamiento (escritura en base de datos, validaciones, etc.)
	time.Sleep(3 * time.Second)

	log.Printf("✅ Reserva confirmada en base de datos. Liberando Lock...")

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
		BookingID:    "BKG-777",
		UserID:       req.GetUserId(),
		ResourceType: req.GetResourceType(),
		ResourceID:   req.GetResourceId(),
		Date:         req.GetDate(),
	}

	eventBytes, err := json.Marshal(event)
	if err != nil {
		log.Printf("❌ Error al serializar evento de reserva: %v", err)
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
			log.Printf("❌ Error al publicar evento en RabbitMQ: %v", err)
		} else {
			log.Printf("📤 [RabbitMQ] Evento publicado con éxito: %s", string(eventBytes))
		}
	}
	// -----------------------------------------

	return &pb.BookingResponse{
		Success:   true,
		Message:   "¡Reserva procesada exitosamente con control de concurrencia!",
		BookingId: "BKG-777",
	}, nil
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
		log.Printf("⚠️ No se pudo conectar a RabbitMQ (intento %d/5): %v. Reintentando en 3s...", i+1, err)
		time.Sleep(3 * time.Second)
	}
	if err != nil {
		log.Fatalf("❌ Error fatal: No se pudo conectar a RabbitMQ. %v", err)
	}

	mqChannel, err = mqConn.Channel()
	if err != nil {
		log.Fatalf("❌ Error fatal: No se pudo crear el canal de RabbitMQ: %v", err)
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
		log.Fatalf("❌ Error fatal: No se pudo declarar la cola de RabbitMQ: %v", err)
	}

	log.Printf("🟢 Conexión a RabbitMQ establecida exitosamente y cola '%s' de eventos lista.", queueName)
}

func main() {
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "localhost:6379" // Respaldo para cuando corres en local sin Docker
	}

	rdb = redis.NewClient(&redis.Options{
		Addr: redisAddr,
	})

	// Verificamos que Redis responda (Ping)
	if err := rdb.Ping(context.Background()).Err(); err != nil {
		log.Fatalf("❌ Error fatal: No se pudo conectar a Redis. ¿Está corriendo el contenedor? %v", err)
	}
	log.Printf("🟢 Conexión a Redis establecida exitosamente.")

	// Inicializamos RabbitMQ
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
		log.Fatalf("❌ Fallo al abrir el puerto: %v", err)
	}

	s := grpc.NewServer()
	pb.RegisterBookingServiceServer(s, &server{})

	log.Printf("🚀 MS-06 Booking Engine encendido en el puerto 50051")

	if err := s.Serve(lis); err != nil {
		log.Fatalf("❌ Fallo al servir gRPC: %v", err)
	}
}
