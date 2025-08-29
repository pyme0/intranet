#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Configuración de la base de datos
const CONTACTS_DB_PATH = path.join(__dirname, 'contacts.db');

console.log('🏢 Inicializando base de datos de empresas y marcas...');
console.log(`📍 Ubicación: ${CONTACTS_DB_PATH}`);

// Crear/conectar a la base de datos
const db = new sqlite3.Database(CONTACTS_DB_PATH, (err) => {
  if (err) {
    console.error('❌ Error conectando a la base de datos:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Conectado a la base de datos SQLite');
  }
});

// Función para ejecutar consultas de forma secuencial
function runQuery(query, description) {
  return new Promise((resolve, reject) => {
    db.run(query, (err) => {
      if (err) {
        console.error(`❌ Error ${description}:`, err.message);
        reject(err);
      } else {
        console.log(`✅ ${description}`);
        resolve();
      }
    });
  });
}

// Función para insertar datos de ejemplo
function insertData(query, params, description) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) {
        console.error(`❌ Error ${description}:`, err.message);
        reject(err);
      } else {
        console.log(`✅ ${description}`);
        resolve(this.lastID);
      }
    });
  });
}

async function initializeDatabase() {
  try {
    // 1. Crear tabla de empresas
    await runQuery(`
      CREATE TABLE IF NOT EXISTS companies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        website TEXT,
        phone TEXT,
        address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, 'Tabla companies creada');

    // 2. Crear tabla de marcas
    await runQuery(`
      CREATE TABLE IF NOT EXISTS brands (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        company_id TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'active',
        registration_date DATE,
        registration_number TEXT,
        class_nice TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE
      )
    `, 'Tabla brands creada');

    // 3. Actualizar tabla de contactos para agregar company_id
    await runQuery(`
      ALTER TABLE contacts ADD COLUMN company_id TEXT REFERENCES companies(id)
    `, 'Columna company_id agregada a contacts').catch(() => {
      console.log('ℹ️  Columna company_id ya existe en contacts');
    });

    // 4. Insertar empresas de ejemplo
    console.log('\n📝 Insertando empresas de ejemplo...');
    
    const companies = [
      {
        id: 'company_dbv_001',
        name: 'DBV Consultores',
        description: 'Empresa de consultoría especializada en marcas y propiedad intelectual',
        website: 'https://dbvconsultores.com',
        phone: '+56912345678',
        address: 'Las Condes, Santiago, Chile'
      },
      {
        id: 'company_stetson_001',
        name: 'Stetson Legal',
        description: 'Bufete de abogados especializado en derecho comercial',
        website: 'https://stetsonlegal.com',
        phone: '+56987654321',
        address: 'Providencia, Santiago, Chile'
      },
      {
        id: 'company_patricia_001',
        name: 'Patricia Stocker Abogados',
        description: 'Estudio jurídico especializado en marcas registradas',
        website: 'https://patriciastocker.com',
        phone: '+56933445566',
        address: 'Las Condes, Santiago, Chile'
      }
    ];

    for (const company of companies) {
      await insertData(
        `INSERT OR REPLACE INTO companies (id, name, description, website, phone, address, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [company.id, company.name, company.description, company.website, company.phone, company.address],
        `Empresa: ${company.name}`
      );
    }

    // 5. Insertar marcas de ejemplo
    console.log('\n🏷️  Insertando marcas de ejemplo...');
    
    const brands = [
      {
        id: 'brand_canadian_001',
        name: 'Canadian',
        company_id: 'company_dbv_001',
        description: 'Marca registrada para productos alimenticios',
        status: 'registered',
        registration_date: '2013-05-15',
        registration_number: 'CL-123456',
        class_nice: '29, 30',
        notes: 'Marca con antecedentes importantes. Caso de referencia para consultas similares.'
      },
      {
        id: 'brand_statsen_001',
        name: 'Statsen',
        company_id: 'company_dbv_001',
        description: 'Marca en proceso de registro',
        status: 'pending',
        registration_date: null,
        registration_number: null,
        class_nice: '35',
        notes: 'Marca en disputa. Revisar uso previo antes de proceder con registro.'
      },
      {
        id: 'brand_stetson_001',
        name: 'Stetson Professional',
        company_id: 'company_stetson_001',
        description: 'Marca de servicios legales',
        status: 'registered',
        registration_date: '2020-03-10',
        registration_number: 'CL-789012',
        class_nice: '45',
        notes: 'Marca registrada para servicios jurídicos y consultoría legal.'
      }
    ];

    for (const brand of brands) {
      await insertData(
        `INSERT OR REPLACE INTO brands (id, name, company_id, description, status, registration_date, registration_number, class_nice, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [brand.id, brand.name, brand.company_id, brand.description, brand.status, brand.registration_date, brand.registration_number, brand.class_nice, brand.notes],
        `Marca: ${brand.name} (${brand.company_id})`
      );
    }

    // 6. Actualizar contactos existentes con empresas
    console.log('\n👥 Actualizando contactos con empresas...');
    
    const contactUpdates = [
      { contactName: 'Marco Obreque', companyId: 'company_patricia_001' },
      { contactName: 'Cliente Statsen', companyId: 'company_dbv_001' },
      { contactName: 'Stetson Legal', companyId: 'company_stetson_001' },
      { contactName: 'Monica Stocker', companyId: 'company_patricia_001' }
    ];

    for (const update of contactUpdates) {
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE contacts SET company_id = ? WHERE name LIKE ?',
          [update.companyId, `%${update.contactName}%`],
          function(err) {
            if (err) {
              console.error(`❌ Error actualizando ${update.contactName}:`, err.message);
              reject(err);
            } else {
              console.log(`✅ Contacto ${update.contactName} → ${update.companyId}`);
              resolve();
            }
          }
        );
      });
    }

    // 7. Mostrar resumen
    console.log('\n📊 Resumen de la base de datos:');
    
    // Contar empresas
    await new Promise((resolve) => {
      db.get("SELECT COUNT(*) as count FROM companies", (err, row) => {
        if (!err) {
          console.log(`   🏢 Empresas: ${row.count}`);
        }
        resolve();
      });
    });

    // Contar marcas
    await new Promise((resolve) => {
      db.get("SELECT COUNT(*) as count FROM brands", (err, row) => {
        if (!err) {
          console.log(`   🏷️  Marcas: ${row.count}`);
        }
        resolve();
      });
    });

    // Contar contactos con empresa
    await new Promise((resolve) => {
      db.get("SELECT COUNT(*) as count FROM contacts WHERE company_id IS NOT NULL", (err, row) => {
        if (!err) {
          console.log(`   👥 Contactos con empresa: ${row.count}`);
        }
        resolve();
      });
    });

    console.log('\n🎉 Base de datos de empresas y marcas inicializada correctamente');
    console.log('🚀 Ahora puedes gestionar contactos, empresas y marcas de forma integrada');

  } catch (error) {
    console.error('❌ Error durante la inicialización:', error.message);
    process.exit(1);
  } finally {
    // Cerrar conexión
    db.close((err) => {
      if (err) {
        console.error('❌ Error cerrando la base de datos:', err.message);
      } else {
        console.log('✅ Conexión cerrada');
      }
    });
  }
}

// Ejecutar inicialización
initializeDatabase();
