import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase, traducirErrorSupabase } from "../supabaseClient";
import { descargarCSV } from "../utils/csv";
import { anonimizarEntrenadores, anonimizarSesiones } from "../utils/evidencias";
import {
  fechaLocalISO,
  normalizarRespuestaPaginada,
  periodoMensualInicial,
  tarjetasResumen,
  validarPeriodoReporte,
} from "../utils/reportes";
import { ROLES_PERMITIDOS } from "../utils/permisos";
import Paginacion from "./Paginacion";

const SESIONES_POR_PAGINA = 20;
const estadoVisible = (valor) => `${valor || "pendiente"}`.replaceAll("_", " ").toUpperCase();


const ESTADOS_SESION = [
  ["", "Todas"],
  ["programada", "Programadas"],
  ["completada", "Completadas"],
  ["cancelada", "Canceladas"],
  ["presente", "Presentes"],
  ["ausente", "Ausentes"],
  ["justificada", "Justificadas"],
];

const COLOR_ESTADO = {
  activo: ["#E1F5EE", "#085041"],
  completada: ["#E1F5EE", "#085041"],
  presente: ["#E1F5EE", "#085041"],
  pendiente: ["#FDECEE", "#9B1C24"],
  programada: ["#F0F0F0", "#555555"],
  justificada: ["#F0F0F0", "#555555"],
  cancelada: ["#FFF0F0", "#B02A2A"],
  ausente: ["#FFF0F0", "#B02A2A"],
};

const campo = {
  background: "#FFF", border: "1px solid #E5E5E5", borderRadius: "999px",
  boxSizing: "border-box", fontSize: "13px", outline: "none", padding: "10px 16px",
};

const numero = (valor) => Number(valor) || 0;

// Filtro que deja el Inicio al pulsar una tarjeta ({ estado, dias }); se descarta al entrar.
const CLAVE_FILTRO_INICIAL = "reportes:filtro-inicial";
const leerFiltroInicial = () => {
  try {
    const guardado = window.sessionStorage.getItem(CLAVE_FILTRO_INICIAL);
    return guardado ? JSON.parse(guardado) : null;
  } catch {
    return null;
  }
};
const periodoDeUltimosDias = (dias) => {
  const desde = new Date();
  desde.setDate(desde.getDate() - (dias - 1));
  return { desde: fechaLocalISO(desde), hasta: fechaLocalISO(new Date()) };
};
const tarjetaBase = { background: "#FFFFFF", border: "0.5px solid #E5E5E5", borderRadius: "12px", padding: "20px 24px" };

const botonPildora = (fondo, color, borde = "none") => ({
  background: fondo, border: borde, borderRadius: "999px", color, cursor: "pointer",
  fontSize: "12px", fontWeight: "800", padding: "9px 16px", whiteSpace: "nowrap",
});

const Insignia = ({ valor }) => {
  const clave = `${valor || "pendiente"}`.toLowerCase();
  const [fondo, color] = COLOR_ESTADO[clave] || ["#F5F5F5", "#555"];
  return (
    <span style={{ background: fondo, borderRadius: "20px", color, fontSize: "10px", fontWeight: "800", padding: "3px 10px", whiteSpace: "nowrap" }}>
      {estadoVisible(valor)}
    </span>
  );
};

// Evita inyección de fórmulas en Excel/Sheets: una celda de texto que empieza con
// = + - @ (o tab/CR) se prefija con apóstrofo para que se lea como texto.
const neutralizarCelda = (valor) =>
  typeof valor === "string" && /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;

const exportarCSV = (nombre, columnas, filas) =>
  descargarCSV(
    nombre,
    columnas,
    filas.map((fila) => Object.fromEntries(
      Object.entries(fila).map(([clave, valor]) => [clave, neutralizarCelda(valor)])
    ))
  );

// ---------------------------------------------------------------------------
// Dashboard: graficas en SVG/CSS puro (sin librerias). Paleta de la marca:
// negro como dato principal, gris para lo neutro y rojo solo para lo que requiere atencion.
// Cada grafica trae su leyenda con cifras, asi la identidad no depende solo del color.
// ---------------------------------------------------------------------------
const NEGRO = "#0B0B0B";
const GRIS = "#8A8A8A";
const ROJO = "#E11D2E";
const PISTA = "#EFEFEF";
const porcentaje = (parte, total) => (total > 0 ? Math.round((parte / total) * 100) : 0);

const Panel = ({ titulo, subtitulo, acciones = null, children }) => (
  <section style={{ ...tarjetaBase, display: "flex", flexDirection: "column", minWidth: 0 }}>
    <div style={{ alignItems: "flex-start", display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "space-between", marginBottom: "16px" }}>
      <div>
        <h4 style={{ color: NEGRO, fontSize: "15px", fontWeight: "900", margin: 0 }}>{titulo}</h4>
        {subtitulo && <p style={{ color: "#888", fontSize: "12px", lineHeight: 1.5, margin: "3px 0 0" }}>{subtitulo}</p>}
      </div>
      {acciones}
    </div>
    {children}
  </section>
);

