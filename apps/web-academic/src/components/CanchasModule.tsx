import { useState } from 'react';
import { 
  Activity, 
  MapPin, 
  CheckCircle, 
  CreditCard,
  Send,
  Loader2
} from 'lucide-react';

interface Cancha {
  id: number;
  name: string;
  location: string;
  price: number;
  description: string;
  image: string;
}

interface CanchasModuleProps {
  token: string;
}

const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3000';

const CANCHAS_DATA: Cancha[] = [
  {
    id: 1,
    name: 'Cancha de Fútbol (Césped Sintético)',
    location: 'Campus Norte - Detrás de la Facultad de Ingeniería',
    price: 15.00,
    description: 'Cancha reglamentaria con iluminación nocturna LED de alta potencia. Césped sintético de grado profesional certificado.',
    image: 'https://images.unsplash.com/photo-1556125088-fd6e35eedee1?q=80&w=350&auto=format&fit=crop'
  },
  {
    id: 2,
    name: 'Cancha de Baloncesto Coliseo',
    location: 'Coliseo Universitario - Planta Baja',
    price: 8.00,
    description: 'Piso de parquet pulido profesional, canastas retráctiles y marcador electrónico. Ideal para partidos recreativos y ligas internas.',
    image: 'https://images.unsplash.com/photo-1544698310-74ea9d1c8258?q=80&w=350&auto=format&fit=crop'
  },
  {
    id: 3,
    name: 'Cancha de Tenis Arcilla',
    location: 'Complejo Deportivo Sur - Junto a las Piscinas',
    price: 10.00,
    description: 'Cancha de arcilla batida con excelente drenaje y mantenimiento diario. Cuenta con graderíos pequeños para espectadores.',
    image: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=350&auto=format&fit=crop'
  }
];

