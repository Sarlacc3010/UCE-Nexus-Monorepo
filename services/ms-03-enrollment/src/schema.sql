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
    name VARCHAR(255) NOT NULL,
    description VARCHAR(255),
    semester_id INTEGER REFERENCES semesters(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
INSERT INTO subjects (id, name, description, semester_id) VALUES
(1, 'Fundamentos de Matemática', 'TIP01BF101', 1),
(2, 'Análisis I', 'TIP01BF102', 1),
(3, 'Programación I', 'TIP01BFT03', 1),
(4, 'Fundamentos de Sistemas de Información', 'TIP01BF104', 1),
(5, 'Física Aplicada', 'TIP01BF106', 1),
(6, 'Comunicación y Lenguaje', 'TIP01BCL05', 2),
(7, 'Programación II', 'TIP02BFT01', 2),
(8, 'Análisis II', 'TIP02BFT02', 2),
(9, 'Nuevas Tecnologías e Innovación en SI', 'TIP02BFT03', 2),
(10, 'Matemáticas Discretas', 'TIP02BFT04', 2),
(11, 'Álgebra Lineal', 'TIP02BFT05', 2),
(12, 'Estructura de Datos', 'TIP03BFT01', 3),
(13, 'Arquitectura de Computadores', 'TIP03BFT02', 3),
(14, 'Introducción a la Investigación Científica', 'TIP03BFT03', 3),
(15, 'Interfaces de Usuario', 'TIP03BFT04', 3),
(16, 'Probabilidades y Estadística', 'TIP03BFT05', 3),
(17, 'Ecuaciones Diferenciales', 'TIP03BFT06', 3),
(18, 'Liderazgo', 'TIP02BCL06', 4),
(19, 'Algoritmos', 'TIP04BFT01', 4),
(20, 'Sistemas Operativos I', 'TIP04BFT02', 4),
(21, 'Infraestructura de TI-I', 'TIP04BFT03', 4),
(22, 'Métodos Numéricos', 'TIP04BFT04', 4),
(23, 'Almacenaje de Datos y de la Información', 'TIP04BFT05', 4),
(24, 'Marcos de Desarrollo I', 'TIP05BFT01', 5),
(25, 'Sistemas Operativos II', 'TIP05BFT02', 5),
(26, 'Infraestructura de TI-II', 'TIP05BFT03', 5),
(27, 'Gestión de Datos y de la Información', 'TIP05BFT04', 5),
(28, 'Análisis y Diseño de Sistemas', 'TIP05BFT05', 5),
(29, 'Marcos de Desarrollo II', 'TIP06BFT01', 6),
(30, 'Análisis de Datos', 'TIP06BFT02', 6),
(31, 'Seguridad y Gestión de Riesgo en las TI', 'TIP06BFT03', 6),
(32, 'Desarrollo de Sistemas de Información', 'TIP06BFT04', 6),
(33, 'Contabilidad Financiera', 'TIP06BFT05', 6),
(34, 'Programación Web', 'TIP07BFT01', 7),
(35, 'Arquitectura de Software', 'TIP07BFT02', 7),
(36, 'Sociedad de la Información', 'TIP07BFT03', 7),
(37, 'Inteligencia de Negocios', 'TIP07BFT04', 7),
(38, 'Fundamentos de Economía', 'TIP07BFT05', 7),
(39, 'Investigación Aplicada', 'TIP07BFT06', 7),
(40, 'Programación Distribuida', 'TIP08BFT01', 8),
(41, 'Minería de Datos', 'TIP08BFT02', 8),
(42, 'Control de Calidad del Software', 'TIP08BFT03', 8),
(43, 'Auditoría de TI', 'TIP08BFT04', 8),
(44, 'Investigación Operativa', 'TIP08BFT05', 8),
(45, 'Modelos de Investigación de Operaciones', 'TIP09BFT01', 9),
(46, 'Gestión en Procesos de Negocios (BPM)', 'TIP09BFT02', 9),
(47, 'Gestión de Proyectos en SI', 'TIP09BFT03', 9),
(48, 'Legislación Informática', 'TIP09BFT04', 9),
(49, 'Titulación I', 'TIP09TEMTT1', 9),
(50, 'Sistemas de Información Empresarial', 'TIP10BFT01', 10),
(51, 'Formación de Empresas de Base Tecnológica', 'TIP10BFT02', 10),
(52, 'Programación para Dispositivos Móviles', 'TIP10BFT03', 10),
(53, 'Estrategia, Gestión y Adquisición en los SI', 'TIP10BFT04', 10),
(54, 'Titulación II', 'TIP10TEMTT1', 10)
ON CONFLICT (id) DO NOTHING;

-- Parallels Seed
INSERT INTO parallels (id, name, subject_id) VALUES
(1, 'SI1-001', 1),
(2, 'SI1-002', 1),
(3, 'SI1-003', 1),
(4, 'SI1-001', 2),
(5, 'SI1-002', 2),
(6, 'SI1-003', 2),
(7, 'SI2-001', 6),
(8, 'SI2-002', 6),
(9, 'SI2-003', 6),
(10, 'SI2-001', 7),
(11, 'SI2-002', 7),
(12, 'SI2-003', 7),
(13, 'SI3-001', 12),
(14, 'SI3-002', 12),
(15, 'SI3-003', 12),
(16, 'SI3-001', 13),
(17, 'SI3-002', 13),
(18, 'SI3-003', 13),
(19, 'SI4-001', 18),
(20, 'SI4-002', 18),
(22, 'SI4-001', 19),
(23, 'SI4-002', 19),
(25, 'SI5-001', 24),
(26, 'SI5-002', 24),
(27, 'SI5-001', 25),
(28, 'SI5-002', 25),
(29, 'SI6-001', 29),
(30, 'SI6-002', 29),
(31, 'SI6-001', 30),
(32, 'SI6-002', 30),
(33, 'SI7-001', 34),
(34, 'SI7-001', 35),
(35, 'SI8-001', 40),
(36, 'SI8-001', 41),
(37, 'SI9-001', 45),
(38, 'SI9-001', 46),
(39, 'SI10-001', 50),
(40, 'SI10-001', 51),
(42, 'SI7-001', 36),
(43, 'SI7-001', 37),
(44, 'SI7-001', 38),
(45, 'SI7-001', 39),
(73, 'SI1-001', 3),
(66, 'SI1-001', 4),
(57, 'SI1-001', 5),
(60, 'SI2-001', 8),
(75, 'SI2-001', 9),
(53, 'SI2-001', 10),
(49, 'SI2-001', 11),
(74, 'SI3-001', 14),
(55, 'SI3-001', 15),
(64, 'SI3-001', 16),
(50, 'SI3-001', 17),
(46, 'SI4-001', 20),
(56, 'SI4-001', 21),
(71, 'SI4-001', 22),
(68, 'SI4-001', 23),
(47, 'SI5-001', 26),
(48, 'SI5-001', 27),
(62, 'SI5-001', 28),
(52, 'SI6-001', 31),
(59, 'SI6-001', 32),
(51, 'SI6-001', 33),
(63, 'SI8-001', 42),
(72, 'SI8-001', 43),
(69, 'SI8-001', 44),
(54, 'SI9-001', 47),
(61, 'SI9-001', 48),
(70, 'SI9-001', 49),
(58, 'SI10-001', 52),
(67, 'SI10-001', 53),
(65, 'SI10-001', 54),
(76, 'SI1-002', 3),
(77, 'SI1-003', 3),
(78, 'SI1-002', 4),
(79, 'SI1-003', 4),
(80, 'SI1-002', 5),
(81, 'SI1-003', 5),
(82, 'SI2-002', 8),
(83, 'SI2-003', 8),
(84, 'SI2-002', 9),
(85, 'SI2-003', 9),
(86, 'SI2-002', 10),
(87, 'SI2-003', 10),
(88, 'SI2-002', 11),
(89, 'SI2-003', 11),
(90, 'SI3-002', 17),
(91, 'SI3-003', 17),
(92, 'SI3-002', 15),
(93, 'SI3-002', 14),
(94, 'SI3-002', 16),
(95, 'SI3-003', 16),
(96, 'SI4-002', 23),
(97, 'SI4-002', 21),
(98, 'SI4-003', 21),
(99, 'SI4-002', 22),
(100, 'SI4-002', 20),
(101, 'SI4-003', 20),
(102, 'SI5-002', 28),
(103, 'SI5-002', 27),
(104, 'SI5-002', 26),
(105, 'SI5-003', 26),
(106, 'SI5-003', 25),
(107, 'SI6-002', 33),
(108, 'SI6-002', 32),
(109, 'SI6-002', 31),
(118, 'SI8-002', 43),
(119, 'SI8-002', 42),
(120, 'SI8-002', 44),
(121, 'SI8-002', 41),
(122, 'SI8-002', 40),
(124, 'SI9-002', 47),
(125, 'SI9-002', 46),
(126, 'SI9-002', 48),
(127, 'SI9-002', 45),
(128, 'SI9-002', 49),
(129, 'SI10-002', 53),
(130, 'SI10-002', 51),
(131, 'SI10-002', 52),
(133, 'SI10-002', 50),
(134, 'SI10-002', 54)
ON CONFLICT (id) DO NOTHING;

-- Schedules Seed
INSERT INTO schedules (id, parallel_id, lab_id, dia, hora_inicio, hora_fin) VALUES
(1, 33, 1, 'Lunes', '07:00:00', '09:00:00'),
(2, 34, 1, 'Lunes', '07:00:00', '09:00:00'),
(3, 33, 22, 'Lunes', '18:00:00', '20:00:00'),
(4, 33, 22, 'Viernes', '18:00:00', '20:00:00'),
(5, 33, 21, 'Lunes', '18:00:00', '20:00:00'),
(6, 33, 21, 'Viernes', '18:00:00', '20:00:00'),
(7, 62, 10, 'Lunes', '18:00:00', '20:00:00'),
(8, 5, 11, 'Lunes', '07:00:00', '09:00:00'),
(9, 5, 11, 'Martes', '07:00:00', '09:00:00')
ON CONFLICT (id) DO NOTHING;

-- Professor Assignments Seed
INSERT INTO professor_assignments (professor_id, subject_id) VALUES
(2, 2),
(3, 2),
(7, 5),
(8, 5),
(12, 1),
(13, 1),
(14, 4),
(15, 4),
(16, 3),
(17, 3),
(18, 11),
(19, 11),
(20, 8),
(21, 8),
(22, 6),
(23, 6),
(24, 10),
(25, 10),
(26, 9),
(27, 9),
(28, 7)
ON CONFLICT (professor_id, subject_id) DO NOTHING;

-- Student Enrollments Seed
INSERT INTO student_enrollments (student_id, parallel_id) VALUES
(6, 33),
(6, 34),
(6, 42),
(6, 43),
(6, 44),
(6, 45),
(43, 1),
(43, 4),
(43, 73),
(43, 66),
(43, 57),
(45, 33),
(45, 34),
(45, 42),
(45, 43),
(45, 44),
(45, 45),
(5, 15),
(5, 18),
(5, 91),
(5, 95),
(4, 7),
(4, 10),
(4, 60),
(4, 75),
(4, 53),
(4, 49),
(9, 37),
(9, 38),
(9, 54),
(9, 61),
(9, 70),
(42, 19),
(42, 22),
(42, 46),
(42, 56),
(42, 71),
(42, 68)
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
