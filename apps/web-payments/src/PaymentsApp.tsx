import { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Car, 
  History, 
  CheckCircle, 
  AlertCircle, 
  Download,
  Send,
  Loader2,
  ShieldCheck,
  User,
  Hash,
  Sparkles
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

interface PaymentsAppProps {
  activeTab: string; // 'aranceles' | 'estacionamiento' | 'historial_pagos'
  token: string;
}

const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3000';

export default function PaymentsApp({ activeTab: initialTab, token }: PaymentsAppProps) {
  // Pestaña local: 'aranceles' | 'estacionamiento' | 'historial'
  const [currentSubTab, setCurrentSubTab] = useState<string>('aranceles');

  // Mapear tab externa de web-host a tab local
  useEffect(() => {
    if (initialTab === 'historial_pagos') {
      setCurrentSubTab('historial');
    } else if (initialTab === 'estacionamiento') {
      setCurrentSubTab('estacionamiento');
    } else {
      setCurrentSubTab('aranceles');
    }
  }, [initialTab]);

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
  const PARKING_ANNUAL_FEE = 45.00;

  // Estados de Matrícula (Aranceles)
  const [tuitionFee, setTuitionFee] = useState<number>(0.00);
  const [tuitionNeedsPayment, setTuitionNeedsPayment] = useState<boolean>(false);
  const [showTuitionStripeForm, setShowTuitionStripeForm] = useState<boolean>(false);

  // Estados de Estacionamiento
  const [hasParkingPass, setHasParkingPass] = useState<boolean>(false);
  const [parkingDetails, setParkingDetails] = useState<any>(null);
  const [showParkingRegisterForm, setShowParkingRegisterForm] = useState<boolean>(false);
  const [showParkingStripeForm, setShowParkingStripeForm] = useState<boolean>(false);

  // Formulario Registro Vehículo
  const [driverName, setDriverName] = useState<string>('');
  const [vehiclePlate, setVehiclePlate] = useState<string>('');
  const [vehicleModel, setVehicleModel] = useState<string>('');
  const [vehicleColor, setVehicleColor] = useState<string>('');

  // Formulario Tarjeta (Stripe)
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvc, setCardCvc] = useState<string>('');
  const [cardName, setCardName] = useState<string>('');
  const [email, setEmail] = useState<string>('');

  // UI y Transacciones
  const [loading, setLoading] = useState<boolean>(false);
  const [successReceipt, setSuccessReceipt] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [history, setHistory] = useState<PaymentHistory[]>([]);

  // 1. Cargar cobros de matrícula pendientes
  const fetchTuitionStatus = async () => {
    try {
      const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`${API_URL}/api/academic/students/${studentId}/semester-status/3`, { headers });
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

  // 2. Cargar historial y pase de estacionamiento
  const fetchHistoryAndParking = async () => {
    try {
      const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`${API_URL}/api/payments/student/${studentId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);

        // Verificar si hay algún pago de estacionamiento exitoso en el historial
        const parkingPayment = data.find((p: any) => p.category === 'ESTACIONAMIENTO' && p.status === 'COMPLETED');
        if (parkingPayment) {
          setHasParkingPass(true);
          
          let parsedDriver = 'Juan Pérez UCE';
          let parsedPlate = 'PCG-4890';
          let parsedModel = 'Chevrolet Sail Sport';
          let parsedColor = 'Blanco Glaciar';
          
          // Intentar parsear el formato "Estacionamiento | Conductor: X | Placa: Y | Modelo: Z | Color: W"
          if (parkingPayment.description && parkingPayment.description.includes('|')) {
            const parts = parkingPayment.description.split('|');
            parts.forEach((part: string) => {
              const subparts = part.split(':');
              if (subparts.length === 2) {
                const key = subparts[0].trim().toLowerCase();
                const val = subparts[1].trim();
                if (key === 'conductor') parsedDriver = val;
                else if (key === 'placa') parsedPlate = val;
                else if (key === 'modelo') parsedModel = val;
                else if (key === 'color') parsedColor = val;
              }
            });
          } else if (parkingPayment.description && parkingPayment.description.includes('Conductor:')) {
            const match = parkingPayment.description.match(/Conductor:\s*([^|]+)/);
            if (match) parsedDriver = match[1].trim();
          }
          
          setParkingDetails({
            driver: parsedDriver,
            plate: parsedPlate,
            model: parsedModel,
            color: parsedColor,
            validUntil: new Date(new Date(parkingPayment.created_at).getTime() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('es-EC') // 1 año de validez
          });
        } else {
          setHasParkingPass(false);
          setParkingDetails(null);
        }
      }
    } catch (err) {
      console.error('Error fetching payment history:', err);
    }
  };

  useEffect(() => {
    fetchTuitionStatus();
    fetchHistoryAndParking();
  }, [studentId, token]);

  useEffect(() => {
    if (currentSubTab === 'historial') {
      fetchHistoryAndParking();
    }
  }, [currentSubTab]);

  // 3. Procesar cobro con Stripe
  const handleProcessPayment = async (amount: number, category: string, description: string) => {
    if (amount <= 0) return;

    if (!cardNumber || !cardExpiry || !cardCvc || !cardName || !email) {
      setErrorMessage('Por favor, completa todos los campos de tu tarjeta de crédito y tu correo institucional.');
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
          category,
          recipientEmail: email
        });

        // Limpiar formularios
        setCardNumber('');
        setCardExpiry('');
        setCardCvc('');
        setCardName('');
        setShowTuitionStripeForm(false);
        setShowParkingStripeForm(false);
        setShowParkingRegisterForm(false);

        // Actualizar estados
        if (category === 'MATRICULA') {
          setTuitionNeedsPayment(false);
          setTuitionFee(0.00);
        } else if (category === 'ESTACIONAMIENTO') {
          setHasParkingPass(true);
          setParkingDetails({
            driver: driverName || 'Estudiante UCE',
            plate: vehiclePlate || 'N/A',
            model: vehicleModel || 'N/A',
            color: vehicleColor || 'N/A',
            validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('es-EC')
          });
        }
        
        // Recargar historial en segundo plano
        fetchHistoryAndParking();
      } else {
        setErrorMessage(confirmData.error || 'El pago no pudo ser verificado.');
      }
    } catch (err) {
      setErrorMessage('Error de comunicación con el procesador de pagos.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = (paymentId: string) => {
    alert(`Descargando comprobante PDF para la transacción ${paymentId}...\nEl archivo ha sido enviado también a tu correo.`);
  };

  return (
    <div style={{
      fontFamily: "'Outfit', sans-serif",
      backgroundColor: '#f8fafc',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 4px 25px rgba(0,0,0,0.02)',
      border: '1px solid #e2e8f0',
      minHeight: '400px'
    }}>
      
      {/* Subnavegación Interna */}
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
          <Car size={16} /> Pago de estacionamiento (Anual)
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
            Tu recibo oficial ha sido generado y enviado a <strong>{successReceipt.recipientEmail}</strong>.
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
      ) : currentSubTab === 'aranceles' ? (
        /* PAGO DE ARANCELES (MATRÍCULAS) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {!tuitionNeedsPayment ? (
            <div style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '16px',
              padding: '30px',
              textAlign: 'center',
              boxShadow: '0 8px 24px rgba(16,185,129,0.03)'
            }}>
              <CheckCircle size={40} color="#10b981" style={{ margin: '0 auto 12px auto' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#065f46', margin: '0 0 4px 0' }}>No se registran valores pendientes</h3>
              <p style={{ color: '#047857', fontSize: '13px', margin: 0 }}>
                Tu matrícula y aranceles universitarios se encuentran al día (Estado: Matriculado / Gratuidad vigente).
              </p>
            </div>
          ) : (
            <div style={{ background: 'white', borderRadius: '16px', padding: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <AlertCircle size={32} color="#EF4444" />
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0d3b8e', margin: 0 }}>Arancel Académico Pendiente</h3>
                  <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>Registro de matrícula en estado temporal "Inscrito".</p>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #edf2f7' }}>
                      <td style={{ padding: '8px 0', color: '#64748b', fontWeight: 600 }}>Concepto:</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700, color: '#1e293b' }}>Cobro de Matrícula (Créditos repetidos/2da carrera)</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 0', color: '#64748b', fontWeight: 600 }}>Total a Pagar:</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 800, fontSize: '16px', color: '#ef4444' }}>
                        ${tuitionFee.toFixed(2)} USD
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {!showTuitionStripeForm ? (
                <button
                  onClick={() => { setShowTuitionStripeForm(true); setErrorMessage(''); }}
                  style={{
                    backgroundColor: '#0d3b8e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '14px 24px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(13, 59, 142, 0.2)'
                  }}
                >
                  <CreditCard size={18} /> Realizar pago
                </button>
              ) : (
                /* Formulario de Stripe de Matrículas */
                <div style={{ marginTop: '20px', borderTop: '1px solid #edf2f7', paddingTop: '20px' }}>
                  {renderStripeForm(tuitionFee, 'MATRICULA', 'Cobro de Matrícula Extraordinaria UCE')}
                </div>
              )}
            </div>
          )}
        </div>
      ) : currentSubTab === 'estacionamiento' ? (
        /* PAGO DE ESTACIONAMIENTO */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {hasParkingPass && parkingDetails ? (
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '30px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
              border: '1px solid #e2e8f0',
              borderLeft: '6px solid #10b981'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
                <CheckCircle size={36} color="#10b981" />
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#065f46', margin: 0 }}>
                    Estacionamiento válido hasta {parkingDetails.validUntil}
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>Pase vehicular anual activo y registrado con éxito.</p>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', fontSize: '13px' }}>
                <h4 style={{ fontWeight: 700, color: '#0d3b8e', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={16} color="#D4AF37" /> Detalles del Vehículo y Conductor
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>
                  <div>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Conductor:</span>
                    <div style={{ fontWeight: 700, color: '#1e293b', marginTop: '2px' }}>{parkingDetails.driver}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Matrícula (Placa):</span>
                    <div style={{ fontWeight: 700, color: '#1e293b', marginTop: '2px' }}>{parkingDetails.plate}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Modelo:</span>
                    <div style={{ fontWeight: 700, color: '#1e293b', marginTop: '2px' }}>{parkingDetails.model}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Color del vehículo:</span>
                    <div style={{ fontWeight: 700, color: '#1e293b', marginTop: '2px' }}>{parkingDetails.color}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Recuadro de No Registra Vehículo */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '16px',
                padding: '30px',
                textAlign: 'center',
                boxShadow: '0 4px 15px rgba(0,0,0,0.01)'
              }}>
                <AlertCircle size={40} color="#64748b" style={{ margin: '0 auto 12px auto' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#334155', margin: '0 0 4px 0' }}>No registra vehículo</h3>
                <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 20px 0' }}>
                  No dispones de un pase de estacionamiento anual vigente registrado en tu cuenta.
                </p>

                {!showParkingRegisterForm && (
                  <button
                    onClick={() => { setShowParkingRegisterForm(true); setErrorMessage(''); }}
                    style={{
                      backgroundColor: '#0d3b8e',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '12px 20px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(13, 59, 142, 0.2)'
                    }}
                  >
                    Registrar vehículo y pagar estacionamiento
                  </button>
                )}
              </div>

              {/* Formulario Registro de Vehículo */}
              {showParkingRegisterForm && (
                <div style={{
                  background: 'white',
                  borderRadius: '16px',
                  padding: '30px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
                  border: '1px solid #e2e8f0'
                }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#0d3b8e', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Car size={18} color="#D4AF37" /> Formulario de Registro Vehicular
                  </h4>

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
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: '220px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4A5568', marginBottom: '6px' }}>
                          Nombre del Conductor:
                        </label>
                        <input
                          type="text"
                          placeholder="Ej. Juan Pérez UCE"
                          value={driverName}
                          onChange={(e) => setDriverName(e.target.value)}
                          style={{ width: '100%', fontSize: '13px', outline: 'none', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px' }}
                        />
                      </div>

                      <div style={{ flex: 1, minWidth: '220px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4A5568', marginBottom: '6px' }}>
                          Matrícula del Vehículo (Placa):
                        </label>
                        <input
                          type="text"
                          placeholder="Ej. PCG-4890"
                          value={vehiclePlate}
                          onChange={(e) => setVehiclePlate(e.target.value)}
                          style={{ width: '100%', fontSize: '13px', outline: 'none', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: '220px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4A5568', marginBottom: '6px' }}>
                          Modelo del Vehículo:
                        </label>
                        <input
                          type="text"
                          placeholder="Ej. Chevrolet Sail Sport"
                          value={vehicleModel}
                          onChange={(e) => setVehicleModel(e.target.value)}
                          style={{ width: '100%', fontSize: '13px', outline: 'none', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px' }}
                        />
                      </div>

                      <div style={{ flex: 1, minWidth: '220px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4A5568', marginBottom: '6px' }}>
                          Color del Vehículo:
                        </label>
                        <input
                          type="text"
                          placeholder="Ej. Blanco Glaciar"
                          value={vehicleColor}
                          onChange={(e) => setVehicleColor(e.target.value)}
                          style={{ width: '100%', fontSize: '13px', outline: 'none', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px' }}
                        />
                      </div>
                    </div>
                  </div>

                  {!showParkingStripeForm ? (
                    <button
                      onClick={() => {
                        if (!driverName || !vehiclePlate || !vehicleModel || !vehicleColor) {
                          setErrorMessage('Por favor, completa todos los campos del vehículo antes de proceder.');
                          return;
                        }
                        setErrorMessage('');
                        setShowParkingStripeForm(true);
                      }}
                      style={{
                        marginTop: '20px',
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
                      Proceder al pago
                    </button>
                  ) : (
                    /* Formulario de Stripe de Estacionamiento */
                    <div style={{ marginTop: '20px', borderTop: '1px solid #edf2f7', paddingTop: '20px' }}>
                      {renderStripeForm(PARKING_ANNUAL_FEE, 'ESTACIONAMIENTO', `Estacionamiento | Conductor: ${driverName} | Placa: ${vehiclePlate} | Modelo: ${vehicleModel} | Color: ${vehicleColor}`)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* PESTAÑA: HISTORIAL */
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
                          backgroundColor: item.category === 'MATRICULA' ? '#eff6ff' : item.category === 'ESTACIONAMIENTO' ? '#faf5ff' : '#f0fdf4',
                          color: item.category === 'MATRICULA' ? '#1d4ed8' : item.category === 'ESTACIONAMIENTO' ? '#7c3aed' : '#15803d'
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
      )}
    </div>
  );

  // Renderizador de Formulario Stripe
  function renderStripeForm(amount: number, category: string, description: string) {
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
          <span style={{ fontWeight: 700, fontSize: '14px' }}>Pasarela Segura de Stripe (Visa/Mastercard)</span>
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
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  backgroundColor: '#fff'
                }}
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
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  backgroundColor: '#fff'
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
              placeholder="4000 1234 5678 9010"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                backgroundColor: '#fff'
              }}
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
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  backgroundColor: '#fff'
                }}
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
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  backgroundColor: '#fff'
                }}
              />
            </div>
          </div>

        </div>

        {/* Botón Pagar con Stripe */}
        <button
          onClick={() => handleProcessPayment(amount, category, description)}
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
              <ShieldCheck size={18} /> Pagar ${amount.toFixed(2)} USD
            </>
          )}
        </button>
      </div>
    );
  }
}
