import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, traducirErrorSupabase } from "../supabaseClient";
import {
  ESTADOS_ASISTENCIA,
  ESTADOS_SESION,
  resumirAsistencia,
  validarResultadoSesion,
} from "../utils/sesiones";
import { ZONA_HORARIA, fechaHoy } from "../utils/horario";

const diaDe = (iso) => new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));

const VISTAS = [
  ["hoy", "Hoy y pendientes"], ["proximas", "Próximas"], ["historial", "Historial"],
];

const boton = { fontSize: "12px", fontWeight: "700", padding: "10px 16px", borderRadius: "8px", border: "none", cursor: "pointer" };

const etiquetas = {
  programada: "Programada", completada: "Completada", cancelada: "Cancelada",
  pendiente: "Pendiente", presente: "Presente", ausente: "Ausente", justificada: "Justificada",
};

export default function SesionesEntrenador({ usuario }) {
  const coachId = usuario?.id;
  const [sesiones, setSesiones] = useState([]);
  const [vista, setVista] = useState("hoy");
  const [pendiente, setPendiente] = useState(null);
  const [observacion, setObservacion] = useState("");
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const cargarDatos = useCallback(async () => {
    if (!coachId) return;
    const [resultadoSesiones] = await Promise.all([
      supabase.from("sesiones_entrenamiento")
        .select("id,cliente_id,rutina_id,titulo,inicio,fin,estado,asistencia,observaciones,clientes(nombre,apellido),rutinas(nombre)")
        .eq("coach_id", coachId).order("inicio", { ascending: false }).limit(500),
    ]);

    const fallo = resultadoSesiones.error;
    if (fallo) {
      console.error("No se pudieron cargar las sesiones:", fallo);
      setError(traducirErrorSupabase(fallo));
    } else {
      setSesiones(resultadoSesiones.data || []);
      setError("");
    }
    setCargando(false);
  }, [coachId]);

  useEffect(() => {
    if (!coachId) return undefined;
    const temporizador = window.setTimeout(() => void cargarDatos(), 0);
    const canal = supabase
      .channel(`sesiones-coach-${coachId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "sesiones_entrenamiento", filter: `coach_id=eq.${coachId}`,
      }, () => void cargarDatos())
      .subscribe();
    return () => {
      window.clearTimeout(temporizador);
      void supabase.removeChannel(canal);
    };
  }, [cargarDatos, coachId]);

  const resumen = useMemo(() => resumirAsistencia(sesiones), [sesiones]);
  const hoy = fechaHoy();
  const sesionesVista = useMemo(() => {
    const porInicio = (lista, desc = false) => lista.slice().sort((x, y) => (desc ? -1 : 1) * (x.inicio || "").localeCompare(y.inicio || ""));
    if (vista === "hoy") {
      return porInicio(sesiones.filter((sesion) => sesion.estado === ESTADOS_SESION.PROGRAMADA && diaDe(sesion.inicio) <= hoy));
    }
    if (vista === "proximas") {
      return porInicio(sesiones.filter((sesion) => sesion.estado === ESTADOS_SESION.PROGRAMADA && diaDe(sesion.inicio) > hoy));
    }
    return porInicio(sesiones.filter((sesion) => sesion.estado !== ESTADOS_SESION.PROGRAMADA), true);
  }, [hoy, sesiones, vista]);

  const guardarResultado = async (sesion, estado, asistencia, observaciones) => {
    setError("");
    setMensaje("");
    const errorValidacion = validarResultadoSesion(estado, asistencia);
    if (errorValidacion) return setError(errorValidacion);

    setProcesando(true);
    const { data, error: errorActualizacion } = await supabase.rpc("actualizar_resultado_sesion", {
      p_sesion_id: sesion.id,
      p_estado: estado,
      p_asistencia: asistencia,
      p_observaciones: observaciones.trim() || null,
    });
    setProcesando(false);
    if (errorActualizacion || !data) {
      setError(traducirErrorSupabase(errorActualizacion || { message: "Sesión no encontrada" }));
      return;
    }
    setPendiente(null);
    setMensaje("Resultado de la sesión actualizado.");
    await cargarDatos();
  };

  // Presente se registra con un solo clic; los demás resultados piden una observación opcional.
  const actualizarResultado = (sesion, estado, asistencia) => {
    if (asistencia === ESTADOS_ASISTENCIA.PRESENTE) {
      void guardarResultado(sesion, estado, asistencia, sesion.observaciones || "");
      return;
    }
    setObservacion(sesion.observaciones || "");
    setPendiente({ sesion, estado, asistencia });
  };

  if (cargando) return <p style={{ color: "#777", padding: "40px", textAlign: "center" }}>Cargando sesiones...</p>;

  return (
    <section>
      <header style={{ marginBottom: "22px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: "900", margin: 0 }}>Asistencia de sesiones</h3>
        <p style={{ color: "#777", fontSize: "13px", marginTop: "5px" }}>
          Las sesiones se crean al asignar una rutina desde Clientes. Aquí registras si el cliente asistió.
        </p>
      </header>

      {error && <p role="alert" style={{ background: "#FFF0F0", borderRadius: "8px", color: "#B00020", padding: "12px" }}>{error}</p>}
      {mensaje && <p role="status" style={{ background: "#EEFFF3", borderRadius: "8px", color: "#126B2D", padding: "12px" }}>{mensaje}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        {[
          ["Total", resumen.total], ["Programadas", resumen.programadas],
          ["Presentes", resumen.presentes], ["Ausentes", resumen.ausentes],
          ["Asistencia cerrada", `${resumen.porcentajeAsistencia}%`],
        ].map(([etiqueta, valor]) => (
          <div key={etiqueta} style={{ background: "#FFF", border: "1px solid #E5E5E5", borderRadius: "10px", padding: "16px" }}>
            <p style={{ color: "#777", fontSize: "11px", margin: 0 }}>{etiqueta}</p>
            <strong style={{ fontSize: "22px" }}>{valor}</strong>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
        {VISTAS.map(([valor, etiqueta]) => (
          <button key={valor} type="button" onClick={() => setVista(valor)} style={{ ...boton, background: vista === valor ? "#0B0B0B" : "#FFF", color: vista === valor ? "#FFFFFF" : "#0B0B0B", border: vista === valor ? "1px solid #0B0B0B" : "1px solid #D5D5D5" }}>
            {etiqueta}
            {valor === "hoy" ? ` (${sesiones.filter((x) => x.estado === ESTADOS_SESION.PROGRAMADA && diaDe(x.inicio) <= hoy).length})` : ""}
          </button>
        ))}
      </div>

      {sesionesVista.length === 0 ? (
        <div style={{ background: "#FFF", border: "0.5px solid #E5E5E5", borderRadius: "12px", color: "#777", fontSize: "13px", padding: "36px", textAlign: "center" }}>{vista === "hoy" ? "No tienes sesiones pendientes de marcar hoy." : "No hay sesiones para mostrar."}</div>
      ) : (
        <div style={{ display: "grid", gap: "10px" }}>
          {sesionesVista.map((sesion) => (
            <article key={sesion.id} style={{ background: "#FFF", border: "0.5px solid #E5E5E5", borderRadius: "12px", padding: "20px 24px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "space-between" }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "900" }}>{sesion.titulo}</h4>
                  <p style={{ color: "#555", fontSize: "13px", margin: "5px 0" }}>
                    {sesion.clientes?.nombre} {sesion.clientes?.apellido} · {new Date(sesion.inicio).toLocaleString("es-DO", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                  <p style={{ color: "#777", fontSize: "12px", margin: 0 }}>
                    Estado: {etiquetas[sesion.estado]} · Asistencia: {etiquetas[sesion.asistencia]}
                  </p>
                  {sesion.observaciones && <p style={{ color: "#666", fontSize: "12px" }}>{sesion.observaciones}</p>}
                </div>
                {sesion.estado === ESTADOS_SESION.PROGRAMADA && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", height: "fit-content" }}>
                    {diaDe(sesion.inicio) <= hoy && (
                      <>
                        <button disabled={procesando} type="button" onClick={() => actualizarResultado(sesion, ESTADOS_SESION.COMPLETADA, ESTADOS_ASISTENCIA.PRESENTE)} style={{ ...boton, background: "#0B0B0B", color: "#FFF" }}>Presente</button>
                        <button disabled={procesando} type="button" onClick={() => actualizarResultado(sesion, ESTADOS_SESION.COMPLETADA, ESTADOS_ASISTENCIA.AUSENTE)} style={{ ...boton, background: "#F5F5F5", border: "0.5px solid #E5E5E5", color: "#E11D2E" }}>Ausente</button>
                        <button disabled={procesando} type="button" onClick={() => actualizarResultado(sesion, ESTADOS_SESION.COMPLETADA, ESTADOS_ASISTENCIA.JUSTIFICADA)} style={{ ...boton, background: "#F5F5F5", border: "0.5px solid #E5E5E5", color: "#0B0B0B" }}>Justificada</button>
                      </>
                    )}
                    <button disabled={procesando} type="button" onClick={() => actualizarResultado(sesion, ESTADOS_SESION.CANCELADA, ESTADOS_ASISTENCIA.PENDIENTE)} style={{ ...boton, background: "#F5F5F5", border: "0.5px solid #E5E5E5", color: "#0B0B0B" }}>Cancelar</button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      {pendiente && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(11,11,11,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", zIndex: 50 }}>
          <div style={{ background: "#FFF", border: "0.5px solid #E5E5E5", borderRadius: "12px", maxWidth: "440px", padding: "20px 24px", width: "100%" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "900", margin: 0 }}>
              {pendiente.estado === ESTADOS_SESION.CANCELADA ? "Cancelar sesión" : pendiente.asistencia === ESTADOS_ASISTENCIA.AUSENTE ? "Marcar ausencia" : "Marcar justificada"}
            </h3>
            <p style={{ color: "#888", fontSize: "12px", margin: "2px 0 14px" }}>
              {pendiente.sesion.clientes?.nombre} {pendiente.sesion.clientes?.apellido} · {new Date(pendiente.sesion.inicio).toLocaleString("es-DO", { dateStyle: "medium", timeStyle: "short" })}
            </p>
            <label htmlFor="obs-sesion" style={{ display: "block", color: "#888", fontSize: "11px", fontWeight: "700", letterSpacing: "0.03em", marginBottom: "6px", textTransform: "uppercase" }}>Observaciones (opcional)</label>
            <textarea id="obs-sesion" autoFocus rows={3} maxLength={500} value={observacion} onChange={(e) => setObservacion(e.target.value)} style={{ background: "#F5F5F5", border: "0.5px solid #E5E5E5", borderRadius: "8px", boxSizing: "border-box", fontSize: "13px", padding: "10px 12px", resize: "vertical", width: "100%" }} />
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "16px" }}>
              <button type="button" disabled={procesando} onClick={() => setPendiente(null)} style={{ ...boton, background: "#FFF", border: "0.5px solid #E5E5E5", color: "#555" }}>Volver</button>
              <button type="button" disabled={procesando} onClick={() => void guardarResultado(pendiente.sesion, pendiente.estado, pendiente.asistencia, observacion)} style={{ ...boton, background: "#0B0B0B", color: "#FFF", opacity: procesando ? 0.6 : 1 }}>{procesando ? "Guardando..." : "Confirmar"}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}