const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// 1. Configuración de conexiones locales (puertos redireccionados en localhost)
const catalogPool = new Pool({
  connectionString: 'postgresql://catalog_user:catalog_password@localhost:5433/uce_catalog_dev'
});

const enrollmentPool = new Pool({
  connectionString: 'postgresql://enrollment_user:enrollment_password@localhost:5434/uce_enrollment_dev'
});

// 2. Ruta del archivo dump legacy
const dumpFilePath = 'C:\\Users\\abeln\\Documents\\Github\\Sistema_Laboratorios_Arqui\\final_labdb_dump.sql';

// 3. Tabla de decodificación CP437 -> bytes -> UTF-8
const cp437Table = 
  "\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f" +
  "\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1a\x1b\x1c\x1d\x1e\x1f" +
  " !\"#$%&'()*+,-./0123456789:;<=>?" +
  "@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_" +
  "`abcdefghijklmnopqrstuvwxyz{|}~ " +
  "ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒ" +
  "áíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐" +
  "└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀" +
  "αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■\xa0";

function decodeOem(str) {
  if (typeof str !== 'string') return str;
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const idx = cp437Table.indexOf(char);
    if (idx !== -1) {
      bytes.push(idx);
    } else {
      bytes.push(char.charCodeAt(0) & 0xff);
    }
  }
  return new TextDecoder('utf-8').decode(new Uint8Array(bytes));
}

// Helper para limpiar strings y remover acentos para códigos únicos
function generateCode(name) {
  const decoded = decodeOem(name);
  
  // Casos especiales conocidos
  if (decoded.includes("Laboratorio de Computación")) {
    const num = decoded.match(/\d+/);
    return num ? `LAB-Comp-${num[0].padStart(2, '0')}` : 'LAB-Comp-Gen';
  }
  if (decoded.includes("Laboratorio de Civil")) {
    const num = decoded.match(/\d+/);
    return num ? `LAB-Civil-${num[0].padStart(2, '0')}` : 'LAB-Civil-Gen';
  }
  if (decoded.includes("Suficiencia Civil")) {
    const letter = decoded.split(" ").pop();
    return `LAB-Suf-Civil-${letter}`;
  }
  if (decoded.includes("Suficiencia Informática")) {
    const letter = decoded.split(" ").pop();
    return `LAB-Suf-Info-${letter}`;
  }
  if (decoded.toLowerCase() === "laboratorio de redes") {
    return "LAB-Redes";
  }
  if (decoded.toLowerCase() === "laboratorio de redes 2") {
    return "LAB-Redes-2";
  }
  
  // Default clean up
  return 'LAB-' + decoded
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-zA-Z0-9]/g, "-") // replace non-alphanumeric with hyphen
    .replace(/-+/g, "-") // collapse hyphens
    .replace(/^-|-$/g, ""); // trim hyphens
}

// 4. Parseador de bloques COPY en el dump
function parseCopyBlocks(content) {
  const blocks = {};
  const copyRegex = /COPY public\.(\w+) \([^)]*\) FROM stdin;/g;
  let match;
  
  while ((match = copyRegex.exec(content)) !== null) {
    const tableName = match[1];
    const startIndex = copyRegex.lastIndex;
    const endMarker = "\n\\.";
    const endIndex = content.indexOf(endMarker, startIndex);
    
    if (endIndex !== -1) {
      const dataSection = content.substring(startIndex, endIndex).trim();
      const lines = dataSection.split('\n').filter(line => line.trim().length > 0);
      blocks[tableName] = lines.map(line => line.split('\t'));
    }
  }
  
  return blocks;
}

