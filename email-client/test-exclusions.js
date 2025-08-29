#!/usr/bin/env node

/**
 * Script de prueba para verificar que las exclusiones funcionan correctamente
 * Prueba casos problemáticos identificados por el usuario
 */

console.log('🧪 PRUEBA DE EXCLUSIONES - EMPLEADOS INTERNOS Y PALABRAS PROBLEMÁTICAS');
console.log('='.repeat(80));

// Simular la lógica de filtrado mejorada
function testExclusions() {
  // Casos de prueba problemáticos identificados
  const testCases = [
    {
      name: "Caso con empleados internos",
      input: "Marcos dice que Patricia Stocker debe revisar el caso de Statsen",
      expectedPriority: ["statsen"],
      expectedContext: ["caso"],
      shouldExclude: ["marcos", "patricia", "stocker", "dice", "debe"]
    },
    {
      name: "Caso con palabras problemáticas",
      input: "Viene Canadian pero quizá hay que restringir esto para compensarlo",
      expectedPriority: ["canadian"],
      expectedContext: [],
      shouldExclude: ["viene", "quizá", "restringir", "esto", "compensarlo"]
    },
    {
      name: "Caso mixto complejo",
      input: "Marco viene de Canadian y dice que Hermes debe revisar el caso de Focovi",
      expectedPriority: ["canadian", "focovi"],
      expectedContext: ["caso"],
      shouldExclude: ["marco", "viene", "dice", "hermes", "debe"]
    }
  ];

  // Lógica de filtrado copiada del código mejorado
  const stopWords = [
    'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le', 'da', 'su', 'por', 'son', 'con', 'para', 'al', 'del', 'los', 'las', 'una', 'sobre', 'todo', 'también', 'tras', 'otro', 'algún', 'tanto', 'muy', 'ya', 'sea', 'puede', 'tiene', 'hace', 'hay', 'está', 'han', 'ser', 'si', 'me', 'mi', 'tu', 'él', 'ella', 'nos', 'vos', 'ellos', 'ellas',
    'deberia', 'desistir', 'del', 'uso', 'utilizado', 'preguntarle', 'pregunta', 'consulta', 'sobre', 'acerca', 'respecto', 'mediante', 'durante', 'antes', 'después', 'mientras', 'cuando', 'donde', 'como', 'porque', 'aunque', 'sino', 'pero', 'mas', 'menos', 'mucho', 'poco', 'bien', 'mal', 'mejor', 'peor'
  ];

  const internalExclusions = [
    'patricia', 'stocker', 'marcos', 'marco', 'hermes', 'tomas', 'tomás', 'monica',
    'marcas', 'tomas@patriciastocker.com', 'marcas@patriciastocker.com',
    'patriciastocker'
  ];

  const neverProperNouns = [
    'viene', 'quizá', 'quiza', 'restringir', 'esto', 'compensarlo',
    'tiene', 'tengo', 'tienes', 'hacer', 'hago', 'haces', 'dice', 'digo', 'dices',
    'viene', 'vengo', 'vienes', 'puede', 'puedo', 'puedes', 'debe', 'debo', 'debes'
  ];

  const isProperNoun = (word) => {
    const lowerWord = word.toLowerCase();
    
    if (!/^[A-Z][a-z]{2,}/.test(word)) return false;
    if (stopWords.includes(lowerWord)) return false;
    if (internalExclusions.includes(lowerWord)) return false;
    if (neverProperNouns.includes(lowerWord)) return false;
    if (word.length < 4) return false;
    
    const knownExternalNames = ['Statsen', 'Stetson', 'Focovi', 'Canadian', 'Nuvola', 'Patagonia'];
    if (knownExternalNames.includes(word)) return true;
    
    const excludePatterns = [
      /^(Consulta|Marca|Registro|Cliente|Empresa|Abogado|Legal|Urgente|Pendiente|Solicitud|Carta|Documento|Email|Correo|Reunión|Meeting|Llamada|Teléfono)$/i,
      /^(Viene|Tiene|Hace|Dice|Puede|Debe|Quiere|Sabe|Está|Estás|Están)$/i,
      /^(Esto|Esta|Este|Eso|Esa|Ese|Aquí|Allí|Ahora|Entonces|Luego|Después|Antes|Siempre|Nunca)$/i
    ];
    
    return !excludePatterns.some(pattern => pattern.test(word));
  };

  const isKnownCompany = (word) => {
    const lowerWord = word.toLowerCase();
    if (internalExclusions.includes(lowerWord)) return false;
    const externalCompanies = ['statsen', 'stetson', 'focovi', 'canadian', 'dbv', 'nuvola', 'patagonia', 'berries', 'farms'];
    return externalCompanies.includes(lowerWord);
  };

  const isRelevantNoun = (word) => {
    const legalTerms = ['marca', 'registro', 'solicitud', 'oposicion', 'tribunal', 'inapi', 'patente', 'derecho', 'propiedad', 'intelectual', 'comercial', 'industrial', 'renovacion', 'renovación', 'caso', 'casos'];
    return legalTerms.includes(word.toLowerCase());
  };

  let allTestsPassed = true;

  testCases.forEach((testCase, index) => {
    console.log(`\n📝 CASO ${index + 1}: ${testCase.name}`);
    console.log(`   Entrada: "${testCase.input}"`);
    
    const allWords = testCase.input.split(/\s+/).filter(word => word.length > 0);
    
    // Aplicar el sistema de ranking
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

      if (isRelevantNoun(word)) {
        score += 50;
        reasons.push('Término legal relevante');
        if (category === 'descartado') category = 'contexto_legal';
      }

      if (stopWords.includes(lowerWord) || internalExclusions.includes(lowerWord) || neverProperNouns.includes(lowerWord)) {
        score = 0;
        reasons = ['Excluido - empleado interno, stop word o palabra problemática'];
        category = 'excluido';
      }

      return { original: word, normalized: lowerWord, score, reasons, category };
    });

    const rankedTerms = termAnalysis.filter(term => term.score > 0).sort((a, b) => b.score - a.score);
    const priorityTerms = rankedTerms.filter(term => term.score >= 80).map(term => term.normalized);
    const contextTerms = rankedTerms.filter(term => term.score >= 40 && term.score < 80).map(term => term.normalized);

    console.log(`   📊 Términos analizados: [${allWords.join(', ')}]`);
    console.log(`   ✅ Términos prioritarios: [${priorityTerms.join(', ') || 'ninguno'}]`);
    console.log(`   📋 Términos de contexto: [${contextTerms.join(', ') || 'ninguno'}]`);
    
    // Verificar exclusiones
    const allSelectedTerms = [...priorityTerms, ...contextTerms];
    const foundExclusions = testCase.shouldExclude.filter(term => allSelectedTerms.includes(term));
    
    console.log(`   ❌ Términos que DEBEN estar excluidos: [${testCase.shouldExclude.join(', ')}]`);
    console.log(`   🔍 Términos problemáticos encontrados: [${foundExclusions.join(', ') || 'ninguno'}]`);
    
    // Verificar resultados
    const priorityMatch = JSON.stringify(priorityTerms.sort()) === JSON.stringify(testCase.expectedPriority.sort());
    const contextMatch = JSON.stringify(contextTerms.sort()) === JSON.stringify(testCase.expectedContext.sort());
    const exclusionsWork = foundExclusions.length === 0;
    
    console.log(`   🎯 Términos prioritarios correctos: ${priorityMatch ? '✅' : '❌'}`);
    console.log(`   🎯 Términos de contexto correctos: ${contextMatch ? '✅' : '❌'}`);
    console.log(`   🎯 Exclusiones funcionando: ${exclusionsWork ? '✅' : '❌'}`);
    
    const testPassed = priorityMatch && contextMatch && exclusionsWork;
    console.log(`   🏆 Resultado: ${testPassed ? '✅ PASÓ' : '❌ FALLÓ'}`);
    
    if (!testPassed) allTestsPassed = false;
  });

  console.log('\n' + '='.repeat(80));
  console.log(`🏆 RESULTADO FINAL: ${allTestsPassed ? '✅ TODAS LAS PRUEBAS PASARON' : '❌ ALGUNAS PRUEBAS FALLARON'}`);
  
  if (allTestsPassed) {
    console.log('\n🎉 ¡Excelente! El sistema de exclusiones está funcionando correctamente:');
    console.log('   - Empleados internos (Marcos, Patricia, Stocker, Hermes) excluidos');
    console.log('   - Palabras problemáticas (viene, quizá, restringir, etc.) excluidas');
    console.log('   - Solo nombres externos y empresas externas como filtros');
    console.log('   - Términos de contexto legal apropiados incluidos');
  }

  return allTestsPassed;
}

// Ejecutar las pruebas
testExclusions();

console.log('\n📋 PARA PROBAR EN LA APLICACIÓN:');
console.log('1. Crea un post-it: "Marcos dice que Patricia Stocker debe revisar el caso de Statsen"');
console.log('2. Verifica que los filtros sean: ["statsen"] (prioritario) y ["caso"] (contexto)');
console.log('3. Confirma que NO aparezcan: ["marcos", "patricia", "stocker", "dice", "debe"]');
