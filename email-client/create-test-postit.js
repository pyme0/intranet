#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Configuración de la base de datos
const DB_PATH = path.join(__dirname, 'post-its.db');

console.log('📝 Creando post-it de prueba para IA...');

// Crear/conectar a la base de datos
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Error conectando a la base de datos:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Conectado a la base de datos SQLite');
  }
});

// Contenido del post-it de prueba
const testPostIt = {
  id: `postit_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  title: 'Consulta urgente Statsen - Marca registrada',
  content: `- Hay que preguntarle a Statsen si ha utilizado marca
En dicho caso hay que contestar la carta. 
Si: El cliente deberia desistir del uso, para evitar acciones legales en su contra
No: No se contesta la carta simplemente y hablan en acuerdo entre los abogados. 

Preguntarle a Marco 3 opciones viables para que el cliente pueda continuar con el registro. 

Viene año 2013. 
No tengo idea que pudo haber pasado. 

Quizá se escribió Stetson. 

Restringir la cobertura. 
La marca no se puede modificar

Notas: 
- Esto no suele pasar. 

- El tiene que plantear el tema de reembolso. No tocar el tema. No corresponderia de su parte, son

Compensarlo de otra manera. 

Marca Caso Canadian fue un gran antecedente.`,
  color: '#fce7f3', // Rosa para destacar
  position: 0
};

// Insertar el post-it de prueba
db.run(
  `INSERT INTO post_its (id, title, content, color, position, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
  [testPostIt.id, testPostIt.title, testPostIt.content, testPostIt.color, testPostIt.position],
  function(err) {
    if (err) {
      console.error('❌ Error creando post-it de prueba:', err.message);
    } else {
      console.log('✅ Post-it de prueba creado exitosamente');
      console.log(`📋 ID: ${testPostIt.id}`);
      console.log(`📝 Título: ${testPostIt.title}`);
      console.log(`🎨 Color: ${testPostIt.color}`);
      console.log('');
      console.log('🤖 Ahora puedes probar la generación de correo con IA:');
      console.log('1. Ve a http://localhost:3001');
      console.log('2. Cambia a la pestaña "Notas"');
      console.log('3. Busca el post-it rosa con el título "Consulta urgente Statsen"');
      console.log('4. Haz clic en los 3 puntos → "Generar correo con IA"');
      console.log('5. ¡Verás el correo generado por Llama 3.3 70B!');
    }
    
    // Cerrar conexión
    db.close((err) => {
      if (err) {
        console.error('❌ Error cerrando la base de datos:', err.message);
      } else {
        console.log('✅ Conexión cerrada');
      }
    });
  }
);
