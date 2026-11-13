import { useCallback, useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
import { supabase } from "../supabaseClient";
import {
  crearRangoEvento,
  fechaLocalDe,
  formatearHora12,
  horaLocalDe,
  validarDatosEvento,
  ZONA_HORARIA_APLICACION,
} from "../utils/agenda";
import { horasDisponibles, TEXTO_HORARIO, validarHorarioLaboral } from "../utils/horario";

const TIPOS_EVENTO = [
  { valor: "reunion", etiqueta: "Reunión con cliente", fondo: "#0B0B0B", texto: "#FFFFFF", requiereCliente: true },
  { valor: "evaluacion", etiqueta: "Evaluación física", fondo: "#E11D2E", texto: "#FFFFFF", requiereCliente: true },
  { valor: "recordatorio", etiqueta: "Recordatorio", fondo: "#6B6B6B", texto: "#FFFFFF", requiereCliente: false },
  { valor: "personal", etiqueta: "Personal", fondo: "#D4D4D4", texto: "#0B0B0B", requiereCliente: false },
];
const TIPO_SESION = { valor: "sesion", etiqueta: "Sesión", fondo: "#E11D2E", texto: "#FFFFFF" };
const tipoDe = (valor) => TIPOS_EVENTO.find((t) => t.valor === valor) || TIPO_SESION;

const RECORDATORIOS = [
  { minutos: "", etiqueta: "Sin recordatorio" },
  { minutos: 60, etiqueta: "1 hora antes" },
  { minutos: 1440, etiqueta: "1 día antes" },
  { minutos: 2880, etiqueta: "2 días antes" },
];

const FORMULARIO_INICIAL = { titulo: "", fecha: "", hora: "", descripcion: "", clienteId: "", tipo: "reunion", recordatorioMin: "" };

const adaptarEventoInterno = (evento) => ({
  id: evento.id,
  title: evento.titulo,
  start: evento.inicio,
  end: evento.fin,
  fecha: evento.fecha,
  description: evento.descripcion || "",
  coachId: evento.coach_id,
  clienteId: evento.cliente_id || "",
  clienteNombre: evento.clientes
    ? `${evento.clientes.nombre || ""} ${evento.clientes.apellido || ""}`.trim()
    : "",
  tipo: evento.tipo || "sesion",
  recordatorioMin: evento.recordatorio_min || "",
  backgroundColor: tipoDe(evento.tipo).fondo,
  borderColor: tipoDe(evento.tipo).fondo,
  textColor: tipoDe(evento.tipo).texto,
  fuente: "supabase",
});

export default function Calendario({ usuario }) {
  const coachId = usuario?.id;
  const [clientes, setClientes] = useState([]);
  const [eventosInternos, setEventosInternos] = useState([]);
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL);
  const [editandoId, setEditandoId] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mostrarSelectorHora, setMostrarSelectorHora] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const cargarEventosInternos = useCallback(async () => {
    if (!coachId) return;
    const { data, error: errorConsulta } = await supabase
      .from("eventos")
      .select("id,titulo,descripcion,inicio,fin,fecha,coach_id,cliente_id,tipo,recordatorio_min,clientes(nombre,apellido)")
      .eq("coach_id", coachId)
      .order("inicio", { ascending: true });

    if (errorConsulta) {
      console.error("Error al cargar eventos:", errorConsulta);
      setError("No se pudieron cargar los eventos internos.");
      return;
    }
    setEventosInternos((data || []).map(adaptarEventoInterno));
  }, [coachId]);

  useEffect(() => {
    if (!coachId) return;
    const cargarClientes = async () => {
      const { data, error: errorClientes } = await supabase
        .from("clientes")
        .select("id,nombre,apellido,estado")
        .eq("coach_id", coachId)
        .order("nombre", { ascending: true });
      if (errorClientes) setError("No se pudieron cargar los clientes para la agenda.");
      else setClientes(data || []);
    };
    void cargarClientes();
  }, [coachId]);

  useEffect(() => {
    if (!coachId) return undefined;
    const temporizador = window.setTimeout(() => {
      void cargarEventosInternos();
    }, 0);

    const canal = supabase
      .channel(`eventos-coach-${coachId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "eventos", filter: `coach_id=eq.${coachId}` },
        () => void cargarEventosInternos()
      )
      .subscribe();

    return () => {
      window.clearTimeout(temporizador);
      void supabase.removeChannel(canal);
    };
  }, [cargarEventosInternos, coachId]);

  const eventos = eventosInternos;

  const eventosDia = useMemo(() => {
    if (!diaSeleccionado) return [];
    return eventos
      .filter((evento) => (evento.fecha || fechaLocalDe(evento.start)) === diaSeleccionado)
      .slice()
      .sort((a, b) => (a.start || "").localeCompare(b.start || ""));
  }, [diaSeleccionado, eventos]);

  const limpiarMensajes = () => {
    setError("");
    setMensaje("");
  };

  const cancelarFormulario = () => {
    setMostrarForm(false);
    setEditandoId(null);
    setFormulario(FORMULARIO_INICIAL);
    setMostrarSelectorHora(false);
    setError("");
  };

  const abrirNuevoEvento = (fecha = diaSeleccionado || fechaLocalDe(new Date())) => {
    limpiarMensajes();
    setEditandoId(null);
    setFormulario({ ...FORMULARIO_INICIAL, fecha: fecha || "" });
    setMostrarForm(true);
  };

  const abrirEdicion = (evento) => {
    if (evento.coachId !== coachId) {
      setError("Solo puedes editar tus propios eventos.");
      return;
    }
    limpiarMensajes();
    setEditandoId(evento.id);
    setFormulario({
      titulo: evento.title || "",
      fecha: evento.fecha || fechaLocalDe(evento.start) || "",
      hora: horaLocalDe(evento.start),
      descripcion: evento.description || "",
      clienteId: evento.clienteId || "",
      tipo: TIPOS_EVENTO.some((t) => t.valor === evento.tipo) ? evento.tipo : "reunion",
      recordatorioMin: evento.recordatorioMin || "",
    });
    setMostrarForm(true);
  };

  const guardarEvento = async (eventoFormulario) => {
    eventoFormulario.preventDefault();
    limpiarMensajes();
    const errorValidacion = validarDatosEvento(formulario);
    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }
    if (!coachId) {
      setError("No se detectó una sesión activa.");
      return;
    }

    const { inicio, fin } = crearRangoEvento(formulario.fecha, formulario.hora);
    const duracion = Math.round((Date.parse(fin) - Date.parse(inicio)) / 60000) || 60;
    const errorHorario = validarHorarioLaboral(formulario.fecha, formulario.hora, duracion);
    if (errorHorario) {
      setError(errorHorario);
      return;
    }
    const tipoElegido = tipoDe(formulario.tipo);
    if (tipoElegido.requiereCliente && !formulario.clienteId) {
      setError(`Selecciona el cliente para ${tipoElegido.etiqueta.toLowerCase()}.`);
      return;
    }
    const minutosAviso = formulario.clienteId && formulario.recordatorioMin ? Number(formulario.recordatorioMin) : null;
    if (minutosAviso && Date.parse(inicio) - minutosAviso * 60000 < Date.now() - 60000) {
      setError("Ese recordatorio ya habría pasado. Elige un aviso más corto o una fecha más lejana.");
      return;
    }
    const datosInternos = {
      tipo: formulario.tipo,
      recordatorio_min: minutosAviso,
      recordatorio_enviado_en: null,
      titulo: formulario.titulo.trim(),
      descripcion: formulario.descripcion.trim(),
      inicio,
      fin,
      fecha: formulario.fecha,
      coach_id: coachId,
      cliente_id: formulario.clienteId || null,
    };
    setProcesando(true);
    try {
      let errorGuardado;
      if (editandoId) {
        const resultado = await supabase
          .from("eventos")
          .update(datosInternos)
          .eq("id", editandoId)
          .eq("coach_id", coachId)
          .select("id")
          .maybeSingle();
        errorGuardado = resultado.error || (!resultado.data ? { message: "Evento no encontrado" } : null);
      } else {
        const resultado = await supabase.from("eventos").insert(datosInternos).select("id").single();
        errorGuardado = resultado.error;
      }
      if (errorGuardado) throw errorGuardado;

      const eraEdicion = Boolean(editandoId);
      const fechaGuardada = formulario.fecha;
      cancelarFormulario();
      setDiaSeleccionado(fechaGuardada);
      setMensaje(eraEdicion ? "Evento actualizado correctamente." : "Evento creado correctamente.");
      await cargarEventosInternos();
    } catch (errorGuardado) {
      console.error("Error al guardar evento:", errorGuardado);
      setError(editandoId ? "No se pudo actualizar el evento." : "No se pudo crear el evento.");
    } finally {
      setProcesando(false);
    }
  };

  const eliminarEvento = async (evento) => {
    if (evento.coachId !== coachId) {
      setError("No tienes permiso para eliminar este evento.");
      return;
    }
    if (!window.confirm(`¿Deseas eliminar el evento “${evento.title}”?`)) return;

    limpiarMensajes();
    setProcesando(true);
    try {
      const { error: errorEliminacion } = await supabase
        .from("eventos")
        .delete()
        .eq("id", evento.id)
        .eq("coach_id", coachId);
      if (errorEliminacion) throw errorEliminacion;

      setMensaje("Evento eliminado correctamente.");
      await cargarEventosInternos();
    } catch (errorEliminacion) {
      console.error("Error al eliminar evento:", errorEliminacion);
      setError("No se pudo eliminar el evento.");
    } finally {
      setProcesando(false);
    }
  };

  const estiloInput = {
    width: "100%", background: "#FAFAFA", border: "1px solid #E5E5E5",
    borderRadius: "8px", boxSizing: "border-box", display: "block", fontSize: "14px",
    marginBottom: "10px", outline: "none", padding: "12px",
  };
  const estiloBoton = (fondo, color) => ({
    background: fondo, border: "none", borderRadius: "7px", color,
    cursor: procesando ? "default" : "pointer", fontSize: "12px", fontWeight: "700",
    opacity: procesando ? 0.6 : 1, padding: "8px 12px",
  });

  return (
    <section>
      <header style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h3 style={{ color: "#0B0B0B", fontSize: "20px", fontWeight: "900", margin: 0 }}>Mi calendario</h3>
          <p style={{ color: "#888", fontSize: "13px", margin: "4px 0 0" }}>Horario: {TEXTO_HORARIO}</p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          <button type="button" disabled={procesando} onClick={() => abrirNuevoEvento()} style={{ ...estiloBoton("#0B0B0B", "#FFFFFF"), fontSize: "14px", padding: "10px 18px" }}>
            + Nuevo evento
          </button>
        </div>
      </header>

      {error && <p role="alert" style={{ background: "#FFF0F0", border: "1px solid #FFCCCC", borderRadius: "8px", color: "#CC0000", fontSize: "13px", padding: "12px 16px" }}>{error}</p>}
      {mensaje && <p role="status" style={{ background: "#EEFFF3", border: "1px solid #BCE8C8", borderRadius: "8px", color: "#126B2D", fontSize: "13px", padding: "12px 16px" }}>{mensaje}</p>}

      {mostrarForm && (
        <form onSubmit={guardarEvento} style={{ background: "#FFF", border: "1px solid #E5E5E5", borderRadius: "12px", marginBottom: "20px", padding: "24px" }}>
          <h4 style={{ fontSize: "15px", margin: "0 0 16px" }}>{editandoId ? "Editar evento" : "Crear nuevo evento"}</h4>
          <div role="group" aria-label="Tipo de evento" style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
            {TIPOS_EVENTO.map((t) => {
              const activo = formulario.tipo === t.valor;
              return (
                <button key={t.valor} type="button" aria-pressed={activo} onClick={() => setFormulario((actual) => ({ ...actual, tipo: t.valor }))} style={{ background: activo ? "#0B0B0B" : "#FFF", border: activo ? "1px solid #0B0B0B" : "1px solid #D5D5D5", borderRadius: "8px", color: activo ? "#FFF" : "#0B0B0B", cursor: "pointer", fontSize: "12px", fontWeight: "700", padding: "8px 14px" }}>
                  {t.etiqueta}
                </button>
              );
            })}
          </div>
          <input aria-label="Título del evento" maxLength={100} placeholder="Título del evento *" value={formulario.titulo} onChange={(e) => setFormulario((actual) => ({ ...actual, titulo: e.target.value }))} style={estiloInput} />
          <select aria-label="Cliente relacionado" value={formulario.clienteId} onChange={(e) => setFormulario((actual) => ({ ...actual, clienteId: e.target.value }))} style={estiloInput}>
            <option value="">{tipoDe(formulario.tipo).requiereCliente ? "Selecciona un cliente *" : "Sin cliente relacionado"}</option>
            {clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nombre} {cliente.apellido}</option>)}
          </select>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            <input aria-label="Fecha del evento" type="date" value={formulario.fecha} onChange={(e) => setFormulario((actual) => ({ ...actual, fecha: e.target.value }))} style={{ ...estiloInput, flex: "1 1 180px" }} />
            <div style={{ flex: "1 1 180px", position: "relative" }}>
              <button type="button" aria-expanded={mostrarSelectorHora} onClick={() => setMostrarSelectorHora((actual) => !actual)} style={{ ...estiloInput, alignItems: "center", color: formulario.hora ? "#0B0B0B" : "#888", cursor: "pointer", display: "flex", justifyContent: "space-between", textAlign: "left" }}>
                {formatearHora12(formulario.hora)}
              </button>
              {mostrarSelectorHora && (
                <div style={{ background: "#FFF", border: "1px solid #E5E5E5", borderRadius: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", left: 0, maxHeight: "220px", overflowY: "auto", padding: "12px", position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 20 }}>
                  <div style={{ display: "grid", gap: "6px", gridTemplateColumns: "repeat(3, 1fr)" }}>
                    {horasDisponibles(formulario.fecha, 60).map((hora) => (
                      <button key={hora} type="button" onClick={() => { setFormulario((actual) => ({ ...actual, hora })); setMostrarSelectorHora(false); }} style={estiloBoton(formulario.hora === hora ? "#0B0B0B" : "#F5F5F5", formulario.hora === hora ? "#FFFFFF" : "#0B0B0B")}>
                        {formatearHora12(hora)}
                      </button>
                    ))}
                  </div>
                  <input aria-label="Hora exacta" type="time" value={formulario.hora} onChange={(e) => setFormulario((actual) => ({ ...actual, hora: e.target.value }))} style={{ ...estiloInput, margin: "10px 0 0" }} />
                </div>
              )}
            </div>
          </div>
          {formulario.clienteId && (
            <div style={{ marginBottom: "10px" }}>
              <select aria-label="Recordatorio al cliente" value={formulario.recordatorioMin} onChange={(e) => setFormulario((actual) => ({ ...actual, recordatorioMin: e.target.value }))} style={{ ...estiloInput, marginBottom: "4px" }}>
                {RECORDATORIOS.map((r) => <option key={r.minutos} value={r.minutos}>{r.minutos ? `Avisar al cliente ${r.etiqueta}` : "No avisar al cliente"}</option>)}
              </select>
              <p style={{ color: "#888", fontSize: "11px", margin: 0 }}>El cliente recibe una notificación en su portal.</p>
            </div>
          )}
          <textarea aria-label="Descripción del evento" maxLength={500} placeholder="Descripción (opcional)" rows={3} value={formulario.descripcion} onChange={(e) => setFormulario((actual) => ({ ...actual, descripcion: e.target.value }))} style={{ ...estiloInput, resize: "vertical" }} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            <button type="submit" disabled={procesando} style={{ ...estiloBoton("#0B0B0B", "#FFFFFF"), flex: "1 1 150px", fontSize: "14px", padding: "12px" }}>
              {procesando ? "Guardando..." : editandoId ? "Guardar cambios" : "Crear evento"}
            </button>
            <button type="button" disabled={procesando} onClick={cancelarFormulario} style={{ ...estiloBoton("#F5F5F5", "#555"), flex: "1 1 120px", fontSize: "14px", padding: "12px" }}>Cancelar</button>
          </div>
        </form>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
        <div style={{ background: "#FFF", border: "1px solid #E5E5E5", borderRadius: "12px", flex: "1 1 520px", minWidth: 0, padding: "16px" }}>
          <style>{`
            .mi-calendario .fc-toolbar { flex-wrap: wrap; gap: 8px; }
            .mi-calendario .fc-toolbar-title { font-size: 18px; font-weight: 900; color: #0B0B0B; text-transform: capitalize; }
            .mi-calendario .fc-button { background: #F5F5F5 !important; border: none !important; color: #0B0B0B !important; font-weight: 700 !important; box-shadow: none !important; border-radius: 8px !important; padding: 6px 12px !important; }
            .mi-calendario .fc-button:hover { background: #EAEAEA !important; }
            .mi-calendario .fc-button-active, .mi-calendario .fc-button:active { background: #0B0B0B !important; color: #FFFFFF !important; }
            .mi-calendario .fc-col-header-cell { background: #FAFAFA; padding: 8px 0; }
            .mi-calendario .fc-col-header-cell-cushion, .mi-calendario .fc-daygrid-day-number { color: #555; font-size: 11px; text-decoration: none; }
            .mi-calendario .fc-day-today { background: #FDECEE !important; }
            .mi-calendario .fc-event { border: none !important; border-radius: 6px !important; cursor: pointer; font-size: 11px !important; font-weight: 700 !important; padding: 1px 4px !important; }
            .mi-calendario table, .mi-calendario td, .mi-calendario th, .mi-calendario .fc-scrollgrid { border-color: #F0F0F0 !important; }
            @media (max-width: 640px) { .mi-calendario .fc-toolbar-title { font-size: 15px; } .mi-calendario .fc-button { font-size: 11px !important; padding: 5px 8px !important; } }
          `}</style>
          <div className="mi-calendario">
            <FullCalendar plugins={[dayGridPlugin, interactionPlugin]} initialView="dayGridMonth" locale={esLocale} events={eventos} dateClick={(info) => setDiaSeleccionado(info.dateStr)} eventClick={(info) => setDiaSeleccionado(info.event.extendedProps.fecha || fechaLocalDe(info.event.startStr))} headerToolbar={{ left: "prev,next today", center: "title", right: "" }} height="auto" eventColor="#E11D2E" eventTextColor="#0B0B0B" />
          </div>
        </div>

        {diaSeleccionado && (
          <aside style={{ background: "#FFF", border: "1px solid #E5E5E5", borderRadius: "12px", flex: "1 1 270px", height: "fit-content", maxWidth: "100%", padding: "20px" }}>
            <div style={{ alignItems: "flex-start", display: "flex", gap: "10px", justifyContent: "space-between" }}>
              <div>
                <h4 style={{ fontSize: "14px", margin: "0 0 4px", textTransform: "capitalize" }}>
                  {new Date(`${diaSeleccionado}T12:00:00-04:00`).toLocaleDateString("es-DO", { weekday: "long", day: "numeric", month: "long", timeZone: ZONA_HORARIA_APLICACION })}
                </h4>
                <p style={{ color: "#888", fontSize: "12px", margin: "0 0 16px" }}>{eventosDia.length} evento{eventosDia.length !== 1 ? "s" : ""}</p>
              </div>
              <button type="button" disabled={procesando} onClick={() => abrirNuevoEvento(diaSeleccionado)} style={estiloBoton("#0B0B0B", "#FFFFFF")}>Agregar</button>
            </div>
            {eventosDia.length === 0 ? (
              <div style={{ background: "#F5F5F5", borderRadius: "10px", padding: "20px", textAlign: "center" }}><p style={{ color: "#888", fontSize: "13px", margin: 0 }}>No hay eventos este día</p></div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {eventosDia.map((evento) => (
                  <article key={evento.id} style={{ background: "#F5F5F5", borderRadius: "10px", padding: "12px 14px" }}>
                    <div style={{ alignItems: "center", display: "flex", gap: "8px", marginBottom: "5px" }}>
                      <span style={{ background: tipoDe(evento.tipo).fondo, borderRadius: "6px", color: tipoDe(evento.tipo).texto, fontSize: "10px", fontWeight: "700", padding: "3px 8px", textTransform: "uppercase" }}>{tipoDe(evento.tipo).etiqueta}</span>
                      {evento.start?.includes("T") && <span style={{ background: "#FDECEE", border: "1px solid #E11D2E", borderRadius: "6px", fontSize: "11px", fontWeight: "900", padding: "3px 8px" }}>{new Date(evento.start).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit", timeZone: ZONA_HORARIA_APLICACION })}</span>}
                    </div>
                    <p style={{ fontSize: "13px", fontWeight: "700", margin: 0 }}>{evento.title}</p>
                    {evento.clienteNombre && <p style={{ color: "#555", fontSize: "11px", margin: "4px 0 0" }}>Cliente: {evento.clienteNombre}{evento.recordatorioMin ? ` · aviso ${RECORDATORIOS.find((r) => r.minutos === evento.recordatorioMin)?.etiqueta || ""}` : ""}</p>}
                    {evento.description && <p style={{ color: "#666", fontSize: "11px", margin: "5px 0 0", overflowWrap: "anywhere" }}>{evento.description}</p>}
                    {evento.coachId === coachId && (
                      <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                        <button type="button" disabled={procesando} onClick={() => abrirEdicion(evento)} style={{ ...estiloBoton("#0B0B0B", "#FFFFFF"), flex: 1 }}>Editar</button>
                        <button type="button" disabled={procesando} onClick={() => void eliminarEvento(evento)} style={{ ...estiloBoton("#FFF0F0", "#B00020"), flex: 1 }}>Eliminar</button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </aside>
        )}
      </div>
    </section>
  );
}