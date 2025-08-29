#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Configuración de la base de datos
const DB_PATH = path.join(__dirname, 'post-its.db');

console.log('🗄️  Inicializando base de datos de Post-its...');
console.log(`📍 Ubicación: ${DB_PATH}`);

// Crear/conectar a la base de datos
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Error conectando a la base de datos:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Conectado a la base de datos SQLite');
  }
});

// Crear tabla de post-its
db.run(`
  CREATE TABLE IF NOT EXISTS post_its (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '#fef3c7',
    position INTEGER NOT NULL DEFAULT 0,
    archived INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`, (err) => {
  if (err) {
    console.error('❌ Error creando tabla post_its:', err.message);
  } else {
    console.log('✅ Tabla post_its creada/verificada correctamente');

    // Agregar columna archived si no existe (para bases de datos existentes)
    db.run(`ALTER TABLE post_its ADD COLUMN archived INTEGER NOT NULL DEFAULT 0`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('❌ Error agregando columna archived:', err.message);
      } else if (!err) {
        console.log('✅ Columna archived agregada correctamente');
      }
    });
  }
});

// Verificar estructura de la tabla
db.all("PRAGMA table_info(post_its)", (err, rows) => {
  if (err) {
    console.error('❌ Error obteniendo información de la tabla:', err.message);
  } else {
    console.log('📋 Estructura de la tabla post_its:');
    rows.forEach(row => {
      console.log(`   - ${row.name}: ${row.type} ${row.notnull ? 'NOT NULL' : ''} ${row.dflt_value ? `DEFAULT ${row.dflt_value}` : ''}`);
    });
  }
});

// Contar registros existentes
db.get("SELECT COUNT(*) as count FROM post_its", (err, row) => {
  if (err) {
    console.error('❌ Error contando registros:', err.message);
  } else {
    console.log(`📊 Post-its existentes: ${row.count}`);
  }
  
  // Cerrar conexión
  db.close((err) => {
    if (err) {
      console.error('❌ Error cerrando la base de datos:', err.message);
    } else {
      console.log('✅ Base de datos inicializada correctamente');
      console.log('🚀 ¡Listo para usar Post-its!');
    }
  });
});
