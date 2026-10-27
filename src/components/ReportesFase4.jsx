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
  programada: ["#EEF5FF", "#275A91"],
  justificada: ["#EEF5FF", "#275A91"],
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

const Numero = ({ valor }) => (
  <span style={{ color: Number(valor) > 0 ? "#0B0B0B" : "#BBB", fontWeight: Number(valor) > 0 ? "800" : "500" }}>{valor ?? 0}</span>
);

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
  const [totalSesiones, setTotalSesiones] = useState(0);
  const [paginaSesiones, setPaginaSesiones] = useState(1);
  const [filtroEstado, setFiltroEstado] = useState(() => filtroInicial?.estado || "");
  const [cargandoResumen, setCargandoResumen] = useState(true);
  const [cargandoSesiones, setCargandoSesiones] = useState(true);
  const [error, setError] = useState("");
  const [errorPeriodo, setErrorPeriodo] = useState("");
  const solicitudResumen = useRef(0);
  const solicitudSesiones = useRef(0);

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
  const cargarResumen = useCallback(async () => {
    const numero = ++solicitudResumen.current;
    setCargandoResumen(true);
    const parametros = { p_desde: periodoAplicado.desde, p_hasta: periodoAplicado.hasta };
    const solicitudes = [
      supabase.rpc("reporte_resumen_operativo", { ...parametros, p_coach_id: filtroCoachId }),
    ];
    if (esAdmin) {
      solicitudes.push(supabase.rpc("reporte_entrenadores_paginado", { ...parametros, p_pagina: 1, p_por_pagina: 50 }));
      solicitudes.push(supabase.from("clientes").select("id", { count: "exact", head: true }).is("coach_id", null));
    }
    const resultados = await Promise.all(solicitudes);
    if (numero !== solicitudResumen.current) return; // llegó una respuesta más reciente
    const fallo = resultados.find((resultado) => resultado.error)?.error;
    if (fallo) {
      console.error("Error cargando reportes:", fallo);
      setError(traducirErrorSupabase(fallo));
    } else {
      setError("");
      setResumen({ ...(resultados[0].data || {}), clientes_sin_entrenador: esAdmin ? (resultados[2]?.count ?? 0) : null });
      if (esAdmin) setEntrenadores(normalizarRespuestaPaginada(resultados[1].data).items);
    }
    setCargandoResumen(false);
  }, [esAdmin, filtroCoachId, periodoAplicado]);

  const cargarSesiones = useCallback(async () => {
    const numero = ++solicitudSesiones.current;
    setCargandoSesiones(true);
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
      <header style={{ marginBottom: "18px" }}>
        <h3 style={{ color: "#0B0B0B", fontSize: "20px", fontWeight: "900", margin: 0 }}>Reportes operativos</h3>
        <p style={{ color: "#888", fontSize: "13px", margin: "4px 0 0" }}>
          Clientes, rutinas, sesiones y asistencia del periodo que elijas.
        </p>
      </header>

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
          {[[7, "7 días"], [30, "30 días"], [90, "90 días"]].map(([dias, etiqueta]) => (
            <button key={dias} type="button" onClick={() => aplicarRapido(dias)} style={{ background: "transparent", border: "none", borderRadius: "999px", color: "#555", cursor: "pointer", fontSize: "12px", fontWeight: "700", padding: "8px 12px" }}>
              {etiqueta}
            </button>
          ))}
        </div>
        <button type="button" onClick={exportarResumen} disabled={cargando} style={{ ...botonPildora("#0B0B0B", "#FFFFFF"), marginLeft: "auto", opacity: cargando ? 0.5 : 1, padding: "12px 20px" }}>
          Exportar resumen CSV
        </button>
      </form>

      {errorPeriodo && <p role="alert" style={{ background: "#FFF0F0", borderRadius: "8px", color: "#B00020", padding: "12px" }}>{errorPeriodo}</p>}
      {error && <p role="alert" style={{ background: "#FFF0F0", borderRadius: "8px", color: "#B00020", padding: "12px" }}>{error}</p>}

      {cargando ? <p style={{ color: "#777", padding: "36px", textAlign: "center" }}>Calculando reporte...</p> : (
        <>
          <h4 style={{ color: "#0B0B0B", fontSize: "15px", fontWeight: "900", margin: "0 0 2px" }}>{esAdmin ? "Estado actual del gimnasio" : "Estado actual de tus clientes"}</h4>
          <p style={{ color: "#888", fontSize: "12px", margin: "0 0 12px" }}>Una foto de hoy. No cambia con las fechas del periodo.</p>
          <div style={{ display: "grid", gap: "14px", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", marginBottom: "24px" }}>
            {[
              [numero(resumen?.clientes_activos), "Clientes activos", `De ${numero(resumen?.clientes_total)} registrados`, false],
              [numero(resumen?.clientes_sin_rutina), "Clientes sin rutina", "Falta que su entrenador les asigne una", true],
              ...(esAdmin ? [[numero(resumen?.clientes_sin_entrenador), "Clientes sin asignar", "No tienen entrenador asignado", true]] : []),
              [numero(resumen?.portales_activos), "Clientes con acceso al portal", "Ya crearon su contraseña", false],
              [numero(resumen?.rutinas_total), "Rutinas creadas", "Disponibles para asignar", false],
            ].map(([valor, titulo, ayuda, alerta]) => (
              <article key={titulo} style={{ ...tarjetaBase, padding: "18px 20px" }}>
                <p style={{ color: "#888", fontSize: "11px", fontWeight: "700", letterSpacing: "0.5px", margin: 0, textTransform: "uppercase" }}>{titulo}</p>
                <strong style={{ color: alerta && valor > 0 ? "#E11D2E" : "#0B0B0B", display: "block", fontSize: "34px", fontWeight: "900", lineHeight: 1, margin: "10px 0 8px" }}>{valor}</strong>
                <p style={{ color: "#888", fontSize: "12px", lineHeight: 1.5, margin: 0 }}>{ayuda}</p>
              </article>
            ))}
          </div>

          <section style={{ ...tarjetaBase, marginBottom: "20px" }}>
            <h4 style={{ color: "#0B0B0B", fontSize: "15px", fontWeight: "900", margin: 0 }}>Actividad del periodo</h4>
            <p style={{ color: "#888", fontSize: "12px", margin: "3px 0 16px" }}>Sesiones de entrenamiento dentro de las fechas elegidas arriba.</p>
            {numero(resumen?.sesiones_total) === 0 ? (
              <p style={{ background: "#FAFAFA", border: "0.5px solid #E5E5E5", borderRadius: "10px", color: "#666", fontSize: "13px", lineHeight: 1.6, margin: 0, padding: "16px" }}>
                No hay sesiones agendadas en este periodo. Las sesiones las crea el entrenador desde su módulo Sesiones; cuando existan, aquí verás cuántas se completaron y cómo fue la asistencia.
              </p>
            ) : (() => {
              const total = numero(resumen?.sesiones_total);
              const partes = [
                ["Completadas", numero(resumen?.sesiones_completadas), "#0B0B0B"],
                ["Pendientes", numero(resumen?.sesiones_programadas), "#BDBDBD"],
                ["Canceladas", numero(resumen?.sesiones_canceladas), "#F4B3B9"],
              ];
              const presentes = numero(resumen?.asistencias);
              const ausentes = numero(resumen?.ausencias);
              const justificadas = numero(resumen?.justificadas);
              const conAsistencia = presentes + ausentes + justificadas;
              return (
                <div style={{ display: "grid", gap: "24px", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
                  <div>
                    <p style={{ color: "#0B0B0B", fontSize: "14px", margin: "0 0 10px" }}><strong style={{ fontSize: "26px", fontWeight: "900" }}>{total}</strong> {total === 1 ? "sesión agendada" : "sesiones agendadas"}</p>
                    <div style={{ background: "#F0F0F0", borderRadius: "999px", display: "flex", height: "10px", overflow: "hidden" }}>
                      {partes.map(([nombre, cantidad, color]) => cantidad > 0 && <div key={nombre} title={`${nombre}: ${cantidad}`} style={{ background: color, width: `${(cantidad / total) * 100}%` }} />)}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", marginTop: "10px" }}>
                      {partes.map(([nombre, cantidad, color]) => (
                        <span key={nombre} style={{ alignItems: "center", color: "#555", display: "inline-flex", fontSize: "12px", gap: "6px" }}>
                          <span aria-hidden="true" style={{ background: color, borderRadius: "50%", height: "9px", width: "9px" }} />{nombre}: <strong>{cantidad}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p style={{ color: "#0B0B0B", fontSize: "14px", margin: "0 0 10px" }}>
                      <strong style={{ fontSize: "26px", fontWeight: "900" }}>{conAsistencia === 0 ? "Sin datos" : `${Math.round(Number(resumen?.porcentaje_asistencia) || 0)}%`}</strong> {conAsistencia === 0 ? "" : "de asistencia"}
                    </p>
                    <p style={{ color: "#666", fontSize: "12px", lineHeight: 1.6, margin: 0 }}>
                      {conAsistencia === 0
                        ? "Todavía no se registró la asistencia de ninguna sesión. El entrenador la anota al terminar cada una."
                        : `De ${conAsistencia} ${conAsistencia === 1 ? "sesión con asistencia registrada" : "sesiones con asistencia registrada"}: ${presentes} ${presentes === 1 ? "cliente fue" : "clientes fueron"}, ${ausentes} no ${ausentes === 1 ? "fue" : "fueron"} y ${justificadas} se justificaron.`}
                    </p>
                  </div>
                </div>
              );
            })()}
          </section>

          {esAdmin && (
            <div style={{ ...tarjetaBase, marginBottom: "20px", overflowX: "auto" }}>
              <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "space-between", marginBottom: "14px" }}>
                <div>
                  <h4 style={{ color: "#0B0B0B", fontSize: "15px", fontWeight: "900", margin: 0 }}>Comparación por entrenador</h4>
                  <p style={{ color: "#888", fontSize: "12px", margin: "3px 0 0" }}>
                    Una fila por entrenador. Clientes y rutinas son los de hoy; el resto cuenta solo el periodo elegido. El export interno incluye nombre y correo; la evidencia anónima los oculta.
                  </p>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  <button type="button" onClick={exportarEntrenadores} disabled={entrenadores.length === 0} style={{ ...botonPildora("#FFF", "#333", "1px solid #D9D9D9"), opacity: entrenadores.length === 0 ? 0.5 : 1 }}>Exportar interno</button>
                  <button type="button" onClick={exportarEntrenadoresAnonimos} disabled={entrenadores.length === 0} style={{ ...botonPildora("#0B0B0B", "#FFFFFF"), opacity: entrenadores.length === 0 ? 0.5 : 1 }}>Evidencia anónima</button>
                </div>
              </div>
              <table style={{ borderCollapse: "collapse", fontSize: "13px", minWidth: "820px", width: "100%" }}>
                <thead>
                  <tr>{["Entrenador", "Estado", "Clientes", "Rutinas", "Sesiones", "Completadas", "Presentes", "Ausentes"].map((titulo, indice) => (
                    <th key={titulo} style={{ borderBottom: "1px solid #E5E5E5", color: "#888", fontSize: "11px", fontWeight: "700", padding: "10px 9px", textAlign: indice < 2 ? "left" : "center", textTransform: "uppercase" }}>{titulo}</th>
                  ))}</tr>
                </thead>
                <tbody>{entrenadores.map((entrenador) => (
                  <tr key={entrenador.coach_id}>
                    <td style={{ borderBottom: "1px solid #F0F0F0", padding: "11px 9px" }}>
                      <div style={{ alignItems: "center", display: "flex", gap: "10px" }}>
                        <div aria-hidden="true" style={{ alignItems: "center", background: "#0B0B0B", borderRadius: "50%", color: "#FF5A64", display: "flex", flexShrink: 0, fontSize: "12px", fontWeight: "900", height: "32px", justifyContent: "center", width: "32px" }}>
                          {entrenador.nombre?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <strong style={{ color: "#0B0B0B" }}>{entrenador.nombre}</strong>
                          <p style={{ color: "#888", fontSize: "11px", margin: "1px 0 0" }}>{entrenador.email}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ borderBottom: "1px solid #F0F0F0", padding: "11px 9px" }}><Insignia valor={entrenador.estado} /></td>
                    {["clientes_total", "rutinas_total", "sesiones_total", "sesiones_completadas", "asistencias", "ausencias"].map((clave) => (
                      <td key={clave} style={{ borderBottom: "1px solid #F0F0F0", padding: "11px 9px", textAlign: "center" }}><Numero valor={entrenador[clave]} /></td>
                    ))}
                  </tr>
                ))}</tbody>
              </table>
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
    </section>
  );
}