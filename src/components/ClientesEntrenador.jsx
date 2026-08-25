import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
// AJUSTA esta ruta si tu firebase.js está en otro lugar
import { db, auth } from "../firebase";

// --- Mismo lenguaje de diseño que InicioEntrenador.jsx ---
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

// Normaliza estado leído de Firestore (soporta datos viejos en minúsculas)
const normalizarEstado = (valor) => {
  const v = (valor || "").toLowerCase();
  if (v.startsWith("activo")) return "Activo";
  if (v.includes("evalu")) return "En Evaluación";
  if (v.startsWith("inactivo")) return "Inactivo";
  return "En Evaluación";
};

const ESTADO_COLORES = {
  "Activo": { bg: "#E1F5EE", color: "#085041" },
  "En Evaluación": { bg: "#FFF8E1", color: "#B8860B" },
  "Inactivo": { bg: "#F5F5F5", color: "#555" },
};

const FILTROS = ["Todos", "Activo", "En Evaluación", "Inactivo"];

export default function ClientesEntrenador({ usuario }) {
  const [modoCrear, setModoCrear] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  const [clientes, setClientes] = useState([]);
  const [rutinas, setRutinas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const [clienteParaAsignarRutina, setClienteParaAsignarRutina] = useState(null);
  const [rutinaSeleccionada, setRutinaSeleccionada] = useState("");
  const [asignandoRutina, setAsignandoRutina] = useState(false);

  const coachId = usuario?.uid || auth.currentUser?.uid;

  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    estado: "En Evaluación",
    edad: "",
    objetivo: "Hipertrofia / Masa Muscular",
    plan: "Plan Smart",
    observaciones: "",
  });

  // --- Historial de mediciones (ficha antropométrica) del cliente en el expediente ---
  const [mediciones, setMediciones] = useState([]);
  const [cargandoMediciones, setCargandoMediciones] = useState(false);
  const [mostrarFormMedicion, setMostrarFormMedicion] = useState(false);
  const [guardandoMedicion, setGuardandoMedicion] = useState(false);
  const [nuevaMedicion, setNuevaMedicion] = useState({
    fecha: new Date().toISOString().split("T")[0],
    peso: "",
    estatura: "",
    cintura: "",
    cadera: "",
  });

  // --- Escucha en tiempo real de los clientes del coach logueado ---
  useEffect(() => {
    if (!coachId) {
      setCargando(false);
      setError("No se detectó una sesión activa.");
      return;
    }

    const q = query(collection(db, "clientes"), where("coachId", "==", coachId));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const lista = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            docId: docSnap.id,
            nombre: `${data.nombre || ""} ${data.apellido || ""}`.trim() || "Sin nombre",
            email: data.email || "",
            telefono: data.telefono || "--",
            estado: normalizarEstado(data.estado),
            plan: data.plan || "Sin plan asignado",
            objetivo: data.objetivo || "Sin definir",
            pesoActual: data.pesoActual ? `${data.pesoActual} kg` : "--",
            rutinaAsignada: data.rutinaAsignada || "Sin Asignar",
          };
        });
        lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
        setClientes(lista);
        setCargando(false);
      },
      (err) => {
        console.error("Error al leer clientes:", err);
        setError("No se pudieron cargar los clientes. Verifica las reglas de Firestore.");
        setCargando(false);
      }
    );

    return () => unsubscribe();
  }, [coachId]);

  // --- Rutinas del coach, para el modal de asignación ---
  useEffect(() => {
    if (!coachId) return;
    const q = query(collection(db, "rutinas"), where("coachId", "==", coachId));
    const unsub = onSnapshot(q, (snap) => {
      const lista = snap.docs.map((d) => ({ docId: d.id, ...d.data() }));
      lista.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
      setRutinas(lista);
    });
    return () => unsub();
  }, [coachId]);

  // --- Historial de mediciones del cliente que tiene el expediente abierto ---
  useEffect(() => {
    if (!clienteSeleccionado) {
      setMediciones([]);
      return;
    }
    setCargandoMediciones(true);
    const q = query(collection(db, "mediciones"), where("clienteId", "==", clienteSeleccionado.docId));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const lista = snap.docs.map((d) => ({ docId: d.id, ...d.data() }));
        lista.sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
        setMediciones(lista);
        setCargandoMediciones(false);
      },
      (err) => {
        console.error("Error leyendo mediciones:", err);
        setCargandoMediciones(false);
      }
    );
    return () => unsub();
  }, [clienteSeleccionado?.docId]);

  const handleGuardarCliente = async (e) => {
    e.preventDefault();
    setError(null);

    if (!nuevoCliente.nombre.trim() || !nuevoCliente.email.trim()) {
      setError("Nombre y correo son obligatorios.");
      return;
    }
    if (!coachId) {
      setError("No se detectó una sesión activa. Vuelve a iniciar sesión.");
      return;
    }

    const soloLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    if (!soloLetras.test(nuevoCliente.nombre.trim())) {
      setError("El nombre solo puede contener letras.");
      return;
    }
    if (nuevoCliente.apellido && !soloLetras.test(nuevoCliente.apellido.trim())) {
      setError("El apellido solo puede contener letras.");
      return;
    }

    const formatoCorreo = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!formatoCorreo.test(nuevoCliente.email.trim())) {
      setError("El formato del correo no es válido.");
      return;
    }

    if (nuevoCliente.telefono && nuevoCliente.telefono.replace(/\D/g, "").length > 10) {
      setError("El teléfono no puede tener más de 10 dígitos.");
      return;
    }

    // Evitar correos duplicados dentro de tus propios clientes
    const yaExiste = clientes.some(
      (c) => c.email.trim().toLowerCase() === nuevoCliente.email.trim().toLowerCase()
    );
    if (yaExiste) {
      setError("Ya tienes un cliente registrado con ese correo.");
      return;
    }

    setGuardando(true);
    try {
      await addDoc(collection(db, "clientes"), {
        nombre: nuevoCliente.nombre.trim(),
        apellido: nuevoCliente.apellido.trim() || "",
        email: nuevoCliente.email.trim(),
        telefono: nuevoCliente.telefono || "",
        estado: nuevoCliente.estado,
        coachId,
        creadoEn: serverTimestamp(),
        objetivo: nuevoCliente.objetivo,
        plan: nuevoCliente.plan,
        edad: nuevoCliente.edad || "",
        observaciones: nuevoCliente.observaciones || "",
        rutinaAsignada: "Sin Asignar",
      });

      setNuevoCliente({
        nombre: "", apellido: "", email: "", telefono: "",
        estado: "En Evaluación", edad: "",
        objetivo: "Hipertrofia / Masa Muscular", plan: "Plan Smart", observaciones: "",
      });
      setModoCrear(false);
    } catch (err) {
      console.error("Error al guardar cliente:", err);
      setError("No se pudo guardar el cliente. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  const handleCambiarEstado = async (cliente, nuevoEstado) => {
    try {
      await updateDoc(doc(db, "clientes", cliente.docId), { estado: nuevoEstado });
      setClienteSeleccionado((prev) => (prev ? { ...prev, estado: nuevoEstado } : prev));
    } catch (err) {
      console.error("Error al actualizar estado:", err);
      setError("No se pudo actualizar el estado del cliente.");
    }
  };

  const abrirAsignarRutina = (cliente) => {
    setClienteParaAsignarRutina(cliente);
    setRutinaSeleccionada(cliente.rutinaId || "");
  };

  const handleConfirmarAsignacion = async (e) => {
    e.preventDefault();
    if (!clienteParaAsignarRutina) return;

    setAsignandoRutina(true);
    try {
      if (rutinaSeleccionada === "") {
        // Quitar rutina asignada
        await updateDoc(doc(db, "clientes", clienteParaAsignarRutina.docId), {
          rutinaAsignada: "Sin Asignar",
          rutinaId: "",
        });
      } else {
        const rutina = rutinas.find((r) => r.docId === rutinaSeleccionada);
        if (!rutina) return;
        await updateDoc(doc(db, "clientes", clienteParaAsignarRutina.docId), {
          rutinaAsignada: rutina.nombre,
          rutinaId: rutina.docId,
        });
      }
      setClienteParaAsignarRutina(null);
      setRutinaSeleccionada("");
    } catch (err) {
      console.error("Error al asignar rutina:", err);
      setError("No se pudo asignar la rutina.");
    } finally {
      setAsignandoRutina(false);
    }
  };

  // --- IMC: cálculo y clasificación (rangos estándar OMS) ---
  const clasificarIMC = (imc) => {
    if (imc < 18.5) return { label: "Bajo peso", bg: "#EAF2FB", color: "#2E5D9A" };
    if (imc < 25) return { label: "Normal", bg: "#E1F5EE", color: "#085041" };
    if (imc < 30) return { label: "Sobrepeso", bg: "#FFF8E1", color: "#B8860B" };
    return { label: "Obesidad", bg: "#FDECEC", color: "#B02A2A" };
  };

  const handleGuardarMedicion = async (e) => {
    e.preventDefault();
    setError(null);

    if (!clienteSeleccionado) return;

    if (!nuevaMedicion.fecha) {
      setError("Selecciona la fecha de la medición.");
      return;
    }
    if (!nuevaMedicion.peso || !nuevaMedicion.estatura) {
      setError("Peso y estatura son obligatorios para registrar una medición.");
      return;
    }

    const peso = parseFloat(nuevaMedicion.peso);
    const estatura = parseFloat(nuevaMedicion.estatura);
    const cintura = nuevaMedicion.cintura ? parseFloat(nuevaMedicion.cintura) : null;
    const cadera = nuevaMedicion.cadera ? parseFloat(nuevaMedicion.cadera) : null;

    if (isNaN(peso) || peso <= 0) {
      setError("El peso debe ser un número mayor a 0.");
      return;
    }
    if (isNaN(estatura) || estatura <= 0) {
      setError("La estatura debe ser un número mayor a 0.");
      return;
    }
    if (nuevaMedicion.cintura && (isNaN(cintura) || cintura <= 0)) {
      setError("La cintura debe ser un número mayor a 0.");
      return;
    }
    if (nuevaMedicion.cadera && (isNaN(cadera) || cadera <= 0)) {
      setError("La cadera debe ser un número mayor a 0.");
      return;
    }

    const imc = Math.round((peso / ((estatura / 100) ** 2)) * 10) / 10;
    const icc = cintura && cadera ? Math.round((cintura / cadera) * 100) / 100 : null;

    setGuardandoMedicion(true);
    try {
      await addDoc(collection(db, "mediciones"), {
        clienteId: clienteSeleccionado.docId,
        coachId,
        fecha: nuevaMedicion.fecha,
        peso,
        estatura,
        cintura,
        cadera,
        imc,
        icc,
        creadoEn: serverTimestamp(),
      });

      // Denormalizamos el último peso/estatura en el cliente para que la tarjeta/lista se actualice sin ir al historial
      await updateDoc(doc(db, "clientes", clienteSeleccionado.docId), {
        pesoActual: peso,
        estatura,
      });

      setNuevaMedicion({ fecha: new Date().toISOString().split("T")[0], peso: "", estatura: "", cintura: "", cadera: "" });
      setMostrarFormMedicion(false);
    } catch (err) {
      console.error("Error al guardar medición:", err);
      setError("No se pudo guardar la medición.");
    } finally {
      setGuardandoMedicion(false);
    }
  };

  const clientesFiltrados = clientes.filter((c) => {
    const cumpleFiltro = filtroEstado === "Todos" || c.estado === filtroEstado;
    const cumpleBusqueda =
      c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.email.toLowerCase().includes(busqueda.toLowerCase());
    return cumpleFiltro && cumpleBusqueda;
  });

  const totalActivos = clientes.filter((c) => c.estado === "Activo").length;
  const totalEvaluacion = clientes.filter((c) => c.estado === "En Evaluación").length;

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
            {modoCrear ? "Nuevo registro" : "Directorio de atletas"}
          </p>
          <h2 style={{ fontSize: "26px", fontWeight: "900", color: "#0B0B0B", margin: 0 }}>
            {modoCrear ? "Registro de Cliente" : "Gestión de Clientes"}
          </h2>
          <p style={{ fontSize: "14px", color: "#888", marginTop: "6px" }}>
            {modoCrear
              ? "Ingresa la información del cliente para darlo de alta en Firestore."
              : "Consulta expedientes, asigna rutinas y da seguimiento a tus clientes."}
          </p>
        </div>

        <button
          onClick={() => setModoCrear(!modoCrear)}
          style={{
            background: "#FFC800", color: "#0B0B0B", fontWeight: "900",
            fontSize: "13px", padding: "12px 20px", borderRadius: "10px",
            border: "none", cursor: "pointer", flexShrink: 0,
          }}
        >
          {modoCrear ? "← Volver al Directorio" : "Nuevo Cliente"}
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
          {/* Cards resumen */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "16px", marginBottom: "24px",
          }}>
            {[
              { label: "Total registrados", valor: clientes.length, color: "#FFC800" },
              { label: "Activos", valor: totalActivos, color: "#1D9E75" },
              { label: "En evaluación", valor: totalEvaluacion, color: "#378ADD" },
            ].map((card) => (
              <div key={card.label} style={estiloCard}>
                <p style={{ fontSize: "12px", color: "#888", marginBottom: "8px" }}>{card.label}</p>
                <p style={{ fontSize: "36px", fontWeight: "900", color: card.color, margin: 0 }}>{card.valor}</p>
              </div>
            ))}
          </div>

          {/* Filtros y búsqueda */}
          <div style={{
            ...estiloCard, marginBottom: "20px", padding: "16px 20px",
            display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "12px",
          }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {FILTROS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFiltroEstado(f)}
                  style={{
                    fontSize: "12px", fontWeight: "700", padding: "8px 14px",
                    borderRadius: "8px", border: "none", cursor: "pointer",
                    background: filtroEstado === f ? "#FFC800" : "#F5F5F5",
                    color: "#0B0B0B",
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o correo..."
              style={{ ...inputStyle, width: "260px" }}
            />
          </div>

          {/* Lista de clientes */}
          {clientesFiltrados.length === 0 ? (
            <div style={{ ...estiloCard, textAlign: "center", padding: "40px" }}>
              <p style={{ color: "#888", fontSize: "13px", margin: 0 }}>
                No hay clientes que coincidan con este filtro.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {clientesFiltrados.map((cliente) => {
                const colores = ESTADO_COLORES[cliente.estado];
                return (
                  <div key={cliente.docId} style={estiloCard}>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                      <div style={{
                        width: "44px", height: "44px", borderRadius: "50%", background: "#F5F5F5",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#0B0B0B", fontWeight: "900", fontSize: "16px", flexShrink: 0,
                      }}>
                        {cliente.nombre.charAt(0).toUpperCase()}
                      </div>

                      <div style={{ flex: 1, minWidth: "220px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <p style={{ fontSize: "15px", fontWeight: "900", color: "#0B0B0B", margin: 0 }}>
                            {cliente.nombre}
                          </p>
                          <span style={{
                            fontSize: "10px", fontWeight: "700", padding: "3px 10px", borderRadius: "20px",
                            background: colores.bg, color: colores.color, textTransform: "uppercase",
                          }}>
                            {cliente.estado}
                          </span>
                        </div>
                        <p style={{ fontSize: "12px", color: "#888", margin: "2px 0 0" }}>
                          {cliente.email} · {cliente.telefono}
                        </p>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginTop: "10px", fontSize: "12px", color: "#555" }}>
                          <span>Objetivo: <strong style={{ color: "#0B0B0B" }}>{cliente.objetivo}</strong></span>
                          <span>Plan: <strong style={{ color: "#0B0B0B" }}>{cliente.plan}</strong></span>
                          <span>Rutina: <strong style={{ color: "#0B0B0B" }}>{cliente.rutinaAsignada}</strong></span>
                          <span>Peso: <strong style={{ color: "#0B0B0B" }}>{cliente.pesoActual}</strong></span>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                        <button
                          onClick={() => setClienteSeleccionado(cliente)}
                          style={{
                            background: "#0B0B0B", color: "#FFF", fontWeight: "700", fontSize: "12px",
                            padding: "10px 16px", borderRadius: "8px", border: "none", cursor: "pointer",
                          }}
                        >
                          Ver Expediente
                        </button>
                        <button
                          onClick={() => abrirAsignarRutina(cliente)}
                          style={{
                            background: "#F5F5F5", color: "#0B0B0B", fontWeight: "700", fontSize: "12px",
                            padding: "10px 16px", borderRadius: "8px", border: "0.5px solid #E5E5E5", cursor: "pointer",
                          }}
                        >
                          Asignar Rutina
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* Formulario de alta */
        <div style={{ ...estiloCard, maxWidth: "720px" }}>
          <form onSubmit={handleGuardarCliente} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div>
              <p style={{ fontSize: "12px", fontWeight: "900", color: "#FFC800", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "12px" }}>
                1. Información Personal
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={labelStyle}>Nombre *</label>
                  <input
                    type="text" required style={inputStyle}
                    value={nuevoCliente.nombre}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })}
                    placeholder="Ej. Carlos"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Apellido</label>
                  <input
                    type="text" style={inputStyle}
                    value={nuevoCliente.apellido}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, apellido: e.target.value })}
                    placeholder="Ej. Rodríguez"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Correo Electrónico *</label>
                  <input
                    type="email" required style={inputStyle}
                    value={nuevoCliente.email}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, email: e.target.value })}
                    placeholder="carlos@email.com"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Teléfono</label>
                  <input
                    type="text" style={inputStyle}
                    value={nuevoCliente.telefono}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })}
                    placeholder="+1 (809) 000-0000"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Estado Inicial</label>
                  <select
                    style={inputStyle}
                    value={nuevoCliente.estado}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, estado: e.target.value })}
                  >
                    <option value="En Evaluación">En Evaluación</option>
                    <option value="Activo">Activo</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Edad</label>
                  <input
                    type="number" style={inputStyle}
                    value={nuevoCliente.edad}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, edad: e.target.value })}
                    placeholder="26"
                  />
                </div>
              </div>

              
            </div>

            <div>
              <p style={{ fontSize: "12px", fontWeight: "900", color: "#FFC800", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "12px" }}>
                2. Objetivos y Plan
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                <div>
                  <label style={labelStyle}>Objetivo Principal</label>
                  <select
                    style={inputStyle}
                    value={nuevoCliente.objetivo}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, objetivo: e.target.value })}
                  >
                    <option value="Hipertrofia / Masa Muscular">Hipertrofia / Masa Muscular</option>
                    <option value="Pérdida de Grasa">Pérdida de Grasa</option>
                    <option value="Fuerza Máxima">Fuerza Máxima</option>
                    <option value="Salud y Movilidad">Salud y Movilidad</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Suscripción / Plan</label>
                  <select
                    style={inputStyle}
                    value={nuevoCliente.plan}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, plan: e.target.value })}
                  >
                    <option value="Plan Smart">Plan Smart</option>
                    <option value="Plan Black">Plan Black</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Observaciones / Lesiones Previas</label>
                <textarea
                  rows="3"
                  style={{ ...inputStyle, resize: "vertical" }}
                  value={nuevoCliente.observaciones}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, observaciones: e.target.value })}
                  placeholder="Detalle cualquier condición física relevante..."
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "0.5px solid #E5E5E5", paddingTop: "18px" }}>
              <button
                type="button"
                onClick={() => setModoCrear(false)}
                style={{
                  background: "#FFF", color: "#555", fontWeight: "700", fontSize: "13px",
                  padding: "12px 20px", borderRadius: "8px", border: "0.5px solid #E5E5E5", cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                style={{
                  background: "#FFC800", color: "#0B0B0B", fontWeight: "900", fontSize: "13px",
                  padding: "12px 22px", borderRadius: "8px", border: "none",
                  cursor: guardando ? "default" : "pointer", opacity: guardando ? 0.6 : 1,
                }}
              >
                {guardando ? "Guardando..." : "Guardar Cliente"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Asignar Rutina */}
      {clienteParaAsignarRutina && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(11,11,11,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", zIndex: 50,
        }}>
          <div style={{ ...estiloCard, maxWidth: "420px", width: "100%" }}>
            <div style={{ borderBottom: "0.5px solid #E5E5E5", paddingBottom: "14px", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "900", color: "#0B0B0B", margin: 0 }}>
                Asignar Rutina
              </h3>
              <p style={{ fontSize: "12px", color: "#888", margin: "2px 0 0" }}>
                {clienteParaAsignarRutina.nombre}
              </p>
            </div>

            <form onSubmit={handleConfirmarAsignacion} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={labelStyle}>Rutina</label>
                <select
                  style={inputStyle}
                  value={rutinaSeleccionada}
                  onChange={(e) => setRutinaSeleccionada(e.target.value)}
                >
                  <option value="">Sin Asignar</option>
                  {rutinas.map((r) => (
                    <option key={r.docId} value={r.docId}>
                      {r.nombre} · {r.nivel}
                    </option>
                  ))}
                </select>
                {rutinas.length === 0 && (
                  <p style={{ fontSize: "11px", color: "#B8860B", marginTop: "6px" }}>
                    Aún no tienes rutinas creadas. Ve a "Rutinas" en el menú para crear la primera.
                  </p>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "4px" }}>
                <button
                  type="button"
                  onClick={() => { setClienteParaAsignarRutina(null); setRutinaSeleccionada(""); }}
                  style={{
                    background: "#FFF", color: "#555", fontWeight: "700", fontSize: "13px",
                    padding: "10px 18px", borderRadius: "8px", border: "0.5px solid #E5E5E5", cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={asignandoRutina}
                  style={{
                    background: "#FFC800", color: "#0B0B0B", fontWeight: "900", fontSize: "13px",
                    padding: "10px 20px", borderRadius: "8px", border: "none",
                    cursor: asignandoRutina ? "default" : "pointer", opacity: asignandoRutina ? 0.6 : 1,
                  }}
                >
                  {asignandoRutina ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal expediente */}
      {clienteSeleccionado && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(11,11,11,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", zIndex: 50,
        }}>
          <div style={{ ...estiloCard, maxWidth: "540px", width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "flex-start",
              borderBottom: "0.5px solid #E5E5E5", paddingBottom: "16px", marginBottom: "16px",
            }}>
              <div>
                <h3 style={{ fontSize: "20px", fontWeight: "900", color: "#0B0B0B", margin: 0 }}>
                  {clienteSeleccionado.nombre}
                </h3>
                <p style={{ fontSize: "12px", color: "#888", margin: "2px 0 0" }}>{clienteSeleccionado.email}</p>
              </div>
              <button
                onClick={() => setClienteSeleccionado(null)}
                style={{ background: "none", border: "none", color: "#888", fontSize: "18px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px",
              background: "#F5F5F5", borderRadius: "10px", padding: "16px", marginBottom: "16px", fontSize: "13px",
            }}>
              <div>
                <p style={{ ...labelStyle, marginBottom: "2px" }}>Estado</p>
                <p style={{ fontWeight: "700", color: "#0B0B0B", margin: 0 }}>{clienteSeleccionado.estado}</p>
              </div>
              <div>
                <p style={{ ...labelStyle, marginBottom: "2px" }}>Teléfono</p>
                <p style={{ fontWeight: "700", color: "#0B0B0B", margin: 0 }}>{clienteSeleccionado.telefono}</p>
              </div>
              <div>
                <p style={{ ...labelStyle, marginBottom: "2px" }}>Peso Registrado</p>
                <p style={{ fontWeight: "700", color: "#0B0B0B", margin: 0 }}>{clienteSeleccionado.pesoActual}</p>
              </div>
              <div>
                <p style={{ ...labelStyle, marginBottom: "2px" }}>Rutina Vigente</p>
                <p style={{ fontWeight: "700", color: "#0B0B0B", margin: 0 }}>{clienteSeleccionado.rutinaAsignada}</p>
              </div>
            </div>

            {/* Historial de mediciones (ficha antropométrica) */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <p style={{ fontSize: "13px", fontWeight: "900", color: "#0B0B0B", margin: 0 }}>
                  Historial de Mediciones
                </p>
                <button
                  onClick={() => setMostrarFormMedicion(!mostrarFormMedicion)}
                  style={{
                    background: mostrarFormMedicion ? "#F5F5F5" : "#FFC800",
                    color: "#0B0B0B", fontWeight: "700", fontSize: "11px",
                    padding: "6px 12px", borderRadius: "8px",
                    border: mostrarFormMedicion ? "0.5px solid #E5E5E5" : "none", cursor: "pointer",
                  }}
                >
                  {mostrarFormMedicion ? "Cancelar" : "Nueva Medición"}
                </button>
              </div>

              {mostrarFormMedicion && (
                <form
                  onSubmit={handleGuardarMedicion}
                  style={{
                    background: "#F5F5F5", borderRadius: "10px", padding: "14px",
                    marginBottom: "12px", display: "flex", flexDirection: "column", gap: "10px",
                  }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div>
                      <label style={labelStyle}>Fecha</label>
                      <input
                        type="date" required style={{ ...inputStyle, background: "#FFF" }}
                        value={nuevaMedicion.fecha}
                        onChange={(e) => setNuevaMedicion({ ...nuevaMedicion, fecha: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Peso (kg) *</label>
                      <input
                        type="number" step="0.1" required style={{ ...inputStyle, background: "#FFF" }}
                        value={nuevaMedicion.peso}
                        onChange={(e) => setNuevaMedicion({ ...nuevaMedicion, peso: e.target.value })}
                        placeholder="75.0"
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Estatura (cm) *</label>
                      <input
                        type="number" required style={{ ...inputStyle, background: "#FFF" }}
                        value={nuevaMedicion.estatura}
                        onChange={(e) => setNuevaMedicion({ ...nuevaMedicion, estatura: e.target.value })}
                        placeholder="175"
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Cintura (cm)</label>
                      <input
                        type="number" step="0.1" style={{ ...inputStyle, background: "#FFF" }}
                        value={nuevaMedicion.cintura}
                        onChange={(e) => setNuevaMedicion({ ...nuevaMedicion, cintura: e.target.value })}
                        placeholder="82"
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Cadera (cm)</label>
                      <input
                        type="number" step="0.1" style={{ ...inputStyle, background: "#FFF" }}
                        value={nuevaMedicion.cadera}
                        onChange={(e) => setNuevaMedicion({ ...nuevaMedicion, cadera: e.target.value })}
                        placeholder="98"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={guardandoMedicion}
                    style={{
                      background: "#0B0B0B", color: "#FFF", fontWeight: "700", fontSize: "12px",
                      padding: "10px", borderRadius: "8px", border: "none",
                      cursor: guardandoMedicion ? "default" : "pointer", opacity: guardandoMedicion ? 0.6 : 1,
                    }}
                  >
                    {guardandoMedicion ? "Guardando..." : "Guardar Medición"}
                  </button>
                </form>
              )}

              {cargandoMediciones ? (
                <p style={{ fontSize: "12px", color: "#888" }}>Cargando historial...</p>
              ) : mediciones.length === 0 ? (
                <p style={{ fontSize: "12px", color: "#888" }}>Aún no hay mediciones registradas.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "220px", overflowY: "auto" }}>
                  {mediciones.map((m) => {
                    const clasif = clasificarIMC(m.imc);
                    return (
                      <div key={m.docId} style={{
                        background: "#F5F5F5", borderRadius: "8px", padding: "10px 12px",
                        display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", flexWrap: "wrap", gap: "6px",
                      }}>
                        <span style={{ fontWeight: "700", color: "#0B0B0B" }}>{m.fecha}</span>
                        <span style={{ color: "#555" }}>Peso: <strong style={{ color: "#0B0B0B" }}>{m.peso} kg</strong></span>
                        {m.icc && (
                          <span style={{ color: "#555" }}>ICC: <strong style={{ color: "#0B0B0B" }}>{m.icc}</strong></span>
                        )}
                        <span style={{
                          fontSize: "10px", fontWeight: "700", padding: "3px 8px", borderRadius: "20px",
                          background: clasif.bg, color: clasif.color,
                        }}>
                          IMC {m.imc} · {clasif.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                onClick={() =>
                  handleCambiarEstado(clienteSeleccionado, clienteSeleccionado.estado === "Activo" ? "Inactivo" : "Activo")
                }
                style={{
                  background: "#F5F5F5", color: "#0B0B0B", fontWeight: "700", fontSize: "12px",
                  padding: "10px 16px", borderRadius: "8px", border: "0.5px solid #E5E5E5", cursor: "pointer",
                }}
              >
                {clienteSeleccionado.estado === "Activo" ? "Marcar Inactivo" : "Marcar Activo"}
              </button>
              <button
                onClick={() => setClienteSeleccionado(null)}
                style={{
                  background: "#0B0B0B", color: "#FFF", fontWeight: "700", fontSize: "12px",
                  padding: "10px 18px", borderRadius: "8px", border: "none", cursor: "pointer",
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}