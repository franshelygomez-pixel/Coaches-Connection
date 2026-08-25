import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs, doc, updateDoc, addDoc, deleteDoc } from "firebase/firestore";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

export default function DashboardAdmin({ seccion, setSeccion }) {
  const [pendientes, setPendientes] = useState([]);
  const [activos, setActivos] = useState([]);
  const [inactivos, setInactivos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [coachSeleccionado, setCoachSeleccionado] = useState(null);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [mostrarFormCliente, setMostrarFormCliente] = useState(false);
  const [formCliente, setFormCliente] = useState({ nombre: "", apellido: "", email: "", telefono: "", coachId: "" });
  const [errorForm, setErrorForm] = useState("");

  // ✅ Antes estaban declarados DENTRO de "if (seccion === 'Solicitudes')",
  // lo cual violaba las Reglas de los Hooks. Ahora están aquí arriba,
  // junto con todos los demás hooks, sin ninguna condición.
  const [busquedaSol, setBusquedaSol] = useState("");
  const [seleccionados, setSeleccionados] = useState([]);

  // ✅ Esta variable se usaba en la sección "Entrenadores" pero nunca
  // había sido declarada con useState (hubiera lanzado ReferenceError).
  const [busquedaEnt, setBusquedaEnt] = useState("");

  // --- Historial de mediciones (ficha antropométrica) para el modal de Clientes ---
  const [clienteHistorial, setClienteHistorial] = useState(null);
  const [medicionesHistorial, setMedicionesHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  const cargarCoaches = async () => {
    const snap = await getDocs(query(collection(db, "usuarios"), where("rol", "==", "coach")));
    const coaches = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setPendientes(coaches.filter((c) => c.estado === "pendiente"));
    setActivos(coaches.filter((c) => c.estado === "activo"));
    setInactivos(coaches.filter((c) => c.estado === "inactivo"));
  };

  const cargarClientes = async () => {
    const snap = await getDocs(collection(db, "clientes"));
    setClientes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const cargar = async () => {
    setCargando(true);
    await cargarCoaches();
    await cargarClientes();
    setCargando(false);
  };

  useEffect(() => { cargar(); }, [seccion]);

  const cambiarEstadoCoach = async (coachId, nuevoEstado) => {
    await updateDoc(doc(db, "usuarios", coachId), { estado: nuevoEstado });
    setCoachSeleccionado(null);
    cargarCoaches();
  };

  const guardarCliente = async () => {
  setErrorForm("");

  if (!formCliente.nombre || !formCliente.email) {
    setErrorForm("Nombre y correo son obligatorios");
    return;
  }

  const soloLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
  if (!soloLetras.test(formCliente.nombre)) {
    setErrorForm("El nombre solo puede contener letras");
    return;
  }
  if (formCliente.apellido && !soloLetras.test(formCliente.apellido)) {
    setErrorForm("El apellido solo puede contener letras");
    return;
  }

  const formatoCorreo = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!formatoCorreo.test(formCliente.email)) {
    setErrorForm("El formato del correo no es válido");
    return;
  }

  if (formCliente.telefono && formCliente.telefono.length > 10) {
    setErrorForm("El teléfono no puede tener más de 10 dígitos");
    return;
  }

  // Verificar correo duplicado solo al crear, no al editar
  if (!clienteSeleccionado) {
    const q = query(collection(db, "clientes"), where("email", "==", formCliente.email));
    const snap = await getDocs(q);
    if (!snap.empty) {
      setErrorForm("Este correo ya está registrado para otro cliente");
      return;
    }
  }

  if (clienteSeleccionado) {
    await updateDoc(doc(db, "clientes", clienteSeleccionado.id), { ...formCliente });
  } else {
    await addDoc(collection(db, "clientes"), {
      ...formCliente,
      estado: "activo",
      creadoEn: new Date()
    });
  }

  setMostrarFormCliente(false);
  setClienteSeleccionado(null);
  setFormCliente({ nombre: "", apellido: "", email: "", telefono: "", coachId: "" });
  cargarClientes();
};

  const cambiarEstadoCliente = async (clienteId, nuevoEstado) => {
    await updateDoc(doc(db, "clientes", clienteId), { estado: nuevoEstado });
    cargarClientes();
  };

  // --- Ver historial antropométrico de un cliente (solo lectura) ---
  const abrirHistorial = async (cliente) => {
    setClienteHistorial(cliente);
    setCargandoHistorial(true);
    try {
      const q = query(collection(db, "mediciones"), where("clienteId", "==", cliente.id));
      const snap = await getDocs(q);
      const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      lista.sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
      setMedicionesHistorial(lista);
    } catch (e) {
      console.error("Error cargando historial de mediciones:", e);
      setMedicionesHistorial([]);
    } finally {
      setCargandoHistorial(false);
    }
  };

  const cerrarHistorial = () => {
    setClienteHistorial(null);
    setMedicionesHistorial([]);
  };

  const clasificarIMC = (imc) => {
    if (imc == null) return { label: "--", bg: "#F5F5F5", color: "#888" };
    if (imc < 18.5) return { label: "Bajo peso", bg: "#EAF2FB", color: "#2E5D9A" };
    if (imc < 25) return { label: "Normal", bg: "#E1F5EE", color: "#085041" };
    if (imc < 30) return { label: "Sobrepeso", bg: "#FFF8E1", color: "#B8860B" };
    return { label: "Obesidad", bg: "#FDECEC", color: "#B02A2A" };
  };

  if (cargando) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px" }}>
      <p style={{ color: "#888" }}>Cargando...</p>
    </div>
  );

  const estiloCard = {
    background: "#FFFFFF", border: "0.5px solid #E5E5E5",
    borderRadius: "12px", padding: "20px 24px"
  };

  const estiloBoton = (bg, color) => ({
    padding: "8px 16px", borderRadius: "8px", border: "none",
    cursor: "pointer", fontWeight: "700", fontSize: "13px",
    background: bg, color: color
  });

  const estiloInput = {
    width: "100%", border: "0.5px solid #E5E5E5", borderRadius: "8px",
    padding: "12px", fontSize: "14px", marginBottom: "10px",
    outline: "none", display: "block", background: "#FAFAFA"
  };

  const CardCoach = ({ coach, onClick }) => (
    <div onClick={onClick} style={{
      ...estiloCard, display: "flex", alignItems: "center",
      justifyContent: "space-between", cursor: "pointer",
      marginBottom: "8px", transition: "border-color 0.15s"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{
          width: "40px", height: "40px", borderRadius: "50%", background: "#0B0B0B",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#FFC800", fontWeight: "900", fontSize: "14px", flexShrink: 0
        }}>
          {coach.nombre?.[0]?.toUpperCase()}
        </div>
        <div>
          <p style={{ fontWeight: "700", fontSize: "14px", color: "#0B0B0B", margin: 0 }}>
            {coach.nombre} {coach.apellido}
          </p>
          <p style={{ fontSize: "12px", color: "#888", margin: "2px 0 0" }}>{coach.email}</p>
        </div>
      </div>
      <span style={{ fontSize: "12px", color: "#888" }}>Ver </span>
    </div>
  );

  const PerfilCoach = ({ coach }) => {
    const clientesDelCoach = clientes.filter(c => c.coachId === coach.id && c.estado === "activo");
    return (
      <div>
        <button onClick={() => setCoachSeleccionado(null)} style={{
          background: "none", border: "none", cursor: "pointer",
          color: "#888", fontSize: "13px", marginBottom: "24px"
        }}>Volver</button>

        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
          {/* Info del coach */}
          <div style={{ ...estiloCard, flex: "0 0 300px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
              <div style={{
                width: "56px", height: "56px", borderRadius: "50%", background: "#0B0B0B",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#FFC800", fontWeight: "900", fontSize: "20px"
              }}>
                {coach.nombre?.[0]?.toUpperCase()}
              </div>
              <div>
                <h2 style={{ fontSize: "16px", fontWeight: "900", color: "#0B0B0B", margin: 0 }}>
                  {coach.nombre} {coach.apellido}
                </h2>
                <p style={{ fontSize: "12px", color: "#888", margin: "4px 0 0" }}>{coach.email}</p>
                <span style={{
                  display: "inline-block", marginTop: "6px", fontSize: "11px", fontWeight: "700",
                  padding: "3px 10px", borderRadius: "20px",
                  background: coach.estado === "activo" ? "#E1F5EE" : "#F5F5F5",
                  color: coach.estado === "activo" ? "#085041" : "#555"
                }}>
                  {coach.estado?.toUpperCase()}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              {coach.estado === "activo" && (
                <button onClick={() => cambiarEstadoCoach(coach.id, "inactivo")}
                  style={estiloBoton("#F5F5F5", "#555")}>
                  Desactivar
                </button>
              )}
              {coach.estado === "inactivo" && (
                <button onClick={() => cambiarEstadoCoach(coach.id, "activo")}
                  style={estiloBoton("#FFC800", "#0B0B0B")}>
                  Activar
                </button>
              )}
            </div>
          </div>

          {/* Clientes del coach */}
          <div style={{ flex: 1, minWidth: "280px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "900", color: "#0B0B0B", marginBottom: "16px" }}>
              Clientes asignados ({clientesDelCoach.length})
            </h3>
            {clientesDelCoach.length === 0 ? (
              <div style={{ ...estiloCard, textAlign: "center", padding: "40px" }}>
                <p style={{ color: "#888" }}>No tiene clientes asignados</p>
              </div>
            ) : (
              clientesDelCoach.map(c => (
                <div key={c.id} style={{ ...estiloCard, marginBottom: "8px" }}>
                  <p style={{ fontWeight: "700", fontSize: "14px", color: "#0B0B0B", margin: 0 }}>
                    {c.nombre} {c.apellido}
                  </p>
                  <p style={{ fontSize: "12px", color: "#888", margin: "4px 0 0" }}>{c.email}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  const FormCliente = () => (
  <div style={{ ...estiloCard, maxWidth: "480px", marginBottom: "24px" }}>
    <h3 style={{ fontSize: "16px", fontWeight: "900", color: "#0B0B0B", marginBottom: "20px" }}>
      {clienteSeleccionado ? "Editar cliente" : "Nuevo cliente"}
    </h3>
    <div style={{ display: "flex", gap: "10px" }}>
      <input
        placeholder="Nombre *"
        value={formCliente.nombre}
        onChange={e => {
          const val = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "");
          setFormCliente({ ...formCliente, nombre: val });
        }}
        style={estiloInput}
      />
      <input
        placeholder="Apellido"
        value={formCliente.apellido}
        onChange={e => {
          const val = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "");
          setFormCliente({ ...formCliente, apellido: val });
        }}
        style={estiloInput}
      />
    </div>
    <input
      placeholder="Correo"
      type="email"
      value={formCliente.email}
      onChange={e => setFormCliente({ ...formCliente, email: e.target.value })}
      style={estiloInput}
    />
    <input
      placeholder="Teléfono"
      value={formCliente.telefono}
      onChange={e => {
        const val = e.target.value.replace(/\D/g, "");
        setFormCliente({ ...formCliente, telefono: val });
      }}
      maxLength={15}
      style={estiloInput}
    />
    <select
      value={formCliente.coachId}
      onChange={e => setFormCliente({ ...formCliente, coachId: e.target.value })}
      style={{ ...estiloInput, color: formCliente.coachId ? "#0B0B0B" : "#888" }}
    >
      <option value="">Asignar a un entrenador (opcional)</option>
      {activos.map(c => (
        <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>
      ))}
    </select>
    {errorForm && (
  <div style={{
    background: "#FFF0F0", border: "0.5px solid #FFCCCC",
    borderRadius: "8px", padding: "12px 16px", marginBottom: "12px",
    display: "flex", alignItems: "flex-start", gap: "8px"
  }}>
    <span style={{ color: "#CC0000", fontWeight: "900", flexShrink: 0 }}>!</span>
    <p style={{ color: "#CC0000", fontSize: "13px", margin: 0, lineHeight: 1.5 }}>{errorForm}</p>
  </div>
)}
    <div style={{ display: "flex", gap: "10px" }}>
      <button onClick={guardarCliente} style={estiloBoton("#FFC800", "#0B0B0B")}>
        {clienteSeleccionado ? "Guardar cambios" : "Crear cliente"}
      </button>
      <button onClick={() => {
        setMostrarFormCliente(false);
        setClienteSeleccionado(null);
        setFormCliente({ nombre: "", apellido: "", email: "", telefono: "", coachId: "" });
      }} style={estiloBoton("#F5F5F5", "#555")}>
        Cancelar
      </button>
    </div>
  </div>
);

  // --- Modal de solo lectura: historial de mediciones (ficha antropométrica) ---
  const ModalHistorial = () => {
    if (!clienteHistorial) return null;
    return (
      <div style={{
        position: "fixed", inset: 0, background: "rgba(11,11,11,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", zIndex: 50,
      }}>
        <div style={{ ...estiloCard, maxWidth: "520px", width: "100%", maxHeight: "85vh", overflowY: "auto" }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "flex-start",
            borderBottom: "0.5px solid #E5E5E5", paddingBottom: "16px", marginBottom: "16px",
          }}>
            <div>
              <h3 style={{ fontSize: "18px", fontWeight: "900", color: "#0B0B0B", margin: 0 }}>
                {clienteHistorial.nombre} {clienteHistorial.apellido}
              </h3>
              <p style={{ fontSize: "12px", color: "#888", margin: "2px 0 0" }}>
                Historial de mediciones antropométricas
              </p>
            </div>
            <button
              onClick={cerrarHistorial}
              style={{ background: "none", border: "none", color: "#888", fontSize: "18px", cursor: "pointer" }}
            >
              ✕
            </button>
          </div>

          {cargandoHistorial ? (
            <p style={{ fontSize: "13px", color: "#888" }}>Cargando historial...</p>
          ) : medicionesHistorial.length === 0 ? (
            <div style={{ background: "#F5F5F5", borderRadius: "10px", padding: "24px", textAlign: "center" }}>
              <p style={{ color: "#888", fontSize: "13px", margin: 0 }}>
                Este cliente aún no tiene mediciones registradas por su entrenador.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {medicionesHistorial.map((m) => {
                const clasif = clasificarIMC(m.imc);
                return (
                  <div key={m.id} style={{ background: "#F5F5F5", borderRadius: "10px", padding: "14px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontWeight: "900", fontSize: "13px", color: "#0B0B0B" }}>{m.fecha}</span>
                      <span style={{
                        fontSize: "10px", fontWeight: "700", padding: "3px 10px", borderRadius: "20px",
                        background: clasif.bg, color: clasif.color,
                      }}>
                        IMC {m.imc ?? "--"} · {clasif.label}
                      </span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", fontSize: "12px", color: "#555" }}>
                      <div>
                        <p style={{ margin: "0 0 2px", color: "#888", fontSize: "10px", textTransform: "uppercase" }}>Peso</p>
                        <p style={{ margin: 0, fontWeight: "700", color: "#0B0B0B" }}>{m.peso} kg</p>
                      </div>
                      <div>
                        <p style={{ margin: "0 0 2px", color: "#888", fontSize: "10px", textTransform: "uppercase" }}>Estatura</p>
                        <p style={{ margin: 0, fontWeight: "700", color: "#0B0B0B" }}>{m.estatura} cm</p>
                      </div>
                      <div>
                        <p style={{ margin: "0 0 2px", color: "#888", fontSize: "10px", textTransform: "uppercase" }}>Cintura</p>
                        <p style={{ margin: 0, fontWeight: "700", color: "#0B0B0B" }}>{m.cintura ? `${m.cintura} cm` : "--"}</p>
                      </div>
                      <div>
                        <p style={{ margin: "0 0 2px", color: "#888", fontSize: "10px", textTransform: "uppercase" }}>Cadera</p>
                        <p style={{ margin: 0, fontWeight: "700", color: "#0B0B0B" }}>{m.cadera ? `${m.cadera} cm` : "--"}</p>
                      </div>
                    </div>
                    {m.icc && (
                      <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#555" }}>
                        Índice Cintura-Cadera: <strong style={{ color: "#0B0B0B" }}>{m.icc}</strong>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
            <button onClick={cerrarHistorial} style={estiloBoton("#0B0B0B", "#FFF")}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ===== INICIO =====
  if (seccion === "Inicio") {
  const ultimosCoaches = [...pendientes, ...activos, ...inactivos]
    .sort((a, b) => b.creadoEn?.toDate?.() - a.creadoEn?.toDate?.())
    .slice(0, 5);

  const ultimosClientes = [...clientes]
    .sort((a, b) => b.creadoEn?.toDate?.() - a.creadoEn?.toDate?.())
    .slice(0, 5);

  const topCoaches = activos
    .map(c => ({
      ...c,
      totalClientes: clientes.filter(cl => cl.coachId === c.id && cl.estado === "activo").length
    }))
    .sort((a, b) => b.totalClientes - a.totalClientes)
    .slice(0, 3);

  const hoy = new Date();
  const hora = hoy.getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 18 ? "Buenas tardes" : "Buenas noches";

  return (
    <div>
      {/* Saludo */}
      <div style={{ marginBottom: "28px" }}>
        <p style={{ fontSize: "13px", color: "#888", margin: "0 0 4px" }}>
          {hoy.toLocaleDateString("es-DO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
        <h2 style={{ fontSize: "26px", fontWeight: "900", color: "#0B0B0B", margin: 0 }}>
          {saludo}, Administrador
        </h2>
      </div>

      {/* Cards resumen */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        {[
          { label: "Solicitudes pendientes", valor: pendientes.length, color: "#FFC800", ir: "Solicitudes" },
          { label: "Entrenadores activos", valor: activos.length, color: "#1D9E75", ir: "Entrenadores" },
          { label: "Clientes totales", valor: clientes.filter(c => c.estado === "activo").length, color: "#378ADD", ir: "Clientes" },
          { label: "Sin entrenador", valor: clientes.filter(c => c.estado === "activo" && !c.coachId).length, color: "#E24B4A", ir: "Clientes" },
        ].map(card => (
          <div key={card.label} onClick={() => setSeccion(card.ir)} style={{
            background: "#FFFFFF", border: "0.5px solid #E5E5E5", borderRadius: "12px",
            padding: "20px 24px", cursor: "pointer", transition: "border-color 0.15s"
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = card.color}
            onMouseLeave={e => e.currentTarget.style.borderColor = "#E5E5E5"}
          >
            <p style={{ fontSize: "12px", color: "#888", marginBottom: "8px" }}>{card.label}</p>
            <p style={{ fontSize: "36px", fontWeight: "900", color: card.color, margin: "0 0 6px" }}>{card.valor}</p>
            <p style={{ fontSize: "12px", color: card.color, margin: 0, fontWeight: "700" }}>Ver detalle</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>

        {/* Últimos coaches */}
        <div style={{ background: "#FFFFFF", border: "0.5px solid #E5E5E5", borderRadius: "12px", padding: "24px" }}>
          <h3 style={{ fontSize: "15px", fontWeight: "900", color: "#0B0B0B", marginBottom: "16px" }}>
            Últimos entrenadores registrados
          </h3>
          {ultimosCoaches.length === 0 ? (
            <p style={{ color: "#888", fontSize: "13px" }}>No hay entrenadores aún</p>
          ) : ultimosCoaches.map(c => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "32px", height: "32px", borderRadius: "50%", background: "#0B0B0B",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#FFC800", fontWeight: "900", fontSize: "12px", flexShrink: 0
                }}>
                  {c.nombre?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: "700", color: "#0B0B0B", margin: 0 }}>{c.nombre} {c.apellido}</p>
                  <p style={{ fontSize: "11px", color: "#888", margin: 0 }}>{c.creadoEn?.toDate?.().toLocaleDateString("es-DO") || "N/A"}</p>
                </div>
              </div>
              <span style={{
                fontSize: "11px", fontWeight: "700", padding: "3px 10px", borderRadius: "20px",
                background: c.estado === "activo" ? "#E1F5EE" : c.estado === "pendiente" ? "#FFF8E1" : "#F5F5F5",
                color: c.estado === "activo" ? "#085041" : c.estado === "pendiente" ? "#B8860B" : "#555"
              }}>
                {c.estado?.toUpperCase()}
              </span>
            </div>
          ))}
        </div>

        {/* Últimos clientes */}
        <div style={{ background: "#FFFFFF", border: "0.5px solid #E5E5E5", borderRadius: "12px", padding: "24px" }}>
          <h3 style={{ fontSize: "15px", fontWeight: "900", color: "#0B0B0B", marginBottom: "16px" }}>
            Últimos clientes agregados
          </h3>
          {ultimosClientes.length === 0 ? (
            <p style={{ color: "#888", fontSize: "13px" }}>No hay clientes aún</p>
          ) : ultimosClientes.map(c => {
            const coach = activos.find(a => a.id === c.coachId);
            return (
              <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{
                    width: "32px", height: "32px", borderRadius: "50%", background: "#F5F5F5",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#0B0B0B", fontWeight: "900", fontSize: "12px", flexShrink: 0
                  }}>
                    {c.nombre?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontSize: "13px", fontWeight: "700", color: "#0B0B0B", margin: 0 }}>{c.nombre} {c.apellido}</p>
                    <p style={{ fontSize: "11px", color: "#888", margin: 0 }}>{coach ? `Coach: ${coach.nombre}` : "Sin coach"}</p>
                  </div>
                </div>
                <span style={{
                  fontSize: "11px", fontWeight: "700", padding: "3px 10px", borderRadius: "20px",
                  background: c.estado === "activo" ? "#E1F5EE" : "#F5F5F5",
                  color: c.estado === "activo" ? "#085041" : "#555"
                }}>
                  {c.estado?.toUpperCase()}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top 3 coaches */}
      <div style={{ background: "#FFFFFF", border: "0.5px solid #E5E5E5", borderRadius: "12px", padding: "24px" }}>
        <h3 style={{ fontSize: "15px", fontWeight: "900", color: "#0B0B0B", marginBottom: "16px" }}>
          Entrenadores con más clientes
        </h3>
        {topCoaches.length === 0 ? (
          <p style={{ color: "#888", fontSize: "13px" }}>No hay entrenadores activos</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            {topCoaches.map((c, i) => (
              <div key={c.id} style={{ background: i === 0 ? "#0B0B0B" : "#F5F5F5", borderRadius: "12px", padding: "20px" }}>
                <p style={{ fontSize: "11px", fontWeight: "700", color: i === 0 ? "#FFC800" : "#888", marginBottom: "8px" }}>
                  #{i + 1} ENTRENADOR
                </p>
                <p style={{ fontSize: "16px", fontWeight: "900", color: i === 0 ? "#FFFFFF" : "#0B0B0B", margin: "0 0 4px" }}>
                  {c.nombre} {c.apellido}
                </p>
                <p style={{ fontSize: "28px", fontWeight: "900", color: "#FFC800", margin: 0 }}>{c.totalClientes}</p>
                <p style={{ fontSize: "12px", color: i === 0 ? "#888" : "#555", margin: "4px 0 0" }}>clientes asignados</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

  // ===== SOLICITUDES =====
  if (seccion === "Solicitudes") {
  const pendientesFiltrados = pendientes.filter(c =>
    `${c.nombre} ${c.apellido} ${c.email}`.toLowerCase().includes(busquedaSol.toLowerCase())
  );

  const toggleSeleccion = (id) => {
    setSeleccionados(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const aprobarMasivo = async () => {
    await Promise.all(seleccionados.map(id => updateDoc(doc(db, "usuarios", id), { estado: "activo" })));
    setSeleccionados([]);
    cargarCoaches();
  };

  const rechazarMasivo = async () => {
    await Promise.all(seleccionados.map(id => updateDoc(doc(db, "usuarios", id), { estado: "rechazado" })));
    setSeleccionados([]);
    cargarCoaches();
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <h3 style={{ fontSize: "20px", fontWeight: "900", color: "#0B0B0B", margin: 0 }}>
          Solicitudes pendientes ({pendientes.length})
        </h3>
        {seleccionados.length > 0 && (
          <div style={{ display: "flex", gap: "8px" }}>
            <span style={{ fontSize: "13px", color: "#888", alignSelf: "center" }}>{seleccionados.length} seleccionados</span>
            <button onClick={aprobarMasivo} style={estiloBoton("#FFC800", "#0B0B0B")}>Aprobar todos</button>
            <button onClick={rechazarMasivo} style={estiloBoton("#FFF0F0", "#CC0000")}>Rechazar todos</button>
          </div>
        )}
      </div>

      {/* Buscador */}
      <input
        placeholder="Buscar por nombre o correo..."
        value={busquedaSol}
        onChange={e => setBusquedaSol(e.target.value)}
        style={{ ...estiloInput, marginBottom: "16px" }}
      />

      {pendientes.length === 0 ? (
        <div style={{ ...estiloCard, textAlign: "center", padding: "60px" }}>
          <p style={{ color: "#888" }}>No hay solicitudes pendientes</p>
        </div>
      ) : coachSeleccionado ? (
        <div style={{ maxWidth: "480px" }}>
          <button onClick={() => setCoachSeleccionado(null)} style={{
            background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: "13px", marginBottom: "24px"
          }}>← Volver</button>
          <div style={estiloCard}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
              <div style={{
                width: "56px", height: "56px", borderRadius: "50%", background: "#0B0B0B",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#FFC800", fontWeight: "900", fontSize: "20px"
              }}>
                {coachSeleccionado.nombre?.[0]?.toUpperCase()}
              </div>
              <div>
                <h2 style={{ fontSize: "16px", fontWeight: "900", color: "#0B0B0B", margin: 0 }}>
                  {coachSeleccionado.nombre} {coachSeleccionado.apellido}
                </h2>
                <p style={{ fontSize: "12px", color: "#888", margin: "4px 0 0" }}>{coachSeleccionado.email}</p>
                <p style={{ fontSize: "12px", color: "#888", margin: "4px 0 0" }}>
                  Registrado: {coachSeleccionado.creadoEn?.toDate?.().toLocaleDateString("es-DO") || "N/A"}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => cambiarEstadoCoach(coachSeleccionado.id, "activo")} style={estiloBoton("#FFC800", "#0B0B0B")}>Aprobar</button>
              <button onClick={() => cambiarEstadoCoach(coachSeleccionado.id, "rechazado")} style={estiloBoton("#F5F5F5", "#CC0000")}>Rechazar</button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          {/* Seleccionar todos */}
          {pendientesFiltrados.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <input type="checkbox"
                checked={seleccionados.length === pendientesFiltrados.length && pendientesFiltrados.length > 0}
                onChange={e => setSeleccionados(e.target.checked ? pendientesFiltrados.map(c => c.id) : [])}
                style={{ width: "16px", height: "16px", cursor: "pointer" }}
              />
              <span style={{ fontSize: "13px", color: "#888" }}>Seleccionar todos</span>
            </div>
          )}
          {pendientesFiltrados.map(c => (
            <div key={c.id} style={{ ...estiloCard, display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <input type="checkbox"
                checked={seleccionados.includes(c.id)}
                onChange={() => toggleSeleccion(c.id)}
                style={{ width: "16px", height: "16px", cursor: "pointer", flexShrink: 0 }}
              />
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
                onClick={() => setCoachSeleccionado(c)}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{
                    width: "40px", height: "40px", borderRadius: "50%", background: "#0B0B0B",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#FFC800", fontWeight: "900", fontSize: "14px", flexShrink: 0
                  }}>
                    {c.nombre?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontWeight: "700", fontSize: "14px", color: "#0B0B0B", margin: 0 }}>{c.nombre} {c.apellido}</p>
                    <p style={{ fontSize: "12px", color: "#888", margin: "2px 0 0" }}>{c.email}</p>
                  </div>
                </div>
                <span style={{ fontSize: "12px", color: "#888" }}>Ver perfil →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

  // ===== ENTRENADORES =====
  if (seccion === "Entrenadores") {
  const activosFiltrados = activos.filter(c =>
    `${c.nombre} ${c.apellido} ${c.email}`.toLowerCase().includes(busquedaEnt.toLowerCase())
  );
  const inactivosFiltrados = inactivos.filter(c =>
    `${c.nombre} ${c.apellido} ${c.email}`.toLowerCase().includes(busquedaEnt.toLowerCase())
  );

  return (
    <div>
      {coachSeleccionado ? (
        <PerfilCoach coach={coachSeleccionado} />
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <h3 style={{ fontSize: "20px", fontWeight: "900", color: "#0B0B0B", margin: 0 }}>
              Entrenadores ({activos.length} activos)
            </h3>
          </div>

          <input
            placeholder="Buscar entrenador por nombre o correo..."
            value={busquedaEnt}
            onChange={e => setBusquedaEnt(e.target.value)}
            style={{ ...estiloInput, marginBottom: "20px" }}
          />

          {activosFiltrados.length === 0 && inactivosFiltrados.length === 0 ? (
            <div style={{ ...estiloCard, textAlign: "center", padding: "40px" }}>
              <p style={{ color: "#888" }}>No hay entrenadores con ese nombre</p>
            </div>
          ) : (
            <>
              {activosFiltrados.length > 0 && (
                <div style={{ marginBottom: "32px" }}>
                  <p style={{ fontSize: "12px", fontWeight: "700", color: "#888", letterSpacing: "1px", marginBottom: "12px" }}>ACTIVOS</p>
                  {activosFiltrados.map(c => <CardCoach key={c.id} coach={c} onClick={() => setCoachSeleccionado(c)} />)}
                </div>
              )}
              {inactivosFiltrados.length > 0 && (
                <div>
                  <p style={{ fontSize: "12px", fontWeight: "700", color: "#888", letterSpacing: "1px", marginBottom: "12px" }}>INACTIVOS</p>
                  {inactivosFiltrados.map(c => <CardCoach key={c.id} coach={c} onClick={() => setCoachSeleccionado(c)} />)}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

  // ===== CLIENTES =====
  if (seccion === "Clientes") return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <h3 style={{ fontSize: "20px", fontWeight: "900", color: "#0B0B0B", margin: 0 }}>
          Clientes ({clientes.filter(c => c.estado === "activo").length} activos)
        </h3>
        <button onClick={() => {
          setMostrarFormCliente(true);
          setClienteSeleccionado(null);
          setFormCliente({ nombre: "", apellido: "", email: "", telefono: "", coachId: "" });
        }} style={estiloBoton("#FFC800", "#0B0B0B")}>
          Nuevo cliente
        </button>
      </div>

      {mostrarFormCliente && (
  <div style={{ ...estiloCard, maxWidth: "480px", marginBottom: "24px" }}>
    <h3 style={{ fontSize: "16px", fontWeight: "900", color: "#0B0B0B", marginBottom: "20px" }}>
      {clienteSeleccionado ? "Editar cliente" : "Nuevo cliente"}
    </h3>
    <div style={{ display: "flex", gap: "10px" }}>
      <input
        placeholder="Nombre"
        value={formCliente.nombre}
        onChange={e => {
          const val = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "");
          setFormCliente(f => ({ ...f, nombre: val }));
        }}
        style={estiloInput}
      />
      <input
        placeholder="Apellido"
        value={formCliente.apellido}
        onChange={e => {
          const val = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "");
          setFormCliente(f => ({ ...f, apellido: val }));
        }}
        style={estiloInput}
      />
    </div>
    <input
      placeholder="Correo"
      type="email"
      value={formCliente.email}
      onChange={e => setFormCliente(f => ({ ...f, email: e.target.value }))}
      style={estiloInput}
    />
    <input
      placeholder="Teléfono"
      value={formCliente.telefono}
      onChange={e => {
        const val = e.target.value.replace(/\D/g, "");
        setFormCliente(f => ({ ...f, telefono: val }));
      }}
      minLength={10}

      style={estiloInput}
    />
    <select
      value={formCliente.coachId}
      onChange={e => setFormCliente(f => ({ ...f, coachId: e.target.value }))}
      style={{ ...estiloInput, color: formCliente.coachId ? "#0B0B0B" : "#888" }}
    >
      <option value="">Asignar a un entrenador (opcional)</option>
      {activos.map(c => (
        <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>
      ))}
    </select>
    {errorForm && <p style={{ color: "#FF4444", fontSize: "13px", marginBottom: "10px" }}>{errorForm}</p>}
    <div style={{ display: "flex", gap: "10px" }}>
      <button onClick={guardarCliente} style={estiloBoton("#FFC800", "#0B0B0B")}>
        {clienteSeleccionado ? "Guardar cambios" : "Crear cliente"}
      </button>
      <button onClick={() => {
        setMostrarFormCliente(false);
        setClienteSeleccionado(null);
        setFormCliente({ nombre: "", apellido: "", email: "", telefono: "", coachId: "" });
      }} style={estiloBoton("#F5F5F5", "#555")}>
        Cancelar
      </button>
    </div>
  </div>
)}

      {clientes.length === 0 ? (
        <div style={{ ...estiloCard, textAlign: "center", padding: "60px" }}>
          <p style={{ color: "#888" }}>No hay clientes registrados</p>
        </div>
      ) : (
        <div>
          {clientes.map(c => {
            const coachAsignado = activos.find(a => a.id === c.coachId);
            return (
              <div key={c.id} style={{
                ...estiloCard, display: "flex", alignItems: "center",
                justifyContent: "space-between", marginBottom: "8px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{
                    width: "40px", height: "40px", borderRadius: "50%", background: "#F5F5F5",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#0B0B0B", fontWeight: "900", fontSize: "14px", flexShrink: 0
                  }}>
                    {c.nombre?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontWeight: "700", fontSize: "14px", color: "#0B0B0B", margin: 0 }}>
                      {c.nombre} {c.apellido}
                    </p>
                    <p style={{ fontSize: "12px", color: "#888", margin: "2px 0 0" }}>
                      {c.email} {coachAsignado ? `· Coach: ${coachAsignado.nombre}` : "· Sin coach asignado"}
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span style={{
                    fontSize: "11px", fontWeight: "700", padding: "3px 10px",
                    borderRadius: "20px",
                    background: c.estado === "activo" ? "#E1F5EE" : "#F5F5F5",
                    color: c.estado === "activo" ? "#085041" : "#555"
                  }}>
                    {c.estado?.toUpperCase()}
                  </span>
                  <button onClick={() => abrirHistorial(c)} style={estiloBoton("#F5F5F5", "#378ADD")}>
                    Ver Historial
                  </button>
                  <button onClick={() => {
                    setClienteSeleccionado(c);
                    setFormCliente({ nombre: c.nombre, apellido: c.apellido, email: c.email, telefono: c.telefono || "", coachId: c.coachId || "" });
                    setMostrarFormCliente(true);
                  }} style={estiloBoton("#F5F5F5", "#0B0B0B")}>
                    Editar
                  </button>
                  <button onClick={() => cambiarEstadoCliente(c.id, c.estado === "activo" ? "inactivo" : "activo")}
                    style={estiloBoton(c.estado === "activo" ? "#FFF0F0" : "#E1F5EE", c.estado === "activo" ? "#CC0000" : "#085041")}>
                    {c.estado === "activo" ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ModalHistorial />
    </div>
  );

  // ===== REPORTES =====
if (seccion === "Reportes") {
  const datosGrafica = activos.map(coach => ({
    nombre: `${coach.nombre} ${coach.apellido}`.split(" ").slice(0, 2).join(" "),
    clientes: clientes.filter(c => c.coachId === coach.id && c.estado === "activo").length,
  }));

  const totalClientes = clientes.filter(c => c.estado === "activo").length;
  const totalInactivos = clientes.filter(c => c.estado === "inactivo").length;
  const sinCoach = clientes.filter(c => c.estado === "activo" && !c.coachId).length;

  return (
    <div>
      <h3 style={{ fontSize: "20px", fontWeight: "900", color: "#0B0B0B", marginBottom: "20px" }}>Reportes</h3>

      {/* Cards resumen */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        {[
          { label: "Clientes activos", valor: totalClientes, color: "#1D9E75" },
          { label: "Clientes inactivos", valor: totalInactivos, color: "#888" },
          { label: "Sin entrenador asignado", valor: sinCoach, color: "#FFC800" },
          { label: "Entrenadores activos", valor: activos.length, color: "#378ADD" },
        ].map(card => (
          <div key={card.label} style={{ background: "#FFFFFF", border: "0.5px solid #E5E5E5", borderRadius: "12px", padding: "20px 24px" }}>
            <p style={{ fontSize: "12px", color: "#888", marginBottom: "8px" }}>{card.label}</p>
            <p style={{ fontSize: "32px", fontWeight: "900", color: card.color, margin: 0 }}>{card.valor}</p>
          </div>
        ))}
      </div>

      {/* Gráfica de clientes por coach */}
      <div style={{ background: "#FFFFFF", border: "0.5px solid #E5E5E5", borderRadius: "12px", padding: "24px", marginBottom: "24px" }}>
        <h4 style={{ fontSize: "16px", fontWeight: "900", color: "#0B0B0B", marginBottom: "20px" }}>
          Clientes por entrenador
        </h4>
        {activos.length === 0 ? (
          <p style={{ color: "#888", textAlign: "center", padding: "40px 0" }}>No hay entrenadores activos</p>
        ) : (
          <BarChart width={600} height={280} data={datosGrafica} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
            <XAxis dataKey="nombre" tick={{ fontSize: 12, fill: "#888" }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#888" }} />
            <Tooltip
              contentStyle={{ borderRadius: "8px", border: "0.5px solid #E5E5E5", fontSize: "13px" }}
              formatter={(value) => [value, "Clientes"]}
            />
            <Bar dataKey="clientes" fill="#FFC800" radius={[6, 6, 0, 0]} />
          </BarChart>
        )}
      </div>

      {/* Tabla clientes por coach */}
      <div style={{ background: "#FFFFFF", border: "0.5px solid #E5E5E5", borderRadius: "12px", padding: "24px" }}>
        <h4 style={{ fontSize: "16px", fontWeight: "900", color: "#0B0B0B", marginBottom: "20px" }}>
          Detalle por entrenador
        </h4>
        {activos.map(coach => {
          const clientesCoach = clientes.filter(c => c.coachId === coach.id && c.estado === "activo");
          return (
            <div key={coach.id} style={{ marginBottom: "16px", paddingBottom: "16px", borderBottom: "0.5px solid #F0F0F0" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{
                    width: "32px", height: "32px", borderRadius: "50%", background: "#0B0B0B",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#FFC800", fontWeight: "900", fontSize: "12px"
                  }}>
                    {coach.nombre?.[0]?.toUpperCase()}
                  </div>
                  <p style={{ fontWeight: "700", fontSize: "14px", color: "#0B0B0B", margin: 0 }}>
                    {coach.nombre} {coach.apellido}
                  </p>
                </div>
                <span style={{
                  fontSize: "13px", fontWeight: "900", color: "#FFC800",
                  background: "#FFF8E1", padding: "4px 12px", borderRadius: "20px"
                }}>
                  {clientesCoach.length} clientes
                </span>
              </div>
              {/* Barra de progreso */}
              <div style={{ height: "6px", background: "#F5F5F5", borderRadius: "99px", overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: "99px", background: "#FFC800",
                  width: totalClientes > 0 ? `${(clientesCoach.length / totalClientes) * 100}%` : "0%",
                  transition: "width 0.5s"
                }} />
              </div>
            </div>
          );
        })}
        {activos.length === 0 && (
          <p style={{ color: "#888", textAlign: "center", padding: "40px 0" }}>No hay entrenadores activos</p>
        )}
      </div>
    </div>
  );
}

  return null;
}