import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs, doc, updateDoc, addDoc, deleteDoc } from "firebase/firestore";

export default function DashboardAdmin({ seccion }) {
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

  // Solo letras en nombre y apellido
  const soloLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
  if (!soloLetras.test(formCliente.nombre)) {
    setErrorForm("El nombre solo puede contener letras");
    return;
  }
  if (formCliente.apellido && !soloLetras.test(formCliente.apellido)) {
    setErrorForm("El apellido solo puede contener letras");
    return;
  }

  // Validar formato de correo Gmail
  const esGmail = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
  if (!esGmail.test(formCliente.email)) {
    setErrorForm("El correo debe ser una dirección Gmail válida (@gmail.com)");
    return;
  }

  // Validar teléfono solo números
  if (formCliente.telefono && !/^\d+$/.test(formCliente.telefono)) {
    setErrorForm("El teléfono solo puede contener números");
    return;
  }

  if (clienteSeleccionado) {
    await updateDoc(doc(db, "clientes", clienteSeleccionado.id), { ...formCliente });
  } else {
    await addDoc(collection(db, "clientes"), { ...formCliente, estado: "activo", creadoEn: new Date() });
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
      <span style={{ fontSize: "12px", color: "#888" }}>Ver →</span>
    </div>
  );

  const PerfilCoach = ({ coach }) => {
    const clientesDelCoach = clientes.filter(c => c.coachId === coach.id && c.estado === "activo");
    return (
      <div>
        <button onClick={() => setCoachSeleccionado(null)} style={{
          background: "none", border: "none", cursor: "pointer",
          color: "#888", fontSize: "13px", marginBottom: "24px"
        }}>← Volver</button>

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
);

  // ===== INICIO =====
  if (seccion === "Inicio") return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        {[
          { label: "Solicitudes pendientes", valor: pendientes.length, color: "#FFC800" },
          { label: "Entrenadores activos", valor: activos.length, color: "#1D9E75" },
          { label: "Entrenadores inactivos", valor: inactivos.length, color: "#888" },
          { label: "Clientes totales", valor: clientes.filter(c => c.estado === "activo").length, color: "#378ADD" },
        ].map(card => (
          <div key={card.label} style={estiloCard}>
            <p style={{ fontSize: "12px", color: "#888", marginBottom: "8px" }}>{card.label}</p>
            <p style={{ fontSize: "36px", fontWeight: "900", color: card.color, margin: 0 }}>{card.valor}</p>
          </div>
        ))}
      </div>
      {pendientes.length > 0 && (
        <div>
          <h3 style={{ fontSize: "16px", fontWeight: "900", color: "#0B0B0B", marginBottom: "16px" }}>
            Solicitudes recientes
          </h3>
          {pendientes.slice(0, 3).map(c => (
            <CardCoach key={c.id} coach={c} onClick={() => {
              setCoachSeleccionado(c);
            }} />
          ))}
        </div>
      )}
    </div>
  );

  // ===== SOLICITUDES =====
  if (seccion === "Solicitudes") return (
    <div>
      <h3 style={{ fontSize: "20px", fontWeight: "900", color: "#0B0B0B", marginBottom: "20px" }}>
        Solicitudes pendientes ({pendientes.length})
      </h3>
      {pendientes.length === 0 ? (
        <div style={{ ...estiloCard, textAlign: "center", padding: "60px" }}>
          <p style={{ color: "#888" }}>No hay solicitudes pendientes</p>
        </div>
      ) : (
        <div>
          {coachSeleccionado ? (
            <div style={{ maxWidth: "480px" }}>
              <button onClick={() => setCoachSeleccionado(null)} style={{
                background: "none", border: "none", cursor: "pointer",
                color: "#888", fontSize: "13px", marginBottom: "24px"
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
                  <button onClick={() => cambiarEstadoCoach(coachSeleccionado.id, "activo")}
                    style={estiloBoton("#FFC800", "#0B0B0B")}>
                    Aprobar
                  </button>
                  <button onClick={() => cambiarEstadoCoach(coachSeleccionado.id, "rechazado")}
                    style={estiloBoton("#F5F5F5", "#CC0000")}>
                    Rechazar
                  </button>
                </div>
              </div>
            </div>
          ) : (
            pendientes.map(c => (
              <CardCoach key={c.id} coach={c} onClick={() => setCoachSeleccionado(c)} />
            ))
          )}
        </div>
      )}
    </div>
  );

  // ===== ENTRENADORES =====
  if (seccion === "Entrenadores") return (
    <div>
      {coachSeleccionado ? (
        <PerfilCoach coach={coachSeleccionado} />
      ) : (
        <>
          <h3 style={{ fontSize: "20px", fontWeight: "900", color: "#0B0B0B", marginBottom: "20px" }}>
            Entrenadores activos ({activos.length})
          </h3>
          {activos.length === 0 ? (
            <div style={{ ...estiloCard, textAlign: "center", padding: "40px", marginBottom: "24px" }}>
              <p style={{ color: "#888" }}>No hay entrenadores activos</p>
            </div>
          ) : (
            <div style={{ marginBottom: "32px" }}>
              {activos.map(c => (
                <CardCoach key={c.id} coach={c} onClick={() => setCoachSeleccionado(c)} />
              ))}
            </div>
          )}
          {inactivos.length > 0 && (
            <>
              <h3 style={{ fontSize: "20px", fontWeight: "900", color: "#0B0B0B", marginBottom: "20px" }}>
                Entrenadores inactivos ({inactivos.length})
              </h3>
              {inactivos.map(c => (
                <CardCoach key={c.id} coach={c} onClick={() => setCoachSeleccionado(c)} />
              ))}
            </>
          )}
        </>
      )}
    </div>
  );

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
          + Nuevo cliente
        </button>
      </div>

      {mostrarFormCliente && (
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
      placeholder="Correo Gmail *"
      type="email"
      value={formCliente.email}
      onChange={e => setFormCliente(f => ({ ...f, email: e.target.value }))}
      style={estiloInput}
    />
    <input
      placeholder="Teléfono (solo números)"
      value={formCliente.telefono}
      onChange={e => {
        const val = e.target.value.replace(/\D/g, "");
        setFormCliente(f => ({ ...f, telefono: val }));
      }}
      maxLength={15}
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
    </div>
  );

  // ===== REPORTES =====
  if (seccion === "Reportes") return (
    <div>
      <h3 style={{ fontSize: "20px", fontWeight: "900", color: "#0B0B0B", marginBottom: "20px" }}>Reportes</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
        {activos.map(coach => {
          const clientesCoach = clientes.filter(c => c.coachId === coach.id && c.estado === "activo");
          return (
            <div key={coach.id} style={estiloCard}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <div style={{
                  width: "36px", height: "36px", borderRadius: "50%", background: "#0B0B0B",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#FFC800", fontWeight: "900", fontSize: "13px"
                }}>
                  {coach.nombre?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p style={{ fontWeight: "700", fontSize: "14px", color: "#0B0B0B", margin: 0 }}>
                    {coach.nombre} {coach.apellido}
                  </p>
                  <p style={{ fontSize: "12px", color: "#888", margin: "2px 0 0" }}>Entrenador activo</p>
                </div>
              </div>
              <div style={{ borderTop: "0.5px solid #F0F0F0", paddingTop: "12px" }}>
                <p style={{ fontSize: "12px", color: "#888", margin: "0 0 4px" }}>Clientes asignados</p>
                <p style={{ fontSize: "28px", fontWeight: "900", color: "#FFC800", margin: 0 }}>
                  {clientesCoach.length}
                </p>
              </div>
            </div>
          );
        })}
        {activos.length === 0 && (
          <div style={{ ...estiloCard, textAlign: "center", padding: "60px" }}>
            <p style={{ color: "#888" }}>No hay entrenadores activos para reportar</p>
          </div>
        )}
      </div>
    </div>
  );

  return null;
}