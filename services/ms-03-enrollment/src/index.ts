import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb, pool } from './db';

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

// Iniciar servidor y DB
app.listen(PORT, async () => {
  console.log(`🚀 ms-03-enrollment corriendo en http://localhost:${PORT}`);
  await initDb();
});
