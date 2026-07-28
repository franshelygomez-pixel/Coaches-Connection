import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";

export default function Calendario() {
  const [eventos, setEventos] = useState([]);
  const [eventosDia, setEventosDia] = useState([]);
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nuevoEvento, setNuevoEvento] = useState({ titulo: "", fecha: "", hora: "", descripcion: "" });
  const [error, setError] = useState("");

  const token = localStorage.getItem("googleCalendarToken");

  const cargarEventos = async () => {
    try {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=100&singleEvents=true&orderBy=startTime`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.error) { setError("No se pudo cargar el calendario."); return; }
      const formateados = (data.items || []).map((e) => ({
        id: e.id,
        title: e.summary || "Sin título",
        start: e.start?.dateTime || e.start?.date,
        end: e.end?.dateTime || e.end?.date,
        description: e.description || "",
      }));
      setEventos(formateados);
    } catch {
      setError("Error al conectar con Google Calendar.");
    }
  };

  const crearEvento = async () => {
    if (!nuevoEvento.titulo || !nuevoEvento.fecha || !nuevoEvento.hora) return;
    const inicio = new Date(`${nuevoEvento.fecha}T${nuevoEvento.hora}:00`);
    const fin = new Date(inicio.getTime() + 60 * 60 * 1000);
    const evento = {
      summary: nuevoEvento.titulo,
      description: nuevoEvento.descripcion,
      start: { dateTime: inicio.toISOString(), timeZone: "America/Santo_Domingo" },
      end: { dateTime: fin.toISOString(), timeZone: "America/Santo_Domingo" },
    };
    try {
      await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(evento),
      });
      setMostrarForm(false);
      setNuevoEvento({ titulo: "", fecha: "", hora: "", descripcion: "" });
      cargarEventos();
    } catch {
      setError("Error al crear el evento.");
    }
  };

  const handleDiaClick = (info) => {
    const fecha = info.dateStr;
    setDiaSeleccionado(fecha);
    const del_dia = eventos.filter((e) => e.start?.startsWith(fecha));
    setEventosDia(del_dia);
  };

  useEffect(() => { cargarEventos(); }, []);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-800">Mi Calendario</h3>
          <p className="text-gray-500 text-sm">Sincronizado con Google Calendar</p>
        </div>
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="bg-blue-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-800 transition"
        >
          + Nuevo evento
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-600 text-sm mb-4">{error}</div>}

      {/* Formulario nuevo evento */}
      {mostrarForm && (
        <div className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-gray-200">
          <h4 className="font-semibold text-gray-800 mb-4">Crear nuevo evento</h4>
          <div className="grid grid-cols-1 gap-3">
            <input placeholder="Título del evento" value={nuevoEvento.titulo}
              onChange={(e) => setNuevoEvento({ ...nuevoEvento, titulo: e.target.value })}
              className="border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-900" />
            <div className="flex gap-3">
              <input type="date" value={nuevoEvento.fecha}
                onChange={(e) => setNuevoEvento({ ...nuevoEvento, fecha: e.target.value })}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-900" />
              <input type="time" value={nuevoEvento.hora}
                onChange={(e) => setNuevoEvento({ ...nuevoEvento, hora: e.target.value })}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-900" />
            </div>
            <input placeholder="Descripción (opcional)" value={nuevoEvento.descripcion}
              onChange={(e) => setNuevoEvento({ ...nuevoEvento, descripcion: e.target.value })}
              className="border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-900" />
            <div className="flex gap-3">
              <button onClick={crearEvento} className="flex-1 bg-blue-900 text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-800 transition">Crear evento</button>
              <button onClick={() => setMostrarForm(false)} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl text-sm font-medium hover:bg-gray-200 transition">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-6">
        {/* Calendario */}
        <div className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale={esLocale}
            events={eventos}
            dateClick={handleDiaClick}
            headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
            height="auto"
            eventColor="#1e3a5f"
          />
        </div>

        {/* Panel lateral de eventos del día */}
        {diaSeleccionado && (
          <div className="w-72 bg-white rounded-2xl p-5 shadow-sm border border-gray-200 h-fit">
            <h4 className="font-semibold text-gray-800 mb-1">
              {new Date(diaSeleccionado + "T00:00:00").toLocaleDateString("es-DO", { weekday: "long", day: "numeric", month: "long" })}
            </h4>
            <p className="text-gray-400 text-xs mb-4">{eventosDia.length} evento{eventosDia.length !== 1 ? "s" : ""}</p>
            {eventosDia.length === 0 ? (
              <p className="text-gray-400 text-sm">No hay eventos este día</p>
            ) : (
              <div className="flex flex-col gap-3">
                {eventosDia.map((e) => (
                  <div key={e.id} className="border-l-4 border-blue-900 pl-3">
                    <p className="font-medium text-gray-800 text-sm">{e.title}</p>
                    {e.start?.includes("T") && (
                      <p className="text-gray-400 text-xs mt-1">
                        {new Date(e.start).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                    {e.description && <p className="text-gray-400 text-xs mt-1">{e.description}</p>}
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