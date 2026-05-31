package main

import (
	"context"
	"log"
	"net"

	pb "uce-nexus/ms-06-booking/pb" // Importamos el código autogenerado del contrato

	"google.golang.org/grpc"
)

// server es la estructura que implementará los métodos de nuestro contrato gRPC
type server struct {
	pb.UnimplementedBookingServiceServer
}

// CreateBooking es la función que Node.js va a invocar remotamente
func (s *server) CreateBooking(ctx context.Context, req *pb.BookingRequest) (*pb.BookingResponse, error) {
	log.Printf("📥 [gRPC] Petición recibida:")
	log.Printf("👤 Usuario ID: %s", req.GetUserId())
	log.Printf("🏢 Recurso: %s (ID: %s)", req.GetResourceType(), req.GetResourceId())
	log.Printf("📅 Fecha: %s", req.GetDate())

	// TODO: Aquí implementaremos la conexión a Redis para el Mutex Lock (Bloqueo de Concurrencia)
	// Por ahora, simulamos que la reserva fue exitosa

	return &pb.BookingResponse{
		Success:   true,
		Message:   "¡Reserva confirmada exitosamente desde el motor en Go!",
		BookingId: "BKG-777",
	}, nil
}

func main() {
	// 1. Abrimos el puerto 50051 (puerto estándar para gRPC)
	lis, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatalf("❌ Fallo al abrir el puerto: %v", err)
	}

	// 2. Creamos un nuevo servidor gRPC
	s := grpc.NewServer()

	// 3. Registramos nuestro servicio de reservas en el servidor
	pb.RegisterBookingServiceServer(s, &server{})

	log.Printf("🚀 MS-06 Booking Engine (Go) encendido y escuchando en el puerto 50051")

	// 4. Iniciamos el servidor
	if err := s.Serve(lis); err != nil {
		log.Fatalf("❌ Fallo al servir gRPC: %v", err)
	}
}
