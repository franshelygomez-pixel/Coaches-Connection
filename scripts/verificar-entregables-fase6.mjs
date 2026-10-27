import { existsSync, readFileSync } from "node:fs";

const requeridos = [
  "FASE_6.md",
  "docs/INDICE_FASE_6.md",
  "docs/MANUAL_TECNICO.md",
  "docs/MANUAL_ADMINISTRADOR.md",
  "docs/MANUAL_USUARIO.md",
  "docs/MATRIZ_REQUERIMIENTOS_TRAZABILIDAD.md",
  "docs/PLAN_PILOTO.md",
  "docs/CASOS_ACEPTACION_FASE_6.md",
  "docs/INSTRUMENTOS_PILOTO.md",
  "docs/CONSENTIMIENTO_PARTICIPACION_PILOTO.md",
  "docs/GUIA_EVIDENCIAS_Y_ANONIMIZACION.md",
  "docs/PLANTILLA_RESULTADOS_Y_DISCUSION.md",
  "docs/ACTA_CIERRE_PILOTO.md",
  ".env.production.example",
  "netlify.toml",
  "vercel.json",
];

const faltantes = requeridos.filter((ruta) => !existsSync(ruta));
if (faltantes.length) {
  throw new Error(`Faltan entregables de la Fase 6: ${faltantes.join(", ")}`);
}

const paquete = JSON.parse(readFileSync("package.json", "utf8"));
if (paquete.version !== "1.6.0") {
  throw new Error(`La versión del frontend debe ser 1.6.0 y es ${paquete.version || "desconocida"}.`);
}

const fase = readFileSync("FASE_6.md", "utf8");
for (const termino of ["Despliegue", "trazabilidad", "usabilidad", "anonimizadas", "No inventar resultados"]) {
  if (!fase.toLocaleLowerCase("es").includes(termino.toLocaleLowerCase("es"))) {
    throw new Error(`FASE_6.md no documenta el apartado requerido: ${termino}.`);
  }
}

const manualTecnico = readFileSync("docs/MANUAL_TECNICO.md", "utf8");
for (const termino of ["React", "Supabase", "RLS", "respaldo", "recuperación"]) {
  if (!manualTecnico.toLocaleLowerCase("es").includes(termino.toLocaleLowerCase("es"))) {
    throw new Error(`El manual técnico no incluye: ${termino}.`);
  }
}

const trazabilidad = readFileSync("docs/MATRIZ_REQUERIMIENTOS_TRAZABILIDAD.md", "utf8");
const identificadores = trazabilidad.match(/\bR(?:F|NF)-\d{2}\b/g) || [];
if (new Set(identificadores).size < 20) {
  throw new Error("La matriz debe documentar al menos 20 requerimientos únicos.");
}

const instrumentos = readFileSync("docs/INSTRUMENTOS_PILOTO.md", "utf8");
for (const termino of ["SUS", "aceptación", "observación", "incidencias"]) {
  if (!instrumentos.toLocaleLowerCase("es").includes(termino.toLocaleLowerCase("es"))) {
    throw new Error(`Falta el instrumento de ${termino}.`);
  }
}

const archivosConfiguracion = [".env.example", ".env.production.example"];
for (const ruta of archivosConfiguracion) {
  const contenido = readFileSync(ruta, "utf8");
  if (/service_role|secret_key|sb_secret_/i.test(contenido)) {
    throw new Error(`${ruta} contiene una referencia a credenciales privadas.`);
  }
}

console.log("Entregables de la Fase 6 verificados correctamente.");
console.log(`Documentos y configuraciones comprobados: ${requeridos.length}.`);
console.log(`Requerimientos trazados: ${new Set(identificadores).size}.`);
