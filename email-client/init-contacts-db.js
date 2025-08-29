#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Configuración de la base de datos
const DB_PATH = path.join(__dirname, 'contacts.db');

console.log('👥 Inicializando base de datos de contactos...');
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

// Crear tabla de contactos
db.run(`
  CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    alias TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`, (err) => {
  if (err) {
    console.error('❌ Error creando tabla contacts:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Tabla contacts creada/verificada correctamente');
    // Insertar contactos después de crear la tabla
    insertSampleContacts();
  }
});

// Contactos de ejemplo basados en tu caso
const sampleContacts = [
  {
    id: 'contact_marcos_001',
    name: 'Marco Obreque',
    alias: 'Marco',
    email: 'marco@patriciastocker.com',
    phone: '+56912345678'
  },
  {
    id: 'contact_hermes_001', 
    name: 'Hermes Establecer',
    alias: 'Hermes',
    email: 'hermes@cliente.com',
    phone: '+56987654321'
  },
  {
    id: 'contact_statsen_001',
    name: 'Cliente Statsen',
    alias: 'Statsen',
    email: 'statsen@empresa.com',
    phone: '+56911223344'
  },
  {
    id: 'contact_stetson_001',
    name: 'Stetson Legal',
    alias: 'Stetson',
    email: 'stetson@legal.com',
    phone: '+56955667788'
  },
  {
    id: 'contact_monica_001',
    name: 'Monica Stocker',
    alias: 'Monica',
    email: 'monica@patriciastocker.com',
    phone: '+56933445566'
  }
];

// Insertar contactos de ejemplo
console.log('📝 Insertando contactos de ejemplo...');

const insertContact = (contact) => {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT OR REPLACE INTO contacts (id, name, alias, email, phone, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [contact.id, contact.name, contact.alias, contact.email, contact.phone],
      function(err) {
        if (err) {
          reject(err);
        } else {
          console.log(`   ✅ ${contact.name} (${contact.alias}) - ${contact.email}`);
          resolve();
        }
      }
    );
  });
};

// Función para insertar contactos de ejemplo
function insertSampleContacts() {
  console.log('📝 Insertando contactos de ejemplo...');

  // Insertar todos los contactos
  Promise.all(sampleContacts.map(insertContact))
    .then(() => {
    // Verificar estructura de la tabla
    db.all("PRAGMA table_info(contacts)", (err, rows) => {
      if (err) {
        console.error('❌ Error obteniendo información de la tabla:', err.message);
      } else {
        console.log('📋 Estructura de la tabla contacts:');
        rows.forEach(row => {
          console.log(`   - ${row.name}: ${row.type} ${row.notnull ? 'NOT NULL' : ''} ${row.dflt_value ? `DEFAULT ${row.dflt_value}` : ''}`);
        });
      }
    });

    // Contar registros existentes
    db.get("SELECT COUNT(*) as count FROM contacts", (err, row) => {
      if (err) {
        console.error('❌ Error contando registros:', err.message);
      } else {
        console.log(`📊 Contactos en la base de datos: ${row.count}`);
      }
      
      // Cerrar conexión
      db.close((err) => {
        if (err) {
          console.error('❌ Error cerrando la base de datos:', err.message);
        } else {
          console.log('✅ Base de datos de contactos inicializada correctamente');
          console.log('🚀 ¡Listo para generar correos automáticos!');
        }
      });
    });
  })
    .catch((err) => {
      console.error('❌ Error insertando contactos:', err.message);
      process.exit(1);
    });
}
