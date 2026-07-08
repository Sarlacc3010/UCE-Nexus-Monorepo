-- UCE-Nexus Enrollment and Academic Structure Schema

-- 1. Semesters
CREATE TABLE IF NOT EXISTS semesters (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    level INTEGER NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Subjects (Asignaturas)
CREATE TABLE IF NOT EXISTS subjects (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20),
    name VARCHAR(255) NOT NULL,
    description VARCHAR(255),
    semester_id INTEGER REFERENCES semesters(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2.1 Subject Prerequisites
CREATE TABLE IF NOT EXISTS subject_prerequisites (
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    prerequisite_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    PRIMARY KEY (subject_id, prerequisite_id)
);

-- 3. Parallels (Paralelos)
CREATE TABLE IF NOT EXISTS parallels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Schedules (Horarios fijos de clase)
CREATE TABLE IF NOT EXISTS schedules (
    id SERIAL PRIMARY KEY,
    parallel_id INTEGER REFERENCES parallels(id) ON DELETE CASCADE,
    lab_id INTEGER NOT NULL, -- Mapped to physical lab IDs
    dia VARCHAR(20) NOT NULL, -- Lunes, Martes, etc.
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_times CHECK (hora_fin > hora_inicio)
);

-- 5. Student Enrollments (Inscripción de estudiantes a paralelos)
CREATE TABLE IF NOT EXISTS student_enrollments (
    student_id INTEGER NOT NULL,
    parallel_id INTEGER REFERENCES parallels(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (student_id, parallel_id)
);

-- 6. Professor Assignments (Asignación de docentes a materias)
CREATE TABLE IF NOT EXISTS professor_assignments (
    professor_id INTEGER NOT NULL,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (professor_id, subject_id)
);

-- Index for schedules conflict checks
CREATE INDEX IF NOT EXISTS idx_schedules_lookup ON schedules(lab_id, dia, hora_inicio, hora_fin);


-- ==========================================================
-- SEED DATA FROM SISTEMA_LABORATORIOS_ARQUI
-- ==========================================================

-- Semesters Seed
INSERT INTO semesters (id, name, level, active) VALUES
(1, 'Primer Semestre', 1, true),
(2, 'Segundo Semestre', 2, true),
(3, 'Tercer Semestre', 3, true),
(4, 'Cuarto Semestre', 4, true),
(5, 'Quinto Semestre', 5, true),
(6, 'Sexto Semestre', 6, true),
(7, 'Séptimo Semestre', 7, true),
(8, 'Octavo Semestre', 8, true),
(9, 'Noveno Semestre', 9, true),
(10, 'Décimo Semestre', 10, true)
ON CONFLICT (id) DO NOTHING;

-- Subjects Seed
INSERT INTO subjects (id, code, name, description, semester_id) VALUES
(1, 'TIP01BFT01', 'FUNDAMENTOS DE MATEMATICA', 'Nivel 1', 1),
(2, 'TIP01BFT02', 'ANALISIS I', 'Nivel 1', 1),
(3, 'TIP01BFT03', 'PROGRAMACION I', 'Nivel 1', 1),
(4, 'TIP01BFT04', 'FUNDAMENTOS DE SISTEMAS DE INFORMACION', 'Nivel 1', 1),
(5, 'TIP01BFT06', 'FISICA APLICADA', 'Nivel 1', 1),
(6, 'TIP01BCL05', 'COMUNICACION Y LENGUAJE', 'Nivel 1', 1),
(7, 'TIP02BFT01', 'PROGRAMACION II', 'Nivel 2', 2),
(8, 'TIP02BFT02', 'ANALISIS II', 'Nivel 2', 2),
(9, 'TIP02BFT03', 'NUEVAS TECNOLOGIAS E INNOVACION EN SISTEMAS DE INFORMACION', 'Nivel 2', 2),
(10, 'TIP02BFT04', 'MATEMATICAS DISCRETAS', 'Nivel 2', 2),
(11, 'TIP02BFT05', 'ALGEBRA LINEAL', 'Nivel 2', 2),
(12, 'TIP03BFT01', 'ESTRUCTURA DE DATOS', 'Nivel 3', 3),
(13, 'TIP03BFT02', 'ARQUITECTURA DE COMPUTADORES', 'Nivel 3', 3),
(14, 'TIP03BFT03', 'INTRODUCCIÓN A LA INVESTIGACION CIENTÍFICA', 'Nivel 3', 3),
(15, 'TIP03BFT04', 'INTERFACES DE USUARIO', 'Nivel 3', 3),
(16, 'TIP03BFT05', 'PROBABILIDADES Y ESTADÍSTICA', 'Nivel 3', 3),
(17, 'TIP03BFT06', 'ECUACIONES DIFERENCIALES', 'Nivel 3', 3),
(18, 'TIP02BCL06', 'LIDERAZGO', 'Nivel 2', 2),
(19, 'TIP04BFT01', 'ALGORITMOS', 'Nivel 4', 4),
(20, 'TIP04BFT02', 'SISTEMAS OPERATIVOS I', 'Nivel 4', 4),
(21, 'TIP04BFT03', 'INFRAESTRUCTURA DE TI - I', 'Nivel 4', 4),
(22, 'TIP04BFT04', 'MÉTODOS NUMÉRICOS', 'Nivel 4', 4),
(23, 'TIP04BFT05', 'ALMACENAJE DE DATOS Y DE LA INFORMACIÓN', 'Nivel 4', 4),
(24, 'TIP05BFT01', 'MARCOS DE DESARROLLO I', 'Nivel 5', 5),
(25, 'TIP05BFT02', 'SISTEMAS OPERATIVOS II', 'Nivel 5', 5),
(26, 'TIP05BFT03', 'INFRAESTRUCUTURA DE TI - II', 'Nivel 5', 5),
(27, 'TIP05BFT04', 'GESTIÓN DE DATOS Y DE LA INFORMACIÓN', 'Nivel 5', 5),
(28, 'TIP05BFT05', 'ANÁLISIS Y DISEÑO DE SISTEMAS', 'Nivel 5', 5),
(29, 'TIP06BFT01', 'MARCOS DE DESARROLLO II', 'Nivel 6', 6),
(30, 'TIP06BFT02', 'ANÁLISIS DE DATOS', 'Nivel 6', 6),
(31, 'TIP06BFT03', 'SEGURIDAD Y GESTIÓN DE RIESGO EN LAS TI', 'Nivel 6', 6),
(32, 'TIP06BFT04', 'DESARROLLO DE SISTEMAS DE INFORMACIÓN', 'Nivel 6', 6),
(33, 'TIP06BFT05', 'CONTABILIDAD FINANCIERA', 'Nivel 6', 6),
(34, 'TIP06PVS1', 'VINCULACION CON LA COLECTIVIDAD I', 'Nivel 6', 6),
(35, 'TIP07BFT01', 'PROGRAMACIÓN WEB', 'Nivel 7', 7),
(36, 'TIP07BFT02', 'ARQUITECTURA DE SOFTWARE', 'Nivel 7', 7),
(37, 'TIP07BFT03', 'SOCIEDAD DE LA INFORMACIÓN', 'Nivel 7', 7),
(38, 'TIP07BFT04', 'INTELIGENCIA DE NEGOCIOS', 'Nivel 7', 7),
(39, 'TIP07BFT05', 'FUNDAMENTOS DE ECONCOMÍA', 'Nivel 7', 7),
(40, 'TIP07BFT06', 'INVESTIGACIÓN APLICADA', 'Nivel 7', 7),
(41, 'TIP07PVS1', 'VINCULACION CON LA COLECTIVIDAD II', 'Nivel 7', 7),
(42, 'TIP08BFT01', 'PROGRAMACIÓN DISTRIBUIDA', 'Nivel 8', 8),
(43, 'TIP08BFT02', 'MINERIA DE DATOS', 'Nivel 8', 8),
(44, 'TIP08BFT03', 'CONTROL DE CALIDAD DEL SOFTWARE', 'Nivel 8', 8),
(45, 'TIP08BFT04', 'AUDITORIA DE TI', 'Nivel 8', 8),
(46, 'TIP08BFT05', 'INVESTIGACIÓN OPERATIVA', 'Nivel 8', 8),
(47, 'TIP08PPPP1', 'PRACTICAS PRE PROFESIONALES I', 'Nivel 8', 8),
(48, 'TIP08PPPP2', 'PRACTICAS PRE PROFESIONALES II', 'Nivel 8', 8),
(49, 'TIP09BFT01', 'MODELOS DE INVESTIGACIÓN DE OPERACIONES', 'Nivel 9', 9),
(50, 'TIP09BFT02', 'GESTIÓN EN PROCESOS DE NEGOCIOS (BPM)', 'Nivel 9', 9),
(51, 'TIP09BFT03', 'GESTIÓN DE PROYECTOS EN SISTEMAS DE INFORMACIÓN', 'Nivel 9', 9),
(52, 'TIP09BFT04', 'LEGISLACIÓN INFORMÁTICA', 'Nivel 9', 9),
(53, 'TIP09TEMTT1', 'TITULACION I', 'Nivel 9', 9),
(54, 'TIP07PPPP3', 'PRACTICAS PRE PROFESIONALES III', 'Nivel 7', 7),
(55, 'TIP10BFT01', 'SISTEMAS DE INFORMACIÓN EMPRESARIAL', 'Nivel 10', 10),
(56, 'TIP10BFT02', 'FORMACIÓN DE EMPRESAS DE BASE TECNOLÓGICA', 'Nivel 10', 10),
(57, 'TIP10BFT03', 'PROGRAMACIÓN PARA DISPOSITIVOS MÓVILES', 'Nivel 10', 10),
(58, 'TIP10BFT04', 'ESTRATEGIA, GESTIÓN Y ADQUISICIÓN EN LOS SISTEMAS DE INFORMACIÓN', 'Nivel 10', 10),
(59, 'TIP10TEMTT1', 'TITULACIÓN II', 'Nivel 10', 10)
ON CONFLICT (id) DO NOTHING;

-- Subject Prerequisites Seed
INSERT INTO subject_prerequisites (subject_id, prerequisite_id) VALUES
(7, 3),
(8, 2),
(9, 4),
(10, 1),
(11, 1),
(12, 7),
(13, 5),
(14, 6),
(15, 9),
(16, 10),
(17, 11),
(17, 8),
(18, 6),
(19, 12),
(20, 13),
(21, 13),
(22, 17),
(22, 16),
(23, 15),
(24, 19),
(24, 23),
(25, 20),
(26, 21),
(27, 23),
(28, 23),
(29, 24),
(30, 27),
(30, 22),
(32, 28),
(33, 16),
(35, 29),
(36, 30),
(37, 14),
(38, 30),
(38, 31),
(39, 33),
(40, 14),
(42, 35),
(43, 38),
(43, 35),
(44, 36),
(45, 38),
(46, 36),
(49, 46),
(50, 43),
(51, 45),
(51, 44),
(52, 42),
(55, 50),
(56, 50),
(57, 42),
(58, 51)
ON CONFLICT (subject_id, prerequisite_id) DO NOTHING;

-- Parallels Seed
INSERT INTO parallels (id, name, subject_id) VALUES
(1, 'SI1-001', 1),
(2, 'SI1-002', 1),
(3, 'SI1-001', 2),
(4, 'SI1-002', 2),
(5, 'SI1-001', 3),
(6, 'SI1-002', 3),
(7, 'SI1-001', 4),
(8, 'SI1-002', 4),
(9, 'SI1-001', 5),
(10, 'SI1-002', 5),
(11, 'SI1-001', 6),
(12, 'SI1-002', 6),
(13, 'SI2-001', 7),
(14, 'SI2-002', 7),
(15, 'SI2-001', 8),
(16, 'SI2-002', 8),
(17, 'SI2-001', 9),
(18, 'SI2-002', 9),
(19, 'SI2-001', 10),
(20, 'SI2-002', 10),
(21, 'SI2-001', 11),
(22, 'SI2-002', 11),
(23, 'SI3-001', 12),
(24, 'SI3-002', 12),
(25, 'SI3-001', 13),
(26, 'SI3-002', 13),
(27, 'SI3-001', 14),
(28, 'SI3-002', 14),
(29, 'SI3-001', 15),
(30, 'SI3-002', 15),
(31, 'SI3-001', 16),
(32, 'SI3-002', 16),
(33, 'SI3-001', 17),
(34, 'SI3-002', 17),
(35, 'SI2-001', 18),
(36, 'SI2-002', 18),
(37, 'SI4-001', 19),
(38, 'SI4-002', 19),
(39, 'SI4-001', 20),
(40, 'SI4-002', 20),
(41, 'SI4-001', 21),
(42, 'SI4-002', 21),
(43, 'SI4-001', 22),
(44, 'SI4-002', 22),
(45, 'SI4-001', 23),
(46, 'SI4-002', 23),
(47, 'SI5-001', 24),
(48, 'SI5-002', 24),
(49, 'SI5-001', 25),
(50, 'SI5-002', 25),
(51, 'SI5-001', 26),
(52, 'SI5-002', 26),
(53, 'SI5-001', 27),
(54, 'SI5-002', 27),
(55, 'SI5-001', 28),
(56, 'SI5-002', 28),
(57, 'SI6-001', 29),
(58, 'SI6-002', 29),
(59, 'SI6-001', 30),
(60, 'SI6-002', 30),
(61, 'SI6-001', 31),
(62, 'SI6-002', 31),
(63, 'SI6-001', 32),
(64, 'SI6-002', 32),
(65, 'SI6-001', 33),
(66, 'SI6-002', 33),
(67, 'SI6-001', 34),
(68, 'SI6-002', 34),
(69, 'SI7-001', 35),
(70, 'SI7-002', 35),
(71, 'SI7-001', 36),
(72, 'SI7-002', 36),
(73, 'SI7-001', 37),
(74, 'SI7-002', 37),
(75, 'SI7-001', 38),
(76, 'SI7-002', 38),
(77, 'SI7-001', 39),
(78, 'SI7-002', 39),
(79, 'SI7-001', 40),
(80, 'SI7-002', 40),
(81, 'SI7-001', 41),
(82, 'SI7-002', 41),
(83, 'SI8-001', 42),
(84, 'SI8-002', 42),
(85, 'SI8-001', 43),
(86, 'SI8-002', 43),
(87, 'SI8-001', 44),
(88, 'SI8-002', 44),
(89, 'SI8-001', 45),
(90, 'SI8-002', 45),
(91, 'SI8-001', 46),
(92, 'SI8-002', 46),
(93, 'SI8-001', 47),
(94, 'SI8-002', 47),
(95, 'SI8-001', 48),
(96, 'SI8-002', 48),
(97, 'SI9-001', 49),
(98, 'SI9-002', 49),
(99, 'SI9-001', 50),
(100, 'SI9-002', 50),
(101, 'SI9-001', 51),
(102, 'SI9-002', 51),
(103, 'SI9-001', 52),
(104, 'SI9-002', 52),
(105, 'SI9-001', 53),
(106, 'SI9-002', 53),
(107, 'SI7-001', 54),
(108, 'SI7-002', 54),
(109, 'SI10-001', 55),
(110, 'SI10-002', 55),
(111, 'SI10-001', 56),
(112, 'SI10-002', 56),
(113, 'SI10-001', 57),
(114, 'SI10-002', 57),
(115, 'SI10-001', 58),
(116, 'SI10-002', 58),
(117, 'SI10-001', 59),
(118, 'SI10-002', 59)
ON CONFLICT (id) DO NOTHING;

-- Schedules Seed
INSERT INTO schedules (id, parallel_id, lab_id, dia, hora_inicio, hora_fin) VALUES
(1, 1, 4, 'Miércoles', '14:00:00', '16:00:00'),
(2, 1, 13, 'Lunes', '14:00:00', '16:00:00'),
(3, 2, 7, 'Miércoles', '18:00:00', '20:00:00'),
(4, 2, 6, 'Martes', '07:00:00', '09:00:00'),
(5, 3, 2, 'Lunes', '14:00:00', '16:00:00'),
(6, 3, 5, 'Jueves', '18:00:00', '20:00:00'),
(7, 4, 5, 'Martes', '11:00:00', '13:00:00'),
(8, 4, 14, 'Martes', '07:00:00', '09:00:00'),
(9, 5, 18, 'Viernes', '09:00:00', '11:00:00'),
(10, 5, 5, 'Viernes', '16:00:00', '18:00:00'),
(11, 6, 6, 'Jueves', '14:00:00', '16:00:00'),
(12, 6, 17, 'Jueves', '14:00:00', '16:00:00'),
(13, 7, 20, 'Miércoles', '07:00:00', '09:00:00'),
(14, 7, 2, 'Jueves', '16:00:00', '18:00:00'),
(15, 8, 4, 'Martes', '11:00:00', '13:00:00'),
(16, 8, 4, 'Jueves', '09:00:00', '11:00:00'),
(17, 9, 13, 'Viernes', '18:00:00', '20:00:00'),
(18, 9, 8, 'Jueves', '11:00:00', '13:00:00'),
(19, 10, 12, 'Lunes', '18:00:00', '20:00:00'),
(20, 10, 12, 'Jueves', '14:00:00', '16:00:00'),
(21, 11, 12, 'Martes', '18:00:00', '20:00:00'),
(22, 11, 2, 'Lunes', '11:00:00', '13:00:00'),
(23, 12, 8, 'Miércoles', '16:00:00', '18:00:00'),
(24, 12, 20, 'Martes', '11:00:00', '13:00:00'),
(25, 13, 13, 'Martes', '09:00:00', '11:00:00'),
(26, 13, 6, 'Viernes', '18:00:00', '20:00:00'),
(27, 14, 4, 'Jueves', '14:00:00', '16:00:00'),
(28, 14, 16, 'Martes', '16:00:00', '18:00:00'),
(29, 15, 13, 'Martes', '09:00:00', '11:00:00'),
(30, 15, 16, 'Martes', '07:00:00', '09:00:00'),
(31, 16, 1, 'Jueves', '14:00:00', '16:00:00'),
(32, 16, 1, 'Miércoles', '14:00:00', '16:00:00'),
(33, 17, 19, 'Jueves', '09:00:00', '11:00:00'),
(34, 17, 15, 'Miércoles', '18:00:00', '20:00:00'),
(35, 18, 7, 'Miércoles', '18:00:00', '20:00:00'),
(36, 18, 19, 'Martes', '07:00:00', '09:00:00'),
(37, 19, 6, 'Martes', '14:00:00', '16:00:00'),
(38, 19, 5, 'Jueves', '07:00:00', '09:00:00'),
(39, 20, 12, 'Lunes', '16:00:00', '18:00:00'),
(40, 20, 6, 'Jueves', '18:00:00', '20:00:00'),
(41, 21, 10, 'Martes', '09:00:00', '11:00:00'),
(42, 21, 7, 'Viernes', '14:00:00', '16:00:00'),
(43, 22, 8, 'Martes', '09:00:00', '11:00:00'),
(44, 22, 6, 'Jueves', '16:00:00', '18:00:00'),
(45, 23, 13, 'Jueves', '14:00:00', '16:00:00'),
(46, 23, 13, 'Lunes', '07:00:00', '09:00:00'),
(47, 24, 18, 'Martes', '18:00:00', '20:00:00'),
(48, 24, 11, 'Viernes', '16:00:00', '18:00:00'),
(49, 25, 1, 'Lunes', '14:00:00', '16:00:00'),
(50, 25, 17, 'Martes', '18:00:00', '20:00:00'),
(51, 26, 5, 'Martes', '09:00:00', '11:00:00'),
(52, 26, 3, 'Viernes', '14:00:00', '16:00:00'),
(53, 27, 4, 'Martes', '11:00:00', '13:00:00'),
(54, 27, 11, 'Lunes', '18:00:00', '20:00:00'),
(55, 28, 17, 'Martes', '11:00:00', '13:00:00'),
(56, 28, 15, 'Viernes', '14:00:00', '16:00:00'),
(57, 29, 13, 'Lunes', '09:00:00', '11:00:00'),
(58, 29, 17, 'Lunes', '18:00:00', '20:00:00'),
(59, 30, 18, 'Jueves', '14:00:00', '16:00:00'),
(60, 30, 18, 'Lunes', '11:00:00', '13:00:00'),
(61, 31, 14, 'Lunes', '18:00:00', '20:00:00'),
(62, 31, 3, 'Martes', '07:00:00', '09:00:00'),
(63, 32, 15, 'Jueves', '18:00:00', '20:00:00'),
(64, 32, 10, 'Lunes', '11:00:00', '13:00:00'),
(65, 33, 10, 'Miércoles', '11:00:00', '13:00:00'),
(66, 33, 12, 'Lunes', '18:00:00', '20:00:00'),
(67, 34, 11, 'Viernes', '18:00:00', '20:00:00'),
(68, 34, 2, 'Martes', '07:00:00', '09:00:00'),
(69, 35, 11, 'Miércoles', '07:00:00', '09:00:00'),
(70, 35, 5, 'Miércoles', '14:00:00', '16:00:00'),
(71, 36, 10, 'Viernes', '11:00:00', '13:00:00'),
(72, 36, 18, 'Lunes', '11:00:00', '13:00:00'),
(73, 37, 18, 'Viernes', '18:00:00', '20:00:00'),
(74, 37, 4, 'Martes', '18:00:00', '20:00:00'),
(75, 38, 20, 'Lunes', '07:00:00', '09:00:00'),
(76, 38, 9, 'Martes', '11:00:00', '13:00:00'),
(77, 39, 5, 'Jueves', '14:00:00', '16:00:00'),
(78, 39, 1, 'Martes', '18:00:00', '20:00:00'),
(79, 40, 19, 'Martes', '16:00:00', '18:00:00'),
(80, 40, 2, 'Jueves', '11:00:00', '13:00:00'),
(81, 41, 15, 'Miércoles', '16:00:00', '18:00:00'),
(82, 41, 20, 'Miércoles', '07:00:00', '09:00:00'),
(83, 42, 5, 'Viernes', '16:00:00', '18:00:00'),
(84, 42, 11, 'Viernes', '07:00:00', '09:00:00'),
(85, 43, 19, 'Viernes', '16:00:00', '18:00:00'),
(86, 43, 14, 'Jueves', '07:00:00', '09:00:00'),
(87, 44, 2, 'Miércoles', '07:00:00', '09:00:00'),
(88, 44, 9, 'Lunes', '07:00:00', '09:00:00'),
(89, 45, 13, 'Miércoles', '11:00:00', '13:00:00'),
(90, 45, 9, 'Martes', '09:00:00', '11:00:00'),
(91, 46, 1, 'Lunes', '07:00:00', '09:00:00'),
(92, 46, 10, 'Jueves', '07:00:00', '09:00:00'),
(93, 47, 6, 'Viernes', '07:00:00', '09:00:00'),
(94, 47, 19, 'Viernes', '18:00:00', '20:00:00'),
(95, 48, 8, 'Miércoles', '14:00:00', '16:00:00'),
(96, 48, 20, 'Viernes', '18:00:00', '20:00:00'),
(97, 49, 4, 'Martes', '07:00:00', '09:00:00'),
(98, 49, 5, 'Miércoles', '07:00:00', '09:00:00'),
(99, 50, 7, 'Jueves', '16:00:00', '18:00:00'),
(100, 50, 12, 'Viernes', '09:00:00', '11:00:00'),
(101, 51, 4, 'Martes', '18:00:00', '20:00:00'),
(102, 51, 11, 'Viernes', '16:00:00', '18:00:00'),
(103, 52, 7, 'Jueves', '18:00:00', '20:00:00'),
(104, 52, 3, 'Lunes', '16:00:00', '18:00:00'),
(105, 53, 11, 'Miércoles', '14:00:00', '16:00:00'),
(106, 53, 15, 'Miércoles', '16:00:00', '18:00:00'),
(107, 54, 17, 'Miércoles', '16:00:00', '18:00:00'),
(108, 54, 12, 'Lunes', '18:00:00', '20:00:00'),
(109, 55, 14, 'Martes', '07:00:00', '09:00:00'),
(110, 55, 11, 'Viernes', '14:00:00', '16:00:00'),
(111, 56, 9, 'Martes', '07:00:00', '09:00:00'),
(112, 56, 1, 'Viernes', '18:00:00', '20:00:00'),
(113, 57, 13, 'Martes', '14:00:00', '16:00:00'),
(114, 57, 12, 'Lunes', '11:00:00', '13:00:00'),
(115, 58, 18, 'Lunes', '11:00:00', '13:00:00'),
(116, 58, 7, 'Lunes', '14:00:00', '16:00:00'),
(117, 59, 15, 'Miércoles', '16:00:00', '18:00:00'),
(118, 59, 9, 'Martes', '14:00:00', '16:00:00'),
(119, 60, 9, 'Miércoles', '16:00:00', '18:00:00'),
(120, 60, 10, 'Lunes', '11:00:00', '13:00:00'),
(121, 61, 2, 'Viernes', '16:00:00', '18:00:00'),
(122, 61, 18, 'Martes', '11:00:00', '13:00:00'),
(123, 62, 19, 'Miércoles', '07:00:00', '09:00:00'),
(124, 62, 11, 'Miércoles', '18:00:00', '20:00:00'),
(125, 63, 15, 'Martes', '18:00:00', '20:00:00'),
(126, 63, 15, 'Lunes', '11:00:00', '13:00:00'),
(127, 64, 13, 'Martes', '07:00:00', '09:00:00'),
(128, 64, 17, 'Miércoles', '07:00:00', '09:00:00'),
(129, 65, 1, 'Miércoles', '09:00:00', '11:00:00'),
(130, 65, 6, 'Martes', '09:00:00', '11:00:00'),
(131, 66, 2, 'Jueves', '07:00:00', '09:00:00'),
(132, 66, 11, 'Jueves', '09:00:00', '11:00:00'),
(133, 67, 5, 'Miércoles', '09:00:00', '11:00:00'),
(134, 67, 17, 'Lunes', '09:00:00', '11:00:00'),
(135, 68, 18, 'Lunes', '14:00:00', '16:00:00'),
(136, 68, 6, 'Jueves', '16:00:00', '18:00:00'),
(137, 69, 13, 'Jueves', '14:00:00', '16:00:00'),
(138, 69, 17, 'Miércoles', '14:00:00', '16:00:00'),
(139, 70, 6, 'Lunes', '07:00:00', '09:00:00'),
(140, 70, 3, 'Martes', '09:00:00', '11:00:00'),
(141, 71, 14, 'Lunes', '16:00:00', '18:00:00'),
(142, 71, 3, 'Jueves', '16:00:00', '18:00:00'),
(143, 72, 16, 'Lunes', '09:00:00', '11:00:00'),
(144, 72, 18, 'Viernes', '16:00:00', '18:00:00'),
(145, 73, 1, 'Martes', '16:00:00', '18:00:00'),
(146, 73, 10, 'Miércoles', '09:00:00', '11:00:00'),
(147, 74, 7, 'Viernes', '18:00:00', '20:00:00'),
(148, 74, 18, 'Lunes', '09:00:00', '11:00:00'),
(149, 75, 16, 'Viernes', '16:00:00', '18:00:00'),
(150, 75, 14, 'Lunes', '09:00:00', '11:00:00'),
(151, 76, 10, 'Lunes', '18:00:00', '20:00:00'),
(152, 76, 12, 'Martes', '09:00:00', '11:00:00'),
(153, 77, 18, 'Martes', '18:00:00', '20:00:00'),
(154, 77, 14, 'Lunes', '09:00:00', '11:00:00'),
(155, 78, 1, 'Lunes', '09:00:00', '11:00:00'),
(156, 78, 8, 'Jueves', '09:00:00', '11:00:00'),
(157, 79, 4, 'Viernes', '11:00:00', '13:00:00'),
(158, 79, 1, 'Jueves', '16:00:00', '18:00:00'),
(159, 80, 5, 'Viernes', '16:00:00', '18:00:00'),
(160, 80, 7, 'Lunes', '18:00:00', '20:00:00'),
(161, 81, 15, 'Lunes', '07:00:00', '09:00:00'),
(162, 81, 11, 'Martes', '07:00:00', '09:00:00'),
(163, 82, 11, 'Miércoles', '09:00:00', '11:00:00'),
(164, 82, 1, 'Lunes', '18:00:00', '20:00:00'),
(165, 83, 17, 'Martes', '07:00:00', '09:00:00'),
(166, 83, 15, 'Miércoles', '09:00:00', '11:00:00'),
(167, 84, 19, 'Lunes', '14:00:00', '16:00:00'),
(168, 84, 6, 'Miércoles', '11:00:00', '13:00:00'),
(169, 85, 9, 'Martes', '14:00:00', '16:00:00'),
(170, 85, 1, 'Jueves', '16:00:00', '18:00:00'),
(171, 86, 16, 'Jueves', '18:00:00', '20:00:00'),
(172, 86, 14, 'Lunes', '11:00:00', '13:00:00'),
(173, 87, 8, 'Martes', '14:00:00', '16:00:00'),
(174, 87, 8, 'Jueves', '09:00:00', '11:00:00'),
(175, 88, 15, 'Martes', '14:00:00', '16:00:00'),
(176, 88, 5, 'Viernes', '16:00:00', '18:00:00'),
(177, 89, 12, 'Jueves', '18:00:00', '20:00:00'),
(178, 89, 17, 'Jueves', '11:00:00', '13:00:00'),
(179, 90, 17, 'Viernes', '18:00:00', '20:00:00'),
(180, 90, 2, 'Lunes', '07:00:00', '09:00:00'),
(181, 91, 4, 'Lunes', '14:00:00', '16:00:00'),
(182, 91, 14, 'Viernes', '07:00:00', '09:00:00'),
(183, 92, 6, 'Martes', '09:00:00', '11:00:00'),
(184, 92, 15, 'Viernes', '11:00:00', '13:00:00'),
(185, 93, 3, 'Lunes', '07:00:00', '09:00:00'),
(186, 93, 10, 'Jueves', '18:00:00', '20:00:00'),
(187, 94, 10, 'Miércoles', '16:00:00', '18:00:00'),
(188, 94, 13, 'Martes', '07:00:00', '09:00:00'),
(189, 95, 6, 'Miércoles', '16:00:00', '18:00:00'),
(190, 95, 16, 'Miércoles', '18:00:00', '20:00:00'),
(191, 96, 19, 'Miércoles', '16:00:00', '18:00:00'),
(192, 96, 10, 'Viernes', '16:00:00', '18:00:00'),
(193, 97, 9, 'Lunes', '18:00:00', '20:00:00'),
(194, 97, 18, 'Miércoles', '18:00:00', '20:00:00'),
(195, 98, 14, 'Martes', '07:00:00', '09:00:00'),
(196, 98, 8, 'Jueves', '18:00:00', '20:00:00'),
(197, 99, 13, 'Martes', '18:00:00', '20:00:00'),
(198, 99, 15, 'Martes', '11:00:00', '13:00:00'),
(199, 100, 6, 'Martes', '14:00:00', '16:00:00'),
(200, 100, 8, 'Viernes', '16:00:00', '18:00:00'),
(201, 101, 9, 'Martes', '11:00:00', '13:00:00'),
(202, 101, 11, 'Lunes', '11:00:00', '13:00:00'),
(203, 102, 16, 'Lunes', '14:00:00', '16:00:00'),
(204, 102, 10, 'Lunes', '18:00:00', '20:00:00'),
(205, 103, 6, 'Lunes', '09:00:00', '11:00:00'),
(206, 103, 20, 'Jueves', '09:00:00', '11:00:00'),
(207, 104, 5, 'Lunes', '11:00:00', '13:00:00'),
(208, 104, 12, 'Martes', '16:00:00', '18:00:00'),
(209, 105, 12, 'Martes', '14:00:00', '16:00:00'),
(210, 105, 3, 'Miércoles', '14:00:00', '16:00:00'),
(211, 106, 19, 'Miércoles', '18:00:00', '20:00:00'),
(212, 106, 4, 'Martes', '16:00:00', '18:00:00'),
(213, 107, 17, 'Lunes', '07:00:00', '09:00:00'),
(214, 107, 5, 'Martes', '11:00:00', '13:00:00'),
(215, 108, 6, 'Lunes', '14:00:00', '16:00:00'),
(216, 108, 20, 'Martes', '14:00:00', '16:00:00'),
(217, 109, 17, 'Jueves', '18:00:00', '20:00:00'),
(218, 109, 14, 'Viernes', '18:00:00', '20:00:00'),
(219, 110, 3, 'Viernes', '14:00:00', '16:00:00'),
(220, 110, 16, 'Martes', '11:00:00', '13:00:00'),
(221, 111, 13, 'Viernes', '11:00:00', '13:00:00'),
(222, 111, 4, 'Jueves', '18:00:00', '20:00:00'),
(223, 112, 9, 'Viernes', '16:00:00', '18:00:00'),
(224, 112, 7, 'Viernes', '09:00:00', '11:00:00'),
(225, 113, 4, 'Jueves', '11:00:00', '13:00:00'),
(226, 113, 15, 'Miércoles', '07:00:00', '09:00:00'),
(227, 114, 7, 'Lunes', '14:00:00', '16:00:00'),
(228, 114, 16, 'Jueves', '14:00:00', '16:00:00'),
(229, 115, 3, 'Martes', '07:00:00', '09:00:00'),
(230, 115, 12, 'Jueves', '14:00:00', '16:00:00'),
(231, 116, 9, 'Viernes', '16:00:00', '18:00:00'),
(232, 116, 17, 'Jueves', '11:00:00', '13:00:00'),
(233, 117, 17, 'Martes', '14:00:00', '16:00:00'),
(234, 117, 15, 'Jueves', '11:00:00', '13:00:00'),
(235, 118, 5, 'Martes', '16:00:00', '18:00:00'),
(236, 118, 4, 'Lunes', '16:00:00', '18:00:00')
ON CONFLICT (id) DO NOTHING;

-- Enrollments Seed
INSERT INTO student_enrollments (student_id, parallel_id) VALUES
(42, 5),
(42, 13)
ON CONFLICT (student_id, parallel_id) DO NOTHING;



-- ==========================================================
-- CALIFICACIONES (Estructura UCE)
-- Total: 20 puntos
--   Examen 1er Hemisemestre : 2 pts  (aprobacion >= 1.00)
--   Nota Individual          : 7 pts  (aprobacion >= 3.50)
--   Nota Grupal              : 5 pts  (aprobacion >= 2.50)
--   Examen Final             : 6 pts  (aprobacion >= 3.00)
--   TOTAL APROBACION         : >= 14 / 20
-- ==========================================================

CREATE TABLE IF NOT EXISTS grades (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL,
    parallel_id INTEGER NOT NULL REFERENCES parallels(id) ON DELETE CASCADE,

    -- Componentes de la nota (sobre 20 en total)
    examen_hemisemestre DECIMAL(4,2) DEFAULT NULL, -- Sobre 2 pts
    nota_individual     DECIMAL(4,2) DEFAULT NULL, -- Sobre 7 pts
    nota_grupal         DECIMAL(4,2) DEFAULT NULL, -- Sobre 5 pts
    examen_final        DECIMAL(4,2) DEFAULT NULL, -- Sobre 6 pts

    -- Nota total calculada y estado
    nota_total          DECIMAL(5,2) GENERATED ALWAYS AS (
                            COALESCE(examen_hemisemestre, 0) +
                            COALESCE(nota_individual, 0) +
                            COALESCE(nota_grupal, 0) +
                            COALESCE(examen_final, 0)
                        ) STORED,
    estado              VARCHAR(20) DEFAULT 'CURSANDO', -- CURSANDO | APROBADO | REPROBADO | RETIRADO

    -- Control de quién ingresó la nota
    ingresado_por       INTEGER DEFAULT NULL, -- ID del profesor
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Integridad: solo se puede tener una nota por estudiante-paralelo
    CONSTRAINT fk_grade_enrollment FOREIGN KEY (student_id, parallel_id)
        REFERENCES student_enrollments(student_id, parallel_id) ON DELETE CASCADE,
    CONSTRAINT uq_grade_per_student_parallel UNIQUE (student_id, parallel_id),

    -- Validacion de rangos por componente
    CONSTRAINT chk_examen_hemisemestre CHECK (examen_hemisemestre IS NULL OR (examen_hemisemestre >= 0 AND examen_hemisemestre <= 2)),
    CONSTRAINT chk_nota_individual     CHECK (nota_individual IS NULL OR (nota_individual >= 0 AND nota_individual <= 7)),
    CONSTRAINT chk_nota_grupal         CHECK (nota_grupal IS NULL OR (nota_grupal >= 0 AND nota_grupal <= 5)),
    CONSTRAINT chk_examen_final        CHECK (examen_final IS NULL OR (examen_final >= 0 AND examen_final <= 6))
);

CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_parallel ON grades(parallel_id);


-- ==========================================================
-- SOLICITUDES ESTUDIANTILES (Retiro Simple y Retiro Fortuito)
-- ==========================================================

CREATE TABLE IF NOT EXISTS student_requests (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL,

    -- Tipo de solicitud:
    --   RETIRO_SIMPLE   : Se hace dentro del primer mes, sin aprobación, solo aplica a UNA materia.
    --   RETIRO_FORTUITO : Pasado el primer mes, aplica a TODAS las asignaturas, requiere aprobacion
    --                     y el estudiante debe adjuntar el motivo y evidencias.
    tipo_solicitud  VARCHAR(30) NOT NULL, -- RETIRO_SIMPLE | RETIRO_FORTUITO | TERCERA_MATRICULA | EXCEPCIONALIDAD

    -- Estado del flujo de aprobación
    estado          VARCHAR(20) DEFAULT 'PENDIENTE', -- PENDIENTE | EN_REVISION | APROBADA | RECHAZADA

    -- Para RETIRO_SIMPLE: solo se llena parallel_id (una sola materia)
    -- Para RETIRO_FORTUITO: parallel_id es NULL, aplica a todas sus materias activas
    parallel_id     INTEGER REFERENCES parallels(id) ON DELETE SET NULL,

    -- Para RETIRO_FORTUITO y otras solicitudes con justificativo
    motivo          TEXT,
    evidencias_url  TEXT[], -- Array de URLs (ej. S3) con los archivos adjuntos

    -- Trazabilidad
    fecha_solicitud     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_resolucion    TIMESTAMP DEFAULT NULL,
    resuelto_por        INTEGER DEFAULT NULL, -- ID del administrativo que procesa
    notas_administrativo TEXT DEFAULT NULL,   -- Comentarios internos al resolver

    CONSTRAINT chk_retiro_simple_parallel CHECK (
        -- Si es RETIRO_SIMPLE, debe tener un parallel_id específico
        tipo_solicitud != 'RETIRO_SIMPLE' OR parallel_id IS NOT NULL
    ),
    CONSTRAINT chk_retiro_fortuito_motivo CHECK (
        -- Si es RETIRO_FORTUITO, el motivo es obligatorio
        tipo_solicitud != 'RETIRO_FORTUITO' OR motivo IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS idx_requests_student    ON student_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_requests_estado     ON student_requests(estado);
CREATE INDEX IF NOT EXISTS idx_requests_tipo       ON student_requests(tipo_solicitud);

-- ==========================================================
-- ESTADO DE MATRÍCULA SEMESTRAL Y PAGOS
-- ==========================================================

CREATE TABLE IF NOT EXISTS student_semester_status (
    student_id INTEGER NOT NULL,
    semester_id INTEGER NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'INSCRITO', -- 'INSCRITO', 'MATRICULADO'
    needs_payment BOOLEAN DEFAULT false,
    payment_amount DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (student_id, semester_id)
);

CREATE INDEX IF NOT EXISTS idx_semester_status_student ON student_semester_status(student_id);
CREATE INDEX IF NOT EXISTS idx_semester_status_lookup  ON student_semester_status(student_id, semester_id);

-- ==========================================================
-- SEED DATA FOR TESTING ENROLLMENTS, PAYMENTS AND GRADES
-- ==========================================================

-- Enrollments Seed
INSERT INTO student_enrollments (student_id, parallel_id) VALUES
(1, 23), -- Estructura de Datos (Nivel 3)
(1, 25), -- Arquitectura de Computadores (Nivel 3)
(4, 23), -- Carlos - Estructura de Datos
(4, 25), -- Carlos - Arquitectura de Computadores
(4, 29), -- Carlos - Interfaces de Usuario
(6, 23), -- Juan - Estructura de Datos
(6, 25), -- Juan - Arquitectura de Computadores
(42, 23),
(42, 25)
ON CONFLICT (student_id, parallel_id) DO NOTHING;

-- Semester Status Seed
INSERT INTO student_semester_status (student_id, semester_id, status, needs_payment, payment_amount) VALUES
(1, 3, 'MATRICULADO', false, 0.00),
(4, 3, 'INSCRITO', true, 120.00), -- Carlos needs payment
(6, 3, 'INSCRITO', true, 120.00), -- Juan needs payment
(42, 3, 'MATRICULADO', false, 0.00)
ON CONFLICT (student_id, semester_id) DO NOTHING;

-- Grades Seed
INSERT INTO grades (student_id, parallel_id, examen_hemisemestre, nota_individual, nota_grupal, examen_final, estado) VALUES
-- Student 1
(1, 23, 1.80, 6.20, 4.50, 5.00, 'APROBADO'),
(1, 25, 1.50, 5.80, 4.00, 4.20, 'APROBADO'),
-- Student 4
(4, 23, 1.90, 6.50, 4.80, 5.20, 'APROBADO'),
(4, 25, 1.70, 6.00, 4.20, 4.80, 'APROBADO'),
(4, 29, 1.60, 5.50, 4.50, 4.90, 'APROBADO'),
-- Student 6
(6, 23, 1.20, 4.50, 3.80, 4.50, 'APROBADO'),
(6, 25, 1.40, 5.00, 4.00, 4.20, 'APROBADO'),
-- Student 42
(42, 23, 1.85, 6.30, 4.60, 5.10, 'APROBADO'),
(42, 25, 1.60, 5.95, 4.10, 4.50, 'APROBADO')
ON CONFLICT (student_id, parallel_id) DO NOTHING;
