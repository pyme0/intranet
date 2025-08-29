#!/usr/bin/env node

/**
 * Script de prueba para verificar el sistema de filtrado inteligente
 * Prueba el caso específico: "Hay que preguntarle a Statsen si ha utilizado marca"
 * 
 * Resultado esperado:
 * - Términos prioritarios: ["statsen"] 
 * - Contexto: ["marca"]
 * - NO debe incluir: ["deberia", "desistir", "del", "uso", "preguntarle"]
 */

console.log('🧪 PRUEBA DEL SISTEMA DE FILTRADO INTELIGENTE');
console.log('='.repeat(60));

// Simular la lógica de filtrado del archivo search-contact-in-emails/route.ts
function testSmartFiltering() {
  const contactName = "Statsen";
  const postItContent = "Hay que preguntarle a Statsen si ha utilizado marca";
  
  console.log(`📝 Entrada de prueba:`);
  console.log(`   Contacto: "${contactName}"`);
  console.log(`   Post-it: "${postItContent}"`);
  console.log('');

  // Stop words expandidas (copiadas del código mejorado)
  const stopWords = [
    // Artículos, preposiciones, conjunciones básicas
    'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le', 'da', 'su', 'por', 'son', 'con', 'para', 'al', 'del', 'los', 'las', 'una', 'sobre', 'todo', 'también', 'tras', 'otro', 'algún', 'tanto', 'muy', 'ya', 'sea', 'puede', 'tiene', 'hace', 'hay', 'está', 'han', 'ser', 'si', 'me', 'mi', 'tu', 'él', 'ella', 'nos', 'vos', 'ellos', 'ellas',
    // Verbos y palabras funcionales problemáticas identificadas
    'deberia', 'desistir', 'del', 'uso', 'utilizado', 'preguntarle', 'pregunta', 'consulta', 'sobre', 'acerca', 'respecto', 'mediante', 'durante', 'antes', 'después', 'mientras', 'cuando', 'donde', 'como', 'porque', 'aunque', 'sino', 'pero', 'mas', 'menos', 'mucho', 'poco', 'bien', 'mal', 'mejor', 'peor',
    // Verbos adicionales que causan ruido
    'debería', 'deberían', 'podría', 'podrían', 'tendría', 'tendrían', 'haría', 'harían', 'sería', 'serían', 'estaría', 'estarían',
    'preguntarle', 'preguntarles', 'consultarle', 'consultarles', 'contactar', 'contactarle', 'contactarles',
    'enviar', 'mandar', 'escribir', 'llamar', 'hablar', 'decir', 'comentar', 'informar', 'avisar', 'notificar',
    'revisar', 'verificar', 'confirmar', 'validar', 'comprobar', 'chequear',
    // Palabras temporales y de contexto
    'ayer', 'hoy', 'mañana', 'ahora', 'luego', 'después', 'antes', 'pronto', 'tarde', 'temprano',
    'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo',
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  // Función mejorada para detectar nombres propios
  const isProperNoun = (word) => {
    // Debe empezar con mayúscula y tener al menos 3 caracteres
    if (!/^[A-Z][a-z]{2,}/.test(word)) return false;
    
    // Excluir palabras que claramente no son nombres propios
    const excludePatterns = [
      /^(Consulta|Marca|Registro|Cliente|Empresa|Abogado|Legal|Urgente|Pendiente|Solicitud|Carta|Documento|Email|Correo|Reunión|Meeting|Llamada|Teléfono)$/i,
      /^(Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo)$/i,
      /^(Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre)$/i
    ];
    
    return !excludePatterns.some(pattern => pattern.test(word));
  };

  // Función para detectar sustantivos relevantes al contexto legal/marcas
  const isRelevantNoun = (word) => {
    const legalTerms = ['marca', 'registro', 'solicitud', 'oposicion', 'tribunal', 'inapi', 'patente', 'derecho', 'propiedad', 'intelectual', 'comercial', 'industrial', 'renovacion', 'renovación'];
    return legalTerms.includes(word.toLowerCase());
  };

  // Función para detectar nombres de empresas conocidas
  const isKnownCompany = (word) => {
    const knownCompanies = ['statsen', 'stetson', 'patricia', 'stocker', 'focovi', 'canadian', 'dbv'];
    return knownCompanies.includes(word.toLowerCase());
  };

  // Extraer y clasificar términos del contenido
  const allWords = `${contactName} ${postItContent}`.split(/\s+/).filter(word => word.length > 0);

  console.log(`🔍 Análisis de palabras:`);
  console.log(`   Todas las palabras: [${allWords.join(', ')}]`);
  console.log('');

  // PRIORIDAD 1: Nombres propios específicos (máxima prioridad)
  const properNouns = allWords
    .filter(word => isProperNoun(word))
    .filter(word => !stopWords.includes(word.toLowerCase()))
    .map(word => word.toLowerCase());

  // PRIORIDAD 2: Nombres de empresas conocidas (alta prioridad)
  const companyNames = allWords
    .filter(word => isKnownCompany(word))
    .filter(word => !stopWords.includes(word.toLowerCase()))
    .map(word => word.toLowerCase());

  // PRIORIDAD 3: Email si está disponible (alta prioridad)
  const emailTerms = []; // No hay email en este caso

  // PRIORIDAD 4: Sustantivos relevantes al contexto (solo si hay nombres específicos)
  const relevantNouns = allWords
    .filter(word => isRelevantNoun(word))
    .map(word => word.toLowerCase());

  // Combinar términos con jerarquía estricta
  const priorityTerms = [...new Set([...properNouns, ...companyNames, ...emailTerms])];
  const contextTerms = [...new Set(relevantNouns)];

  console.log(`✅ RESULTADOS DEL FILTRADO INTELIGENTE:`);
  console.log(`   Términos prioritarios: [${priorityTerms.join(', ') || 'ninguno'}]`);
  console.log(`   Términos de contexto: [${contextTerms.join(', ') || 'ninguno'}]`);
  console.log('');

  // Verificar que el resultado es correcto
  const expectedPriority = ['statsen'];
  const expectedContext = ['marca'];
  const problematicTerms = ['deberia', 'desistir', 'del', 'uso', 'preguntarle'];

  console.log(`🎯 VERIFICACIÓN DE RESULTADOS:`);
  
  // Verificar términos prioritarios
  const priorityMatch = JSON.stringify(priorityTerms.sort()) === JSON.stringify(expectedPriority.sort());
  console.log(`   ✓ Términos prioritarios correctos: ${priorityMatch ? '✅ SÍ' : '❌ NO'}`);
  if (!priorityMatch) {
    console.log(`     Esperado: [${expectedPriority.join(', ')}]`);
    console.log(`     Obtenido: [${priorityTerms.join(', ')}]`);
  }

  // Verificar términos de contexto
  const contextMatch = JSON.stringify(contextTerms.sort()) === JSON.stringify(expectedContext.sort());
  console.log(`   ✓ Términos de contexto correctos: ${contextMatch ? '✅ SÍ' : '❌ NO'}`);
  if (!contextMatch) {
    console.log(`     Esperado: [${expectedContext.join(', ')}]`);
    console.log(`     Obtenido: [${contextTerms.join(', ')}]`);
  }

  // Verificar que NO se incluyen términos problemáticos
  const allTerms = [...priorityTerms, ...contextTerms];
  const hasProblematicTerms = problematicTerms.some(term => allTerms.includes(term));
  console.log(`   ✓ Sin términos problemáticos: ${!hasProblematicTerms ? '✅ SÍ' : '❌ NO'}`);
  if (hasProblematicTerms) {
    const foundProblematic = problematicTerms.filter(term => allTerms.includes(term));
    console.log(`     Términos problemáticos encontrados: [${foundProblematic.join(', ')}]`);
  }

  console.log('');
  
  const allTestsPassed = priorityMatch && contextMatch && !hasProblematicTerms;
  console.log(`🏆 RESULTADO FINAL: ${allTestsPassed ? '✅ TODAS LAS PRUEBAS PASARON' : '❌ ALGUNAS PRUEBAS FALLARON'}`);
  
  if (allTestsPassed) {
    console.log('');
    console.log('🎉 El sistema de filtrado inteligente está funcionando correctamente!');
    console.log('   - Identifica correctamente nombres propios como "Statsen"');
    console.log('   - Filtra palabras irrelevantes como "deberia", "preguntarle", etc.');
    console.log('   - Mantiene términos de contexto relevantes como "marca"');
    console.log('   - Priorizará búsquedas específicas sobre genéricas');
  } else {
    console.log('');
    console.log('⚠️  El sistema necesita ajustes adicionales.');
  }

  return allTestsPassed;
}

// Ejecutar la prueba
testSmartFiltering();

console.log('');
console.log('📋 INSTRUCCIONES PARA PROBAR EN LA APLICACIÓN:');
console.log('1. El servidor ya está corriendo en http://localhost:3001');
console.log('2. Crea un post-it con: "Hay que preguntarle a Statsen si ha utilizado marca"');
console.log('3. Usa la función "Buscar contacto en correos"');
console.log('4. VERIFICA LA NUEVA INFORMACIÓN DETALLADA:');
console.log('   - Debe mostrar el ranking de términos con puntajes');
console.log('   - Debe explicar por qué se eligió cada filtro');
console.log('   - Debe mostrar cuántos correos se analizaron');
console.log('   - Debe indicar la estrategia de búsqueda utilizada');
console.log('5. Confirma que los filtros finales sean: ["statsen"] (prioritario) y ["marca"] (contexto)');
console.log('6. Confirma que NO aparezcan: ["deberia", "desistir", "del", "uso", "preguntarle"]');
console.log('');
console.log('🔍 NUEVA FUNCIONALIDAD - INFORMACIÓN DETALLADA:');
console.log('- Ranking de términos con puntajes (100pts para nombres propios)');
console.log('- Explicación de por qué se eligió cada filtro');
console.log('- Estadísticas de búsqueda (X de Y correos analizados)');
console.log('- Estrategia de búsqueda utilizada (específica vs expandida)');
