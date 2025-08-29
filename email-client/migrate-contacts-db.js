#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Configuración de la base de datos
const DB_PATH = path.join(__dirname, 'contacts.db');

console.log('🔄 Migrando base de datos de contactos...');
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

// Función para ejecutar query con promesa
function runQuery(query, description) {
  return new Promise((resolve, reject) => {
    db.run(query, function(err) {
      if (err) {
        console.error(`❌ Error en ${description}:`, err.message);
        reject(err);
      } else {
        console.log(`✅ ${description}`);
        resolve(this);
      }
    });
  });
}

// Función principal de migración
async function migrate() {
  try {
    console.log('\n📝 Agregando nuevas columnas a la tabla contacts...');

    // Agregar columnas para datos personales
    await runQuery(`
      ALTER TABLE contacts ADD COLUMN rut TEXT
    `, 'Columna rut agregada').catch(() => {
      console.log('ℹ️  Columna rut ya existe');
    });

    await runQuery(`
      ALTER TABLE contacts ADD COLUMN address TEXT
    `, 'Columna address agregada').catch(() => {
      console.log('ℹ️  Columna address ya existe');
    });

    await runQuery(`
      ALTER TABLE contacts ADD COLUMN represented_company TEXT
    `, 'Columna represented_company agregada').catch(() => {
      console.log('ℹ️  Columna represented_company ya existe');
    });

    await runQuery(`
      ALTER TABLE contacts ADD COLUMN represented_company_rut TEXT
    `, 'Columna represented_company_rut agregada').catch(() => {
      console.log('ℹ️  Columna represented_company_rut ya existe');
    });

    await runQuery(`
      ALTER TABLE contacts ADD COLUMN gender TEXT DEFAULT 'masculino'
    `, 'Columna gender agregada').catch(() => {
      console.log('ℹ️  Columna gender ya existe');
    });

    // Agregar columnas para datos de marca
    await runQuery(`
      ALTER TABLE contacts ADD COLUMN power_purpose TEXT DEFAULT 'renovación de marca'
    `, 'Columna power_purpose agregada').catch(() => {
      console.log('ℹ️  Columna power_purpose ya existe');
    });

    await runQuery(`
      ALTER TABLE contacts ADD COLUMN brand_class TEXT
    `, 'Columna brand_class agregada').catch(() => {
      console.log('ℹ️  Columna brand_class ya existe');
    });

    await runQuery(`
      ALTER TABLE contacts ADD COLUMN brand_type TEXT DEFAULT 'Marca Mixta'
    `, 'Columna brand_type agregada').catch(() => {
      console.log('ℹ️  Columna brand_type ya existe');
    });

    await runQuery(`
      ALTER TABLE contacts ADD COLUMN brand_coverage TEXT DEFAULT 'Marca de servicios'
    `, 'Columna brand_coverage agregada').catch(() => {
      console.log('ℹ️  Columna brand_coverage ya existe');
    });

    await runQuery(`
      ALTER TABLE contacts ADD COLUMN brand_description TEXT
    `, 'Columna brand_description agregada').catch(() => {
      console.log('ℹ️  Columna brand_description ya existe');
    });

    await runQuery(`
      ALTER TABLE contacts ADD COLUMN brand_registration_number TEXT
    `, 'Columna brand_registration_number agregada').catch(() => {
      console.log('ℹ️  Columna brand_registration_number ya existe');
    });

    await runQuery(`
      ALTER TABLE contacts ADD COLUMN brand_application_number TEXT
    `, 'Columna brand_application_number agregada').catch(() => {
      console.log('ℹ️  Columna brand_application_number ya existe');
    });

    await runQuery(`
      ALTER TABLE contacts ADD COLUMN brand_logo TEXT
    `, 'Columna brand_logo agregada').catch(() => {
      console.log('ℹ️  Columna brand_logo ya existe');
    });

    console.log('\n📋 Verificando estructura de la tabla...');
    
    // Verificar estructura de la tabla
    db.all("PRAGMA table_info(contacts)", (err, rows) => {
      if (err) {
        console.error('❌ Error obteniendo información de la tabla:', err.message);
      } else {
        console.log('📋 Estructura actualizada de la tabla contacts:');
        rows.forEach(row => {
          console.log(`   - ${row.name}: ${row.type} ${row.notnull ? 'NOT NULL' : ''} ${row.dflt_value ? `DEFAULT ${row.dflt_value}` : ''}`);
        });
      }
      
      // Cerrar conexión
      db.close((err) => {
        if (err) {
          console.error('❌ Error cerrando la base de datos:', err.message);
        } else {
          console.log('\n✅ Migración completada exitosamente');
          console.log('🚀 ¡Base de datos lista para los nuevos campos de poder!');
        }
      });
    });

  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    process.exit(1);
  }
}

// Ejecutar migración
migrate();