async function migrate() {
  console.log("📖 Leyendo el archivo dump legacy...");
  if (!fs.existsSync(dumpFilePath)) {
    console.error(`❌ Archivo dump no encontrado en: ${dumpFilePath}`);
    process.exit(1);
  }
  
  const content = fs.readFileSync(dumpFilePath, 'utf-16le');
  console.log("⚙️ Analizando bloques de datos COPY...");
  const dataBlocks = parseCopyBlocks(content);
  
  const tablesFound = Object.keys(dataBlocks);
  console.log(`📊 Tablas encontradas con datos: ${tablesFound.join(', ')}`);

  // --- MIGRACIÓN DE LABORATORIOS ---
  if (dataBlocks['laboratories']) {
    console.log("\n🧪 Migrando laboratorios (Catalog Database)...");
    
    // Limpiamos los laboratorios existentes para insertar los reales sin duplicados
    console.log("🧹 Limpiando tabla laboratories...");
    await catalogPool.query("TRUNCATE TABLE laboratories CASCADE;");
    
    const labs = dataBlocks['laboratories'];
    for (const row of labs) {
      const legacyId = parseInt(row[0]);
      const rawName = row[1];
      const capacity = parseInt(row[2]);
      const rawLocation = row[3] === '\\N' ? 'Edificio de Laboratorios FICA' : row[3];
      const isActive = row[4] === 't';
      
      const name = decodeOem(rawName);
      const location = decodeOem(rawLocation);
      const code = generateCode(rawName);
      
      // Equipamiento genérico
      const equipment = ['Proyector', 'Computadoras', 'Pizarra'];
      
      console.log(`   Inserting: [ID Legacy: ${legacyId}] [Código: ${code}] ${name}`);
      
      await catalogPool.query(
        `INSERT INTO laboratories (code, name, location, capacity, equipment, is_active, legacy_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [code, name, location, capacity, equipment, isActive, legacyId]
      );
    }
    console.log("✅ Laboratorios migrados con éxito.");
  }

  // --- MIGRACIÓN DE DATOS ACADÉMICOS (Enrollment Database) ---
  const enrollmentTables = [
    { name: 'semesters', query: 'INSERT INTO semesters (id, name, level, active, created_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING' },
    { name: 'subjects', query: 'INSERT INTO subjects (id, name, description, semester_id, created_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING' },
    { name: 'parallels', query: 'INSERT INTO parallels (id, name, subject_id, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING' },
    { name: 'schedules', query: 'INSERT INTO schedules (id, parallel_id, lab_id, dia, hora_inicio, hora_fin, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING' },
    { name: 'student_enrollments', query: 'INSERT INTO student_enrollments (student_id, parallel_id, enrolled_at) VALUES ($1, $2, $3) ON CONFLICT (student_id, parallel_id) DO NOTHING' },
    { name: 'professor_assignments', query: 'INSERT INTO professor_assignments (professor_id, subject_id, assigned_at) VALUES ($1, $2, $3) ON CONFLICT (professor_id, subject_id) DO NOTHING' }
  ];

  for (const table of enrollmentTables) {
    if (dataBlocks[table.name]) {
      console.log(`\n📚 Migrando tabla ${table.name} (Enrollment Database)...`);
      const rows = dataBlocks[table.name];
      let insertedCount = 0;
      
      for (const row of rows) {
        // Mapear \N a null
        const params = row.map(val => val === '\\N' ? null : val);
        
        // Decodificar campos de texto para evitar caracteres extraños en nombres
        if (table.name === 'semesters') {
          params[1] = decodeOem(params[1]); // name
        } else if (table.name === 'subjects') {
          params[1] = decodeOem(params[1]); // name
          params[2] = decodeOem(params[2]); // description
        } else if (table.name === 'parallels') {
          params[1] = decodeOem(params[1]); // name
        } else if (table.name === 'schedules') {
          params[3] = decodeOem(params[3]); // dia
        }
        
        try {
          await enrollmentPool.query(table.query, params);
          insertedCount++;
        } catch (err) {
          console.error(`❌ Error al insertar fila en ${table.name}:`, err.message);
        }
      }
      console.log(`   Se procesaron ${rows.length} registros (Insertados/Omitidos por conflicto: ${insertedCount}).`);
    }
  }

  console.log("\n🎉 ¡Proceso de migración completado!");
  await catalogPool.end();
  await enrollmentPool.end();
}

migrate().catch(err => {
  console.error("❌ Error durante la migración:", err);
});