export default function CanchasModule({ token }: CanchasModuleProps) {
  // Estados de Negocio
  const [selectedCancha, setSelectedCancha] = useState<Cancha | null>(null);
  const [showReservationForm, setShowReservationForm] = useState<boolean>(false);
  const [showStripeForm, setShowStripeForm] = useState<boolean>(false);

  // Formulario Reserva
  const [reserveName, setReserveName] = useState<string>('');
  const [reserveDate, setReserveDate] = useState<string>('');
  const [reserveTime, setReserveTime] = useState<string>('09:00 - 10:00');

  // Formulario Stripe
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvc, setCardCvc] = useState<string>('');
  const [cardName, setCardName] = useState<string>('');
  const [email, setEmail] = useState<string>('');

  // UI y Transacción
  const [loading, setLoading] = useState<boolean>(false);
  const [successReceipt, setSuccessReceipt] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Obtener estudiante de JWT
  const getStudentId = () => {
    try {
      if (!token) return 6;
      const base64Url = token.split('.')[1];
      if (!base64Url) return 6;
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonPayload);
      return parseInt(payload.student_id || payload.id || '6', 10);
    } catch (e) {
      return 6;
    }
  };
  const studentId = getStudentId();

  const handleProcessPayment = async () => {
    if (!selectedCancha) return;

    if (!cardNumber || !cardExpiry || !cardCvc || !cardName || !email) {
      setErrorMessage('Por favor, completa todos los campos de tu tarjeta de crédito y tu correo institucional.');
      return;
    }

    setErrorMessage('');
    setLoading(true);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const amount = selectedCancha.price;
      const description = `Reserva de ${selectedCancha.name} - Fecha: ${reserveDate} Hora: ${reserveTime} - Reservante: ${reserveName}`;

      // A. Crear PaymentIntent en ms-04
      const intentRes = await fetch(`${API_URL}/api/payments/intent`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          student_id: studentId.toString(),
          amount: amount.toFixed(2),
          description,
          category: 'CANCHAS',
          email
        })
      });

      if (!intentRes.ok) {
        const errData = await intentRes.json();
        setErrorMessage(errData.error || 'Fallo al iniciar el cobro con Stripe.');
        setLoading(false);
        return;
      }

      const intentData = await intentRes.json();

      // B. Confirmar el pago en ms-04 (Stripe)
      const confirmRes = await fetch(`${API_URL}/api/payments/confirm`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          paymentId: intentData.paymentId,
          transactionRef: intentData.transactionRef,
          email: email,
          paymentMethod: 'Tarjeta Visa/Mastercard'
        })
      });

      const confirmData = await confirmRes.json();
      if (confirmRes.ok && confirmData.success) {
        setSuccessReceipt({
          paymentId: intentData.paymentId,
          transactionRef: intentData.transactionRef,
          amount,
          description,
          category: 'CANCHAS',
          recipientEmail: email
        });

        // Limpiar formularios
        setCardNumber('');
        setCardExpiry('');
        setCardCvc('');
        setCardName('');
        setShowStripeForm(false);
        setShowReservationForm(false);
      } else {
        setErrorMessage(confirmData.error || 'El pago de la reserva no pudo ser verificado.');
      }
    } catch (err) {
      setErrorMessage('Error de conexión con la pasarela de pagos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", padding: '10px 24px 24px 24px', maxWidth: '900px', margin: '0 auto' }}>
      
      {/* Recibo de reserva exitosa */}
      {successReceipt ? (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '30px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
          borderTop: '6px solid #10B981',
          textAlign: 'center'
        }}>
          <CheckCircle size={48} color="#10B981" style={{ margin: '0 auto 16px auto' }} />
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0d3b8e', margin: '0 0 8px 0' }}>¡Reserva Confirmada y Pagada!</h2>
          <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 24px 0' }}>
            Tu recibo de reserva y factura han sido generados y enviados a <strong>{successReceipt.recipientEmail}</strong>.
          </p>

          <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '24px', textAlign: 'left' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #edf2f7' }}>
                  <td style={{ padding: '8px 0', color: '#64748b', fontSize: '13px' }}>ID de Pago:</td>
                  <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700, fontSize: '13px' }}>{successReceipt.paymentId}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #edf2f7' }}>
                  <td style={{ padding: '8px 0', color: '#64748b', fontSize: '13px' }}>Detalles Reserva:</td>
                  <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600, fontSize: '13px', maxWidth: '300px' }}>{successReceipt.description}</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 0', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Valor Cobrado:</td>
                  <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 800, fontSize: '15px', color: '#0d3b8e' }}>
                    ${successReceipt.amount.toFixed(2)} USD
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => { setSelectedCancha(null); setSuccessReceipt(null); }}
              style={{
                backgroundColor: '#0d3b8e',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 20px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Volver al Catálogo de Canchas
            </button>
          </div>
        </div>
      ) : showReservationForm && selectedCancha ? (
        /* Formulario de Registro de Reserva y Pago */
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '30px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e2e8f0'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0d3b8e', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={20} color="#D4AF37" /> Reserva de {selectedCancha.name}
          </h3>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 20px 0' }}>Completa los datos del reservante y procesa el arancel correspondiente.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '220px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4A5568', marginBottom: '6px' }}>
                  Nombre del Reservante / Cédula:
                </label>
                <input
                  type="text"
                  placeholder="Ej. Juan Pérez - 1726384930"
                  value={reserveName}
                  onChange={(e) => setReserveName(e.target.value)}
                  style={{ width: '100%', fontSize: '13px', outline: 'none', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px' }}
                />
              </div>

              <div style={{ flex: 1, minWidth: '220px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4A5568', marginBottom: '6px' }}>
                  Fecha de la Reserva:
                </label>
                <input
                  type="date"
                  value={reserveDate}
                  onChange={(e) => setReserveDate(e.target.value)}
                  style={{ width: '100%', fontSize: '13px', outline: 'none', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4A5568', marginBottom: '6px' }}>
                Horario de Reserva:
              </label>
              <select
                value={reserveTime}
                onChange={(e) => setReserveTime(e.target.value)}
                style={{ width: '100%', fontSize: '13px', outline: 'none', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px' }}
              >
                <option value="09:00 - 10:00">09:00 - 10:00 (Matutino)</option>
                <option value="11:00 - 12:00">11:00 - 12:00 (Matutino)</option>
                <option value="14:00 - 15:00">14:00 - 15:00 (Vespertino)</option>
                <option value="16:00 - 17:00">16:00 - 17:00 (Vespertino)</option>
                <option value="18:00 - 19:00">18:00 - 19:00 (Nocturno LED)</option>
              </select>
            </div>
          </div>

          <div style={{
            background: '#fafbfc',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid #e2e8f0',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ fontWeight: 700, color: '#334155', fontSize: '13px' }}>Costo de Reserva por Hora:</span>
            <span style={{ fontWeight: 800, color: '#0d3b8e', fontSize: '18px' }}>${selectedCancha.price.toFixed(2)} USD</span>
          </div>

          {!showStripeForm ? (
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  if (!reserveName || !reserveDate) {
                    alert('Por favor, ingresa el nombre del reservante y selecciona la fecha.');
                    return;
                  }
                  setShowStripeForm(true);
                  setErrorMessage('');
                }}
                style={{
                  backgroundColor: '#0d3b8e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(13, 59, 142, 0.2)'
                }}
              >
                Pagar reserva
              </button>
              <button
                onClick={() => setShowReservationForm(false)}
                style={{
                  backgroundColor: 'transparent',
                  color: '#64748b',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Volver
              </button>
            </div>
          ) : (
            /* Formulario Stripe */
            <div style={{ borderTop: '1px solid #edf2f7', paddingTop: '20px' }}>
              {renderStripeForm(selectedCancha.price, 'CANCHAS', `Reserva de ${selectedCancha.name} - ${reserveDate} a las ${reserveTime}`)}
            </div>
          )}
        </div>
      ) : (
        /* Catálogo de Canchas */
        <div>
          <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0d3b8e', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Activity size={22} color="#D4AF37" /> Catálogo de Canchas Deportivas
            </h2>
            <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '13px' }}>
              Visualiza y agenda canchas deportivas del Campus UCE. El pago se procesa al instante con Stripe.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
            {CANCHAS_DATA.map(cancha => (
              <div key={cancha.id} style={{
                background: 'white',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <img src={cancha.image} alt={cancha.name} style={{ width: '100%', height: '160px', objectFit: 'cover' }} />
                <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0d3b8e', margin: '0 0 8px 0' }}>{cancha.name}</h4>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
                    <MapPin size={14} color="#D4AF37" /> {cancha.location}
                  </div>

                  <p style={{ fontSize: '12px', color: '#718096', lineHeight: 1.4, margin: '0 0 16px 0', flex: 1 }}>
                    {cancha.description}
                  </p>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '14px'
                  }}>
                    <div>
                      <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', fontWeight: 600 }}>Costo/Hora:</span>
                      <span style={{ fontSize: '16px', fontWeight: 800, color: '#1a202c' }}>${cancha.price.toFixed(2)}</span>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedCancha(cancha);
                        setShowReservationForm(true);
                        setShowStripeForm(false);
                      }}
                      style={{
                        backgroundColor: '#0d3b8e',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 16px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Reservar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Renderizador de Stripe
  function renderStripeForm(amount: number, _category: string, _description: string) {
    return (
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '18px',
          color: '#0d3b8e',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '10px'
        }}>
          <CreditCard size={18} color="#D4AF37" />
          <span style={{ fontWeight: 700, fontSize: '14px' }}>Pasarela de Pago de Stripe (Simulado)</span>
        </div>

        {errorMessage && (
          <div style={{
            background: '#fef2f2',
            color: '#ef4444',
            padding: '10px 14px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '13px',
            fontWeight: 600
          }}>
            {errorMessage}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Nombre y Correo */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4A5568', marginBottom: '6px' }}>
                Nombre del Tarjetahabiente:
              </label>
              <input
                type="text"
                placeholder="Ej. Juan Pérez"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', backgroundColor: '#fff' }}
              />
            </div>

            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4A5568', marginBottom: '6px' }}>
                Correo Institucional para Notificación:
              </label>
              <input
                type="email"
                placeholder="Ej. jperez@uce.edu.ec"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', backgroundColor: '#fff' }}
              />
            </div>
          </div>

          {/* Número de Tarjeta */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4A5568', marginBottom: '6px' }}>
              Número de Tarjeta:
            </label>
            <input
              type="text"
              maxLength={19}
              placeholder="4000 1234 5678 9010"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', backgroundColor: '#fff' }}
            />
          </div>

          {/* Fecha y CVC */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4A5568', marginBottom: '6px' }}>
                Fecha Expiración:
              </label>
              <input
                type="text"
                placeholder="MM/AA"
                maxLength={5}
                value={cardExpiry}
                onChange={(e) => setCardExpiry(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', backgroundColor: '#fff' }}
              />
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4A5568', marginBottom: '6px' }}>
                CVC (Código Seguridad):
              </label>
              <input
                type="password"
                placeholder="CVC"
                maxLength={3}
                value={cardCvc}
                onChange={(e) => setCardCvc(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', backgroundColor: '#fff' }}
              />
            </div>
          </div>

        </div>

        <button
          onClick={handleProcessPayment}
          disabled={loading}
          style={{
            width: '100%',
            marginTop: '25px',
            backgroundColor: loading ? '#94a3b8' : '#0d3b8e',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '14px',
            fontWeight: 700,
            fontSize: '15px',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(13, 59, 142, 0.2)'
          }}
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={18} /> Procesando Transacción con Stripe...
            </>
          ) : (
            <>
              <Send size={16} /> Confirmar Pago de ${amount.toFixed(2)} USD
            </>
          )}
        </button>
      </div>
    );
  }
}
