import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
// AJUSTA esta ruta si tu firebase.js está en otro lugar
import { db, auth } from "../firebase";

// --- Mismo lenguaje de diseño que InicioEntrenador.jsx / ClientesEntrenador.jsx ---
const estiloCard = {
  background: "#FFFFFF",
  border: "0.5px solid #E5E5E5",
  borderRadius: "12px",
  padding: "20px 24px",
};

const inputStyle = {
  width: "100%",
  background: "#F5F5F5",
  border: "0.5px solid #E5E5E5",
  borderRadius: "8px",
  padding: "10px 12px",
  fontSize: "13px",
  color: "#0B0B0B",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle = {
  fontSize: "11px",
  fontWeight: "700",
  color: "#888",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  marginBottom: "6px",
  display: "block",
};

const OBJETIVOS = ["Todos", "Masa Muscular", "Fuerza", "Salud / Movilidad", "Pérdida de Grasa"];
const NIVELES = ["Principiante", "Intermedio", "Avanzado"];

export default function RutinasEntrenador({ usuario }) {
  const coachId = usuario?.uid || auth.currentUser?.uid;

  const [modoCrear, setModoCrear] = useState(false);
  const [rutinaEditando, setRutinaEditando] = useState(null); // docId si estamos editando
  const [filtroObjetivo, setFiltroObjetivo] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const [rutinas, setRutinas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [form, setForm] = useState({
    nombre: "",
    nivel: "Intermedio",
    objetivo: "Hipertrofia / Masa Muscular",
    diasSemana: 4,
  });

  const [ejerciciosBorrador, setEjerciciosBorrador] = useState([]);

  // Panel de asignación directa
  const [rutinaParaAsignar, setRutinaParaAsignar] = useState(null);
  const [clienteDestino, setClienteDestino] = useState("");
  const [notaAsignacion, setNotaAsignacion] = useState("");

  // --- Rutinas del coach en tiempo real ---
  useEffect(() => {
    if (!coachId) {
      setCargando(false);
      setError("No se detectó una sesión activa.");
      return;
    }
    const q = query(collection(db, "rutinas"), where("coachId", "==", coachId));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const lista = snap.docs.map((d) => ({ docId: d.id, ...d.data() }));
        lista.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
        setRutinas(lista);
        setCargando(false);
      },
      (err) => {
        console.error("Error leyendo rutinas:", err);
        setError("No se pudieron cargar las rutinas. Verifica las reglas de Firestore.");
        setCargando(false);
      }
    );
    return () => unsub();
  }, [coachId]);

  // --- Clientes del coach, para el selector de asignación directa ---
  useEffect(() => {
    if (!coachId) return;
    const q = query(collection(db, "clientes"), where("coachId", "==", coachId));
    const unsub = onSnapshot(q, (snap) => {
      setClientes(
        snap.docs.map((d) => {
          const data = d.data();
          return { docId: d.id, nombre: `${data.nombre || ""} ${data.apellido || ""}`.trim() };
        })
      );
    });
    return () => unsub();
  }, [coachId]);

  const resetForm = () => {
    setForm({ nombre: "", nivel: "Intermedio", objetivo: "Hipertrofia / Masa Muscular", diasSemana: 4 });
    setEjerciciosBorrador([]);
    setRutinaEditando(null);
  };

  const abrirCrear = () => {
    resetForm();
    setModoCrear(true);
  };

  const abrirEditar = (rutina) => {
    setForm({
      nombre: rutina.nombre || "",
      nivel: rutina.nivel || "Intermedio",
      objetivo: rutina.objetivo || "Hipertrofia / Masa Muscular",
      diasSemana: rutina.diasSemana || 4,
    });
    setEjerciciosBorrador(rutina.ejercicios || []);
    setRutinaEditando(rutina.docId);
    setModoCrear(true);
  };

  const agregarEjercicio = () => {
    setEjerciciosBorrador([
      ...ejerciciosBorrador,
      { id: Date.now(), nombre: "Nuevo Ejercicio", grupo: "General", series: "3", reps: "10-12", descanso: "60s" },
    ]);
  };

  const actualizarEjercicio = (id, campo, valor) => {
    setEjerciciosBorrador(ejerciciosBorrador.map((ej) => (ej.id === id ? { ...ej, [campo]: valor } : ej)));
  };

  const eliminarEjercicio = (id) => {
    setEjerciciosBorrador(ejerciciosBorrador.filter((ej) => ej.id !== id));
  };

  const handleGuardarRutina = async (e) => {
    e.preventDefault();
    if (!form.nombre || !coachId) return;

    setGuardando(true);
    try {
      const payload = {
        nombre: form.nombre,
        nivel: form.nivel,
        objetivo: form.objetivo,
        diasSemana: Number(form.diasSemana) || 0,
        ejercicios: ejerciciosBorrador,
        ejerciciosTotales: ejerciciosBorrador.length,
        coachId,
        actualizadoEn: serverTimestamp(),
      };

      if (rutinaEditando) {
        await updateDoc(doc(db, "rutinas", rutinaEditando), payload);
      } else {
        await addDoc(collection(db, "rutinas"), { ...payload, creadoEn: serverTimestamp() });
      }

      resetForm();
      setModoCrear(false);
    } catch (err) {
      console.error("Error al guardar rutina:", err);
      setError("No se pudo guardar la rutina. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarRutina = async (rutina) => {
    if (!window.confirm(`¿Eliminar la rutina "${rutina.nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteDoc(doc(db, "rutinas", rutina.docId));
    } catch (err) {
      console.error("Error al eliminar rutina:", err);
      setError("No se pudo eliminar la rutina.");
    }
  };

  // --- Asignación directa: actualiza el cliente (denormalizado, sin JOIN) ---
  const handleAsignar = async (e) => {
    e.preventDefault();
    if (!clienteDestino || !rutinaParaAsignar) return;
    try {
      await updateDoc(doc(db, "clientes", clienteDestino), {
        rutinaAsignada: rutinaParaAsignar.nombre,
        rutinaId: rutinaParaAsignar.docId,
        notaRutina: notaAsignacion || "",
      });
      setRutinaParaAsignar(null);
      setClienteDestino("");
      setNotaAsignacion("");
    } catch (err) {
      console.error("Error al asignar rutina:", err);
      setError("No se pudo asignar la rutina al cliente.");
    }
  };

  const rutinasFiltradas = rutinas.filter((r) => {
    const cumpleFiltro = filtroObjetivo === "Todos" || r.objetivo === filtroObjetivo;
    const cumpleBusqueda = (r.nombre || "").toLowerCase().includes(busqueda.toLowerCase());
    return cumpleFiltro && cumpleBusqueda;
  });

  if (cargando) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px" }}>
        <p style={{ color: "#888" }}>Cargando...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Encabezado */}
      <div style={{ marginBottom: "28px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <p style={{ fontSize: "13px", color: "#888", margin: "0 0 4px" }}>
            {modoCrear ? "Módulo de rutinas" : "Prescripción de entrenamiento"}
          </p>
          <h2 style={{ fontSize: "26px", fontWeight: "900", color: "#0B0B0B", margin: 0 }}>
            {modoCrear ? (rutinaEditando ? "Editar Rutina" : "Diseñador de Rutinas") : "Biblioteca de Rutinas"}
          </h2>
          <p style={{ fontSize: "14px", color: "#888", marginTop: "6px" }}>
            {modoCrear
              ? "Estructura los días de entrenamiento y define los ejercicios prescritos."
              : "Gestiona, edita y asigna programas de entrenamiento a tus clientes."}
          </p>
        </div>

        <button
          onClick={() => (modoCrear ? (resetForm(), setModoCrear(false)) : abrirCrear())}
          style={{
            background: "#FFC800", color: "#0B0B0B", fontWeight: "900",
            fontSize: "13px", padding: "12px 20px", borderRadius: "10px",
            border: "none", cursor: "pointer", flexShrink: 0,
          }}
        >
          {modoCrear ? "Volver" : "Crear Nueva Rutina"}
        </button>
      </div>

      {error && (
        <div style={{
          background: "#FDECEC", border: "0.5px solid #F3C4C4", color: "#B02A2A",
          borderRadius: "10px", padding: "12px 16px", fontSize: "13px", marginBottom: "20px",
        }}>
          {error}
        </div>
      )}

      {!modoCrear ? (
        <>
          {/* Filtros y búsqueda */}
          <div style={{
            ...estiloCard, marginBottom: "20px", padding: "16px 20px",
            display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "12px",
          }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {OBJETIVOS.map((o) => (
                <button
                  key={o}
                  onClick={() => setFiltroObjetivo(o)}
                  style={{
                    fontSize: "12px", fontWeight: "700", padding: "8px 14px",
                    borderRadius: "8px", border: "none", cursor: "pointer",
                    background: filtroObjetivo === o ? "#FFC800" : "#F5F5F5",
                    color: "#0B0B0B",
                  }}
                >
                  {o}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre..."
              style={{ ...inputStyle, width: "240px" }}
            />
          </div>

          {/* Grid de rutinas */}
          {rutinasFiltradas.length === 0 ? (
            <div style={{ ...estiloCard, textAlign: "center", padding: "40px" }}>
              <p style={{ color: "#888", fontSize: "13px", margin: 0 }}>
                No tienes rutinas creadas todavía. Usa "Crear Nueva Rutina" para empezar.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
              {rutinasFiltradas.map((rutina) => (
                <div key={rutina.docId} style={estiloCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <span style={{
                      fontSize: "10px", fontWeight: "700", padding: "3px 10px", borderRadius: "20px",
                      background: "#F5F5F5", color: "#555",
                    }}>
                      {rutina.nivel}
                    </span>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        onClick={() => abrirEditar(rutina)}
                        title="Editar"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: "14px" }}
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => handleEliminarRutina(rutina)}
                        title="Eliminar"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#E24B4A", fontSize: "14px" }}
                      >
                        🗑
                      </button>
                    </div>
                  </div>

                  <p style={{ fontSize: "16px", fontWeight: "900", color: "#0B0B0B", margin: "0 0 4px" }}>
                    {rutina.nombre}
                  </p>
                  <p style={{ fontSize: "12px", color: "#888", margin: "0 0 14px" }}>
                    Objetivo: <strong style={{ color: "#0B0B0B" }}>{rutina.objetivo}</strong>
                  </p>

                  <div style={{
                    display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px",
                    background: "#F5F5F5", borderRadius: "8px", padding: "12px", marginBottom: "14px",
                  }}>
                    <div>
                      <p style={{ ...labelStyle, marginBottom: "2px" }}>Frecuencia</p>
                      <p style={{ fontWeight: "700", fontSize: "13px", color: "#0B0B0B", margin: 0 }}>{rutina.diasSemana} días/sem</p>
                    </div>
                    <div>
                      <p style={{ ...labelStyle, marginBottom: "2px" }}>Ejercicios</p>
                      <p style={{ fontWeight: "700", fontSize: "13px", color: "#0B0B0B", margin: 0 }}>{rutina.ejerciciosTotales || 0}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setRutinaParaAsignar(rutina)}
                    style={{
                      width: "100%", background: "#0B0B0B", color: "#FFF", fontWeight: "700",
                      fontSize: "13px", padding: "12px", borderRadius: "8px", border: "none", cursor: "pointer",
                    }}
                  >
                    Asignar Cliente
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Diseñador de rutinas */
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px", alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Configuración general */}
            <div style={estiloCard}>
              <p style={{ fontSize: "12px", fontWeight: "900", color: "#FFC800", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "14px" }}>
                1. Configuración General
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "14px", marginBottom: "14px" }}>
                <div>
                  <label style={labelStyle}>Nombre del Programa</label>
                  <input
                    type="text" style={inputStyle}
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    placeholder="Ej. Hipertrofia Intermedia - Bloque 1"
                  />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={labelStyle}>Nivel</label>
                  <select style={inputStyle} value={form.nivel} onChange={(e) => setForm({ ...form, nivel: e.target.value })}>
                    {NIVELES.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Objetivo</label>
                  <select style={inputStyle} value={form.objetivo} onChange={(e) => setForm({ ...form, objetivo: e.target.value })}>
                    <option>Hipertrofia / Masa Muscular</option>
                    <option>Pérdida de Grasa</option>
                    <option>Fuerza Máxima</option>
                    <option>Salud / Movilidad</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Días / semana</label>
                  <input
                    type="number" min="1" max="7" style={inputStyle}
                    value={form.diasSemana}
                    onChange={(e) => setForm({ ...form, diasSemana: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Ejercicios */}
            <div style={estiloCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <p style={{ fontSize: "12px", fontWeight: "900", color: "#FFC800", textTransform: "uppercase", letterSpacing: "0.04em", margin: 0 }}>
                  2. Prescripción de Ejercicios
                </p>
                <button
                  onClick={agregarEjercicio}
                  style={{
                    background: "#FFC800", color: "#0B0B0B", fontWeight: "700", fontSize: "12px",
                    padding: "8px 14px", borderRadius: "8px", border: "none", cursor: "pointer",
                  }}
                >
                  Agregar Ejercicio
                </button>
              </div>

              {ejerciciosBorrador.length === 0 ? (
                <p style={{ color: "#888", fontSize: "13px" }}>Aún no has agregado ejercicios.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {ejerciciosBorrador.map((ej, index) => (
                    <div key={ej.id} style={{
                      background: "#F5F5F5", borderRadius: "10px", padding: "14px",
                      display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px",
                    }}>
                      <span style={{
                        width: "26px", height: "26px", background: "#0B0B0B", color: "#FFC800",
                        fontWeight: "900", fontSize: "12px", borderRadius: "6px",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        {index + 1}
                      </span>
                      <input
                        style={{ ...inputStyle, flex: "2 1 180px", background: "#FFF" }}
                        value={ej.nombre}
                        onChange={(e) => actualizarEjercicio(ej.id, "nombre", e.target.value)}
                        placeholder="Nombre del ejercicio"
                      />
                      <input
                        style={{ ...inputStyle, flex: "1 1 100px", background: "#FFF" }}
                        value={ej.grupo}
                        onChange={(e) => actualizarEjercicio(ej.id, "grupo", e.target.value)}
                        placeholder="Grupo muscular"
                      />
                      <input
                        style={{ ...inputStyle, width: "70px", background: "#FFF" }}
                        value={ej.series}
                        onChange={(e) => actualizarEjercicio(ej.id, "series", e.target.value)}
                        placeholder="Series"
                      />
                      <input
                        style={{ ...inputStyle, width: "80px", background: "#FFF" }}
                        value={ej.reps}
                        onChange={(e) => actualizarEjercicio(ej.id, "reps", e.target.value)}
                        placeholder="Reps"
                      />
                      <input
                        style={{ ...inputStyle, width: "80px", background: "#FFF" }}
                        value={ej.descanso}
                        onChange={(e) => actualizarEjercicio(ej.id, "descanso", e.target.value)}
                        placeholder="Descanso"
                      />
                      <button
                        onClick={() => eliminarEjercicio(ej.id)}
                        style={{ background: "none", border: "none", color: "#E24B4A", cursor: "pointer", fontSize: "16px" }}
                        title="Eliminar ejercicio"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => { resetForm(); setModoCrear(false); }}
                style={{
                  background: "#FFF", color: "#555", fontWeight: "700", fontSize: "13px",
                  padding: "12px 20px", borderRadius: "8px", border: "0.5px solid #E5E5E5", cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardarRutina}
                disabled={guardando}
                style={{
                  background: "#FFC800", color: "#0B0B0B", fontWeight: "900", fontSize: "13px",
                  padding: "12px 22px", borderRadius: "8px", border: "none",
                  cursor: guardando ? "default" : "pointer", opacity: guardando ? 0.6 : 1,
                }}
              >
                {guardando ? "Guardando..." : "Guardar Rutina"}
              </button>
            </div>
          </div>

          {/* Panel lateral: asignación directa dentro del diseñador */}
          <div style={{ ...estiloCard, position: "sticky", top: "20px" }}>
            <p style={{ fontSize: "14px", fontWeight: "900", color: "#0B0B0B", marginBottom: "14px" }}>
              Vista Previa
            </p>
            <div style={{ background: "#F5F5F5", borderRadius: "10px", padding: "16px" }}>
              <p style={{ fontSize: "15px", fontWeight: "900", color: "#0B0B0B", margin: "0 0 4px" }}>
                {form.nombre || "Nombre de la rutina"}
              </p>
              <p style={{ fontSize: "12px", color: "#888", margin: "0 0 10px" }}>
                {form.nivel} · {form.objetivo}
              </p>
              <p style={{ fontSize: "12px", color: "#555", margin: 0 }}>
                {form.diasSemana} días/semana · {ejerciciosBorrador.length} ejercicios
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Asignación directa desde la biblioteca */}
      {rutinaParaAsignar && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(11,11,11,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", zIndex: 50,
        }}>
          <div style={{ ...estiloCard, maxWidth: "420px", width: "100%" }}>
            <div style={{ borderBottom: "0.5px solid #E5E5E5", paddingBottom: "14px", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "900", color: "#0B0B0B", margin: 0 }}>
                Asignar "{rutinaParaAsignar.nombre}"
              </h3>
            </div>

            <form onSubmit={handleAsignar} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={labelStyle}>Cliente Destino</label>
                <select
                  required style={inputStyle}
                  value={clienteDestino}
                  onChange={(e) => setClienteDestino(e.target.value)}
                >
                  <option value="">Selecciona un cliente</option>
                  {clientes.map((c) => (
                    <option key={c.docId} value={c.docId}>{c.nombre}</option>
                  ))}
                </select>
                {clientes.length === 0 && (
                  <p style={{ fontSize: "11px", color: "#B8860B", marginTop: "6px" }}>
                    Aún no tienes clientes registrados para asignar.
                  </p>
                )}
              </div>
              <div>
                <label style={labelStyle}>Instrucciones Adicionales</label>
                <textarea
                  rows="3" style={{ ...inputStyle, resize: "vertical" }}
                  value={notaAsignacion}
                  onChange={(e) => setNotaAsignacion(e.target.value)}
                  placeholder="Notas técnicas para el atleta..."
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "6px" }}>
                <button
                  type="button"
                  onClick={() => { setRutinaParaAsignar(null); setClienteDestino(""); setNotaAsignacion(""); }}
                  style={{
                    background: "#FFF", color: "#555", fontWeight: "700", fontSize: "13px",
                    padding: "10px 18px", borderRadius: "8px", border: "0.5px solid #E5E5E5", cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    background: "#FFC800", color: "#0B0B0B", fontWeight: "900", fontSize: "13px",
                    padding: "10px 20px", borderRadius: "8px", border: "none", cursor: "pointer",
                  }}
                >
                  Guardar y Asignar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}