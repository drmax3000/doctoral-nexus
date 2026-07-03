const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/nexus.db');
const API_URL = 'http://localhost:8081/api/v1/nexus/nodes';

async function runHealthCheck() {
  console.log('🔍 Iniciando Pre-Flight Check del sistema Doctoral Nexus...\n');

  // 1. Verificación de la Base de Datos
  console.log('[1/2] Verificando Base de Datos SQLite...');
  if (fs.existsSync(DB_PATH)) {
    const stats = fs.statSync(DB_PATH);
    const sizeKB = (stats.size / 1024).toFixed(2);
    console.log(`  ✅ Archivo de BD encontrado: data/nexus.db (${sizeKB} KB)`);
  } else {
    console.error('  ❌ ERROR: No se encontró la base de datos nexus.db en /data/.');
    console.error('  💡 SOLUCIÓN: Ejecuta "npm run ingest" para crearla desde los archivos Markdown.');
    process.exit(1);
  }

  // 2. Verificación del API
  console.log('\n[2/2] Probando conexión al API local (Expo en puerto 8081)...');
  try {
    // Usamos AbortController para agregar un timeout por si el server no responde
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(API_URL, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const nodeCount = Array.isArray(data) ? data.length : 0;
      console.log(`  ✅ API Respondiendo correctamente (HTTP 200).`);
      console.log(`  ✅ Nodos recuperados del API: ${nodeCount}`);
      
      console.log('\n🚀 ESTADO GLOBAL: ÓPTIMO. El entorno está listo para trabajar.');
      process.exit(0);
    } else {
      console.error(`  ❌ ERROR: El API respondió con código ${response.status} ${response.statusText}`);
      process.exit(1);
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('  ❌ ERROR: El API tardó demasiado en responder (Timeout).');
    } else {
      console.error(`  ❌ ERROR DE CONEXIÓN: No se pudo conectar a ${API_URL}`);
      console.error(`  Detalle: ${error.message}`);
    }
    console.error('  💡 SOLUCIÓN: Asegúrate de que "npx expo start" o "iniciar.bat" esté corriendo en otra terminal.');
    process.exit(1);
  }
}

runHealthCheck();
