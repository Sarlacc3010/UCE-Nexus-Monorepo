import { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Car, 
  History, 
  CheckCircle, 
  AlertCircle, 
  Download,
  Calendar,
  DollarSign,
  Send,
  Loader2
} from 'lucide-react';

interface PaymentHistory {
  id: string;
  amount: number;
  description: string;
  category: string;
  status: string;
  transaction_ref: string;
  created_at: string;
}

interface PaymentsModuleProps {
  activeTab: string; // 'aranceles' | 'estacionamiento'
  token: string;
}

const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3000';

export default function PaymentsModule({ activeTab: initialTab, token }: PaymentsModuleProps) {
  // Pestaña local de pagos: 'aranceles' | 'estacionamiento' | 'historial'
  const [currentSubTab, setCurrentSubTab] = useState<string>(initialTab || 'aranceles');
  
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

  // Estados de Negocio
  const [tuitionFee, setTuitionFee] = useState<number>(0.00);
  const [tuitionNeedsPayment, setTuitionNeedsPayment] = useState<boolean>(false);
  const [parkingFee] = useState<number>(150.00); // Tarifa anual fija
  
  // Estados de Tarjeta de Crédito
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvc, setCardCvc] = useState<string>('');
  const [cardName, setCardName] = useState<string>('');
  const [email, setEmail] = useState<string>('');

  // Estados de UI y Transacción
  const [loading, setLoading] = useState<boolean>(false);
  const [successReceipt, setSuccessReceipt] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [history, setHistory] = useState<PaymentHistory[]>([]);

  // 1. Consultar si hay cobros de matrícula pendientes
  useEffect(() => {
    const fetchTuitionStatus = async () => {
      try {
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await fetch(`${API_URL}/api/academic/students/${studentId}/semester-status/3`, { headers }); // Semestre 3 de ejemplo
        if (res.ok) {
          const data = await res.json();
          if (data && data.status === 'INSCRITO' && data.needs_payment) {
            setTuitionFee(parseFloat(data.payment_amount));
            setTuitionNeedsPayment(true);
          } else {
            setTuitionFee(0.00);
            setTuitionNeedsPayment(false);
          }
        }
      } catch (err) {
        console.error('Error fetching tuition fees:', err);
      }
    };

    fetchTuitionStatus();
  }, [studentId, token]);

  // 2. Cargar historial de pagos del estudiante
  const fetchHistory = async () => {
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`${API_URL}/api/payments/student/${studentId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('Error fetching payment history:', err);
    }
  };

  useEffect(() => {
    if (currentSubTab === 'historial') {
      fetchHistory();
    }
  }, [currentSubTab]);

  // 3. Ejecutar pago con Stripe (Intención + Confirmación)
  const handleProcessPayment = async (amount: number, category: string, description: string) => {
    if (amount <= 0) return;

    if (!cardNumber || !cardExpiry || !cardCvc || !cardName || !email) {
      setErrorMessage('Por favor, completa todos los campos de la tarjeta de crédito y tu correo institucional.');
      return;
    }

    setErrorMessage('');
    setLoading(true);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // A. Crear PaymentIntent en ms-04
      const intentRes = await fetch(`${API_URL}/api/payments/intent`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          student_id: studentId.toString(),
          amount: amount.toFixed(2),
          description,
          category,
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
          paymentMethod: 'Tarjeta de Crédito Visa/MC'
        })
      });

      const confirmData = await confirmRes.json();
      if (confirmRes.ok && confirmData.success) {
        setSuccessReceipt({
          paymentId: intentData.paymentId,
          transactionRef: intentData.transactionRef,
          amount,
          description,
          category,
          recipientEmail: email
        });

        // Limpiar formulario
        setCardNumber('');
        setCardExpiry('');
        setCardCvc('');
        setCardName('');
        
        // Si fue el pago de la matrícula, desactivamos el cobro de la UI
        if (category === 'MATRICULA') {
          setTuitionNeedsPayment(false);
          setTuitionFee(0.00);
        }
      } else {
        setErrorMessage(confirmData.error || 'El pago no pudo ser confirmado.');
      }
    } catch (err) {
      setErrorMessage('Error de conexión con la pasarela de pagos.');
    } finally {
      setLoading(false);
    }
  };

  // Simular la descarga física de la factura
  const handleDownloadInvoice = (paymentId: string) => {
    alert(`Descargando comprobante PDF para la transacción ${paymentId}...\nEl archivo ha sido enviado también a tu correo.`);
  };

  return (
    <div className="payments-wrapper" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      
      {/* Subnavegación */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #e2e8f0',
        marginBottom: '24px',
        gap: '20px'
      }}>
        <button
          onClick={() => { setCurrentSubTab('aranceles'); setSuccessReceipt(null); }}
          style={{
            padding: '12px 6px',
            borderBottom: currentSubTab === 'aranceles' ? '3px solid #0d3b8e' : 'none',
            color: currentSubTab === 'aranceles' ? '#0d3b8e' : '#64748b',
            fontWeight: currentSubTab === 'aranceles' ? 700 : 500,
            cursor: 'pointer',
            backgroundColor: 'transparent',
            border: 'none',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <CreditCard size={16} /> Pago de aranceles
        </button>

        <button
          onClick={() => { setCurrentSubTab('estacionamiento'); setSuccessReceipt(null); }}
          style={{
            padding: '12px 6px',
            borderBottom: currentSubTab === 'estacionamiento' ? '3px solid #0d3b8e' : 'none',
            color: currentSubTab === 'estacionamiento' ? '#0d3b8e' : '#64748b',
            fontWeight: currentSubTab === 'estacionamiento' ? 700 : 500,
            cursor: 'pointer',
            backgroundColor: 'transparent',
            border: 'none',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Car size={16} /> Pago de estacionamiento
        </button>

        <button
          onClick={() => { setCurrentSubTab('historial'); setSuccessReceipt(null); }}
          style={{
            padding: '12px 6px',
            borderBottom: currentSubTab === 'historial' ? '3px solid #0d3b8e' : 'none',
            color: currentSubTab === 'historial' ? '#0d3b8e' : '#64748b',
            fontWeight: currentSubTab === 'historial' ? 700 : 500,
            cursor: 'pointer',
            backgroundColor: 'transparent',
            border: 'none',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <History size={16} /> Historial de pagos
        </button>
      </div>

      {/* Recibo de Éxito */}
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
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0d3b8e', margin: '0 0 8px 0' }}>¡Pago Procesado Exitosamente!</h2>
          <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 24px 0' }}>
            Tu recibo ha sido generado y enviado a <strong>{successReceipt.recipientEmail}</strong>.
          </p>

          <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '24px', textAlign: 'left' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #edf2f7' }}>
                  <td style={{ padding: '8px 0', color: '#64748b', fontSize: '13px' }}>ID del Pago:</td>
                  <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700, fontSize: '13px' }}>{successReceipt.paymentId}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #edf2f7' }}>
                  <td style={{ padding: '8px 0', color: '#64748b', fontSize: '13px' }}>Concepto:</td>
                  <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600, fontSize: '13px' }}>{successReceipt.description}</td>
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
              onClick={() => handleDownloadInvoice(successReceipt.paymentId)}
              style={{
                backgroundColor: '#0d3b8e',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 20px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Download size={16} /> Descargar Factura PDF
            </button>

            <button
              onClick={() => { setCurrentSubTab('historial'); setSuccessReceipt(null); }}
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
              Ver Historial
            </button>
          </div>
        </div>
      ) : currentSubTab === 'historial' ? (
        /* Tabla de Historial */
        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0d3b8e', margin: '0 0 16px 0' }}>Registro Histórico de Pagos</h3>
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              No se registran pagos exitosos anteriores para este estudiante.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #edf2f7', color: '#64748b', textAlign: 'left' }}>
                    <th style={{ padding: '10px 6px' }}>Fecha</th>
                    <th style={{ padding: '10px 6px' }}>Concepto</th>
                    <th style={{ padding: '10px 6px' }}>Categoría</th>
                    <th style={{ padding: '10px 6px' }}>Valor</th>
                    <th style={{ padding: '10px 6px', textAlign: 'center' }}>Factura</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #edf2f7', color: '#334155' }}>
                      <td style={{ padding: '12px 6px' }}>{new Date(item.created_at).toLocaleDateString('es-EC')}</td>
                      <td style={{ padding: '12px 6px', fontWeight: 600 }}>{item.description}</td>
                      <td style={{ padding: '12px 6px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: item.category === 'MATRICULA' ? '#eff6ff' : '#f0fdf4',
                          color: item.category === 'MATRICULA' ? '#1d4ed8' : '#15803d'
                        }}>
                          {item.category}
                        </span>
                      </td>
                      <td style={{ padding: '12px 6px', fontWeight: 700 }}>${parseFloat(item.amount as any).toFixed(2)}</td>
                      <td style={{ padding: '12px 6px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleDownloadInvoice(item.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#0d3b8e',
                            cursor: 'pointer',
                            padding: '4px'
                          }}
                          title="Descargar Comprobante PDF"
                        >
                          <Download size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Formulario de Pago de Tarjeta */
        <div style={{ background: 'white', borderRadius: '16px', padding: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
          {errorMessage && (
            <div style={{
              background: '#fef2f2',
              color: '#ef4444',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600
            }}>
              <AlertCircle size={18} /> {errorMessage}
            </div>
          )}

          {/* Resumen del Cobro */}
          <div style={{
            background: '#fafbfc',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <h4 style={{ margin: '0 0 4px 0', color: '#334155', fontSize: '13px', fontWeight: 600 }}>Concepto a Pagar:</h4>
              <p style={{ margin: 0, fontWeight: 700, color: '#0d3b8e', fontSize: '15px' }}>
                {currentSubTab === 'aranceles' 
                  ? (tuitionNeedsPayment ? 'Arancel de Matrícula (Créditos repetidos/2da carrera)' : 'No registras aranceles académicos pendientes')
                  : 'Pase Anual de Estacionamiento Vehicular UCE'
                }
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Monto a Cobrar:</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b' }}>
                ${currentSubTab === 'aranceles' ? tuitionFee.toFixed(2) : parkingFee.toFixed(2)} USD
              </div>
            </div>
          </div>

          {currentSubTab === 'aranceles' && !tuitionNeedsPayment ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
              No tienes pagos de matrículas pendientes en este período. ¡Disfruta de tu ciclo académico!
            </div>
          ) : (
            /* Campos de Tarjeta */
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
                <span style={{ fontWeight: 700, fontSize: '14px' }}>Detalles de Tarjeta de Crédito (Stripe Segure)</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Nombre y Correo */}
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4A5568', marginBottom: '6px' }}>
                      Nombre en la Tarjeta:
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Juan Pérez"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4A5568', marginBottom: '6px' }}>
                      Correo Electrónico (Notificación):
                    </label>
                    <input
                      type="email"
                      placeholder="Ej. jperez@uce.edu.ec"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        outline: 'none'
                      }}
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
                    placeholder="•••• •••• •••• ••••"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Fecha y CVC */}
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4A5568', marginBottom: '6px' }}>
                      Vencimiento:
                    </label>
                    <input
                      type="text"
                      placeholder="MM/AA"
                      maxLength={5}
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4A5568', marginBottom: '6px' }}>
                      Código CVC:
                    </label>
                    <input
                      type="password"
                      placeholder="CVC"
                      maxLength={3}
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

              </div>

              {/* Botón Pagar */}
              <button
                onClick={() => {
                  const isAranceles = currentSubTab === 'aranceles';
                  const payAmount = isAranceles ? tuitionFee : parkingFee;
                  const category = isAranceles ? 'MATRICULA' : 'ESTACIONAMIENTO';
                  const desc = isAranceles ? 'Cobro de Matrícula Extraordinaria UCE' : 'Pase Anual de Estacionamiento Vehicular UCE';
                  handleProcessPayment(payAmount, category, desc);
                }}
                disabled={loading}
                style={{
                  width: '100%',
                  marginTop: '30px',
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
                    <Loader2 className="animate-spin" size={18} /> Procesando Pago con Stripe...
                  </>
                ) : (
                  <>
                    <Send size={16} /> Confirmar Pago de ${currentSubTab === 'aranceles' ? tuitionFee.toFixed(2) : parkingFee.toFixed(2)} USD
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
