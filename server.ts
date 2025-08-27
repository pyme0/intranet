import { Application, Router } from "@oak/oak";
import { getDatabase, type CreateDeudaData, type UpdateDeudaData } from "./database.ts";

const app = new Application();
const router = new Router();
const db = getDatabase();

// Middleware CORS simple
app.use(async (context, next) => {
  context.response.headers.set("Access-Control-Allow-Origin", "*");
  context.response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  context.response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (context.request.method === "OPTIONS") {
    context.response.status = 200;
    return;
  }

  await next();
});

// Servir archivos estáticos
app.use(async (context, next) => {
  if (context.request.url.pathname === "/" || context.request.url.pathname === "/index.html") {
    try {
      const html = await Deno.readTextFile("./public/index.html");
      context.response.type = "text/html";
      context.response.body = html;
    } catch {
      context.response.status = 404;
      context.response.body = "File not found";
    }
  } else {
    await next();
  }
});

// La base de datos se maneja a través del módulo database.ts

// Rutas de la API
router.get("/api/deudas", (context) => {
  try {
    const deudas = db.getAllDeudas();
    context.response.body = { deudas };
  } catch (error) {
    context.response.status = 500;
    context.response.body = { error: "Error al obtener deudas" };
  }
});

router.get("/api/empresas", (context) => {
  try {
    const empresas = db.getAllEmpresas();
    // Convertir array a objeto para mantener compatibilidad con el frontend
    const empresasObj: Record<string, any> = {};
    empresas.forEach(empresa => {
      empresasObj[empresa.nombre] = empresa;
    });
    context.response.body = { empresas: empresasObj };
  } catch (error) {
    context.response.status = 500;
    context.response.body = { error: "Error al obtener empresas" };
  }
});

router.post("/api/deudas", async (context) => {
  try {
    const body = await context.request.body.json() as CreateDeudaData;
    const nuevaDeuda = db.createDeuda(body);
    context.response.body = { deuda: nuevaDeuda };
  } catch (error) {
    context.response.status = 400;
    context.response.body = { error: "Error al crear deuda" };
  }
});

router.put("/api/deudas/:id", async (context) => {
  try {
    const id = parseInt(context.params.id!);
    const body = await context.request.body.json() as UpdateDeudaData;
    const deudaActualizada = db.updateDeuda(id, body);

    if (deudaActualizada) {
      context.response.body = { deuda: deudaActualizada };
    } else {
      context.response.status = 404;
      context.response.body = { error: "Deuda no encontrada" };
    }
  } catch (error) {
    context.response.status = 400;
    context.response.body = { error: "Error al actualizar deuda" };
  }
});

router.delete("/api/deudas/:id", (context) => {
  try {
    const id = parseInt(context.params.id!);
    const deudaEliminada = db.deleteDeuda(id);

    if (deudaEliminada) {
      context.response.body = { deuda: deudaEliminada };
    } else {
      context.response.status = 404;
      context.response.body = { error: "Deuda no encontrada" };
    }
  } catch (error) {
    context.response.status = 400;
    context.response.body = { error: "Error al eliminar deuda" };
  }
});

router.get("/api/resumen", (context) => {
  try {
    const resumen = db.getResumen();
    context.response.body = resumen;
  } catch (error) {
    context.response.status = 500;
    context.response.body = { error: "Error al obtener resumen" };
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

const PORT = 8000;
const HOSTNAME = "0.0.0.0"; // Escuchar en todas las interfaces

console.log(`🚀 Servidor corriendo en http://${HOSTNAME}:${PORT}`);
console.log(`📊 API disponible en http://localhost:${PORT}/api/deudas`);
console.log(`🌐 Cliente web en http://localhost:${PORT}`);
console.log(`🌍 Accesible externamente en puerto ${PORT}`);

await app.listen({ hostname: HOSTNAME, port: PORT });
