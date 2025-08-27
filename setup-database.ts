import { Database } from "@db/sqlite";

// Crear y configurar la base de datos
const db = new Database("intranet.db");

// Crear tabla de deudas
db.exec(`
  CREATE TABLE IF NOT EXISTS deudas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_acreedora TEXT NOT NULL,
    numero_factura TEXT NOT NULL,
    fecha_emision DATE NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    monto_pendiente REAL NOT NULL,
    estado TEXT CHECK(estado IN ('VIGENTE', 'VENCIDO')) NOT NULL,
    dias_retraso INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Crear tabla de empresas
db.exec(`
  CREATE TABLE IF NOT EXISTS empresas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    rut TEXT NOT NULL,
    banco TEXT NOT NULL,
    cuenta TEXT NOT NULL,
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Insertar datos de ejemplo solo si las tablas están vacías
const deudasCount = db.prepare("SELECT COUNT(*) as count FROM deudas").get() as { count: number };
const empresasCount = db.prepare("SELECT COUNT(*) as count FROM empresas").get() as { count: number };

if (empresasCount.count === 0) {
  console.log("Insertando empresas de ejemplo...");
  
  const insertEmpresa = db.prepare(`
    INSERT INTO empresas (nombre, rut, banco, cuenta, email)
    VALUES (?, ?, ?, ?, ?)
  `);

  const empresas = [
    ["PRISA MEDIA CHILE S.A.", "79.947.310-0", "BANCO DE CHILE", "8004392905", "vmantero@prisamedia.com"],
    ["AS CHILE", "76.409.967-2", "BANCO DE CHILE", "8000800804", null],
    ["IBEROAMERICANA DE NOTICIAS", "76.096.185-K", "BANCO DE CHILE", "9010736110", null],
    ["FAST NET S.A.", "96.770.070-3", "BANCO DE CHILE", "8007823103", null],
    ["BLAYA Y VEGA S.A.", "82.066.500-7", "BANCO DE CHILE", "8007822106", null],
    ["Villegas y Cía SpA", "12.345.678-9", "BANCO DE CHILE", "8001234567", "contacto@villegas.cl"]
  ];

  for (const empresa of empresas) {
    insertEmpresa.run(...empresa);
  }
  
  console.log(`✅ ${empresas.length} empresas insertadas`);
}

if (deudasCount.count === 0) {
  console.log("Insertando deudas de ejemplo...");
  
  const insertDeuda = db.prepare(`
    INSERT INTO deudas (empresa_acreedora, numero_factura, fecha_emision, fecha_vencimiento, monto_pendiente, estado, dias_retraso)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const deudas = [
    ["PRISA MEDIA CHILE", "010004071", "2025-04-10", "2025-04-09", -413620, "VENCIDO", 132],
    ["PRISA MEDIA CHILE", "1332420", "2025-04-03", "2025-05-03", 827240, "VENCIDO", 108],
    ["PRISA MEDIA CHILE", "1346642", "2025-06-25", "2025-07-25", 714000, "VENCIDO", 25],
    ["PRISA MEDIA CHILE", "1347490", "2025-07-01", "2025-08-01", 714000, "VENCIDO", 18],
    ["PRISA MEDIA CHILE", "1352770", "2025-08-04", "2025-09-04", 714000, "VIGENTE", 0],
    ["Villegas y Cía SpA", "1231", "2025-07-05", "2025-07-15", 595000, "VENCIDO", 35],
    ["Villegas y Cía SpA", "1247", "2025-08-06", "2025-08-16", 595000, "VENCIDO", 3]
  ];

  for (const deuda of deudas) {
    insertDeuda.run(...deuda);
  }
  
  console.log(`✅ ${deudas.length} deudas insertadas`);
}

// Crear índices para mejor rendimiento
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_deudas_empresa ON deudas(empresa_acreedora);
  CREATE INDEX IF NOT EXISTS idx_deudas_estado ON deudas(estado);
  CREATE INDEX IF NOT EXISTS idx_deudas_vencimiento ON deudas(fecha_vencimiento);
`);

console.log("✅ Base de datos configurada correctamente");
console.log("📁 Archivo de base de datos: intranet.db");

// Mostrar estadísticas
const finalDeudasCount = db.prepare("SELECT COUNT(*) as count FROM deudas").get() as { count: number };
const finalEmpresasCount = db.prepare("SELECT COUNT(*) as count FROM empresas").get() as { count: number };

console.log(`📊 Total deudas: ${finalDeudasCount.count}`);
console.log(`🏢 Total empresas: ${finalEmpresasCount.count}`);

db.close();
