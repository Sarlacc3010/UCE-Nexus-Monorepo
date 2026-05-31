package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"time"

	pb "uce-nexus/ms-06-booking/pb"

	"github.com/go-redis/redis/v8"
	"google.golang.org/grpc"
)

// Variable global para nuestro cliente de Redis
var rdb *redis.Client

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

	return &pb.BookingResponse{
		Success:   true,
		Message:   "¡Reserva procesada exitosamente con control de concurrencia!",
		BookingId: "BKG-777",
	}, nil
}

func main() {
	// Inicializamos la conexión al contenedor local de Redis
	rdb = redis.NewClient(&redis.Options{
		Addr: "localhost:6379", // Puerto donde corre tu Redis en Docker
	})

	// Verificamos que Redis responda (Ping)
	if err := rdb.Ping(context.Background()).Err(); err != nil {
		log.Fatalf("❌ Error fatal: No se pudo conectar a Redis. ¿Está corriendo el contenedor? %v", err)
	}
	log.Printf("🟢 Conexión a Redis establecida exitosamente.")

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
