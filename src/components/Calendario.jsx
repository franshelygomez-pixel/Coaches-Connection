import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
import { supabase } from "../supabaseClient";

export default function Calendario() {
  const [eventos, setEventos] = useState([]);
  const [eventosDia, setEventosDia] = useState([]);
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nuevoEvento, setNuevoEvento] = useState({ titulo: "", fecha: "", hora: "", descripcion: "" });
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mostrarSelectorHora, setMostrarSelectorHora] = useState(false);
  const [coachId, setCoachId] = useState(null);

  // Franja horaria típica de un gimnasio: 6:00am a 9:00pm cada 30 minutos
  const horasComunes = [];
  for (let h = 6; h <= 21; h++) {
    horasComunes.push(`${String(h).padStart(2, "0")}:00`);
    if (h !== 21) horasComunes.push(`${String(h).padStart(2, "0")}:30`);
  }

  const formatearHora12 = (hora24) => {
    if (!hora24) return "Seleccionar hora";
    const [h, m] = hora24.split(":").map(Number);
    const periodo = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, "0")} ${periodo}`;
  };

  const token = localStorage.getItem("googleCalendarToken");

  // --- Fecha LOCAL correcta (evita el desfase de toISOString() en UTC-4) ---
  const fechaLocalDe = (valor) => {
    if (!valor) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor;
    const d = new Date(valor);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCoachId(data.user?.id || null));
  }, []);

  const cargarEventos = async () => {
    if (!coachId) return;
    try {
      const { data, error: errSupabase } = await supabase
        .from("eventos")
        .select("*")
        .eq("coach_id", coachId);

      if (errSupabase) throw errSupabase;

      const eventosSupabase = (data || []).map(e => ({
        id: e.id,
        title: e.titulo,
        start: e.inicio,
        end: e.fin,
        fecha: e.fecha, // fecha local elegida por el coach al crearlo (fuente de verdad)
        description: e.descripcion || "",
        fuente: "supabase"
      }));

      // Cargar desde Google Calendar si hay token
      if (token) {
        try {
          const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=100&singleEvents=true&orderBy=startTime`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const data = await res.json();
          if (!data.error) {
            const eventosGoogle = (data.items || []).map(e => ({
              id: e.id,
              title: e.summary || "Sin título",
              start: e.start?.dateTime || e.start?.date,
              end: e.end?.dateTime || e.end?.date,
              description: e.description || "",
              fuente: "google"
            }));
            const idsSupabase = new Set(eventosSupabase.map(e => e.title + e.start));
            const eventosUnicos = [
              ...eventosSupabase,
              ...eventosGoogle.filter(e => !idsSupabase.has(e.title + e.start))
            ];
            setEventos(eventosUnicos);
            return;
          }
        } catch { }
      }
      setEventos(eventosSupabase);
    } catch (e) {
      console.error(e);
      setError("Error al cargar eventos.");
    }
  };

  const crearEvento = async () => {
    if (!nuevoEvento.titulo.trim() || !nuevoEvento.fecha || !nuevoEvento.hora) {
      setError("Completa título, fecha y hora.");
      return;
    }
    if (!coachId) {
      setError("No se detectó una sesión activa.");
      return;
    }
    setError("");
    setCargando(true);
    const inicio = new Date(`${nuevoEvento.fecha}T${nuevoEvento.hora}:00`);
    const fin = new Date(inicio.getTime() + 60 * 60 * 1000);

    try {
      const { error: errInsert } = await supabase.from("eventos").insert({
        titulo: nuevoEvento.titulo.trim(),
        descripcion: nuevoEvento.descripcion.trim(),
        inicio: inicio.toISOString(),
        fin: fin.toISOString(),
        fecha: nuevoEvento.fecha,
        coach_id: coachId,
      });

      if (errInsert) throw errInsert;

      // Intentar guardar en Google Calendar si hay token
      if (token) {
        try {
          await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              summary: nuevoEvento.titulo,
              description: nuevoEvento.descripcion,
              start: { dateTime: inicio.toISOString(), timeZone: "America/Santo_Domingo" },
              end: { dateTime: fin.toISOString(), timeZone: "America/Santo_Domingo" },
            }),
          });
        } catch { }
      }

      setMostrarForm(false);
      setNuevoEvento({ titulo: "", fecha: "", hora: "", descripcion: "" });
      setError("");
      cargarEventos();
    } catch (e) {
      console.error(e);
      setError("Error al crear el evento.");
    }
    setCargando(false);
  };

  const handleDiaClick = (info) => {
    const fecha = info.dateStr;
    setDiaSeleccionado(fecha);
    const delDia = eventos.filter((e) => (e.fecha || fechaLocalDe(e.start)) === fecha);
    setEventosDia(delDia);
  };

  useEffect(() => { if (coachId) cargarEventos(); }, [coachId]);

  const estiloInput = {
    width: "100%", border: "0.5px solid #E5E5E5", borderRadius: "8px",
    padding: "12px", fontSize: "14px", marginBottom: "10px",
    outline: "none", display: "block", background: "#FAFAFA"
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h3 style={{ fontSize: "20px", fontWeight: "900", color: "#0B0B0B", margin: 0 }}>Mi Calendario</h3>
          <p style={{ fontSize: "13px", color: "#888", margin: "4px 0 0" }}>
            {token ? "Sincronizado con Google Calendar" : "Calendario local — inicia sesión con Google para sincronizar"}
          </p>
        </div>
        <button onClick={() => setMostrarForm(!mostrarForm)} style={{
          background: "#FFC800", color: "#0B0B0B", fontWeight: "700",
          fontSize: "14px", padding: "10px 18px", borderRadius: "8px",
          border: "none", cursor: "pointer"
        }}>
          + Nuevo evento
        </button>
      </div>

      {error && (
        <div style={{ background: "#FFF0F0", border: "0.5px solid #FFCCCC", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px" }}>
          <p style={{ color: "#CC0000", fontSize: "13px", margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Formulario */}
      {mostrarForm && (
        <div style={{ background: "#FFFFFF", border: "0.5px solid #E5E5E5", borderRadius: "12px", padding: "24px", marginBottom: "20px" }}>
          <h4 style={{ fontSize: "15px", fontWeight: "900", color: "#0B0B0B", marginBottom: "16px" }}>Crear nuevo evento</h4>
          <input placeholder="Título del evento *" value={nuevoEvento.titulo}
            onChange={e => setNuevoEvento({ ...nuevoEvento, titulo: e.target.value })}
            style={estiloInput} />
          <div style={{ display: "flex", gap: "10px" }}>
            <input type="date" value={nuevoEvento.fecha}
              onChange={e => setNuevoEvento({ ...nuevoEvento, fecha: e.target.value })}
              style={{ ...estiloInput, flex: 1 }} />
            <div style={{ flex: 1, position: "relative" }}>
              <button
                type="button"
                onClick={() => setMostrarSelectorHora(!mostrarSelectorHora)}
                style={{
                  ...estiloInput, textAlign: "left", cursor: "pointer",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  color: nuevoEvento.hora ? "#0B0B0B" : "#888",
                }}
              >
                {formatearHora12(nuevoEvento.hora)}
                <span style={{ color: "#888", fontSize: "12px" }}>{mostrarSelectorHora ? "▲" : "▼"}</span>
              </button>

              {mostrarSelectorHora && (
                <div style={{
                  position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 20,
                  background: "#FFFFFF", border: "0.5px solid #E5E5E5", borderRadius: "10px",
                  padding: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  maxHeight: "220px", overflowY: "auto",
                }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
                    {horasComunes.map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => { setNuevoEvento({ ...nuevoEvento, hora: h }); setMostrarSelectorHora(false); }}
                        style={{
                          padding: "8px 6px", borderRadius: "8px", border: "none", cursor: "pointer",
                          fontSize: "12px", fontWeight: "700",
                          background: nuevoEvento.hora === h ? "#FFC800" : "#F5F5F5",
                          color: "#0B0B0B",
                        }}
                      >
                        {formatearHora12(h)}
                      </button>
                    ))}
                  </div>
                  <div style={{ borderTop: "0.5px solid #E5E5E5", marginTop: "10px", paddingTop: "10px" }}>
                    <p style={{ fontSize: "10px", color: "#888", textTransform: "uppercase", margin: "0 0 6px", fontWeight: "700" }}>
                      Hora exacta
                    </p>
                    <input
                      type="time"
                      value={nuevoEvento.hora}
                      onChange={(e) => setNuevoEvento({ ...nuevoEvento, hora: e.target.value })}
                      style={{ ...estiloInput, margin: 0 }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <input placeholder="Descripción (opcional)" value={nuevoEvento.descripcion}
            onChange={e => setNuevoEvento({ ...nuevoEvento, descripcion: e.target.value })}
            style={estiloInput} />
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={crearEvento} disabled={cargando} style={{
              flex: 1, background: "#FFC800", color: "#0B0B0B", fontWeight: "700",
              fontSize: "14px", padding: "12px", borderRadius: "8px", border: "none", cursor: "pointer"
            }}>
              {cargando ? "Guardando..." : "Crear evento"}
            </button>
            <button onClick={() => { setMostrarForm(false); setError(""); }} style={{
              flex: 1, background: "#F5F5F5", color: "#555", fontWeight: "700",
              fontSize: "14px", padding: "12px", borderRadius: "8px", border: "none", cursor: "pointer"
            }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "20px" }}>
        {/* Calendario */}
        <div style={{ flex: 1, background: "#FFFFFF", border: "0.5px solid #E5E5E5", borderRadius: "12px", padding: "16px" }}>
          <style>{`
            .mi-calendario .fc-toolbar-title {
              font-size: 18px; font-weight: 900; color: #0B0B0B; text-transform: capitalize;
            }
            .mi-calendario .fc-button {
              background: #F5F5F5 !important; border: none !important; color: #0B0B0B !important;
              font-weight: 700 !important; box-shadow: none !important; text-transform: capitalize;
              border-radius: 8px !important; padding: 6px 12px !important;
            }
            .mi-calendario .fc-button:hover { background: #EAEAEA !important; }
            .mi-calendario .fc-button-active, .mi-calendario .fc-button:active {
              background: #FFC800 !important; color: #0B0B0B !important;
            }
            .mi-calendario .fc-col-header-cell {
              background: #FAFAFA; padding: 8px 0;
            }
            .mi-calendario .fc-col-header-cell-cushion {
              font-size: 11px; font-weight: 700; color: #888; text-transform: uppercase;
              letter-spacing: 0.04em; text-decoration: none;
            }
            .mi-calendario .fc-daygrid-day-number {
              font-size: 12px; color: #0B0B0B; font-weight: 600; padding: 6px;
              text-decoration: none;
            }
            .mi-calendario .fc-day-today {
              background: #FFF8E1 !important;
            }
            .mi-calendario .fc-day-today .fc-daygrid-day-number {
              background: #FFC800; color: #0B0B0B; border-radius: 50%;
              width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;
              font-weight: 900; margin: 4px;
            }
            .mi-calendario .fc-daygrid-day:hover {
              background: #FAFAFA; cursor: pointer;
            }
            .mi-calendario .fc-event {
              border: none !important; border-radius: 6px !important; padding: 1px 4px !important;
              font-size: 11px !important; font-weight: 700 !important;
            }
            .mi-calendario .fc-daygrid-event-dot {
              border-color: #FFC800 !important;
            }
            .mi-calendario table { border-color: #F0F0F0; }
            .mi-calendario .fc-scrollgrid { border-color: #F0F0F0 !important; }
            .mi-calendario td, .mi-calendario th { border-color: #F0F0F0 !important; }
          `}</style>
          <div className="mi-calendario">
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              locale={esLocale}
              events={eventos}
              dateClick={handleDiaClick}
              headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
              height="auto"
              eventColor="#FFC800"
              eventTextColor="#0B0B0B"
            />
          </div>
        </div>

        {/* Panel lateral */}
        {diaSeleccionado && (
          <div style={{ width: "280px", background: "#FFFFFF", border: "0.5px solid #E5E5E5", borderRadius: "12px", padding: "20px", height: "fit-content" }}>
            <h4 style={{ fontSize: "14px", fontWeight: "900", color: "#0B0B0B", marginBottom: "4px", textTransform: "capitalize" }}>
              {new Date(diaSeleccionado + "T00:00:00").toLocaleDateString("es-DO", { weekday: "long", day: "numeric", month: "long" })}
            </h4>
            <p style={{ fontSize: "12px", color: "#888", marginBottom: "16px" }}>
              {eventosDia.length} evento{eventosDia.length !== 1 ? "s" : ""}
            </p>
            {eventosDia.length === 0 ? (
              <div style={{ background: "#F5F5F5", borderRadius: "10px", padding: "20px", textAlign: "center" }}>
                <p style={{ color: "#888", fontSize: "13px", margin: 0 }}>No hay eventos este día</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {eventosDia
                  .slice()
                  .sort((a, b) => (a.start || "").localeCompare(b.start || ""))
                  .map((e) => (
                    <div key={e.id} style={{ background: "#F5F5F5", borderRadius: "10px", padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: e.description ? "4px" : 0 }}>
                        {e.start?.includes("T") && (
                          <span style={{
                            background: "#FFF8E1", color: "#0B0B0B", fontWeight: "900", fontSize: "11px",
                            padding: "3px 8px", borderRadius: "6px", border: "1px solid #FFC800", flexShrink: 0, whiteSpace: "nowrap",
                          }}>
                            {new Date(e.start).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                        <p style={{ fontWeight: "700", fontSize: "13px", color: "#0B0B0B", margin: 0 }}>{e.title}</p>
                      </div>
                      {e.description && <p style={{ fontSize: "11px", color: "#888", margin: "4px 0 0" }}>{e.description}</p>}
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}