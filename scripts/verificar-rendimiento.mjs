import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const carpetaDist = join(raiz, "dist");
const limites = {
  archivoJavaScript: 400 * 1024,
  totalJavaScript: 900 * 1024,
  totalCss: 100 * 1024,
};

async function listarArchivos(carpeta) {
  const entradas = await readdir(carpeta, { withFileTypes: true });
  const archivos = [];
  for (const entrada of entradas) {
    const ruta = join(carpeta, entrada.name);
    if (entrada.isDirectory()) archivos.push(...await listarArchivos(ruta));
    else archivos.push(ruta);
  }
  return archivos;
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(2)} kB`;
}

let archivos;
try {
  archivos = await listarArchivos(carpetaDist);
} catch {
  console.error("No existe dist. Ejecuta npm run build antes de esta prueba.");
  process.exit(1);
}

const detalles = await Promise.all(archivos.map(async (archivo) => ({
  archivo,
  bytes: (await stat(archivo)).size,
})));
const javascript = detalles.filter(({ archivo }) => archivo.endsWith(".js"));
const css = detalles.filter(({ archivo }) => archivo.endsWith(".css"));
const totalJs = javascript.reduce((total, elemento) => total + elemento.bytes, 0);
const totalCss = css.reduce((total, elemento) => total + elemento.bytes, 0);
const archivoMayor = javascript.sort((a, b) => b.bytes - a.bytes)[0];
const index = await readFile(join(carpetaDist, "index.html"), "utf8");

const verificaciones = [
  {
    criterio: "Mayor archivo JavaScript",
    valor: archivoMayor ? kb(archivoMayor.bytes) : "0 kB",
    limite: kb(limites.archivoJavaScript),
    cumple: !archivoMayor || archivoMayor.bytes <= limites.archivoJavaScript,
    detalle: archivoMayor ? relative(raiz, archivoMayor.archivo) : "Sin archivos",
  },
  {
    criterio: "JavaScript total",
    valor: kb(totalJs),
    limite: kb(limites.totalJavaScript),
    cumple: totalJs <= limites.totalJavaScript,
  },
  {
    criterio: "CSS total",
    valor: kb(totalCss),
    limite: kb(limites.totalCss),
    cumple: totalCss <= limites.totalCss,
  },
  {
    criterio: "Idioma del documento",
    valor: index.includes('<html lang="es">') ? "es" : "no definido",
    limite: "es",
    cumple: index.includes('<html lang="es">'),
  },
  {
    criterio: "Viewport adaptable",
    valor: index.includes('name="viewport"') ? "presente" : "ausente",
    limite: "presente",
    cumple: index.includes('name="viewport"'),
  },
];

console.table(verificaciones);
const fallidas = verificaciones.filter(({ cumple }) => !cumple);
if (fallidas.length > 0) {
  console.error(`${fallidas.length} criterio(s) de rendimiento o compatibilidad no se cumplieron.`);
  process.exit(1);
}
console.log("Presupuesto de carga y comprobaciones básicas de compatibilidad aprobados.");
