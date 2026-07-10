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

// 1. Obtener todos los semestres activos
app.get('/api/semesters', async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query('SELECT * FROM semesters WHERE active = true ORDER BY level ASC');
    res.json(rows);
  } catch (error: any) {
    console.error('Error fetching semesters:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    client.release();
  }
});

// 1.5 Obtener malla curricular agrupada por semestres
app.get('/api/curriculum', async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const semestersResult = await client.query('SELECT * FROM semesters ORDER BY level ASC');
    const semesters = semestersResult.rows;

    const subjectsResult = await client.query(`
      SELECT 
        s.id, s.code, s.name, s.description, s.semester_id,
        COALESCE(
          json_agg(
            json_build_object('id', prereq.id, 'code', prereq.code, 'name', prereq.name)
          ) FILTER (WHERE prereq.id IS NOT NULL), '[]'
        ) as prerequisites
      FROM subjects s
      LEFT JOIN subject_prerequisites sp ON s.id = sp.subject_id
      LEFT JOIN subjects prereq ON sp.prerequisite_id = prereq.id
      GROUP BY s.id, s.code, s.name, s.description, s.semester_id
      ORDER BY s.id ASC
    `);

    const subjects = subjectsResult.rows;

    // Agrupar materias por semestre
    const curriculum = semesters.map(semester => {
      return {
        ...semester,
        subjects: subjects.filter(sub => sub.semester_id === semester.id)
      };
    });

    res.json(curriculum);
  } catch (error: any) {
    console.error('Error fetching curriculum:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    client.release();
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

// 6.5. Obtener Horario Específico de un Estudiante
app.get('/api/students/:id/schedules', async (req: Request, res: Response): Promise<void> => {
  const studentIdStr = req.params.id;
  try {
    const query = `
      SELECT s.*, p.name as parallel_name, sub.name as subject_name, sem.name as semester_name, sem.level as semester_level
      FROM schedules s
      JOIN parallels p ON s.parallel_id = p.id
      JOIN subjects sub ON p.subject_id = sub.id
      JOIN semesters sem ON sub.semester_id = sem.id
      JOIN student_enrollments se ON se.parallel_id = p.id
      LEFT JOIN grades g ON g.student_id = se.student_id AND g.parallel_id = p.id
      WHERE se.student_id = $1 AND (g.estado = 'CURSANDO' OR g.estado IS NULL)
      ORDER BY s.dia, s.hora_inicio
    `;
    const result = await pool.query(query, [studentIdStr]);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching student specific schedules:', error);
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

// 8.5. Estado académico consolidado del estudiante:
// - Recorre TODA la malla curricular (fuente única: subjects.semester_id)
// - Cruza con el historial completo de notas del estudiante (todas las materias, todos los intentos)
// - Determina el semestre pendiente más bajo (obligatorio), el/los semestre(s) en curso,
//   y si el estudiante es REGULAR (matriculado solo en el semestre obligatorio, materias
//   completas, primera matrícula) o IRREGULAR (matriculado en 2 semestres, o repitiendo, etc.)
// Esta es la fuente única de verdad que consumen Calificaciones, Horario y el resumen de inicio.
app.get('/api/students/:id/academic-status', async (req: Request, res: Response): Promise<void> => {
  const studentId = req.params.id;
  try {
    // Última nota conocida por materia (por si el estudiante tiene varios intentos/paralelos
    // históricos de la misma materia), junto con el número de intentos totales.
    const query = `
      WITH student_subject_grades AS (
        SELECT
          sub.id AS subject_id,
          p.name AS parallel_name,
          g.estado,
          g.nota_total,
          g.nota_individual,
          g.nota_grupal,
          g.examen_hemisemestre,
          g.examen_final,
          g.updated_at,
          g.id AS grade_id,
          ROW_NUMBER() OVER (PARTITION BY sub.id ORDER BY g.updated_at ASC, g.id ASC) AS attempt_number,
          COUNT(*) OVER (PARTITION BY sub.id) AS attempts_count
        FROM grades g
        JOIN parallels p  ON g.parallel_id = p.id
        JOIN subjects sub ON p.subject_id  = sub.id
        WHERE g.student_id = $1
      ),
      latest_per_subject AS (
        SELECT DISTINCT ON (subject_id)
          subject_id, parallel_name, estado, nota_total, nota_individual, nota_grupal,
          examen_hemisemestre, examen_final, attempts_count, attempt_number
        FROM student_subject_grades
        ORDER BY subject_id, attempt_number DESC
      )
      SELECT
        sub.id, sub.code, sub.name,
        sem.id AS semester_id, sem.level AS semester_level, sem.name AS semester_name,
        lps.parallel_name, lps.estado AS raw_estado, lps.nota_total, lps.nota_individual, lps.nota_grupal,
        lps.examen_hemisemestre, lps.examen_final, lps.attempts_count, lps.attempt_number
      FROM subjects sub
      JOIN semesters sem ON sub.semester_id = sem.id
      LEFT JOIN latest_per_subject lps ON lps.subject_id = sub.id
      ORDER BY sem.level ASC, sub.id ASC
    `;
    const { rows } = await pool.query(query, [studentId]);

    // Normalizar estado para consumo del frontend: PENDIENTE (nunca la tomó) / MATRICULADO
    // (equivalente a CURSANDO, nombre pedido por negocio) / APROBADO / REPROBADO / RETIRADO
    const subjects = rows.map((r: any) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      semester_id: r.semester_id,
      semester_level: r.semester_level,
      semester_name: r.semester_name,
      parallel_name: r.parallel_name ?? null,
      nota_total: r.nota_total,
      nota_individual: r.nota_individual,
      nota_grupal: r.nota_grupal,
      examen_hemisemestre: r.examen_hemisemestre,
      examen_final: r.examen_final,
      attempts_count: r.attempts_count ? Number(r.attempts_count) : 0,
      attempt_number: r.attempt_number ? Number(r.attempt_number) : 0,
      is_first_attempt: !r.attempts_count || Number(r.attempts_count) <= 1,
      estado: r.raw_estado === 'CURSANDO' ? 'MATRICULADO' : (r.raw_estado ?? 'PENDIENTE')
    }));

    const approvedCount = subjects.filter(s => s.estado === 'APROBADO').length;

    // Semestre pendiente más bajo = primer nivel (1..10) donde queda al menos una materia sin aprobar
    let lowestPendingLevel: number | null = null;
    for (let level = 1; level <= 10; level++) {
      const atLevel = subjects.filter(s => s.semester_level === level);
      if (atLevel.length > 0 && atLevel.some(s => s.estado !== 'APROBADO')) {
        lowestPendingLevel = level;
        break;
      }
    }

    const enrolledSubjects = subjects.filter(s => s.estado === 'MATRICULADO');
    const enrolledLevels = Array.from(new Set(enrolledSubjects.map(s => s.semester_level))).sort((a, b) => a - b);

    const mandatoryLevel = lowestPendingLevel;
    const optionalLevel = lowestPendingLevel && lowestPendingLevel < 10 ? lowestPendingLevel + 1 : null;

    let regularity: 'REGULAR' | 'IRREGULAR' | 'SIN_MATRICULA_ACTIVA' | 'EGRESADO';
    if (lowestPendingLevel === null) {
      regularity = 'EGRESADO';
    } else if (enrolledLevels.length === 0) {
      regularity = 'SIN_MATRICULA_ACTIVA';
    } else if (enrolledLevels.length === 1 && enrolledLevels[0] === mandatoryLevel) {
      const pendingAtMandatory = subjects.filter(s => s.semester_level === mandatoryLevel && s.estado !== 'APROBADO');
      const enrolledIdsAtMandatory = new Set(enrolledSubjects.map(s => s.id));
      const coversAllPending = pendingAtMandatory.every(s => enrolledIdsAtMandatory.has(s.id));
      const allFirstAttempt = enrolledSubjects.every(s => s.is_first_attempt);
      regularity = (coversAllPending && allFirstAttempt) ? 'REGULAR' : 'IRREGULAR';
    } else {
      // Matriculado en 2 semestres (o en niveles que no son el obligatorio) => irregular
      regularity = 'IRREGULAR';
    }

    // Agrupar por semestre para consumo directo del frontend (Calificaciones, Malla, resumen)
    const semesterMap = new Map<number, { level: number; semester_id: number; semester_name: string; subjects: any[] }>();
    for (const s of subjects) {
      if (!semesterMap.has(s.semester_level)) {
        semesterMap.set(s.semester_level, { level: s.semester_level, semester_id: s.semester_id, semester_name: s.semester_name, subjects: [] });
      }
      semesterMap.get(s.semester_level)!.subjects.push(s);
    }
    const semesters = Array.from(semesterMap.values())
      .sort((a, b) => a.level - b.level)
      .map(sem => ({
        ...sem,
        is_mandatory: sem.level === mandatoryLevel,
        is_optional: sem.level === optionalLevel,
        is_current: enrolledLevels.includes(sem.level)
      }));

    res.json({
      student_id: Number(studentId),
      regularity,
      lowest_pending_level: lowestPendingLevel,
      mandatory_level: mandatoryLevel,
      optional_level: optionalLevel,
      enrolled_levels: enrolledLevels,
      approved_count: approvedCount,
      total_curriculum_count: subjects.length,
      semesters
    });
  } catch (error: any) {
    console.error('Error computing academic status:', error);
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

// 16. Inscribir y Matricular Estudiante
// Body: { semester_id, parallels: [id1, id2, ...], repeats_subjects: boolean, is_second_degree: boolean, credits: number }
app.post('/api/students/:student_id/enroll', async (req: Request, res: Response): Promise<void> => {
  const studentIdStr = req.params.student_id as string;
  const student_id = parseInt(studentIdStr, 10);
  const { semester_id, parallels, repeats_subjects, is_second_degree, credits } = req.body;

  if (isNaN(student_id)) {
    res.status(400).json({ error: 'student_id debe ser un entero válido.' });
    return;
  }

  if (!semester_id || !Array.isArray(parallels) || parallels.length === 0) {
    res.status(400).json({ error: 'semester_id y parallels (array no vacío) son obligatorios.' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Determinar arancel e insertar estado de matrícula
    const needs_payment = repeats_subjects || is_second_degree;
    const creditCount = parseInt(credits, 10) || 15; // default a 15 si no se especifica
    // Costo simulado: $10 por crédito si repite/segunda carrera
    const payment_amount = needs_payment ? creditCount * 10.00 : 0.00;
    const status = needs_payment ? 'INSCRITO' : 'MATRICULADO';

    // Insertar/actualizar estado de matrícula
    await client.query(
      `INSERT INTO student_semester_status (student_id, semester_id, status, needs_payment, payment_amount, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (student_id, semester_id) DO UPDATE SET
         status = EXCLUDED.status,
         needs_payment = EXCLUDED.needs_payment,
         payment_amount = EXCLUDED.payment_amount,
         updated_at = NOW()`,
      [student_id, semester_id, status, needs_payment, payment_amount]
    );

    // Verificar prerrequisitos
    for (const parallel_id of parallels) {
      const prereqQuery = await client.query(
        `SELECT sp.prerequisite_id, s.name as prereq_name, target_subj.name as target_name
         FROM parallels p
         JOIN subjects target_subj ON p.subject_id = target_subj.id
         JOIN subject_prerequisites sp ON p.subject_id = sp.subject_id
         JOIN subjects s ON sp.prerequisite_id = s.id
         WHERE p.id = $1`,
        [parallel_id]
      );
      
      for (const prereq of prereqQuery.rows) {
        // Verificar si el estudiante aprobó este prerrequisito
        const gradeResult = await client.query(
          `SELECT estado FROM grades 
           JOIN parallels p ON grades.parallel_id = p.id
           WHERE grades.student_id = $1 AND p.subject_id = $2`,
          [student_id, prereq.prerequisite_id]
        );
        
        const passed = gradeResult.rows.some((r: any) => r.estado === 'APROBADO');
        if (!passed) {
          await client.query('ROLLBACK');
          res.status(400).json({ error: `Para matricularse en ${prereq.target_name} es necesario aprobar el prerrequisito: ${prereq.prereq_name}` });
          return;
        }
      }
    }

    // Limpiar inscripciones anteriores en este semestre (para permitir re-matrícula limpia)
    await client.query(
      `DELETE FROM student_enrollments 
       WHERE student_id = $1 
         AND parallel_id IN (
           SELECT p.id FROM parallels p
           JOIN subjects sub ON p.subject_id = sub.id
           WHERE sub.semester_id = $2
         )`,
      [student_id, semester_id]
    );

    // Inscribir al estudiante a los nuevos paralelos
    for (const parallel_id of parallels) {
      await client.query(
        `INSERT INTO student_enrollments (student_id, parallel_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [student_id, parallel_id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({
      message: 'Inscripción procesada correctamente.',
      student_id,
      semester_id,
      status,
      needs_payment,
      payment_amount
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error during student enrollment:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    client.release();
  }
});

// 17. Obtener Estado de Matrícula del Estudiante
app.get('/api/students/:student_id/semester-status/:semester_id', async (req: Request, res: Response): Promise<void> => {
  const student_id = parseInt(req.params.student_id as string, 10);
  const semester_id = parseInt(req.params.semester_id as string, 10);

  if (isNaN(student_id) || isNaN(semester_id)) {
    res.status(400).json({ error: 'student_id y semester_id deben ser enteros válidos.' });
    return;
  }

  try {
    const result = await pool.query(
      `SELECT * FROM student_semester_status 
       WHERE student_id = $1 AND semester_id = $2`,
      [student_id, semester_id]
    );

    if (result.rows.length === 0) {
      res.json({
        student_id,
        semester_id,
        status: 'NO_INSCRITO',
        needs_payment: false,
        payment_amount: 0.00
      });
    } else {
      res.json(result.rows[0]);
    }
  } catch (error: any) {
    console.error('Error fetching semester status:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/enrollments/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const matriculadosRes = await pool.query("SELECT COUNT(DISTINCT student_id) FROM student_semester_status WHERE status = 'MATRICULADO'");
    const inscritosRes = await pool.query("SELECT COUNT(DISTINCT student_id) FROM student_semester_status WHERE status = 'INSCRITO'");
    const terceraRes = await pool.query("SELECT COUNT(DISTINCT student_id) FROM student_requests WHERE tipo_solicitud = 'TERCERA_MATRICULA'");
    
    const primeraCount = parseInt(matriculadosRes.rows[0].count || '0', 10);
    const segundaCount = parseInt(inscritosRes.rows[0].count || '0', 10);
    const terceraCount = parseInt(terceraRes.rows[0].count || '0', 10);

    res.json({
      primeraMatricula: primeraCount,
      segundaMatricula: segundaCount,
      terceraMatricula: terceraCount
    });
  } catch (error: any) {
    console.error('Error fetching enrollment stats:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

import { startKafkaConsumer } from './kafkaConsumer';

// Iniciar servidor y DB
app.listen(PORT, async () => {
  console.log(`🚀 ms-03-enrollment corriendo en http://localhost:${PORT}`);
  await initDb();
  startKafkaConsumer().catch(err => {
    console.error('❌ Error al arrancar el consumidor de Kafka para Matrículas:', err);
  });
});
