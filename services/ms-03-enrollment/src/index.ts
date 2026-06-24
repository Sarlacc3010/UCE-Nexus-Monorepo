import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb, pool, catalogPool } from './db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Endpoint de salud
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'ms-03-enrollment',
    database: 'connected'
  });
});

// 0. Obtener Laboratorios desde base de datos de catálogo
app.get('/api/laboratories', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await catalogPool.query(
      'SELECT legacy_id AS id, code, name, capacity, location FROM laboratories WHERE is_active = true ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching laboratories:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 1. Obtener Semestres
app.get('/api/semesters', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM semesters ORDER BY level ASC');
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching semesters:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. Obtener Asignaturas (con filtro opcional de semester_id)
app.get('/api/subjects', async (req: Request, res: Response): Promise<void> => {
  const { semester_id } = req.query;
  try {
    let query = 'SELECT * FROM subjects';
    const params: any[] = [];
    if (semester_id) {
      query += ' WHERE semester_id = $1';
      params.push(semester_id);
    }
    query += ' ORDER BY id ASC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3. Obtener Paralelos (con filtro opcional de subject_id)
app.get('/api/parallels', async (req: Request, res: Response): Promise<void> => {
  const { subject_id } = req.query;
  try {
    let query = 'SELECT * FROM parallels';
    const params: any[] = [];
    if (subject_id) {
      query += ' WHERE subject_id = $1';
      params.push(subject_id);
    }
    query += ' ORDER BY id ASC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching parallels:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 4. Obtener Horarios de Clase (con filtros por laboratorio y/o día)
app.get('/api/schedules', async (req: Request, res: Response): Promise<void> => {
  const { lab_id, dia } = req.query;
  try {
    let query = `
      SELECT s.*, p.name as parallel_name, sub.name as subject_name 
      FROM schedules s
      JOIN parallels p ON s.parallel_id = p.id
      JOIN subjects sub ON p.subject_id = sub.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (lab_id) {
      params.push(lab_id);
      query += ` AND s.lab_id = $${params.length}`;
    }
    if (dia) {
      params.push(dia);
      query += ` AND s.dia = $${params.length}`;
    }
    
    query += ' ORDER BY s.dia, s.hora_inicio';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 5. Verificar Conflictos de Horario de Clase
// (Útil para evitar que un alumno reserve un laboratorio cuando hay clase programada)
app.get('/api/schedules/check-conflict', async (req: Request, res: Response): Promise<void> => {
  const { lab_id, dia, hora_inicio, hora_fin } = req.query;

  if (!lab_id || !dia || !hora_inicio || !hora_fin) {
    res.status(400).json({ error: 'Faltan parámetros: lab_id, dia, hora_inicio, hora_fin son obligatorios.' });
    return;
  }

  try {
    // Busca intersección de horarios:
    // (hora_inicio_solicitada < hora_fin_clase) Y (hora_fin_solicitada > hora_inicio_clase)
    const query = `
      SELECT s.*, p.name as parallel_name, sub.name as subject_name 
      FROM schedules s
      JOIN parallels p ON s.parallel_id = p.id
      JOIN subjects sub ON p.subject_id = sub.id
      WHERE s.lab_id = $1 
        AND s.dia = $2 
        AND $3::time < s.hora_fin 
        AND $4::time > s.hora_inicio
    `;
    const result = await pool.query(query, [lab_id, dia, hora_inicio, hora_fin]);

    if (result.rows.length > 0) {
      res.json({
        conflict: true,
        message: 'Existe un conflicto con una clase programada.',
        details: result.rows[0]
      });
    } else {
      res.json({
        conflict: false,
        message: 'Sin conflictos con horarios de clase.'
      });
    }
  } catch (error: any) {
    console.error('Error checking schedule conflict:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 6. Obtener Paralelos de un Estudiante
app.get('/api/students/:id/enrollments', async (req: Request, res: Response): Promise<void> => {
  const studentId = req.params.id;
  try {
    const query = `
      SELECT p.*, sub.name as subject_name, sem.name as semester_name
      FROM student_enrollments se
      JOIN parallels p ON se.parallel_id = p.id
      JOIN subjects sub ON p.subject_id = sub.id
      JOIN semesters sem ON sub.semester_id = sem.id
      WHERE se.student_id = $1
    `;
    const result = await pool.query(query, [studentId]);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching student enrollments:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 7. Obtener Asignaturas de un Profesor
app.get('/api/professors/:id/assignments', async (req: Request, res: Response): Promise<void> => {
  const professorId = req.params.id;
  try {
    const query = `
      SELECT sub.*, sem.name as semester_name
      FROM professor_assignments pa
      JOIN subjects sub ON pa.subject_id = sub.id
      JOIN semesters sem ON sub.semester_id = sem.id
      WHERE pa.professor_id = $1
    `;
    const result = await pool.query(query, [professorId]);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching professor assignments:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 8. Obtener calificaciones de un estudiante (todas sus materias)
app.get('/api/students/:id/grades', async (req: Request, res: Response): Promise<void> => {
  const studentId = req.params.id;
  try {
    const query = `
      SELECT
        g.*,
        sub.name AS subject_name,
        p.name   AS parallel_name,
        sem.name AS semester_name
      FROM grades g
      JOIN parallels p   ON g.parallel_id = p.id
      JOIN subjects sub  ON p.subject_id  = sub.id
      JOIN semesters sem ON sub.semester_id = sem.id
      WHERE g.student_id = $1
      ORDER BY sem.level ASC, sub.name ASC
    `;
    const result = await pool.query(query, [studentId]);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching student grades:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 9. Obtener calificaciones de un paralelo (vista del profesor)
app.get('/api/parallels/:id/grades', async (req: Request, res: Response): Promise<void> => {
  const parallelId = req.params.id;
  try {
    const query = `
      SELECT g.*, g.nota_total
      FROM grades g
      WHERE g.parallel_id = $1
      ORDER BY g.student_id ASC
    `;
    const result = await pool.query(query, [parallelId]);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching parallel grades:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 10. Ingresar o actualizar calificaciones (uso del profesor)
// Body: { student_id, examen_hemisemestre?, nota_individual?, nota_grupal?, examen_final?, ingresado_por }
app.put('/api/parallels/:id/grades', async (req: Request, res: Response): Promise<void> => {
  const parallelId = req.params.id;
  const { student_id, examen_hemisemestre, nota_individual, nota_grupal, examen_final, ingresado_por } = req.body;

  if (!student_id) {
    res.status(400).json({ error: 'student_id es obligatorio.' });
    return;
  }

  try {
    // Verificar que el estudiante esté matriculado en el paralelo
    const enrollment = await pool.query(
      'SELECT 1 FROM student_enrollments WHERE student_id = $1 AND parallel_id = $2',
      [student_id, parallelId]
    );
    if (enrollment.rowCount === 0) {
      res.status(404).json({ error: 'El estudiante no está matriculado en este paralelo.' });
      return;
    }

    // UPSERT: inserta o actualiza la nota
    const upsertQuery = `
      INSERT INTO grades (student_id, parallel_id, examen_hemisemestre, nota_individual, nota_grupal, examen_final, ingresado_por, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (student_id, parallel_id) DO UPDATE SET
        examen_hemisemestre = COALESCE(EXCLUDED.examen_hemisemestre, grades.examen_hemisemestre),
        nota_individual     = COALESCE(EXCLUDED.nota_individual,     grades.nota_individual),
        nota_grupal         = COALESCE(EXCLUDED.nota_grupal,         grades.nota_grupal),
        examen_final        = COALESCE(EXCLUDED.examen_final,        grades.examen_final),
        ingresado_por       = EXCLUDED.ingresado_por,
        updated_at          = NOW()
      RETURNING *
    `;
    const result = await pool.query(upsertQuery, [
      student_id, parallelId,
      examen_hemisemestre ?? null, nota_individual ?? null,
      nota_grupal ?? null, examen_final ?? null,
      ingresado_por ?? null
    ]);

    // Actualizar estado automáticamente si la nota total ya está completa
    const grade = result.rows[0];
    const allFilled = grade.examen_hemisemestre !== null && grade.nota_individual !== null
                   && grade.nota_grupal !== null && grade.examen_final !== null;
    if (allFilled) {
      const estado = grade.nota_total >= 14 ? 'APROBADO' : 'REPROBADO';
      await pool.query('UPDATE grades SET estado = $1 WHERE id = $2', [estado, grade.id]);
      grade.estado = estado;
    }

    res.json({ message: 'Calificación actualizada.', grade });
  } catch (error: any) {
    console.error('Error updating grade:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// 11. Retiro Simple (dentro del primer mes — ejecución directa, sin aprobación)
// El semestre activo debe tener menos de 30 días desde su fecha de inicio.
// Body: { student_id, semester_start_date }
app.delete('/api/students/:student_id/enrollments/:parallel_id', async (req: Request, res: Response): Promise<void> => {
  const { student_id, parallel_id } = req.params;
  const { semester_start_date } = req.body;

  if (!semester_start_date) {
    res.status(400).json({ error: 'semester_start_date es obligatorio para verificar el periodo de retiro simple.' });
    return;
  }

  const startDate = new Date(semester_start_date);
  const today = new Date();
  const diffDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays > 30) {
    res.status(403).json({
      error: 'El periodo de retiro simple ha vencido (más de 30 días desde el inicio del semestre). Debe solicitar un Retiro Fortuito.'
    });
    return;
  }

  try {
    // Verificar que existe la matrícula
    const enrollment = await pool.query(
      'SELECT 1 FROM student_enrollments WHERE student_id = $1 AND parallel_id = $2',
      [student_id, parallel_id]
    );
    if (enrollment.rowCount === 0) {
      res.status(404).json({ error: 'Matrícula no encontrada.' });
      return;
    }

    // Marcar la nota como RETIRADO (si existe) antes de eliminar la matrícula
    await pool.query(
      `UPDATE grades SET estado = 'RETIRADO' WHERE student_id = $1 AND parallel_id = $2`,
      [student_id, parallel_id]
    );

    // Registrar la solicitud de retiro simple para auditoría
    await pool.query(
      `INSERT INTO student_requests (student_id, tipo_solicitud, estado, parallel_id, motivo, fecha_resolucion)
       VALUES ($1, 'RETIRO_SIMPLE', 'APROBADA', $2, 'Retiro dentro del período permitido (primer mes)', NOW())`,
      [student_id, parallel_id]
    );

    // Eliminar la matrícula
    await pool.query(
      'DELETE FROM student_enrollments WHERE student_id = $1 AND parallel_id = $2',
      [student_id, parallel_id]
    );

    res.json({ message: `Retiro simple ejecutado exitosamente del paralelo ${parallel_id}.` });
  } catch (error: any) {
    console.error('Error in retiro simple:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 12. Retiro Fortuito (después del primer mes — requiere aprobación administrativa)
// Aplica a TODAS las materias activas del estudiante.
// Body: { motivo, evidencias_url[] }
app.post('/api/students/:student_id/requests/retiro-fortuito', async (req: Request, res: Response): Promise<void> => {
  const { student_id } = req.params;
  const { motivo, evidencias_url } = req.body;

  if (!motivo) {
    res.status(400).json({ error: 'El motivo es obligatorio para el retiro fortuito.' });
    return;
  }

  try {
    // Verificar que el estudiante tenga materias activas
    const active = await pool.query(
      `SELECT se.parallel_id FROM student_enrollments se
       LEFT JOIN grades g ON g.student_id = se.student_id AND g.parallel_id = se.parallel_id
       WHERE se.student_id = $1 AND (g.estado IS NULL OR g.estado = 'CURSANDO')`,
      [student_id]
    );

    if (active.rowCount === 0) {
      res.status(404).json({ error: 'No se encontraron materias activas para este estudiante.' });
      return;
    }

    // Verificar que no tenga ya un retiro fortuito pendiente
    const existing = await pool.query(
      `SELECT id FROM student_requests WHERE student_id = $1 AND tipo_solicitud = 'RETIRO_FORTUITO' AND estado IN ('PENDIENTE', 'EN_REVISION')`,
      [student_id]
    );
    if (existing.rowCount! > 0) {
      res.status(409).json({ error: 'Ya existe una solicitud de retiro fortuito en proceso.' });
      return;
    }

    // Crear la solicitud (parallel_id = NULL porque aplica a todas las materias)
    const result = await pool.query(
      `INSERT INTO student_requests (student_id, tipo_solicitud, estado, parallel_id, motivo, evidencias_url)
       VALUES ($1, 'RETIRO_FORTUITO', 'PENDIENTE', NULL, $2, $3)
       RETURNING *`,
      [student_id, motivo, evidencias_url ?? []]
    );

    res.status(201).json({
      message: 'Solicitud de retiro fortuito registrada. Espere resolución del Departamento Académico.',
      solicitud: result.rows[0],
      materias_afectadas: active.rowCount
    });
  } catch (error: any) {
    console.error('Error creating retiro fortuito:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 13. Otras solicitudes (Tercera Matrícula, Excepcionalidad)
// Body: { tipo_solicitud, subject_id?, motivo }
app.post('/api/students/:student_id/requests', async (req: Request, res: Response): Promise<void> => {
  const { student_id } = req.params;
  const { tipo_solicitud, parallel_id, motivo } = req.body;

  const tiposValidos = ['TERCERA_MATRICULA', 'EXCEPCIONALIDAD'];
  if (!tipo_solicitud || !tiposValidos.includes(tipo_solicitud)) {
    res.status(400).json({ error: `tipo_solicitud debe ser uno de: ${tiposValidos.join(', ')}` });
    return;
  }
  if (!motivo) {
    res.status(400).json({ error: 'El motivo es obligatorio.' });
    return;
  }

  try {
    const result = await pool.query(
      `INSERT INTO student_requests (student_id, tipo_solicitud, estado, parallel_id, motivo)
       VALUES ($1, $2, 'PENDIENTE', $3, $4)
       RETURNING *`,
      [student_id, tipo_solicitud, parallel_id ?? null, motivo]
    );
    res.status(201).json({ message: 'Solicitud registrada.', solicitud: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating request:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 14. Listar solicitudes de un estudiante
app.get('/api/students/:student_id/requests', async (req: Request, res: Response): Promise<void> => {
  const { student_id } = req.params;
  try {
    const result = await pool.query(
      `SELECT sr.*, p.name AS parallel_name, sub.name AS subject_name
       FROM student_requests sr
       LEFT JOIN parallels p  ON sr.parallel_id = p.id
       LEFT JOIN subjects sub ON p.subject_id = sub.id
       WHERE sr.student_id = $1
       ORDER BY sr.fecha_solicitud DESC`,
      [student_id]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching student requests:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 15. Resolver una solicitud (uso administrativo)
// Body: { estado: 'APROBADA' | 'RECHAZADA', resuelto_por, notas_administrativo? }
app.patch('/api/requests/:id/resolve', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { estado, resuelto_por, notas_administrativo } = req.body;

  if (!estado || !['APROBADA', 'RECHAZADA'].includes(estado)) {
    res.status(400).json({ error: 'estado debe ser APROBADA o RECHAZADA.' });
    return;
  }
  if (!resuelto_por) {
    res.status(400).json({ error: 'resuelto_por es obligatorio.' });
    return;
  }

  try {
    const solicitud = await pool.query('SELECT * FROM student_requests WHERE id = $1', [id]);
    if (solicitud.rowCount === 0) {
      res.status(404).json({ error: 'Solicitud no encontrada.' });
      return;
    }
    const req_data = solicitud.rows[0];

    // Si se aprueba un retiro fortuito, marcar TODAS las materias como RETIRADO
    if (estado === 'APROBADA' && req_data.tipo_solicitud === 'RETIRO_FORTUITO') {
      await pool.query(
        `UPDATE grades SET estado = 'RETIRADO'
         WHERE student_id = $1 AND estado = 'CURSANDO'`,
        [req_data.student_id]
      );
      await pool.query(
        `DELETE FROM student_enrollments
         WHERE student_id = $1
           AND parallel_id IN (
             SELECT parallel_id FROM grades WHERE student_id = $1 AND estado = 'RETIRADO'
           )`,
        [req_data.student_id]
      );
    }

    const result = await pool.query(
      `UPDATE student_requests
       SET estado = $1, resuelto_por = $2, notas_administrativo = $3, fecha_resolucion = NOW()
       WHERE id = $4
       RETURNING *`,
      [estado, resuelto_por, notas_administrativo ?? null, id]
    );
    res.json({ message: `Solicitud ${estado.toLowerCase()}.`, solicitud: result.rows[0] });
  } catch (error: any) {
    console.error('Error resolving request:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Iniciar servidor y DB
app.listen(PORT, async () => {
  console.log(`🚀 ms-03-enrollment corriendo en http://localhost:${PORT}`);
  await initDb();
});