// Anillo con leyenda. Al pasar el cursor (o enfocar con teclado) por un tramo o una fila de
// la leyenda, el centro muestra el valor y el porcentaje de ese tramo.
function Anillo({ partes, centro, subcentro, descripcion }) {
  const [activo, setActivo] = useState(null);
  const R = 54;
  const C = 2 * Math.PI * R;
  const HUECO = 3;
  const total = partes.reduce((suma, parte) => suma + parte.valor, 0);
  const visibles = partes.filter((parte) => parte.valor > 0);
  let acumulado = 0;
  const arcos = total > 0 ? visibles.map((parte) => {
    const largo = (parte.valor / total) * C;
    const arco = { ...parte, largo: visibles.length > 1 ? Math.max(largo - HUECO, 1) : largo, inicio: acumulado };
    acumulado += largo;
    return arco;
  }) : [];
  const enfocado = partes.find((parte) => parte.nombre === activo);
  return (
    <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: "22px" }}>
      <svg viewBox="0 0 140 140" role="img" aria-label={descripcion} style={{ flexShrink: 0, height: "150px", width: "150px" }}>
        <g transform="rotate(-90 70 70)">
          <circle cx="70" cy="70" r={R} fill="none" stroke={PISTA} strokeWidth="14" />
          {arcos.map((arco) => (
            <circle
              key={arco.nombre} cx="70" cy="70" r={R} fill="none" stroke={arco.color}
              strokeWidth={activo === arco.nombre ? 18 : 14}
              strokeDasharray={`${arco.largo} ${C - arco.largo}`} strokeDashoffset={-arco.inicio}
              onMouseEnter={() => setActivo(arco.nombre)} onMouseLeave={() => setActivo(null)}
              style={{ cursor: "default", transition: "stroke-width 0.12s" }}
            />
          ))}
        </g>
        <text x="70" y={enfocado ? 62 : 70} textAnchor="middle" fill={NEGRO} style={{ fontSize: "28px", fontWeight: 900 }}>
          {enfocado ? enfocado.valor : centro}
        </text>
        <text x="70" y={enfocado ? 79 : 88} textAnchor="middle" fill="#444" style={{ fontSize: "10px", fontWeight: 700 }}>
          {enfocado ? enfocado.nombre : subcentro}
        </text>
        {enfocado && (
          <text x="70" y="93" textAnchor="middle" fill="#888" style={{ fontSize: "10px", fontWeight: 600 }}>
            {porcentaje(enfocado.valor, total)}% del total
          </text>
        )}
      </svg>
      <ul style={{ display: "grid", flex: "1 1 130px", gap: "6px", listStyle: "none", margin: 0, padding: 0 }}>
        {partes.map((parte) => (
          <li
            key={parte.nombre} tabIndex={0}
            onMouseEnter={() => setActivo(parte.nombre)} onMouseLeave={() => setActivo(null)}
            onFocus={() => setActivo(parte.nombre)} onBlur={() => setActivo(null)}
            style={{ alignItems: "center", background: activo === parte.nombre ? "#F5F5F5" : "transparent", borderRadius: "8px", color: "#444", display: "flex", fontSize: "13px", gap: "9px", outline: "none", padding: "5px 8px" }}
          >
            <span aria-hidden="true" style={{ background: parte.color, borderRadius: "3px", flexShrink: 0, height: "10px", width: "10px" }} />
            <span style={{ flex: 1 }}>{parte.nombre}</span>
            <strong style={{ color: NEGRO }}>{parte.valor}</strong>
            <span style={{ color: "#999", fontSize: "11px", minWidth: "34px", textAlign: "right" }}>{porcentaje(parte.valor, total)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Barra de avance: cuanto del total ya cumple la condicion; lo que falta se nombra en rojo.
function BarraAvance({ titulo, valor, total, faltante, onVer = null }) {
  const ancho = total > 0 ? Math.min(100, (valor / total) * 100) : 0;
  const falta = Math.max(0, total - valor);
  return (
    <div>
      <div style={{ alignItems: "baseline", display: "flex", justifyContent: "space-between", marginBottom: "7px" }}>
        <span style={{ color: "#333", fontSize: "13px", fontWeight: "700" }}>{titulo}</span>
        <span style={{ color: "#666", fontSize: "12px" }}><strong style={{ color: NEGRO, fontSize: "15px" }}>{valor}</strong> de {total}</span>
      </div>
      <div role="img" aria-label={`${titulo}: ${valor} de ${total}`} style={{ background: PISTA, borderRadius: "999px", height: "10px", overflow: "hidden" }}>
        <div style={{ background: NEGRO, borderRadius: "999px", height: "100%", transition: "width 0.3s", width: `${ancho}%` }} />
      </div>
      {falta > 0 && onVer ? (
        <button
          type="button" onClick={onVer} title="Ver cuáles son"
          style={{ background: "none", border: "none", color: ROJO, cursor: "pointer", fontSize: "12px", fontWeight: "700", margin: "6px 0 0", padding: 0, textDecoration: "none" }}
        >
          {`${falta} ${faltante}`}
        </button>
      ) : (
        <p style={{ color: falta > 0 ? ROJO : "#999", fontSize: "12px", fontWeight: falta > 0 ? "700" : "500", margin: "6px 0 0" }}>
          {falta > 0 ? `${falta} ${faltante}` : "Todos al día"}
        </p>
      )}
    </div>
  );
}

const METRICAS_ENTRENADOR = [
  ["clientes_total", "Clientes", "Cifra de hoy"],
  ["rutinas_total", "Rutinas", "Cifra de hoy"],
  ["sesiones_total", "Sesiones", "Dentro del periodo"],
  ["sesiones_completadas", "Completadas", "Dentro del periodo"],
  ["asistencias", "Presentes", "Dentro del periodo"],
  ["ausencias", "Ausentes", "Dentro del periodo"],
];

// Barras horizontales ordenadas de mayor a menor; el selector cambia la medida.
function ComparacionEntrenadores({ entrenadores }) {
  const [metrica, setMetrica] = useState("clientes_total");
  const [enfocado, setEnfocado] = useState(null);
  const definicion = METRICAS_ENTRENADOR.find(([clave]) => clave === metrica);
  const filas = [...entrenadores].sort((a, b) => numero(b[metrica]) - numero(a[metrica]));
  const maximo = Math.max(1, ...filas.map((fila) => numero(fila[metrica])));
  const color = metrica === "ausencias" ? ROJO : NEGRO;
  const detalle = filas.find((fila) => fila.coach_id === enfocado);
  return (
    <div>
      <div role="group" aria-label="Medida a comparar" style={{ background: "#FAFAFA", border: "1px solid #E5E5E5", borderRadius: "999px", display: "inline-flex", flexWrap: "wrap", gap: "4px", marginBottom: "6px", padding: "4px" }}>
        {METRICAS_ENTRENADOR.map(([clave, etiqueta]) => {
          const seleccionada = metrica === clave;
          return (
            <button key={clave} type="button" aria-pressed={seleccionada} onClick={() => setMetrica(clave)} style={{ background: seleccionada ? NEGRO : "transparent", border: "none", borderRadius: "999px", color: seleccionada ? "#FFF" : "#666", cursor: "pointer", fontSize: "12px", fontWeight: seleccionada ? "800" : "600", padding: "7px 13px" }}>
              {etiqueta}
            </button>
          );
        })}
      </div>
      <p style={{ color: "#999", fontSize: "11px", margin: "0 0 14px 4px" }}>{definicion[2]}</p>
      {filas.length === 0 ? (
        <p style={{ color: "#888", fontSize: "13px", margin: 0 }}>Todavía no hay entrenadores registrados.</p>
      ) : (
        <div role="list" aria-label={`Comparación de ${definicion[1].toLowerCase()} por entrenador`} style={{ display: "grid", gap: "8px" }}>
          {filas.map((fila) => {
            const valor = numero(fila[metrica]);
            const activo = enfocado === fila.coach_id;
            return (
              <div
                key={fila.coach_id} role="listitem" tabIndex={0}
                onMouseEnter={() => setEnfocado(fila.coach_id)} onMouseLeave={() => setEnfocado(null)}
                onFocus={() => setEnfocado(fila.coach_id)} onBlur={() => setEnfocado(null)}
                style={{ alignItems: "center", background: activo ? "#F7F7F7" : "transparent", borderRadius: "8px", display: "grid", gap: "12px", gridTemplateColumns: "minmax(110px, 190px) 1fr", outline: "none", padding: "5px 8px" }}
              >
                <span style={{ color: fila.estado === "activo" ? NEGRO : "#999", fontSize: "13px", fontWeight: "700", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={fila.nombre}>
                  {fila.nombre}{fila.estado === "activo" ? "" : " (inactivo)"}
                </span>
                <span style={{ alignItems: "center", display: "flex" }}>
                  <span style={{ background: color, borderRadius: "0 4px 4px 0", height: "14px", minWidth: valor > 0 ? "4px" : 0, transition: "width 0.25s", width: `${(valor / maximo) * 88}%` }} />
                  <strong style={{ color: valor > 0 ? NEGRO : "#BBB", fontSize: "13px", marginLeft: "8px" }}>{valor}</strong>
                </span>
              </div>
            );
          })}
        </div>
      )}
      <p style={{ background: "#FAFAFA", borderRadius: "8px", color: "#666", fontSize: "12px", lineHeight: 1.6, margin: "14px 0 0", minHeight: "38px", padding: "10px 12px" }}>
        {detalle
          ? <><strong style={{ color: NEGRO }}>{detalle.nombre}</strong>: {numero(detalle.clientes_total)} clientes, {numero(detalle.rutinas_total)} rutinas, {numero(detalle.sesiones_total)} sesiones ({numero(detalle.sesiones_completadas)} completadas), {numero(detalle.asistencias)} presentes y {numero(detalle.ausencias)} ausentes.</>
          : "Pasa el cursor sobre un entrenador para ver su detalle."}
      </p>
    </div>
  );
}

// Los 5 entrenadores con mas trabajo en el periodo: se ordenan por sesiones completadas
// (desempata con sesiones agendadas y luego con clientes a cargo). Si nadie completo
// sesiones todavia, se ordena por clientes a cargo para que el panel no quede vacio.
function TopEntrenadores({ entrenadores, onElegir }) {
  const hayCompletadas = entrenadores.some((entrenador) => numero(entrenador.sesiones_completadas) > 0);
  const clave = hayCompletadas ? "sesiones_completadas" : "clientes_total";
  const orden = [...entrenadores]
    .sort((a, b) => numero(b[clave]) - numero(a[clave]) || numero(b.sesiones_total) - numero(a.sesiones_total) || numero(b.clientes_total) - numero(a.clientes_total))
    .filter((entrenador) => numero(entrenador[clave]) > 0)
    .slice(0, 5);
  const maximo = Math.max(1, ...orden.map((entrenador) => numero(entrenador[clave])));
  if (orden.length === 0) {
    return <p style={{ background: "#FAFAFA", borderRadius: "10px", color: "#666", fontSize: "13px", lineHeight: 1.6, margin: 0, padding: "14px" }}>Todavía no hay actividad de entrenadores para mostrar.</p>;
  }
  return (
    <div>
      <p style={{ color: "#888", fontSize: "11px", margin: "0 0 12px" }}>
        {hayCompletadas ? "Ordenados por sesiones completadas en el periodo." : "Sin sesiones completadas en el periodo: se ordenan por clientes a cargo."}
      </p>
      <ol aria-label="Los 5 entrenadores con más trabajo" style={{ display: "grid", gap: "12px", listStyle: "none", margin: 0, padding: 0 }}>
        {orden.map((entrenador, indice) => {
          const valor = numero(entrenador[clave]);
          return (
            <li key={entrenador.coach_id}>
              <button
                type="button" onClick={() => onElegir({ entrenador, puesto: indice + 1, porCompletadas: hayCompletadas })}
                title={`Ver el detalle de ${entrenador.nombre}`}
                style={{ alignItems: "center", background: "none", border: "none", borderRadius: "10px", cursor: "pointer", display: "grid", font: "inherit", gap: "12px", gridTemplateColumns: "26px 1fr", padding: "6px", textAlign: "left", width: "100%" }}
                onMouseEnter={(evento) => { evento.currentTarget.style.background = "#F7F7F7"; }}
                onMouseLeave={(evento) => { evento.currentTarget.style.background = "none"; }}
              >
                <span aria-hidden="true" style={{ alignItems: "center", background: indice === 0 ? ROJO : NEGRO, borderRadius: "50%", color: "#FFF", display: "flex", fontSize: "12px", fontWeight: "900", height: "26px", justifyContent: "center", width: "26px" }}>{indice + 1}</span>
                <span style={{ display: "block", minWidth: 0 }}>
                  <span style={{ alignItems: "baseline", display: "flex", gap: "8px", justifyContent: "space-between" }}>
                    <strong title={entrenador.nombre} style={{ color: NEGRO, fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entrenador.nombre}</strong>
                    <strong style={{ color: NEGRO, fontSize: "14px" }}>{valor}</strong>
                  </span>
                  <span style={{ background: PISTA, borderRadius: "0 4px 4px 0", display: "block", height: "8px", margin: "5px 0 4px" }}>
                    <span style={{ background: NEGRO, borderRadius: "0 4px 4px 0", display: "block", height: "100%", transition: "width 0.25s", width: `${(valor / maximo) * 100}%` }} />
                  </span>
                  <span style={{ color: "#888", fontSize: "11px", fontWeight: "700" }}>Ver detalle</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// Clientes activos que todavía no tienen rutina: quién es y con qué entrenador está,
// para que el administrador sepa a quién escribirle o a quién reasignar.
function ClientesSinRutina({ items, total, rutinasTotal, nombreEntrenador, esAdmin }) {
  const restantes = Math.max(0, total - items.length);
  return (
    <div style={{ display: "flex", flex: 1, flexDirection: "column" }}>
      <div style={{ alignItems: "baseline", display: "flex", flexWrap: "wrap", gap: "10px 18px", marginBottom: "14px" }}>
        <span style={{ alignItems: "baseline", display: "inline-flex", gap: "7px" }}>
          <strong style={{ color: total > 0 ? ROJO : NEGRO, fontSize: "40px", fontWeight: "900", lineHeight: 1 }}>{total}</strong>
          <span style={{ color: "#555", fontSize: "13px", fontWeight: "700" }}>{total === 1 ? "cliente sin rutina" : "clientes sin rutina"}</span>
        </span>
        <span style={{ color: "#888", fontSize: "12px" }}>{rutinasTotal} {rutinasTotal === 1 ? "rutina disponible" : "rutinas disponibles"} para asignar</span>
      </div>

      {total === 0 ? (
        <p style={{ background: "#FAFAFA", borderRadius: "10px", color: "#666", fontSize: "13px", lineHeight: 1.6, margin: 0, padding: "14px" }}>Todos los clientes activos tienen una rutina asignada.</p>
      ) : (
        <>
          {rutinasTotal === 0 && (
            <p style={{ background: "#FDECEE", borderRadius: "10px", color: "#9B1C24", fontSize: "12px", fontWeight: "700", lineHeight: 1.5, margin: "0 0 10px", padding: "10px 12px" }}>
              Todavía no hay rutinas creadas. Los entrenadores deben crear al menos una para poder asignarla.
            </p>
          )}
          <ul style={{ display: "grid", gap: "2px", listStyle: "none", margin: 0, padding: 0 }}>
            {items.map((cliente) => {
              const nombre = `${cliente.nombre || ""} ${cliente.apellido || ""}`.trim() || "Sin nombre";
              const entrenador = cliente.coach_id ? nombreEntrenador(cliente.coach_id) : null;
              return (
                <li key={cliente.id} style={{ alignItems: "center", borderTop: "1px solid #F0F0F0", display: "flex", gap: "11px", padding: "9px 2px" }}>
                  <span aria-hidden="true" style={{ alignItems: "center", background: NEGRO, borderRadius: "50%", color: "#FF5A64", display: "flex", flexShrink: 0, fontSize: "12px", fontWeight: "900", height: "30px", justifyContent: "center", width: "30px" }}>
                    {nombre[0]?.toUpperCase()}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <strong style={{ color: NEGRO, display: "block", fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nombre}</strong>
                    {esAdmin && (
                      <span style={{ color: entrenador ? "#888" : ROJO, fontSize: "11px", fontWeight: entrenador ? "500" : "700" }}>
                        {entrenador ? `Entrenador: ${entrenador}` : "Sin entrenador asignado"}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          {restantes > 0 && <p style={{ color: "#888", fontSize: "12px", margin: "8px 0 0" }}>y {restantes} más</p>}
        </>
      )}

      {esAdmin && total > 0 && (
        <button type="button" onClick={() => { window.location.hash = "#/Clientes"; }} style={{ ...botonPildora(NEGRO, "#FFFFFF"), alignSelf: "flex-start", marginTop: "auto", padding: "10px 18px" }}>
          Ir a Clientes
        </button>
      )}
    </div>
  );
}

// Ventana flotante simple: se cierra con Escape, con la X o tocando el fondo.
function Ventana({ titulo, subtitulo, onCerrar, children }) {
  useEffect(() => {
    const alTeclear = (evento) => { if (evento.key === "Escape") onCerrar(); };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [onCerrar]);
  return (
    <div
      role="dialog" aria-modal="true" aria-label={titulo}
      onClick={(evento) => { if (evento.target === evento.currentTarget) onCerrar(); }}
      style={{ alignItems: "center", background: "rgba(0,0,0,0.5)", boxSizing: "border-box", display: "flex", inset: 0, justifyContent: "center", padding: "20px", position: "fixed", zIndex: 1000 }}
    >
      <div style={{ background: "#FFF", borderRadius: "14px", boxSizing: "border-box", maxHeight: "88vh", overflowY: "auto", padding: "22px 24px", width: "min(640px, 100%)" }}>
        <div style={{ alignItems: "flex-start", display: "flex", gap: "12px", justifyContent: "space-between", marginBottom: "16px" }}>
          <div>
            <h3 style={{ color: NEGRO, fontSize: "17px", fontWeight: "900", margin: 0 }}>{titulo}</h3>
            {subtitulo && <p style={{ color: "#888", fontSize: "12px", lineHeight: 1.5, margin: "3px 0 0" }}>{subtitulo}</p>}
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" style={{ background: "#F2F2F2", border: "none", borderRadius: "50%", color: NEGRO, cursor: "pointer", fontSize: "16px", fontWeight: "800", height: "30px", lineHeight: 1, width: "30px" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const TIPOS_FALTANTE = {
  rutina: { titulo: "Clientes sin rutina", ayuda: "Todavía no tienen una rutina asignada." },
  entrenador: { titulo: "Clientes sin entrenador", ayuda: "Ningún entrenador los tiene a cargo. Asígnalos desde Clientes." },
  portal: { titulo: "Clientes sin acceso al portal", ayuda: "No tienen una cuenta activa para entrar a su portal." },
};

// Lista real de los clientes que faltan en cada barra de cobertura. Se consulta al abrir y se
// vuelve a consultar si cambian los números del resumen.
function DetalleFaltantes({ tipo, esAdmin, coachId, nombreEntrenador, clave, onCerrar }) {
  const [filas, setFilas] = useState(null);
  const [error, setError] = useState("");
  const definicion = TIPOS_FALTANTE[tipo];

  useEffect(() => {
    let vigente = true;
    (async () => {
      let consulta = supabase.from("clientes").select("id,nombre,apellido,email,estado,coach_id,rutina_id").order("nombre");
      if (!esAdmin && coachId) consulta = consulta.eq("coach_id", coachId);
      const [clientes, cuentas] = await Promise.all([consulta, supabase.from("cuentas_clientes").select("cliente_id,estado")]);
      if (!vigente) return;
      const fallo = clientes.error || cuentas.error;
      if (fallo) { setError(traducirErrorSupabase(fallo)); return; }
      setError("");
      const conCuentaActiva = new Set((cuentas.data || []).filter((cuenta) => `${cuenta.estado}`.toLowerCase() === "activo").map((cuenta) => cuenta.cliente_id));
      const conCuenta = new Set((cuentas.data || []).map((cuenta) => cuenta.cliente_id));
      const lista = (clientes.data || []).filter((cliente) => {
        if (tipo === "rutina") return !cliente.rutina_id;
        if (tipo === "entrenador") return !cliente.coach_id;
        return !conCuentaActiva.has(cliente.id);
      }).map((cliente) => ({ ...cliente, cuenta: conCuenta.has(cliente.id) }));
      setFilas(lista);
    })();
    return () => { vigente = false; };
  }, [tipo, esAdmin, coachId, clave]);

  return (
    <Ventana titulo={definicion.titulo} subtitulo={definicion.ayuda} onCerrar={onCerrar}>
      {error && <p role="alert" style={{ background: "#FDECEE", borderRadius: "10px", color: "#9B1C24", fontSize: "12px", fontWeight: "700", margin: "0 0 12px", padding: "10px 12px" }}>{error}</p>}
      {filas === null && !error && <p style={{ color: "#888", fontSize: "13px", margin: 0 }}>Cargando...</p>}
      {filas && filas.length === 0 && <p style={{ background: "#FAFAFA", borderRadius: "10px", color: "#666", fontSize: "13px", margin: 0, padding: "14px" }}>No hay clientes en esta situación.</p>}
      {filas && filas.length > 0 && (
        <ul style={{ display: "grid", listStyle: "none", margin: 0, padding: 0 }}>
          {filas.map((cliente) => {
            const nombre = `${cliente.nombre || ""} ${cliente.apellido || ""}`.trim() || "Sin nombre";
            const detalle = [
              cliente.email,
              esAdmin && tipo !== "entrenador" ? (cliente.coach_id ? `Entrenador: ${nombreEntrenador(cliente.coach_id)}` : "Sin entrenador") : null,
              tipo === "portal" ? (cliente.cuenta ? "Cuenta desactivada" : "Sin cuenta creada") : null,
            ].filter(Boolean).join(" · ");
            return (
              <li key={cliente.id} style={{ alignItems: "center", borderTop: "1px solid #F0F0F0", display: "flex", gap: "12px", padding: "10px 2px" }}>
                <span aria-hidden="true" style={{ alignItems: "center", background: NEGRO, borderRadius: "50%", color: "#FF5A64", display: "flex", flexShrink: 0, fontSize: "12px", fontWeight: "900", height: "32px", justifyContent: "center", width: "32px" }}>{nombre[0]?.toUpperCase()}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ color: NEGRO, display: "block", fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nombre}</strong>
                  <span style={{ color: "#888", display: "block", fontSize: "11px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{detalle}</span>
                </span>
                <Insignia valor={cliente.estado} />
              </li>
            );
          })}
        </ul>
      )}
      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "18px" }}>
        <button type="button" onClick={onCerrar} style={botonPildora("#FFFFFF", NEGRO, `1px solid ${NEGRO}`)}>Cerrar</button>
        <button type="button" onClick={() => { window.location.hash = "#/Clientes"; onCerrar(); }} style={botonPildora(NEGRO, "#FFFFFF")}>Ir a Clientes</button>
      </div>
    </Ventana>
  );
}

// Todo lo que hizo un entrenador del Top 5 en el periodo: por que esta en el ranking.
function DetalleEntrenador({ entrenador, puesto, porCompletadas, periodo, onCerrar }) {
  const [clientes, setClientes] = useState(null);
  const [sesiones, setSesiones] = useState(null);
  const [error, setError] = useState("");
  const clave = `${entrenador.sesiones_completadas}-${entrenador.sesiones_total}-${entrenador.clientes_total}`;

  useEffect(() => {
    let vigente = true;
    (async () => {
      const [respuestaClientes, respuestaSesiones] = await Promise.all([
        supabase.from("clientes").select("id,nombre,apellido,estado,rutina_id").eq("coach_id", entrenador.coach_id).order("nombre"),
        supabase.rpc("reporte_sesiones_paginado", {
          p_desde: periodo.desde, p_hasta: periodo.hasta, p_pagina: 1, p_por_pagina: 50, p_estado: "completada", p_coach_id: entrenador.coach_id,
        }),
      ]);
      if (!vigente) return;
      const fallo = respuestaClientes.error || respuestaSesiones.error;
      if (fallo) { setError(traducirErrorSupabase(fallo)); return; }
      setError("");
      setClientes(respuestaClientes.data || []);
      setSesiones(normalizarRespuestaPaginada(respuestaSesiones.data).items);
    })();
    return () => { vigente = false; };
  }, [entrenador.coach_id, periodo.desde, periodo.hasta, clave]);

  const completadas = numero(entrenador.sesiones_completadas);
  const motivo = porCompletadas
    ? `Está en el puesto ${puesto} porque completó ${completadas} ${completadas === 1 ? "sesión" : "sesiones"} en el periodo.`
    : `Aún no hay sesiones completadas en el periodo; está en el puesto ${puesto} por sus ${numero(entrenador.clientes_total)} clientes a cargo.`;
  const datos = [
    ["Sesiones completadas", completadas],
    ["Sesiones agendadas", numero(entrenador.sesiones_total)],
    ["Presentes", numero(entrenador.asistencias)],
    ["Ausentes", numero(entrenador.ausencias)],
    ["Clientes a cargo", numero(entrenador.clientes_total)],
    ["Rutinas creadas", numero(entrenador.rutinas_total)],
  ];
  const fecha = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString("es-DO", { day: "numeric", month: "short", year: "numeric" });

  return (
    <Ventana titulo={entrenador.nombre} subtitulo={`Del ${fecha(periodo.desde)} al ${fecha(periodo.hasta)}`} onCerrar={onCerrar}>
      <p style={{ background: "#FAFAFA", borderRadius: "10px", color: "#444", fontSize: "13px", fontWeight: "700", lineHeight: 1.5, margin: "0 0 14px", padding: "11px 13px" }}>{motivo}</p>
      <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", marginBottom: "18px" }}>
        {datos.map(([etiqueta, valor]) => (
          <div key={etiqueta} style={{ border: "0.5px solid #E5E5E5", borderRadius: "10px", padding: "12px 14px" }}>
            <p style={{ color: "#888", fontSize: "11px", margin: "0 0 4px" }}>{etiqueta}</p>
            <p style={{ color: ROJO, fontSize: "26px", fontWeight: "900", margin: 0 }}>{valor}</p>
          </div>
        ))}
      </div>
      {error && <p role="alert" style={{ background: "#FDECEE", borderRadius: "10px", color: "#9B1C24", fontSize: "12px", fontWeight: "700", margin: "0 0 12px", padding: "10px 12px" }}>{error}</p>}

      <h4 style={{ color: NEGRO, fontSize: "14px", fontWeight: "900", margin: "0 0 8px" }}>Sesiones completadas</h4>
      {sesiones === null && !error && <p style={{ color: "#888", fontSize: "13px", margin: "0 0 14px" }}>Cargando...</p>}
      {sesiones && sesiones.length === 0 && <p style={{ color: "#888", fontSize: "13px", margin: "0 0 14px" }}>No completó sesiones en este periodo.</p>}
      {sesiones && sesiones.length > 0 && (
        <ul style={{ display: "grid", listStyle: "none", margin: "0 0 16px", maxHeight: "240px", overflowY: "auto", padding: 0 }}>
          {sesiones.map((sesion) => (
            <li key={sesion.id} style={{ alignItems: "center", borderTop: "1px solid #F0F0F0", display: "flex", gap: "10px", padding: "8px 2px" }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ color: NEGRO, display: "block", fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sesion.cliente}</strong>
                <span style={{ color: "#888", fontSize: "11px" }}>{new Date(sesion.inicio).toLocaleString("es-DO", { dateStyle: "medium", timeStyle: "short" })}{sesion.titulo ? ` · ${sesion.titulo}` : ""}</span>
              </span>
              <Insignia valor={sesion.asistencia} />
            </li>
          ))}
        </ul>
      )}

      <h4 style={{ color: NEGRO, fontSize: "14px", fontWeight: "900", margin: "0 0 8px" }}>Clientes a cargo ({clientes ? clientes.length : "..."})</h4>
      {clientes && clientes.length === 0 && <p style={{ color: "#888", fontSize: "13px", margin: 0 }}>No tiene clientes asignados.</p>}
      {clientes && clientes.length > 0 && (
        <ul style={{ display: "grid", listStyle: "none", margin: 0, maxHeight: "200px", overflowY: "auto", padding: 0 }}>
          {clientes.map((cliente) => (
            <li key={cliente.id} style={{ alignItems: "center", borderTop: "1px solid #F0F0F0", display: "flex", gap: "10px", justifyContent: "space-between", padding: "8px 2px" }}>
              <span style={{ minWidth: 0 }}>
                <strong style={{ color: NEGRO, fontSize: "13px" }}>{`${cliente.nombre || ""} ${cliente.apellido || ""}`.trim() || "Sin nombre"}</strong>
                {!cliente.rutina_id && <span style={{ color: ROJO, fontSize: "11px", fontWeight: "700", marginLeft: "8px" }}>Sin rutina</span>}
              </span>
              <Insignia valor={cliente.estado} />
            </li>
          ))}
        </ul>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "18px" }}>
        <button type="button" onClick={onCerrar} style={botonPildora(NEGRO, "#FFFFFF")}>Cerrar</button>
      </div>
    </Ventana>
  );
}

export default function ReportesFase4({ rol, coachId = null }) {
  const esAdmin = rol === ROLES_PERMITIDOS.ADMIN;
  // El admin ve todo (null); el coach se limita a su propio id. El RPC debe
  // reforzarlo con auth.uid() (ver sql/fase5_cambios.sql); esto es solo la primera barrera.
  const filtroCoachId = esAdmin ? null : coachId;
  const [filtroInicial] = useState(() => leerFiltroInicial());
  const periodoInicial = () => (filtroInicial?.dias ? periodoDeUltimosDias(Number(filtroInicial.dias)) : periodoMensualInicial());
  const [periodo, setPeriodo] = useState(periodoInicial);
  const [periodoAplicado, setPeriodoAplicado] = useState(periodoInicial);
  const [resumen, setResumen] = useState({});
  const [entrenadores, setEntrenadores] = useState([]);
  const [sesiones, setSesiones] = useState([]);
  const [pendientesRutina, setPendientesRutina] = useState({ items: [], total: 0 });
  const [totalSesiones, setTotalSesiones] = useState(0);
  const [paginaSesiones, setPaginaSesiones] = useState(1);
  const [filtroEstado, setFiltroEstado] = useState(() => filtroInicial?.estado || "");
  const [cargandoResumen, setCargandoResumen] = useState(true);
  const [cargandoSesiones, setCargandoSesiones] = useState(true);
  const [error, setError] = useState("");
  const [errorPeriodo, setErrorPeriodo] = useState("");
  const [entrenadoresActivos, setEntrenadoresActivos] = useState(0);
  const [detalleFaltantes, setDetalleFaltantes] = useState(null);
  const [detalleEntrenador, setDetalleEntrenador] = useState(null);
  const solicitudResumen = useRef(0);
  const solicitudSesiones = useRef(0);

  // Total de entrenadores activos para el atajo del administrador.
  const cargarEntrenadoresActivos = useCallback(async () => {
    if (rol !== ROLES_PERMITIDOS.ADMIN) return;
    const { count } = await supabase.from("entrenadores").select("id", { count: "exact", head: true }).eq("estado", "activo");
    setEntrenadoresActivos(count || 0);
  }, [rol]);

  useEffect(() => {
    const temporizador = window.setTimeout(() => void cargarEntrenadoresActivos(), 0);
    return () => window.clearTimeout(temporizador);
  }, [cargarEntrenadoresActivos]);

  useEffect(() => {
    try { window.sessionStorage.removeItem(CLAVE_FILTRO_INICIAL); } catch { /* sin almacenamiento */ }
    if (!filtroInicial?.estado) return undefined;
    // El detalle aparece cuando termina de cargar el resumen: se reintenta unos instantes.
    let intentos = 0;
    const temporizador = window.setInterval(() => {
      const detalle = document.getElementById("detalle-sesiones");
      intentos += 1;
      if (detalle) {
        detalle.scrollIntoView({ behavior: "smooth", block: "start" });
        window.clearInterval(temporizador);
      } else if (intentos >= 20) {
        window.clearInterval(temporizador);
      }
    }, 250);
    return () => window.clearInterval(temporizador);
  }, [filtroInicial]);

  // Resumen y comparación por entrenador solo dependen del periodo: no se vuelven a
  // calcular al paginar o filtrar las sesiones.
  const cargarResumen = useCallback(async (silencioso = false) => {
    const numero = ++solicitudResumen.current;
    if (!silencioso) setCargandoResumen(true);
    const parametros = { p_desde: periodoAplicado.desde, p_hasta: periodoAplicado.hasta };
    const solicitudes = [
      supabase.rpc("reporte_resumen_operativo", { ...parametros, p_coach_id: filtroCoachId }),
    ];
    if (esAdmin) {
      solicitudes.push(supabase.rpc("reporte_entrenadores_paginado", { ...parametros, p_pagina: 1, p_por_pagina: 50 }));
    }
    // Clientes activos sin rutina (los primeros 6, con el total). Solo para el coach: el admin ve el Top 5.
    const consultaPendientes = supabase
      .from("clientes")
      .select("id,nombre,apellido,coach_id", { count: "exact" })
      .is("rutina_id", null)
      .ilike("estado", "activo")
      .order("creado_en", { ascending: false })
      .limit(6);
    if (!esAdmin) solicitudes.push(consultaPendientes.eq("coach_id", filtroCoachId));
    // Cifras de clientes calculadas directamente de las tablas (siempre al día y iguales a las listas de detalle).
    let consultaClientes = supabase.from("clientes").select("id,estado,coach_id,rutina_id");
    if (!esAdmin) consultaClientes = consultaClientes.eq("coach_id", filtroCoachId);
    const [resultados, vivoClientes, vivoCuentas] = await Promise.all([
      Promise.all(solicitudes), consultaClientes, supabase.from("cuentas_clientes").select("cliente_id,estado"),
    ]);
    if (numero !== solicitudResumen.current) return; // llegó una respuesta más reciente
    const resultadoPendientes = esAdmin ? null : resultados.pop();
    const fallo = resultados.find((resultado) => resultado.error)?.error;
    if (fallo) {
      console.error("Error cargando reportes:", fallo);
      setError(traducirErrorSupabase(fallo));
    } else {
      setError("");
      const base = resultados[0].data || {};
      let vivo = {};
      if (!vivoClientes.error && !vivoCuentas.error) {
        const lista = vivoClientes.data || [];
        const ids = new Set(lista.map((cliente) => cliente.id));
        vivo = {
          clientes_total: lista.length,
          clientes_activos: lista.filter((cliente) => `${cliente.estado}`.toLowerCase() === "activo").length,
          clientes_sin_rutina: lista.filter((cliente) => !cliente.rutina_id).length,
          portales_activos: (vivoCuentas.data || []).filter((cuenta) => ids.has(cuenta.cliente_id) && `${cuenta.estado}`.toLowerCase() === "activo").length,
        };
        if (esAdmin) vivo.clientes_sin_entrenador = lista.filter((cliente) => !cliente.coach_id).length;
      }
      setResumen({ ...base, clientes_sin_entrenador: null, ...vivo });
      if (esAdmin) setEntrenadores(normalizarRespuestaPaginada(resultados[1].data).items);
      if (resultadoPendientes) setPendientesRutina({ items: resultadoPendientes.data || [], total: resultadoPendientes.count ?? (resultadoPendientes.data || []).length });
    }
    setCargandoResumen(false);
  }, [esAdmin, filtroCoachId, periodoAplicado]);

  const cargarSesiones = useCallback(async (silencioso = false) => {
    const numero = ++solicitudSesiones.current;
    if (!silencioso) setCargandoSesiones(true);
    const { data, error: fallo } = await supabase.rpc("reporte_sesiones_paginado", {
      p_desde: periodoAplicado.desde,
      p_hasta: periodoAplicado.hasta,
      p_pagina: paginaSesiones,
      p_por_pagina: SESIONES_POR_PAGINA,
      p_estado: filtroEstado || null,
      p_coach_id: filtroCoachId,
    });
    if (numero !== solicitudSesiones.current) return;
    if (fallo) {
      console.error("Error cargando sesiones:", fallo);
      setError(traducirErrorSupabase(fallo));
    } else {
      const normalizadas = normalizarRespuestaPaginada(data);
      setSesiones(normalizadas.items);
      setTotalSesiones(normalizadas.total);
    }
    setCargandoSesiones(false);
  }, [filtroCoachId, filtroEstado, paginaSesiones, periodoAplicado]);

  useEffect(() => {
    const temporizador = window.setTimeout(() => void cargarResumen(), 0);
    return () => window.clearTimeout(temporizador);
  }, [cargarResumen]);

  useEffect(() => {
    const temporizador = window.setTimeout(() => void cargarSesiones(), 0);
    return () => window.clearTimeout(temporizador);
  }, [cargarSesiones]);

  // Datos en vivo: cualquier cambio en las tablas del reporte vuelve a calcular los números sin
  // recargar la pantalla. Además se refresca cada minuto y al volver a la pestaña.
  useEffect(() => {
    let temporizador = null;
    const refrescar = () => {
      window.clearTimeout(temporizador);
      temporizador = window.setTimeout(() => {
        void cargarResumen(true);
        void cargarSesiones(true);
        void cargarEntrenadoresActivos();
      }, 400);
    };
    let canal = supabase.channel(`reportes-vivo-${filtroCoachId || "todos"}`);
    ["clientes", "sesiones_entrenamiento", "historial_rutinas", "entrenadores", "cuentas_clientes"].forEach((tabla) => {
      canal = canal.on("postgres_changes", { event: "*", schema: "public", table: tabla }, refrescar);
    });
    canal.subscribe();
    const intervalo = window.setInterval(refrescar, 15_000);
    const alVolver = () => { if (document.visibilityState === "visible") refrescar(); };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      window.clearTimeout(temporizador);
      window.clearInterval(intervalo);
      document.removeEventListener("visibilitychange", alVolver);
      void supabase.removeChannel(canal);
    };
  }, [cargarResumen, cargarSesiones, cargarEntrenadoresActivos, filtroCoachId]);

  const aplicarRapido = (dias) => {
    const hasta = new Date();
    const desde = new Date();
    desde.setDate(desde.getDate() - (dias - 1));
    const nuevo = { desde: fechaLocalISO(desde), hasta: fechaLocalISO(hasta) };
    setErrorPeriodo("");
    setPeriodo(nuevo);
    setPaginaSesiones(1);
    setPeriodoAplicado(nuevo);
  };

  const aplicarPeriodo = (evento) => {
    evento.preventDefault();
    const mensaje = validarPeriodoReporte(periodo.desde, periodo.hasta);
    if (mensaje) {
      setErrorPeriodo(mensaje);
      return;
    }
    setErrorPeriodo("");
    setPaginaSesiones(1);
    setPeriodoAplicado(periodo);
  };

  const tarjetas = useMemo(() => tarjetasResumen(resumen), [resumen]);
  const nombreEntrenador = useCallback(
    (id) => entrenadores.find((entrenador) => entrenador.coach_id === id)?.nombre || "Entrenador no disponible",
    [entrenadores]
  );

  const exportarResumen = () => {
    exportarCSV(
      `resumen-operativo-${periodoAplicado.desde}-${periodoAplicado.hasta}.csv`,
      [
        { clave: "indicador", etiqueta: "Indicador" },
        { clave: "valor", etiqueta: "Valor" },
        { clave: "desde", etiqueta: "Desde" },
        { clave: "hasta", etiqueta: "Hasta" },
      ],
      tarjetas.map((tarjeta) => ({
        indicador: tarjeta.etiqueta,
        valor: tarjeta.valor,
        desde: periodoAplicado.desde,
        hasta: periodoAplicado.hasta,
      }))
    );
  };

  const exportarEntrenadores = () => {
    exportarCSV(
      `reporte-entrenadores-${periodoAplicado.desde}-${periodoAplicado.hasta}.csv`,
      [
        { clave: "nombre", etiqueta: "Entrenador" },
        { clave: "email", etiqueta: "Correo" },
        { clave: "estado", etiqueta: "Estado" },
        { clave: "clientes_total", etiqueta: "Clientes" },
        { clave: "rutinas_total", etiqueta: "Rutinas" },
        { clave: "sesiones_total", etiqueta: "Sesiones" },
        { clave: "sesiones_completadas", etiqueta: "Completadas" },
        { clave: "asistencias", etiqueta: "Asistencias" },
        { clave: "ausencias", etiqueta: "Ausencias" },
      ],
      entrenadores
    );
  };

  const exportarEntrenadoresAnonimos = () => {
    exportarCSV(
      `evidencia-entrenadores-anonima-${periodoAplicado.desde}-${periodoAplicado.hasta}.csv`,
      [
        { clave: "nombre", etiqueta: "Entrenador anonimizado" },
        { clave: "estado", etiqueta: "Estado" },
        { clave: "clientes_total", etiqueta: "Clientes" },
        { clave: "rutinas_total", etiqueta: "Rutinas" },
        { clave: "sesiones_total", etiqueta: "Sesiones" },
        { clave: "sesiones_completadas", etiqueta: "Completadas" },
        { clave: "asistencias", etiqueta: "Asistencias" },
        { clave: "ausencias", etiqueta: "Ausencias" },
      ],
      anonimizarEntrenadores(entrenadores)
    );
  };

  const exportarPaginaSesiones = () => {
    exportarCSV(
      `sesiones-pagina-${paginaSesiones}-${periodoAplicado.desde}-${periodoAplicado.hasta}.csv`,
      [
        { clave: "inicio", etiqueta: "Inicio" },
        { clave: "cliente", etiqueta: "Cliente" },
        { clave: "entrenador", etiqueta: "Entrenador" },
        { clave: "titulo", etiqueta: "Actividad" },
        { clave: "rutina", etiqueta: "Rutina" },
        { clave: "estado", etiqueta: "Estado" },
        { clave: "asistencia", etiqueta: "Asistencia" },
      ],
      sesiones.map((sesion) => ({ ...sesion, inicio: new Date(sesion.inicio).toLocaleString("es-DO") }))
    );
  };

  const exportarSesionesAnonimas = () => {
    exportarCSV(
      `evidencia-sesiones-anonima-${paginaSesiones}-${periodoAplicado.desde}-${periodoAplicado.hasta}.csv`,
      [
        { clave: "inicio", etiqueta: "Inicio" },
        { clave: "cliente", etiqueta: "Cliente anonimizado" },
        { clave: "entrenador", etiqueta: "Entrenador anonimizado" },
        // "titulo" y "rutina" son texto libre y pueden contener nombres u otros datos
        // personales, por eso no se incluyen en la evidencia anónima.
        { clave: "estado", etiqueta: "Estado" },
        { clave: "asistencia", etiqueta: "Asistencia" },
      ],
      anonimizarSesiones(sesiones).map((sesion) => ({
        ...sesion,
        inicio: new Date(sesion.inicio).toLocaleString("es-DO"),
      }))
    );
  };

  const cargando = cargandoResumen;

  return (
    <section>
      {cargando ? <p style={{ color: "#777", padding: "36px", textAlign: "center" }}>Calculando reporte...</p> : (
        <>
          <h4 style={{ color: NEGRO, fontSize: "15px", fontWeight: "900", margin: "0 0 12px" }}>{esAdmin ? "Estado actual del gimnasio" : "Estado actual de tus clientes"}</h4>
          {(() => {
            const totalClientes = numero(resumen?.clientes_total);
            const activos = numero(resumen?.clientes_activos);
            const sinRutina = numero(resumen?.clientes_sin_rutina);
            const sinEntrenador = numero(resumen?.clientes_sin_entrenador);
            const conPortal = numero(resumen?.portales_activos);
            return (
              <div style={{ display: "grid", gap: "14px", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", marginBottom: "20px" }}>
                <Panel titulo="Clientes" subtitulo="Cuántos están activos del total registrado.">
                  <Anillo
                    partes={[
                      { nombre: "Activos", valor: activos, color: NEGRO },
                      { nombre: "Inactivos", valor: Math.max(0, totalClientes - activos), color: GRIS },
                    ]}
                    centro={`${activos}`} subcentro={`de ${totalClientes}`}
                    descripcion={`${activos} clientes activos de ${totalClientes} registrados`}
                  />
                </Panel>
                <Panel titulo="Cobertura de clientes" subtitulo="Qué parte del total ya tiene cada cosa resuelta.">
                  <div style={{ display: "grid", gap: "18px" }}>
                    <BarraAvance titulo="Con rutina asignada" valor={Math.max(0, totalClientes - sinRutina)} total={totalClientes} faltante={sinRutina === 1 ? "cliente sin rutina" : "clientes sin rutina"} onVer={() => setDetalleFaltantes("rutina")} />
                    {esAdmin && <BarraAvance titulo="Con entrenador" valor={Math.max(0, totalClientes - sinEntrenador)} total={totalClientes} faltante={sinEntrenador === 1 ? "cliente sin entrenador" : "clientes sin entrenador"} onVer={() => setDetalleFaltantes("entrenador")} />}
                    <BarraAvance titulo="Con acceso al portal" valor={conPortal} total={totalClientes} faltante="sin acceso todavía" onVer={() => setDetalleFaltantes("portal")} />
                  </div>
                </Panel>
                {esAdmin ? (
                  <Panel titulo="Top 5 entrenadores" subtitulo="Quiénes más trabajaron en el periodo elegido.">
                    <TopEntrenadores entrenadores={entrenadores} onElegir={setDetalleEntrenador} />
                  </Panel>
                ) : (
                  <Panel titulo="Clientes sin rutina" subtitulo="Quiénes de tus clientes esperan una rutina.">
                    <ClientesSinRutina
                      items={pendientesRutina.items} total={pendientesRutina.total}
                      rutinasTotal={numero(resumen?.rutinas_total)} nombreEntrenador={nombreEntrenador} esAdmin={false}
                    />
                  </Panel>
                )}
              </div>
            );
          })()}

          {esAdmin && (
            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", marginBottom: "22px" }}>
              {[
                { etiqueta: "Clientes registrados", valor: numero(resumen?.clientes_total), destino: "Clientes", ayuda: "Ver clientes" },
                { etiqueta: "Entrenadores", valor: entrenadoresActivos, destino: "Entrenadores", ayuda: "Ver entrenadores" },
                { etiqueta: "Sesiones del periodo", valor: numero(resumen?.sesiones_total), estado: "", ayuda: "Ver detalle" },
                { etiqueta: "Sesiones completadas", valor: numero(resumen?.sesiones_completadas), estado: "completada", ayuda: "Ver detalle" },
              ].map((tarjeta) => (
                <button
                  key={tarjeta.etiqueta}
                  type="button"
                  aria-label={`${tarjeta.etiqueta}: ${tarjeta.valor}. ${tarjeta.ayuda}`}
                  onClick={() => {
                    if (tarjeta.destino) {
                      window.location.hash = `#/${tarjeta.destino}`;
                      return;
                    }
                    setFiltroEstado(tarjeta.estado);
                    setPaginaSesiones(1);
                    window.setTimeout(() => document.getElementById("detalle-sesiones")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
                  }}
                  style={{ ...tarjetaBase, cursor: "pointer", textAlign: "left", width: "100%" }}
                >
                  <p style={{ color: "#888", fontSize: "12px", margin: "0 0 8px" }}>{tarjeta.etiqueta}</p>
                  <p style={{ color: ROJO, fontSize: "36px", fontWeight: "900", margin: 0 }}>{tarjeta.valor}</p>
                  <p style={{ color: "#888", fontSize: "11px", fontWeight: "700", margin: "6px 0 0" }}>{tarjeta.ayuda}</p>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <form onSubmit={aplicarPeriodo} style={{ ...tarjetaBase, alignItems: "end", display: "flex", flexWrap: "wrap", gap: "14px", marginBottom: "18px" }}>
        <label style={{ color: "#666", display: "grid", fontSize: "12px", gap: "5px" }}>
          Desde
          <input type="date" value={periodo.desde} onChange={(evento) => setPeriodo((actual) => ({ ...actual, desde: evento.target.value }))} style={campo} />
        </label>
        <label style={{ color: "#666", display: "grid", fontSize: "12px", gap: "5px" }}>
          Hasta
          <input type="date" value={periodo.hasta} onChange={(evento) => setPeriodo((actual) => ({ ...actual, hasta: evento.target.value }))} style={campo} />
        </label>
        <button type="submit" disabled={cargando} style={{ ...botonPildora("#0B0B0B", "#FFFFFF"), padding: "12px 20px" }}>
          Aplicar periodo
        </button>
        <div role="group" aria-label="Periodos rápidos" style={{ background: "#FAFAFA", border: "1px solid #E5E5E5", borderRadius: "999px", display: "flex", gap: "4px", padding: "4px" }}>
          {[[7, "7 días"], [30, "30 días"], [90, "90 días"]].map(([dias, etiqueta]) => {
            const rango = periodoDeUltimosDias(dias);
            const elegido = rango.desde === periodoAplicado.desde && rango.hasta === periodoAplicado.hasta;
            return (
            <button key={dias} type="button" aria-pressed={elegido} onClick={() => aplicarRapido(dias)} style={{ background: elegido ? "#0B0B0B" : "transparent", border: "none", borderRadius: "999px", color: elegido ? "#FFFFFF" : "#555", cursor: "pointer", fontSize: "12px", fontWeight: elegido ? "800" : "700", padding: "8px 12px" }}>
              {etiqueta}
            </button>
            );
          })}
        </div>
        <button type="button" onClick={exportarResumen} disabled={cargando} style={{ ...botonPildora("#0B0B0B", "#FFFFFF"), marginLeft: "auto", opacity: cargando ? 0.5 : 1, padding: "12px 20px" }}>
          Exportar resumen CSV
        </button>
      </form>

      {errorPeriodo && <p role="alert" style={{ background: "#FFF0F0", borderRadius: "8px", color: "#B00020", padding: "12px" }}>{errorPeriodo}</p>}
      {error && <p role="alert" style={{ background: "#FFF0F0", borderRadius: "8px", color: "#B00020", padding: "12px" }}>{error}</p>}

      {!cargando && (
        <>
          <h4 style={{ color: NEGRO, fontSize: "15px", fontWeight: "900", margin: "0 0 2px" }}>Actividad del periodo</h4>
          <p style={{ color: "#888", fontSize: "12px", margin: "0 0 12px" }}>Sesiones de entrenamiento dentro de las fechas elegidas arriba.</p>
          {numero(resumen?.sesiones_total) === 0 ? (
            <p style={{ ...tarjetaBase, color: "#666", fontSize: "13px", lineHeight: 1.6, marginBottom: "20px" }}>
              No hay sesiones agendadas en este periodo. Las sesiones las crea el entrenador desde su módulo Sesiones; cuando existan, aquí verás cuántas se completaron y cómo fue la asistencia.
            </p>
          ) : (() => {
            const total = numero(resumen?.sesiones_total);
            const presentes = numero(resumen?.asistencias);
            const ausentes = numero(resumen?.ausencias);
            const justificadas = numero(resumen?.justificadas);
            const conAsistencia = presentes + ausentes + justificadas;
            return (
              <div style={{ display: "grid", gap: "14px", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", marginBottom: "20px" }}>
                <Panel titulo="Estado de las sesiones" subtitulo="Cómo van las sesiones agendadas.">
                  <Anillo
                    partes={[
                      { nombre: "Completadas", valor: numero(resumen?.sesiones_completadas), color: NEGRO },
                      { nombre: "Pendientes", valor: numero(resumen?.sesiones_programadas), color: GRIS },
                      { nombre: "Canceladas", valor: numero(resumen?.sesiones_canceladas), color: ROJO },
                    ]}
                    centro={`${total}`} subcentro={total === 1 ? "sesión" : "sesiones"}
                    descripcion={`${total} sesiones agendadas en el periodo`}
                  />
                </Panel>
                <Panel titulo="Asistencia" subtitulo="Resultado de las sesiones con asistencia registrada.">
                  {conAsistencia === 0 ? (
                    <p style={{ color: "#666", fontSize: "13px", lineHeight: 1.6, margin: 0 }}>Todavía no se registró la asistencia de ninguna sesión. El entrenador la anota al terminar cada una.</p>
                  ) : (
                    <Anillo
                      partes={[
                        { nombre: "Presentes", valor: presentes, color: NEGRO },
                        { nombre: "Justificadas", valor: justificadas, color: GRIS },
                        { nombre: "Ausentes", valor: ausentes, color: ROJO },
                      ]}
                      centro={`${Math.round(Number(resumen?.porcentaje_asistencia) || 0)}%`} subcentro="de asistencia"
                      descripcion={`${Math.round(Number(resumen?.porcentaje_asistencia) || 0)}% de asistencia en ${conAsistencia} sesiones`}
                    />
                  )}
                </Panel>
              </div>
            );
          })()}

          {esAdmin && (
            <div style={{ marginBottom: "20px" }}>
              <Panel
                titulo="Comparación por entrenador"
                subtitulo="Elige la medida para ordenar a los entrenadores. Clientes y rutinas son los de hoy; el resto cuenta solo el periodo elegido."
                acciones={(
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    <button type="button" onClick={exportarEntrenadores} disabled={entrenadores.length === 0} style={{ ...botonPildora("#FFF", "#333", "1px solid #D9D9D9"), opacity: entrenadores.length === 0 ? 0.5 : 1 }}>Exportar interno</button>
                    <button type="button" onClick={exportarEntrenadoresAnonimos} disabled={entrenadores.length === 0} style={{ ...botonPildora("#0B0B0B", "#FFFFFF"), opacity: entrenadores.length === 0 ? 0.5 : 1 }}>Evidencia anónima</button>
                  </div>
                )}
              >
                <ComparacionEntrenadores entrenadores={entrenadores} />
              </Panel>
            </div>
          )}

          <div id="detalle-sesiones" style={{ ...tarjetaBase, overflowX: "auto", scrollMarginTop: "16px" }}>
            <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "space-between", marginBottom: "14px" }}>
              <h4 style={{ color: "#0B0B0B", fontSize: "15px", fontWeight: "900", margin: 0 }}>Detalle de sesiones ({totalSesiones})</h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                <button type="button" onClick={exportarPaginaSesiones} disabled={sesiones.length === 0} style={{ ...botonPildora("#FFF", "#333", "1px solid #D9D9D9"), opacity: sesiones.length === 0 ? 0.5 : 1 }}>Exportar interno</button>
                <button type="button" onClick={exportarSesionesAnonimas} disabled={sesiones.length === 0} style={{ ...botonPildora("#0B0B0B", "#FFFFFF"), opacity: sesiones.length === 0 ? 0.5 : 1 }}>Evidencia anónima</button>
              </div>
            </div>

            <div role="group" aria-label="Filtrar sesiones por estado" style={{ background: "#FAFAFA", border: "1px solid #E5E5E5", borderRadius: "999px", display: "inline-flex", flexWrap: "wrap", gap: "4px", marginBottom: "14px", padding: "4px" }}>
              {ESTADOS_SESION.map(([valor, etiqueta]) => {
                const activo = filtroEstado === valor;
                return (
                  <button key={etiqueta} type="button" aria-pressed={activo} onClick={() => { setFiltroEstado(valor); setPaginaSesiones(1); }} style={{ background: activo ? "#0B0B0B" : "transparent", border: "none", borderRadius: "999px", color: activo ? "#FFFFFF" : "#666", cursor: "pointer", fontSize: "12px", fontWeight: activo ? "800" : "600", padding: "8px 14px" }}>
                    {etiqueta}
                  </button>
                );
              })}
            </div>

            <div style={{ opacity: cargandoSesiones ? 0.55 : 1, transition: "opacity 0.15s" }}>
              {sesiones.length === 0 ? (
                <div style={{ alignItems: "center", border: "1px dashed #DDD", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "6px", padding: "36px 20px", textAlign: "center" }}>
                  <strong style={{ color: "#0B0B0B", fontSize: "15px" }}>No hay sesiones para mostrar</strong>
                  <p style={{ color: "#888", fontSize: "13px", margin: 0 }}>Prueba con otro periodo o cambia el filtro de estado.</p>
                </div>
              ) : (
                <table style={{ borderCollapse: "collapse", fontSize: "13px", minWidth: "760px", width: "100%" }}>
                  <thead>
                    <tr>{["Fecha", "Cliente", "Entrenador", "Actividad", "Estado", "Asistencia"].map((titulo) => (
                      <th key={titulo} style={{ borderBottom: "1px solid #E5E5E5", color: "#888", fontSize: "11px", fontWeight: "700", padding: "10px 9px", textAlign: "left", textTransform: "uppercase" }}>{titulo}</th>
                    ))}</tr>
                  </thead>
                  <tbody>{sesiones.map((sesion) => (
                    <tr key={sesion.id}>
                      <td style={{ borderBottom: "1px solid #F0F0F0", color: "#555", padding: "11px 9px", whiteSpace: "nowrap" }}>{new Date(sesion.inicio).toLocaleString("es-DO", { dateStyle: "medium", timeStyle: "short" })}</td>
                      <td style={{ borderBottom: "1px solid #F0F0F0", color: "#0B0B0B", fontWeight: "700", padding: "11px 9px" }}>{sesion.cliente}</td>
                      <td style={{ borderBottom: "1px solid #F0F0F0", color: "#555", padding: "11px 9px" }}>{sesion.entrenador}</td>
                      <td style={{ borderBottom: "1px solid #F0F0F0", color: "#555", padding: "11px 9px" }}>{sesion.titulo}</td>
                      <td style={{ borderBottom: "1px solid #F0F0F0", padding: "11px 9px" }}><Insignia valor={sesion.estado} /></td>
                      <td style={{ borderBottom: "1px solid #F0F0F0", padding: "11px 9px" }}><Insignia valor={sesion.asistencia} /></td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
            <Paginacion pagina={paginaSesiones} total={totalSesiones} porPagina={SESIONES_POR_PAGINA} onCambiar={setPaginaSesiones} />
          </div>

          <p style={{ color: "#999", fontSize: "11px", lineHeight: 1.5, marginTop: "12px" }}>
            Los indicadores son operativos y corresponden al periodo seleccionado. No representan resultados económicos ni efectos a largo plazo.
          </p>
        </>
      )}
      {detalleFaltantes && (
        <DetalleFaltantes
          tipo={detalleFaltantes} esAdmin={esAdmin} coachId={filtroCoachId} nombreEntrenador={nombreEntrenador}
          clave={`${resumen?.clientes_total}-${resumen?.clientes_sin_rutina}-${resumen?.clientes_sin_entrenador}-${resumen?.portales_activos}`}
          onCerrar={() => setDetalleFaltantes(null)}
        />
      )}
      {detalleEntrenador && (
        <DetalleEntrenador
          {...detalleEntrenador}
          entrenador={entrenadores.find((fila) => fila.coach_id === detalleEntrenador.entrenador.coach_id) || detalleEntrenador.entrenador}
          periodo={periodoAplicado} onCerrar={() => setDetalleEntrenador(null)}
        />
      )}
    </section>
  );
}