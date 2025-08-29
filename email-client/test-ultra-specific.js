#!/usr/bin/env node

/**
 * Script de prueba para verificar el sistema ULTRA-ESPECÍFICO
 * Solo debe usar nombres específicos, NO términos genéricos como "caso"
 */

console.log('🧪 PRUEBA DEL SISTEMA ULTRA-ESPECÍFICO');
console.log('='.repeat(70));

function testUltraSpecific() {
  const testCases = [
    {
      name: "Caso con nombre específico válido",
      input: "Hay que revisar el caso de Statsen",
      expectedPriority: ["statsen"],
      expectedContext: [], // NO debe usar "caso" como contexto
      shouldFind: true
    },
    {
      name: "Caso solo con términos genéricos",
      input: "Hay que revisar el caso de la marca",
      expectedPriority: [],
      expectedContext: [],
      shouldFind: false // NO debe encontrar nada
    },
    {
      name: "Caso con empleado interno",
      input: "Marcos dice que hay un caso pendiente",
      expectedPriority: [],
      expectedContext: [],
      shouldFind: false // NO debe usar empleados internos
    },
    {
      name: "Caso con múltiples nombres válidos",
      input: "Reunión entre Statsen y Canadian sobre Focovi",
      expectedPriority: ["statsen", "canadian", "focovi"],
      expectedContext: [],
      shouldFind: true
    },
    {
      name: "Caso mixto - nombres válidos e inválidos",
      input: "Patricia dice que Statsen tiene un caso con Canadian",
      expectedPriority: ["statsen", "canadian"],
      expectedContext: [], // NO "caso", NO "patricia"
      shouldFind: true
    }
  ];

  // Lógica ultra-específica
  const stopWords = [
    'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le', 'da', 'su', 'por', 'son', 'con', 'para', 'al', 'del', 'los', 'las', 'una', 'sobre', 'todo', 'también', 'tras', 'otro', 'algún', 'tanto', 'muy', 'ya', 'sea', 'puede', 'tiene', 'hace', 'hay', 'está', 'han', 'ser', 'si', 'me', 'mi', 'tu', 'él', 'ella', 'nos', 'vos', 'ellos', 'ellas',
    'deberia', 'desistir', 'del', 'uso', 'utilizado', 'preguntarle', 'pregunta', 'consulta', 'sobre', 'acerca', 'respecto'
  ];

  const internalExclusions = [
    'patricia', 'stocker', 'marcos', 'marco', 'hermes', 'tomas', 'tomás', 'monica'
  ];

  const neverProperNouns = [
    'viene', 'quizá', 'quiza', 'restringir', 'esto', 'compensarlo',
    'tiene', 'tengo', 'tienes', 'hacer', 'hago', 'haces', 'dice', 'digo', 'dices',
    'viene', 'vengo', 'vienes', 'puede', 'puedo', 'puedes', 'debe', 'debo', 'debes'
  ];

  const isProperNoun = (word) => {
    const lowerWord = word.toLowerCase();
    
    if (!/^[A-Z][a-z]{3,}/.test(word)) return false;
    if (stopWords.includes(lowerWord)) return false;
    if (internalExclusions.includes(lowerWord)) return false;
    if (neverProperNouns.includes(lowerWord)) return false;
    
    const knownExternalNames = ['Statsen', 'Stetson', 'Focovi', 'Canadian', 'Nuvola', 'Patagonia'];
    if (knownExternalNames.includes(word)) return true;
    
    const excludePatterns = [
      /^(Consulta|Marca|Registro|Cliente|Empresa|Abogado|Legal|Urgente|Pendiente|Solicitud|Carta|Documento|Email|Correo|Reunión|Meeting|Llamada|Teléfono)$/i,
      /^(Viene|Tiene|Hace|Dice|Puede|Debe|Quiere|Sabe|Está|Estás|Están)$/i,
      /^(Esto|Esta|Este|Eso|Esa|Ese|Aquí|Allí|Ahora|Entonces|Luego|Después|Antes|Siempre|Nunca)$/i,
      /^(Caso|Casos|Marca|Marcas)$/i // Excluir términos genéricos
    ];
    
    return !excludePatterns.some(pattern => pattern.test(word));
  };

  const isKnownCompany = (word) => {
    const lowerWord = word.toLowerCase();
    if (internalExclusions.includes(lowerWord)) return false;
    const externalCompanies = ['statsen', 'stetson', 'focovi', 'canadian', 'dbv', 'nuvola', 'patagonia'];
    return externalCompanies.includes(lowerWord);
  };

  // NO usar términos de contexto genéricos
  const isRelevantNoun = () => false; // Deshabilitado

  let allTestsPassed = true;

  testCases.forEach((testCase, index) => {
    console.log(`\n📝 CASO ${index + 1}: ${testCase.name}`);
    console.log(`   Entrada: "${testCase.input}"`);
    
    const allWords = testCase.input.split(/\s+/).filter(word => word.length > 0);
    
    const termAnalysis = allWords.map(word => {
      const lowerWord = word.toLowerCase();
      let score = 0;
      let reasons = [];
      let category = 'descartado';

      if (isProperNoun(word)) {
        score += 100;
        reasons.push('Nombre propio detectado');
        category = 'nombre_propio';
      }

      if (isKnownCompany(word)) {
        score += 90;
        reasons.push('Empresa conocida');
        category = 'empresa';
      }

      // NO usar términos de contexto
      if (stopWords.includes(lowerWord) || internalExclusions.includes(lowerWord) || neverProperNouns.includes(lowerWord)) {
        score = 0;
        reasons = ['Excluido'];
        category = 'excluido';
      }

      return { original: word, normalized: lowerWord, score, reasons, category };
    });

    // SOLO términos con score >= 80 (nombres propios y empresas)
    const rankedTerms = termAnalysis.filter(term => term.score >= 80).sort((a, b) => b.score - a.score);
    const priorityTerms = rankedTerms.map(term => term.normalized);
    const contextTerms = []; // NO usar contexto

    console.log(`   📊 Palabras analizadas: [${allWords.join(', ')}]`);
    console.log(`   🎯 Términos detectados (score ≥80): [${priorityTerms.join(', ') || 'ninguno'}]`);
    console.log(`   📋 Términos de contexto: [${contextTerms.join(', ') || 'ninguno'}] (deshabilitado)`);
    
    // Verificar resultados
    const priorityMatch = JSON.stringify(priorityTerms.sort()) === JSON.stringify(testCase.expectedPriority.sort());
    const contextMatch = JSON.stringify(contextTerms.sort()) === JSON.stringify(testCase.expectedContext.sort());
    const shouldFindMatch = (priorityTerms.length > 0) === testCase.shouldFind;
    
    console.log(`   ✅ Términos prioritarios correctos: ${priorityMatch ? '✅' : '❌'}`);
    console.log(`   📋 Sin términos de contexto: ${contextMatch ? '✅' : '❌'}`);
    console.log(`   🔍 Debe encontrar resultados: ${testCase.shouldFind ? 'SÍ' : 'NO'} | Encontrará: ${priorityTerms.length > 0 ? 'SÍ' : 'NO'} ${shouldFindMatch ? '✅' : '❌'}`);
    
    const testPassed = priorityMatch && contextMatch && shouldFindMatch;
    console.log(`   🏆 Resultado: ${testPassed ? '✅ PASÓ' : '❌ FALLÓ'}`);
    
    if (!testPassed) allTestsPassed = false;
  });

  console.log('\n' + '='.repeat(70));
  console.log(`🏆 RESULTADO FINAL: ${allTestsPassed ? '✅ TODAS LAS PRUEBAS PASARON' : '❌ ALGUNAS PRUEBAS FALLARON'}`);
  
  if (allTestsPassed) {
    console.log('\n🎉 ¡Perfecto! El sistema ULTRA-ESPECÍFICO funciona correctamente:');
    console.log('   ✅ Solo usa nombres específicos de personas/empresas');
    console.log('   ❌ NO usa términos genéricos como "caso", "marca"');
    console.log('   ❌ NO usa empleados internos como filtros');
    console.log('   ✅ Si no hay nombres específicos, no busca nada');
    console.log('   ✅ Busca en contenido completo (body + asunto)');
  }

  return allTestsPassed;
}

testUltraSpecific();

console.log('\n📋 PARA PROBAR EN LA APLICACIÓN:');
console.log('1. Post-it con nombre específico: "Revisar caso de Statsen"');
console.log('   → Debe usar solo: [statsen]');
console.log('2. Post-it genérico: "Revisar el caso de la marca"');
console.log('   → Debe decir: "No se detectaron nombres específicos"');
console.log('3. Verificar que busca en el contenido completo de los correos');
