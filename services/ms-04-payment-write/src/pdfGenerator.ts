import PDFDocument from 'pdfkit';

interface InvoiceData {
  id: string;
  studentId: string;
  amount: number;
  description: string;
  category: string;
  paymentMethod: string;
  transactionRef: string;
  createdAt: string;
}

export function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // --- Diseño de Encabezado ---
      // Franja superior institucional de la UCE (Azul Oscuro: #002F6C)
      doc.rect(0, 0, 595.28, 120)
         .fill('#002F6C');

      // Franja de acento dorado (#D4AF37)
      doc.rect(0, 120, 595.28, 5)
         .fill('#D4AF37');

      // Texto de encabezado
      doc.fillColor('#FFFFFF')
         .fontSize(20)
         .font('Helvetica-Bold')
         .text('UNIVERSIDAD CENTRAL DEL ECUADOR', 50, 40, { align: 'center' });

      doc.fontSize(11)
         .font('Helvetica')
         .text('Portal de Servicios Financieros UCE-Nexus', 50, 70, { align: 'center' });

      // --- Título del Documento ---
      doc.fillColor('#333333')
         .fontSize(16)
         .font('Helvetica-Bold')
         .text('FACTURA / COMPROBANTE ELECTRÓNICO', 50, 160);

      // Línea divisoria
      doc.moveTo(50, 185)
         .lineTo(545, 185)
         .strokeColor('#E2E8F0')
         .lineWidth(1)
         .stroke();

      // --- Tabla de Datos del Comprobante ---
      const startX = 50;
      let currentY = 210;

      const drawRow = (label: string, value: string) => {
        doc.font('Helvetica-Bold')
           .fontSize(10)
           .fillColor('#4A5568')
           .text(label, startX, currentY);

        doc.font('Helvetica')
           .fillColor('#1A202C')
           .text(value, startX + 160, currentY);

        currentY += 24;
      };

      drawRow('ID de Transacción:', data.id);
      drawRow('ID del Estudiante:', data.studentId);
      drawRow('Categoría de Pago:', data.category);
      drawRow('Concepto:', data.description);
      drawRow('Método de Pago:', `${data.paymentMethod} (Stripe)`);
      drawRow('Referencia Pasarela:', data.transactionRef);
      drawRow('Fecha de Emisión:', new Date(data.createdAt).toLocaleString('es-EC'));

      // Línea divisoria antes del total
      doc.moveTo(50, currentY + 10)
         .lineTo(545, currentY + 10)
         .strokeColor('#002F6C')
         .lineWidth(1.5)
         .stroke();

      // --- Sección de Total ---
      currentY += 30;
      doc.rect(50, currentY, 495, 45)
         .fill('#F7FAFC');

      doc.font('Helvetica-Bold')
         .fontSize(12)
         .fillColor('#002F6C')
         .text('TOTAL PROCESADO Y COBRADO:', 70, currentY + 16);

      const formattedAmount = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(data.amount);
      doc.fontSize(14)
         .fillColor('#1A202C')
         .text(formattedAmount, 400, currentY + 15, { align: 'right', width: 120 });

      // --- Mensaje Legal y Pie de Página ---
      doc.fillColor('#718096')
         .fontSize(8)
         .font('Helvetica-Oblique')
         .text('Este documento digital sirve como comprobante tributario simplificado emitido por UCE-Nexus.', 50, 700, { align: 'center' })
         .text('© 2026 Universidad Central del Ecuador. Todos los derechos reservados.', 50, 715, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
