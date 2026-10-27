import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase, traducirErrorSupabase } from "../../supabaseClient";
import {
  DESPLAZAMIENTO_ZONA,
  ZONA_HORARIA,
  fechaHoy,
  formatearHora12,
  minutosEnDia,
  sumarDias,
  TEXTO_HORARIO,
  ventanaDeFecha,
} from "../../utils/horario";

const PX_POR_MINUTO = 1;
const MIN_ANCHO_COLUMNA = 190;

const tarjeta = { background: "#FFFFFF", border: "0.5px solid #E5E5E5", borderRadius: "12px" };

const ESTILOS_BLOQUE = {
  programada: { fondo: "#0B0B0B", color: "#FFFFFF", etiqueta: "Programada" },
  completada: { fondo: "#E1F5EE", color: "#085041", etiqueta: "Completada" },
  cancelada: { fondo: "#F0F0F0", color: "#888888", etiqueta: "Cancelada" },
  evento: { fondo: "#FDECEE", color: "#9B1C24", etiqueta: "Evento" },
};

const botonPildora = (activo = false) => ({
  background: activo ? "#0B0B0B" : "transparent", border: "none", borderRadius: "999px",
  color: activo ? "#FFFFFF" : "#555", cursor: "pointer", fontSize: "13px",
  fontWeight: activo ? "800" : "700", padding: "9px 16px",
});

const nombreCompleto = (persona) => `${persona?.nombre || ""} ${persona?.apellido || ""}`.trim();

// Reparte en carriles los bloques de un entrenador que se solapan en el tiempo.
const repartirCarriles = (bloques) => {
  const ordenados = [...bloques].sort((a, b) => a.desde - b.desde);
  const finales = [];
  const conCarril = ordenados.map((bloque) => {
    let carril = finales.findIndex((fin) => fin <= bloque.desde);
    if (carril === -1) carril = finales.length;
    finales[carril] = bloque.hasta;
    return { ...bloque, carril };
  });
  return { bloques: conCarril, carriles: Math.max(1, finales.length) };
};

