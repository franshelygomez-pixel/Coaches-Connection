import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, traducirErrorSupabase } from "../supabaseClient";
import {
  construirRangoSesion,
  crearSesionConRecordatorio,
  ESTADOS_ASISTENCIA,
  ESTADOS_SESION,
  resumirAsistencia,
  validarResultadoSesion,
  validarSesion,
} from "../utils/sesiones";
import { TEXTO_HORARIO, validarHorarioLaboral } from "../utils/horario";

const hoyLocal = () => {
  const fecha = new Date();
  const desplazamiento = fecha.getTimezoneOffset() * 60_000;
  return new Date(fecha.getTime() - desplazamiento).toISOString().slice(0, 10);
};

const formularioInicial = {
  clienteId: "", rutinaId: "", titulo: "Sesión de entrenamiento",
  fecha: hoyLocal(), hora: "08:00", duracionMinutos: "60", observaciones: "",
};

const campo = {
  width: "100%", background: "#FAFAFA", border: "1px solid #DDD",
  borderRadius: "8px", boxSizing: "border-box", fontSize: "13px", padding: "11px",
};

const etiquetas = {
  programada: "Programada", completada: "Completada", cancelada: "Cancelada",
  pendiente: "Pendiente", presente: "Presente", ausente: "Ausente", justificada: "Justificada",
};

