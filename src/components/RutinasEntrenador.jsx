import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, traducirErrorSupabase } from "../supabaseClient";

const ejercicioVacio = () => ({ ejercicio: "", series: "", repeticiones: "", descanso: "", notas: "" });
const formularioVacio = () => ({ nombre: "", nivel: "Principiante", contenido: [ejercicioVacio()] });

const campo = {
  width: "100%", background: "#FAFAFA", border: "1px solid #E5E5E5",
  borderRadius: "8px", boxSizing: "border-box", fontSize: "14px", outline: "none", padding: "11px",
};

export default function RutinasEntrenador({ usuario }) {
  const coachId = usuario?.id;
  const [rutinas, setRutinas] = useState([]);
  const [formulario, setFormulario] = useState(formularioVacio);
  const [busqueda, setBusqueda] = useState("");
  const [editandoId, setEditandoId] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const cargarRutinas = useCallback(async () => {
    if (!coachId) {
      setError("No se detectó una sesión activa.");
      setCargando(false);
      return;
    }
    const { data, error: errorConsulta } = await supabase
      .from("rutinas")
      .select("id,nombre,nivel,contenido,coach_id,creado_en")
      .eq("coach_id", coachId)
      .order("nombre", { ascending: true });
    if (errorConsulta) setError(traducirErrorSupabase(errorConsulta));
    else {
      setRutinas(data || []);
      setError("");
    }
    setCargando(false);
  }, [coachId]);

  useEffect(() => {
    if (!coachId) return undefined;
    const temporizador = window.setTimeout(() => { void cargarRutinas(); }, 0);
    const canal = supabase
      .channel(`rutinas-${coachId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rutinas", filter: `coach_id=eq.${coachId}` }, () => void cargarRutinas())
      .subscribe();
    return () => {
      window.clearTimeout(temporizador);
      void supabase.removeChannel(canal);
    };
  }, [coachId, cargarRutinas]);

  const rutinasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return rutinas;
    return rutinas.filter((rutina) => `${rutina.nombre} ${rutina.nivel || ""}`.toLowerCase().includes(texto));
  }, [busqueda, rutinas]);

  const limpiarFormulario = () => {
    setFormulario(formularioVacio());
    setEditandoId(null);
  };

  const cambiarEjercicio = (indice, clave, valor) => {
    setFormulario((actual) => ({
      ...actual,
      contenido: actual.contenido.map((ejercicio, posicion) =>
        posicion === indice ? { ...ejercicio, [clave]: valor } : ejercicio
      ),
    }));
  };

  const agregarEjercicio = () => {
    setFormulario((actual) => actual.contenido.length >= 30
      ? actual
      : { ...actual, contenido: [...actual.contenido, ejercicioVacio()] });
  };

  const quitarEjercicio = (indice) => {
    setFormulario((actual) => ({
      ...actual,
      contenido: actual.contenido.length === 1
        ? [ejercicioVacio()]
        : actual.contenido.filter((_, posicion) => posicion !== indice),
    }));
  };

  const guardarRutina = async (evento) => {
    evento.preventDefault();
    setError("");
    const nombre = formulario.nombre.trim();
    const contenido = formulario.contenido
      .map((item) => Object.fromEntries(Object.entries(item).map(([clave, valor]) => [clave, valor.trim()])))
      .filter((item) => item.ejercicio);

    if (!nombre) return setError("Escribe el nombre de la rutina.");
    if (!coachId) return setError("No se detectó una sesión activa.");
    if (contenido.length === 0) return setError("Agrega al menos un ejercicio.");
    if (contenido.some((item) => !item.series || !item.repeticiones)) {
      return setError("Cada ejercicio debe indicar series y repeticiones.");
    }
    if (rutinas.some((rutina) => rutina.id !== editandoId && rutina.nombre.trim().toLowerCase() === nombre.toLowerCase())) {
      return setError("Ya tienes una rutina con ese nombre.");
    }

    setGuardando(true);
    const datos = { nombre, nivel: formulario.nivel, contenido, coach_id: coachId };
    const operacion = editandoId
      ? supabase.from("rutinas").update(datos).eq("id", editandoId).eq("coach_id", coachId).select("id").maybeSingle()
      : supabase.from("rutinas").insert(datos).select("id").single();
    const { data, error: errorGuardado } = await operacion;
    setGuardando(false);
    if (errorGuardado || !data) {
      setError(traducirErrorSupabase(errorGuardado));
      return;
    }
    limpiarFormulario();
    await cargarRutinas();
  };

  const comenzarEdicion = (rutina) => {
    const contenido = Array.isArray(rutina.contenido) && rutina.contenido.length
      ? rutina.contenido.map((item) => ({ ...ejercicioVacio(), ...item }))
      : [ejercicioVacio()];
    setFormulario({ nombre: rutina.nombre, nivel: rutina.nivel || "Principiante", contenido });
    setEditandoId(rutina.id);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const eliminarRutina = async (rutina) => {
    if (!window.confirm(`¿Deseas eliminar la rutina “${rutina.nombre}”?`)) return;
    const { data, error: errorEliminacion } = await supabase
      .from("rutinas")
      .delete()
      .eq("id", rutina.id)
      .eq("coach_id", coachId)
      .select("id")
      .maybeSingle();
    if (errorEliminacion || !data) {
      setError("No se pudo eliminar. Comprueba si está asignada a un cliente.");
      return;
    }
    if (editandoId === rutina.id) limpiarFormulario();
    await cargarRutinas();
  };

  if (cargando) return <p style={{ color: "#888", textAlign: "center", padding: "40px" }}>Cargando rutinas...</p>;

  return (
    <section>
      <header style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "22px", fontWeight: "900" }}>Mis rutinas</h3>
          <p style={{ color: "#888", fontSize: "13px", marginTop: "5px" }}>Crea rutinas con nivel, ejercicios y parámetros de trabajo.</p>
        </div>
        <span style={{ background: "#FBD5D9", borderRadius: "20px", fontSize: "13px", fontWeight: "700", padding: "8px 14px", height: "fit-content" }}>{rutinas.length} registradas</span>
      </header>

      {error && <p role="alert" style={{ background: "#FFF0F0", border: "1px solid #FFCCCC", borderRadius: "8px", color: "#CC0000", fontSize: "13px", padding: "12px" }}>{error}</p>}

      <form onSubmit={guardarRutina} style={{ background: "#FFF", border: "1px solid #E5E5E5", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 2fr) minmax(160px, 1fr)", gap: "10px", marginBottom: "16px" }}>
          <div>
            <label htmlFor="nombre-rutina" style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px" }}>Nombre</label>
            <input id="nombre-rutina" maxLength={80} value={formulario.nombre} onChange={(evento) => setFormulario((actual) => ({ ...actual, nombre: evento.target.value }))} style={campo} />
          </div>
          <div>
            <label htmlFor="nivel-rutina" style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px" }}>Nivel</label>
            <select id="nivel-rutina" value={formulario.nivel} onChange={(evento) => setFormulario((actual) => ({ ...actual, nivel: evento.target.value }))} style={campo}>
              <option>Principiante</option><option>Intermedio</option><option>Avanzado</option>
            </select>
          </div>
        </div>

        <p style={{ fontSize: "12px", fontWeight: "800", marginBottom: "8px" }}>Ejercicios</p>
        {formulario.contenido.map((item, indice) => (
          <div key={indice} style={{ background: "#F7F7F7", borderRadius: "9px", display: "grid", gridTemplateColumns: "2fr 0.7fr 1fr 1fr 2fr auto", gap: "8px", marginBottom: "8px", padding: "10px" }}>
            <input aria-label={`Ejercicio ${indice + 1}`} placeholder="Ejercicio" maxLength={100} value={item.ejercicio} onChange={(e) => cambiarEjercicio(indice, "ejercicio", e.target.value)} style={campo} />
            <input aria-label={`Series del ejercicio ${indice + 1}`} placeholder="Series" maxLength={10} value={item.series} onChange={(e) => cambiarEjercicio(indice, "series", e.target.value)} style={campo} />
            <input aria-label={`Repeticiones del ejercicio ${indice + 1}`} placeholder="Repeticiones" maxLength={20} value={item.repeticiones} onChange={(e) => cambiarEjercicio(indice, "repeticiones", e.target.value)} style={campo} />
            <input aria-label={`Descanso del ejercicio ${indice + 1}`} placeholder="Descanso" maxLength={20} value={item.descanso} onChange={(e) => cambiarEjercicio(indice, "descanso", e.target.value)} style={campo} />
            <input aria-label={`Notas del ejercicio ${indice + 1}`} placeholder="Indicaciones" maxLength={180} value={item.notas} onChange={(e) => cambiarEjercicio(indice, "notas", e.target.value)} style={campo} />
            <button type="button" aria-label={`Quitar ejercicio ${indice + 1}`} onClick={() => quitarEjercicio(indice)} style={{ background: "#FFF0F0", border: 0, borderRadius: "8px", color: "#B02A2A", cursor: "pointer", padding: "0 12px" }}>X</button>
          </div>
        ))}
        <button type="button" onClick={agregarEjercicio} style={{ background: "#F1F1F1", border: 0, borderRadius: "8px", cursor: "pointer", fontWeight: "700", marginBottom: "16px", padding: "10px 14px" }}>+ Agregar ejercicio</button>
        <div style={{ display: "flex", gap: "8px" }}>
          <button type="submit" disabled={guardando} style={{ background: "#0B0B0B", color: "#FFFFFF", border: 0, borderRadius: "8px", cursor: "pointer", fontWeight: "900", padding: "11px 18px", opacity: guardando ? 0.65 : 1 }}>{guardando ? "Guardando..." : editandoId ? "Actualizar rutina" : "Crear rutina"}</button>
          {editandoId && <button type="button" onClick={limpiarFormulario} style={{ background: "#EEE", border: 0, borderRadius: "8px", cursor: "pointer", padding: "11px 18px" }}>Cancelar</button>}
        </div>
      </form>

      <input aria-label="Buscar rutinas" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder="Buscar rutina por nombre o nivel" style={{ ...campo, marginBottom: "16px" }} />
      {rutinasFiltradas.length === 0 ? (
        <div style={{ background: "#FFF", border: "1px solid #E5E5E5", borderRadius: "12px", color: "#888", padding: "36px", textAlign: "center" }}>No hay rutinas para mostrar.</div>
      ) : rutinasFiltradas.map((rutina) => (
        <article key={rutina.id} style={{ background: "#FFF", border: "1px solid #E5E5E5", borderRadius: "12px", marginBottom: "10px", padding: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <h4 style={{ margin: 0 }}>{rutina.nombre}</h4>
              <p style={{ color: "#777", fontSize: "12px", margin: "5px 0 0" }}>{rutina.nivel || "Sin nivel"} · {Array.isArray(rutina.contenido) ? rutina.contenido.length : 0} ejercicios</p>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button type="button" onClick={() => comenzarEdicion(rutina)} style={{ background: "#0B0B0B", color: "#FFFFFF", border: 0, borderRadius: "7px", cursor: "pointer", fontWeight: "700", padding: "8px 12px" }}>Editar</button>
              <button type="button" onClick={() => void eliminarRutina(rutina)} style={{ background: "#FFF0F0", border: 0, borderRadius: "7px", color: "#B02A2A", cursor: "pointer", padding: "8px 12px" }}>Eliminar</button>
            </div>
          </div>
          {Array.isArray(rutina.contenido) && rutina.contenido.length > 0 && (
            <ol style={{ color: "#444", fontSize: "13px", margin: "14px 0 0", paddingLeft: "22px" }}>
              {rutina.contenido.map((item, indice) => <li key={`${rutina.id}-${indice}`} style={{ marginBottom: "5px" }}><strong>{item.ejercicio}</strong> — {item.series} series · {item.repeticiones} repeticiones{item.descanso ? ` · ${item.descanso} descanso` : ""}</li>)}
            </ol>
          )}
        </article>
      ))}
    </section>
  );
}