export default function CalendarioAdmin() {
  const [fecha, setFecha] = useState(fechaHoy);
  const [entrenadores, setEntrenadores] = useState([]);
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const solicitud = useRef(0);

  const cargar = useCallback(async () => {
    const actual = ++solicitud.current;
    const desde = `${fecha}T00:00:00${DESPLAZAMIENTO_ZONA}`;
    const hasta = `${sumarDias(fecha, 1)}T00:00:00${DESPLAZAMIENTO_ZONA}`;
    const [respuestaEntrenadores, respuestaSesiones, respuestaEventos] = await Promise.all([
      supabase.from("entrenadores").select("id,nombre,apellido").eq("estado", "activo").order("nombre"),
      supabase.from("sesiones_entrenamiento")
        .select("id,coach_id,evento_id,titulo,inicio,fin,estado,clientes(nombre,apellido)")
        .gte("inicio", desde).lt("inicio", hasta).order("inicio"),
      supabase.from("eventos")
        .select("id,coach_id,titulo,inicio,fin,clientes(nombre,apellido)")
        .gte("inicio", desde).lt("inicio", hasta).order("inicio"),
    ]);
    if (actual !== solicitud.current) return;

    const fallo = respuestaEntrenadores.error || respuestaSesiones.error || respuestaEventos.error;
    if (fallo) {
      console.error("Error cargando el calendario:", fallo);
      setError(traducirErrorSupabase(fallo));
      setCargando(false);
      return;
    }

    const sesiones = respuestaSesiones.data || [];
    const idsEventoDeSesion = new Set(sesiones.map((sesion) => sesion.evento_id).filter(Boolean));
    const lista = [
      ...sesiones.map((sesion) => ({
        id: `sesion-${sesion.id}`, coachId: sesion.coach_id, tipo: sesion.estado || "programada",
        titulo: sesion.titulo, cliente: nombreCompleto(sesion.clientes), inicio: sesion.inicio, fin: sesion.fin,
      })),
      // Los recordatorios de una sesión ya salen como sesión: solo se agregan eventos sueltos.
      ...(respuestaEventos.data || [])
        .filter((evento) => !idsEventoDeSesion.has(evento.id))
        .map((evento) => ({
          id: `evento-${evento.id}`, coachId: evento.coach_id, tipo: "evento",
          titulo: evento.titulo, cliente: nombreCompleto(evento.clientes), inicio: evento.inicio, fin: evento.fin,
        })),
    ];
    setError("");
    setEntrenadores(respuestaEntrenadores.data || []);
    setItems(lista);
    setCargando(false);
  }, [fecha]);

  useEffect(() => {
    const temporizador = window.setTimeout(() => void cargar(), 0);
    const canal = supabase
      .channel("calendario-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "sesiones_entrenamiento" }, () => void cargar())
      .on("postgres_changes", { event: "*", schema: "public", table: "eventos" }, () => void cargar())
      .subscribe();
    return () => {
      window.clearTimeout(temporizador);
      void supabase.removeChannel(canal);
    };
  }, [cargar]);

  const ventana = ventanaDeFecha(fecha);
  const esHoy = fecha === fechaHoy();

  const etiquetaDia = useMemo(() => {
    const texto = new Date(`${fecha}T12:00:00${DESPLAZAMIENTO_ZONA}`).toLocaleDateString("es-DO", {
      weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: ZONA_HORARIA,
    });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }, [fecha]);

  const bloques = useMemo(() => items.map((item) => {
    const desde = minutosEnDia(item.inicio, fecha);
    const hasta = Math.max(desde + 30, minutosEnDia(item.fin || item.inicio, fecha));
    return { ...item, desde, hasta };
  }), [fecha, items]);

  const cambiarDia = (dias) => { setCargando(true); setFecha((actual) => sumarDias(actual, dias)); };
  const irAHoy = () => { setCargando(true); setFecha(fechaHoy()); };

  // Rango visible: el horario de atención, ampliado si hubiera algo fuera de él.
  const inicioVista = ventana
    ? Math.max(0, Math.min(ventana.desde, ...bloques.map((bloque) => Math.floor(bloque.desde / 60) * 60)))
    : 0;
  const finVista = ventana
    ? Math.min(24 * 60, Math.max(ventana.hasta, ...bloques.map((bloque) => Math.ceil(bloque.hasta / 60) * 60)))
    : 0;
  const alto = (finVista - inicioVista) * PX_POR_MINUTO;
  const horas = [];
  for (let minuto = inicioVista; minuto < finVista; minuto += 60) horas.push(minuto);

  const columnas = entrenadores.map((entrenador) => {
    const propios = bloques.filter((bloque) => bloque.coachId === entrenador.id);
    return { entrenador, ...repartirCarriles(propios) };
  });
  // Eventos de entrenadores que ya no están activos: se muestran aparte para no perderlos.
  const idsActivos = new Set(entrenadores.map((entrenador) => entrenador.id));
  const huerfanos = bloques.filter((bloque) => !idsActivos.has(bloque.coachId));

  return (
    <section>
      <header style={{ marginBottom: "18px" }}>
        <h3 style={{ color: "#0B0B0B", fontSize: "20px", fontWeight: "900", margin: 0 }}>Calendario</h3>
        <p style={{ color: "#888", fontSize: "13px", margin: "4px 0 0" }}>
          Agenda del día de todos los entrenadores. Las zonas grises están fuera del horario de atención.
        </p>
      </header>

      <div style={{ ...tarjeta, alignItems: "center", display: "flex", flexWrap: "wrap", gap: "14px", marginBottom: "16px", padding: "14px 18px" }}>
        <div role="group" aria-label="Cambiar de día" style={{ background: "#FAFAFA", border: "1px solid #E5E5E5", borderRadius: "999px", display: "inline-flex", gap: "4px", padding: "4px" }}>
          <button type="button" onClick={() => cambiarDia(-1)} style={botonPildora()}>Día anterior</button>
          <button type="button" aria-pressed={esHoy} onClick={irAHoy} style={botonPildora(esHoy)}>Hoy</button>
          <button type="button" onClick={() => cambiarDia(1)} style={botonPildora()}>Día siguiente</button>
        </div>
        <input
          type="date" aria-label="Elegir fecha" value={fecha}
          onChange={(evento) => { if (evento.target.value) { setCargando(true); setFecha(evento.target.value); } }}
          style={{ background: "#FAFAFA", border: "1px solid #E5E5E5", borderRadius: "999px", color: "#0B0B0B", fontSize: "13px", outline: "none", padding: "10px 16px" }}
        />
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <p style={{ color: "#0B0B0B", fontSize: "15px", fontWeight: "900", margin: 0 }}>{etiquetaDia}</p>
          <p style={{ color: "#888", fontSize: "12px", margin: "2px 0 0" }}>
            {ventana ? `Atención de ${formatearHora12(ventana.desde)} a ${formatearHora12(ventana.hasta)}` : "Cerrado"}
          </p>
        </div>
      </div>

      {error && <p role="alert" style={{ background: "#FFF0F0", borderRadius: "8px", color: "#B00020", padding: "12px" }}>{error}</p>}

      {cargando ? (
        <p style={{ color: "#777", padding: "36px", textAlign: "center" }}>Cargando agenda...</p>
      ) : !ventana ? (
        <div style={{ ...tarjeta, color: "#666", padding: "38px", textAlign: "center" }}>
          <p style={{ color: "#0B0B0B", fontSize: "15px", fontWeight: "800", margin: "0 0 6px" }}>Los domingos el gimnasio está cerrado</p>
          <p style={{ fontSize: "13px", margin: 0 }}>{TEXTO_HORARIO}</p>
        </div>
      ) : entrenadores.length === 0 ? (
        <div style={{ ...tarjeta, color: "#777", padding: "38px", textAlign: "center" }}>No hay entrenadores activos para mostrar.</div>
      ) : (
        <div style={{ ...tarjeta, overflowX: "auto" }}>
          <div style={{ minWidth: `${72 + entrenadores.length * MIN_ANCHO_COLUMNA}px` }}>
            <div style={{ borderBottom: "0.5px solid #E5E5E5", display: "grid", gridTemplateColumns: `72px repeat(${entrenadores.length}, minmax(${MIN_ANCHO_COLUMNA}px, 1fr))` }}>
              <div />
              {columnas.map(({ entrenador, bloques: propios }) => (
                <div key={entrenador.id} style={{ alignItems: "center", borderLeft: "0.5px solid #E5E5E5", display: "flex", gap: "10px", padding: "12px 14px" }}>
                  <div aria-hidden="true" style={{ alignItems: "center", background: "#0B0B0B", borderRadius: "50%", color: "#FF5A64", display: "flex", flexShrink: 0, fontSize: "13px", fontWeight: "900", height: "34px", justifyContent: "center", width: "34px" }}>
                    {entrenador.nombre?.[0]?.toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ color: "#0B0B0B", fontSize: "13px", fontWeight: "800", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nombreCompleto(entrenador)}</p>
                    <p style={{ color: "#888", fontSize: "11px", margin: "2px 0 0" }}>{propios.length} {propios.length === 1 ? "actividad" : "actividades"}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: `72px repeat(${entrenadores.length}, minmax(${MIN_ANCHO_COLUMNA}px, 1fr))` }}>
              <div style={{ height: `${alto}px`, position: "relative" }}>
                {horas.map((minuto) => (
                  <span key={minuto} style={{ color: "#888", fontSize: "11px", fontWeight: "600", position: "absolute", right: "10px", top: `${(minuto - inicioVista) * PX_POR_MINUTO + 2}px` }}>
                    {formatearHora12(minuto)}
                  </span>
                ))}
              </div>
              {columnas.map(({ entrenador, bloques: propios, carriles }) => (
                <div key={entrenador.id} style={{
                  background: "repeating-linear-gradient(to bottom, #EFEFEF 0, #EFEFEF 1px, transparent 1px, transparent 60px)",
                  borderLeft: "0.5px solid #E5E5E5", height: `${alto}px`, position: "relative",
                }}>
                  {ventana.desde > inicioVista && (
                    <div aria-hidden="true" style={{ background: "rgba(0,0,0,0.045)", height: `${(ventana.desde - inicioVista) * PX_POR_MINUTO}px`, left: 0, position: "absolute", right: 0, top: 0 }} />
                  )}
                  {ventana.hasta < finVista && (
                    <div aria-hidden="true" style={{ background: "rgba(0,0,0,0.045)", bottom: 0, height: `${(finVista - ventana.hasta) * PX_POR_MINUTO}px`, left: 0, position: "absolute", right: 0 }} />
                  )}
                  {propios.map((bloque) => {
                    const estilo = ESTILOS_BLOQUE[bloque.tipo] || ESTILOS_BLOQUE.programada;
                    const ancho = 100 / carriles;
                    return (
                      <article
                        key={bloque.id}
                        title={`${formatearHora12(bloque.desde)} a ${formatearHora12(bloque.hasta)}${bloque.cliente ? ` · ${bloque.cliente}` : ""} · ${bloque.titulo}`}
                        style={{
                          background: estilo.fondo, borderRadius: "8px", boxSizing: "border-box", color: estilo.color,
                          height: `${(bloque.hasta - bloque.desde) * PX_POR_MINUTO - 2}px`, left: `calc(${bloque.carril * ancho}% + 3px)`,
                          overflow: "hidden", padding: "6px 8px", position: "absolute",
                          top: `${(bloque.desde - inicioVista) * PX_POR_MINUTO + 1}px`, width: `calc(${ancho}% - 6px)`,
                        }}
                      >
                        <p style={{ fontSize: "11px", fontWeight: "800", margin: 0, opacity: 0.85 }}>
                          {formatearHora12(bloque.desde)} a {formatearHora12(bloque.hasta)}
                        </p>
                        <p style={{ fontSize: "12px", fontWeight: "800", margin: "2px 0 0", overflow: "hidden", textDecoration: bloque.tipo === "cancelada" ? "line-through" : "none", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {bloque.cliente || "Sin cliente"}
                        </p>
                        <p style={{ fontSize: "11px", margin: "1px 0 0", opacity: 0.8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{bloque.titulo}</p>
                      </article>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!cargando && ventana && (
        <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: "16px", marginTop: "14px" }}>
          {Object.values(ESTILOS_BLOQUE).map((estilo) => (
            <span key={estilo.etiqueta} style={{ alignItems: "center", color: "#555", display: "inline-flex", fontSize: "12px", gap: "6px" }}>
              <span aria-hidden="true" style={{ background: estilo.fondo, border: "0.5px solid #D5D5D5", borderRadius: "4px", height: "12px", width: "12px" }} />
              {estilo.etiqueta}
            </span>
          ))}
          <span style={{ color: "#888", fontSize: "12px" }}>El espacio en blanco dentro del horario está disponible.</span>
        </div>
      )}

      {!cargando && huerfanos.length > 0 && (
        <div style={{ ...tarjeta, marginTop: "16px", padding: "16px 18px" }}>
          <p style={{ color: "#0B0B0B", fontSize: "13px", fontWeight: "800", margin: "0 0 8px" }}>De entrenadores que ya no están activos</p>
          {huerfanos.map((bloque) => (
            <p key={bloque.id} style={{ color: "#666", fontSize: "12px", margin: "4px 0" }}>
              {formatearHora12(bloque.desde)} a {formatearHora12(bloque.hasta)} · {bloque.cliente || "Sin cliente"} · {bloque.titulo}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