export default function SesionesEntrenador({ usuario }) {
  const coachId = usuario?.id;
  const [clientes, setClientes] = useState([]);
  const [rutinas, setRutinas] = useState([]);
  const [sesiones, setSesiones] = useState([]);
  const [form, setForm] = useState(formularioInicial);
  const [filtro, setFiltro] = useState("todas");
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const cargarDatos = useCallback(async () => {
    if (!coachId) return;
    const [resultadoClientes, resultadoRutinas, resultadoSesiones] = await Promise.all([
      supabase.from("clientes")
        .select("id,nombre,apellido,estado,rutina_id")
        .eq("coach_id", coachId).order("nombre"),
      supabase.from("rutinas")
        .select("id,nombre,nivel")
        .eq("coach_id", coachId).order("nombre"),
      supabase.from("sesiones_entrenamiento")
        .select("id,cliente_id,rutina_id,titulo,inicio,fin,estado,asistencia,observaciones,clientes(nombre,apellido),rutinas(nombre)")
        .eq("coach_id", coachId).order("inicio", { ascending: false }).limit(250),
    ]);

    const fallo = resultadoClientes.error || resultadoRutinas.error || resultadoSesiones.error;
    if (fallo) {
      console.error("No se pudieron cargar las sesiones:", fallo);
      setError(traducirErrorSupabase(fallo));
    } else {
      setClientes(resultadoClientes.data || []);
      setRutinas(resultadoRutinas.data || []);
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
  const sesionesFiltradas = useMemo(() => {
    if (filtro === "todas") return sesiones;
    if (filtro === "pendientes") return sesiones.filter((sesion) => sesion.estado === "programada");
    return sesiones.filter((sesion) => sesion.estado === filtro || sesion.asistencia === filtro);
  }, [filtro, sesiones]);

  const cambiar = ({ target: { name, value } }) => {
    setForm((actual) => ({ ...actual, [name]: value }));
  };

  const crearSesion = async (evento) => {
    evento.preventDefault();
    setError("");
    setMensaje("");
    const errorValidacion = validarSesion(form);
    if (errorValidacion) return setError(errorValidacion);
    const errorHorario = validarHorarioLaboral(form.fecha, form.hora, form.duracionMinutos);
    if (errorHorario) return setError(errorHorario);
    const { inicio, fin } = construirRangoSesion(form.fecha, form.hora, form.duracionMinutos);

    setProcesando(true);
    try {
      const resultado = await crearSesionConRecordatorio(supabase, {
        coachId,
        clienteId: form.clienteId,
        rutinaId: form.rutinaId,
        titulo: form.titulo,
        inicio,
        fin,
        fecha: form.fecha,
        observaciones: form.observaciones,
      });

      if (resultado.errorSesion) {
        console.error("Error creando sesión:", resultado.errorSesion);
        setError(traducirErrorSupabase(resultado.errorSesion));
        return;
      }

      setForm(formularioInicial);
      if (resultado.errorRecordatorio) {
        console.error("La sesión se creó sin recordatorio:", resultado.errorRecordatorio);
        setError("La sesión se guardó, pero no se pudo crear el recordatorio en el calendario. Puedes agregarlo manualmente desde Calendario.");
      } else {
        setMensaje("Sesión programada y recordatorio agregado al calendario.");
      }
      await cargarDatos();
    } catch (fallo) {
      console.error("Error inesperado programando la sesión:", fallo);
      setError("No se pudo completar la operación. Intenta nuevamente.");
    } finally {
      setProcesando(false);
    }
  };

  const actualizarResultado = async (sesion, estado, asistencia) => {
    setError("");
    setMensaje("");
    const errorValidacion = validarResultadoSesion(estado, asistencia);
    if (errorValidacion) return setError(errorValidacion);
    const observaciones = window.prompt(
      "Observaciones de la sesión (opcional):",
      sesion.observaciones || ""
    );
    if (observaciones === null) return;

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
    setMensaje("Resultado de la sesión actualizado.");
    await cargarDatos();
  };

  if (cargando) return <p style={{ color: "#777", padding: "40px", textAlign: "center" }}>Cargando sesiones...</p>;

  return (
    <section>
      <header style={{ marginBottom: "22px" }}>
        <h3 style={{ fontSize: "22px", margin: 0 }}>Sesiones y asistencia</h3>
        <p style={{ color: "#777", fontSize: "13px", marginTop: "5px" }}>
          Programa sesiones y registra el resultado de cada asistencia.
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

      <form onSubmit={crearSesion} style={{ background: "#FFF", border: "1px solid #E5E5E5", borderRadius: "12px", marginBottom: "20px", padding: "20px" }}>
        <h4 style={{ margin: "0 0 14px" }}>Programar nueva sesión</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "10px" }}>
          <select aria-label="Cliente" name="clienteId" value={form.clienteId} onChange={(evento) => {
            const cliente = clientes.find((item) => item.id === evento.target.value);
            setForm((actual) => ({ ...actual, clienteId: evento.target.value, rutinaId: cliente?.rutina_id || "" }));
          }} style={campo}>
            <option value="">Selecciona un cliente *</option>
            {clientes.filter((cliente) => cliente.estado !== "Inactivo").map((cliente) => (
              <option key={cliente.id} value={cliente.id}>{cliente.nombre} {cliente.apellido}</option>
            ))}
          </select>
          <select aria-label="Rutina" name="rutinaId" value={form.rutinaId} onChange={cambiar} style={campo}>
            <option value="">Usar rutina actual del cliente</option>
            {rutinas.map((rutina) => <option key={rutina.id} value={rutina.id}>{rutina.nombre}</option>)}
          </select>
          <input aria-label="Título" name="titulo" maxLength={100} value={form.titulo} onChange={cambiar} style={campo} />
          <input aria-label="Fecha" name="fecha" type="date" value={form.fecha} onChange={cambiar} style={campo} />
          <input aria-label="Hora" name="hora" type="time" value={form.hora} onChange={cambiar} style={campo} />
          <select aria-label="Duración" name="duracionMinutos" value={form.duracionMinutos} onChange={cambiar} style={campo}>
            <option value="30">30 minutos</option>
            <option value="45">45 minutos</option>
            <option value="60">60 minutos</option>
            <option value="90">90 minutos</option>
            <option value="120">120 minutos</option>
          </select>
        </div>
        <p style={{ color: "#888", fontSize: "12px", margin: "10px 0 0" }}>Horario de atención: {TEXTO_HORARIO}</p>
        <textarea aria-label="Observaciones" name="observaciones" maxLength={500} rows={3} placeholder="Observaciones opcionales" value={form.observaciones} onChange={cambiar} style={{ ...campo, marginTop: "10px", resize: "vertical" }} />
        <p style={{ color: "#666", fontSize: "12px", margin: "10px 0 0" }}>
          Al programar la sesión también se creará un recordatorio en Calendario.
        </p>
        <button type="submit" disabled={procesando} style={{ background: "#0B0B0B", color: "#FFFFFF", border: 0, borderRadius: "8px", cursor: "pointer", fontWeight: "900", marginTop: "10px", padding: "12px 18px", opacity: procesando ? 0.6 : 1 }}>
          {procesando ? "Guardando..." : "Programar sesión"}
        </button>
      </form>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
        {[
          ["todas", "Todas"], ["pendientes", "Programadas"], ["completada", "Completadas"],
          ["cancelada", "Canceladas"], ["ausente", "Ausencias"],
        ].map(([valor, etiqueta]) => (
          <button key={valor} type="button" onClick={() => setFiltro(valor)} style={{ background: filtro === valor ? "#0B0B0B" : "#FFF", color: filtro === valor ? "#FFFFFF" : "#333", border: "1px solid #DDD", borderRadius: "20px", cursor: "pointer", padding: "8px 13px" }}>{etiqueta}</button>
        ))}
      </div>

      {sesionesFiltradas.length === 0 ? (
        <div style={{ background: "#FFF", border: "1px solid #E5E5E5", borderRadius: "12px", color: "#777", padding: "36px", textAlign: "center" }}>No hay sesiones para mostrar.</div>
      ) : (
        <div style={{ display: "grid", gap: "10px" }}>
          {sesionesFiltradas.map((sesion) => (
            <article key={sesion.id} style={{ background: "#FFF", border: "1px solid #E5E5E5", borderRadius: "12px", padding: "18px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "space-between" }}>
                <div>
                  <h4 style={{ margin: 0 }}>{sesion.titulo}</h4>
                  <p style={{ color: "#555", fontSize: "13px", margin: "5px 0" }}>
                    {sesion.clientes?.nombre} {sesion.clientes?.apellido} · {new Date(sesion.inicio).toLocaleString("es-DO", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                  <p style={{ color: "#777", fontSize: "12px", margin: 0 }}>
                    Rutina: {sesion.rutinas?.nombre || "No especificada"} · Estado: {etiquetas[sesion.estado]} · Asistencia: {etiquetas[sesion.asistencia]}
                  </p>
                  {sesion.observaciones && <p style={{ color: "#666", fontSize: "12px" }}>{sesion.observaciones}</p>}
                </div>
                {sesion.estado === ESTADOS_SESION.PROGRAMADA && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", height: "fit-content" }}>
                    <button disabled={procesando} type="button" onClick={() => void actualizarResultado(sesion, ESTADOS_SESION.COMPLETADA, ESTADOS_ASISTENCIA.PRESENTE)} style={{ background: "#E5F7EA", border: 0, borderRadius: "7px", color: "#126B2D", cursor: "pointer", padding: "8px 10px" }}>Presente</button>
                    <button disabled={procesando} type="button" onClick={() => void actualizarResultado(sesion, ESTADOS_SESION.COMPLETADA, ESTADOS_ASISTENCIA.AUSENTE)} style={{ background: "#FFF0F0", border: 0, borderRadius: "7px", color: "#B00020", cursor: "pointer", padding: "8px 10px" }}>Ausente</button>
                    <button disabled={procesando} type="button" onClick={() => void actualizarResultado(sesion, ESTADOS_SESION.COMPLETADA, ESTADOS_ASISTENCIA.JUSTIFICADA)} style={{ background: "#EAF2FB", border: 0, borderRadius: "7px", color: "#2E5D9A", cursor: "pointer", padding: "8px 10px" }}>Justificada</button>
                    <button disabled={procesando} type="button" onClick={() => void actualizarResultado(sesion, ESTADOS_SESION.CANCELADA, ESTADOS_ASISTENCIA.PENDIENTE)} style={{ background: "#F1F1F1", border: 0, borderRadius: "7px", cursor: "pointer", padding: "8px 10px" }}>Cancelar</button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
