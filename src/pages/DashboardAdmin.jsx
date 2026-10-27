import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import Paginacion from "../components/Paginacion";
import SeguridadAdmin from "../components/admin/SeguridadAdmin";
import useDebounce from "../hooks/useDebounce";
import { normalizarCorreo } from "../utils/validaciones";
import ModalInvitacion from "../components/admin/ModalInvitacion";
import Aviso from "../components/Aviso";

const CLIENTES_ADMIN_POR_PAGINA = 25;

export default function DashboardAdmin({ seccion, setSeccion }) {
  const [pendientes, setPendientes] = useState([]);
  const [rechazados, setRechazados] = useState([]);
  const [activos, setActivos] = useState([]);
  const [inactivos, setInactivos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [coachSeleccionado, setCoachSeleccionado] = useState(null);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [mostrarFormCliente, setMostrarFormCliente] = useState(false);
  const [formCliente, setFormCliente] = useState({ nombre: "", apellido: "", email: "", telefono: "", coachId: "" });
  const [errorForm, setErrorForm] = useState("");
  const [mostrarInvitar, setMostrarInvitar] = useState(false);
  const [avisoInvitacion, setAvisoInvitacion] = useState({ tipo: "", texto: "" });

  const [busquedaEnt, setBusquedaEnt] = useState("");
  const [filtroEnt, setFiltroEnt] = useState("todos");
  const [busquedaClientes, setBusquedaClientes] = useState("");
  const busquedaClientesEstable = useDebounce(busquedaClientes, 350);
  const [paginaClientes, setPaginaClientes] = useState(1);

  // --- Historial de mediciones (ficha antropométrica) para el modal de Clientes ---
  const [clienteHistorial, setClienteHistorial] = useState(null);
  const [medicionesHistorial, setMedicionesHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  const cargarCoaches = useCallback(async () => {
    const { data, error } = await supabase
      .from("usuarios")
      .select("id,nombre,apellido,email,rol,rol_solicitado,estado,codigo,creado_en,telefono,tipo_documento,documento,direccion,aprobado_por,decision_en,motivo_decision")
      .in("rol", ["coach", "admin"]);
    if (error) {
      console.error(error);
      setErrorCarga("No se pudieron cargar los entrenadores.");
      return;
    }
    const usuarios = data || [];
    setPendientes(usuarios.filter((usuario) => usuario.estado === "pendiente"));
    setRechazados(usuarios.filter((usuario) => usuario.estado === "rechazado"));
    setActivos(usuarios.filter((usuario) => usuario.rol === "coach" && usuario.estado === "activo"));
    setInactivos(usuarios.filter((usuario) => usuario.rol === "coach" && usuario.estado === "inactivo"));
  }, []);

  const cargarClientes = useCallback(async () => {
    const { data, error } = await supabase
      .from("clientes")
      .select("id,nombre,apellido,email,telefono,coach_id,estado,creado_en")
      .order("nombre", { ascending: true });
    if (error) {
      console.error(error);
      setErrorCarga("No se pudieron cargar los clientes.");
      return;
    }
    setClientes(data || []);
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorCarga("");
    if (seccion === "Entrenadores") {
      await Promise.all([cargarCoaches(), cargarClientes()]);
    } else {
      await cargarCoaches();
      setClientes([]);
    }
    setCargando(false);
  }, [cargarClientes, cargarCoaches, seccion]);

  useEffect(() => {
    const temporizador = window.setTimeout(() => {
      void cargar();
    }, 0);

    const canalClientes = supabase
      .channel("admin-clientes")
      .on("postgres_changes", { event: "*", schema: "public", table: "clientes" }, () => {
        if (seccion === "Entrenadores") void cargarClientes();
      })
      .subscribe();

    const canalUsuarios = supabase
      .channel("admin-usuarios")
      .on("postgres_changes", { event: "*", schema: "public", table: "usuarios" }, () => void cargarCoaches())
      .subscribe();

    return () => {
      window.clearTimeout(temporizador);
      void supabase.removeChannel(canalClientes);
      void supabase.removeChannel(canalUsuarios);
    };
  }, [cargar, cargarClientes, cargarCoaches, seccion]);

  const cambiarEstadoCoach = async (usuarioId, nuevoEstado) => {
    setErrorCarga("");
    const cuentas = [...pendientes, ...rechazados, ...activos, ...inactivos];
    const cuenta = cuentas.find((usuario) => usuario.id === usuarioId);
    let respuesta;

    if (cuenta?.estado === "pendiente" && nuevoEstado === "activo") {
      respuesta = await supabase.rpc("resolver_solicitud", {
        p_usuario_id: usuarioId,
        p_decision: "aprobar",
        p_motivo: "Aprobación desde el panel administrativo",
      });
    } else if (cuenta?.estado === "pendiente" && nuevoEstado === "rechazado") {
      const motivo = window.prompt("Indica el motivo del rechazo:");
      if (motivo === null) return;
      if (motivo.trim().length < 3) {
        setErrorCarga("El motivo del rechazo debe tener al menos 3 caracteres.");
        return;
      }
      respuesta = await supabase.rpc("resolver_solicitud", {
        p_usuario_id: usuarioId,
        p_decision: "rechazar",
        p_motivo: motivo.trim(),
      });
    } else if (cuenta?.estado === "rechazado" && nuevoEstado === "pendiente") {
      respuesta = await supabase.rpc("resolver_solicitud", {
        p_usuario_id: usuarioId,
        p_decision: "reabrir",
        p_motivo: "Solicitud reabierta desde el panel administrativo",
      });
    } else {
      respuesta = await supabase.rpc("cambiar_estado_usuario", {
        p_usuario_id: usuarioId,
        p_estado: nuevoEstado,
        p_motivo: "Cambio realizado desde el panel administrativo",
      });
    }

    const { data, error } = respuesta;
    if (error || data === null || data === false) {
      console.error(error);
      setErrorCarga("No se pudo cambiar el estado de la cuenta.");
      return;
    }
    setCoachSeleccionado(null);
    await cargarCoaches();
  };

  const guardarCliente = async () => {
    setErrorForm("");

    const nombre = formCliente.nombre.trim();
    const apellido = formCliente.apellido.trim();
    const email = normalizarCorreo(formCliente.email);
    const telefono = formCliente.telefono.replace(/\D/g, "");

    if (!nombre || !email) {
      setErrorForm("Nombre y correo son obligatorios");
      return;
    }

    const soloLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    if (!soloLetras.test(nombre)) {
      setErrorForm("El nombre solo puede contener letras");
      return;
    }
    if (apellido && !soloLetras.test(apellido)) {
      setErrorForm("El apellido solo puede contener letras");
      return;
    }

    const formatoCorreo = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!formatoCorreo.test(email)) {
      setErrorForm("El formato del correo no es válido");
      return;
    }

    if (telefono.length > 10) {
      setErrorForm("El teléfono no puede tener más de 10 dígitos");
      return;
    }

    let consultaDuplicado = supabase.from("clientes").select("id").ilike("email", email).limit(1);
    if (clienteSeleccionado) consultaDuplicado = consultaDuplicado.neq("id", clienteSeleccionado.id);
    const { data: existentes, error: errorDuplicado } = await consultaDuplicado;
    if (errorDuplicado) {
      setErrorForm("No se pudo comprobar el correo del cliente.");
      return;
    }
    if (existentes && existentes.length > 0) {
      setErrorForm("Este correo ya está registrado para otro cliente");
      return;
    }

    if (clienteSeleccionado) {
      const { data, error } = await supabase
        .from("clientes")
        .update({
          nombre,
          apellido,
          email,
          telefono,
          coach_id: formCliente.coachId || null,
        })
        .eq("id", clienteSeleccionado.id)
        .select("id")
        .maybeSingle();
      if (error || !data) { setErrorForm("No se pudo actualizar el cliente."); return; }
    } else {
      const { data, error } = await supabase.from("clientes").insert({
        nombre,
        apellido,
        email,
        telefono,
        coach_id: formCliente.coachId || null,
        estado: "Activo",
      }).select("id").single();
      if (error || !data) { setErrorForm("No se pudo crear el cliente."); return; }
    }

    setMostrarFormCliente(false);
    setClienteSeleccionado(null);
    setFormCliente({ nombre: "", apellido: "", email: "", telefono: "", coachId: "" });
    await cargarClientes();
  };

  const cambiarEstadoCliente = async (clienteId, nuevoEstado) => {
    setErrorCarga("");
    const { data, error } = await supabase
      .from("clientes")
      .update({ estado: nuevoEstado })
      .eq("id", clienteId)
      .select("id")
      .maybeSingle();
    if (error || !data) {
      console.error(error);
      setErrorCarga("No se pudo cambiar el estado del cliente.");
      return;
    }
    await cargarClientes();
  };

  // --- Ver historial antropométrico de un cliente (solo lectura) ---
  const abrirHistorial = async (cliente) => {
    setClienteHistorial(cliente);
    setCargandoHistorial(true);
    try {
      const { data, error } = await supabase
        .from("mediciones")
        .select("*")
        .eq("cliente_id", cliente.id)
        .order("fecha", { ascending: false });
      if (error) throw error;
      setMedicionesHistorial(data || []);
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
    return { label: "Registrado", bg: "#F5F5F5", color: "#555" };
  };

  if (seccion === "Administradores") {
    return <SeguridadAdmin seccion={seccion} />;
  }

  if (cargando) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px" }}>
      <p style={{ color: "#888" }}>Cargando...</p>
    </div>
  );

  if (errorCarga && clientes.length === 0 && pendientes.length === 0 && activos.length === 0) {
    return (
      <div role="alert" style={{ background: "#FFF", border: "1px solid #F3C4C4", borderRadius: "12px", padding: "32px", textAlign: "center" }}>
        <p style={{ color: "#B02A2A", marginBottom: "16px" }}>{errorCarga}</p>
        <button type="button" onClick={() => void cargar()} style={{ background: "#0B0B0B", color: "#FFFFFF", border: 0, borderRadius: "8px", cursor: "pointer", fontWeight: "800", padding: "11px 16px" }}>
          Intentar nuevamente
        </button>
      </div>
    );
  }

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

  const avisoError = errorCarga && <Aviso tipo="error" onCerrar={() => setErrorCarga("")}>{errorCarga}</Aviso>;

  const fechaLegible = (isoString) =>
    isoString ? new Date(isoString).toLocaleDateString("es-DO") : "N/A";

  const CardCoach = ({ coach, onClick }) => (
    <article style={{ alignItems: "center", background: "#FFFFFF", border: "0.5px solid #E5E5E5", borderRadius: "12px", display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "space-between", padding: "20px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{
          width: "40px", height: "40px", borderRadius: "50%", background: "#0B0B0B",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#FF5A64", fontWeight: "900", fontSize: "14px", flexShrink: 0
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
      <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: "8px" }}>
        <span style={{ background: coach.estado === "activo" ? "#E1F5EE" : "#F5F5F5", borderRadius: "20px", color: coach.estado === "activo" ? "#085041" : "#555", fontSize: "11px", fontWeight: "700", padding: "3px 10px" }}>
          {coach.estado === "activo" ? "ACTIVO" : "INACTIVO"}
        </span>
        <button type="button" onClick={onClick} style={{ background: "#F5F5F5", border: "none", borderRadius: "8px", color: "#0B0B0B", cursor: "pointer", fontSize: "13px", fontWeight: "700", padding: "8px 16px" }}>Ver perfil</button>
      </div>
    </article>
  );

  const renderPerfilCoach = (coach) => {
    const clientesDelCoach = clientes.filter(c => c.coach_id === coach.id && c.estado === "Activo");
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
                color: "#FF5A64", fontWeight: "900", fontSize: "20px"
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
                  style={estiloBoton("#0B0B0B", "#FFFFFF")}>
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

  // --- Modal de solo lectura: historial de mediciones (ficha antropométrica) ---
  const renderModalHistorial = () => {
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
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "8px", fontSize: "12px", color: "#555" }}>
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
      .sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en))
      .slice(0, 5);

    const ultimosClientes = [...clientes]
      .sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en))
      .slice(0, 5);

    const topCoaches = activos
      .map(c => ({
        ...c,
        totalClientes: clientes.filter(cl => cl.coach_id === c.id && cl.estado === "Activo").length
      }))
      .sort((a, b) => b.totalClientes - a.totalClientes)
      .slice(0, 3);

    const hoy = new Date();
    const hora = hoy.getHours();
    const saludo = hora < 12 ? "Buenos días" : hora < 18 ? "Buenas tardes" : "Buenas noches";

    return (
      <div>
        {avisoError}
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
            { label: "Entrenadores activos", valor: activos.length, color: "#1D9E75", ir: "Entrenadores" },
            { label: "Clientes totales", valor: clientes.filter(c => c.estado === "Activo").length, color: "#378ADD", ir: "Clientes" },
            { label: "Sin entrenador", valor: clientes.filter(c => c.estado === "Activo" && !c.coach_id).length, color: "#E24B4A", ir: "Clientes" },
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

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "20px" }}>

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
                    color: "#FF5A64", fontWeight: "900", fontSize: "12px", flexShrink: 0
                  }}>
                    {c.nombre?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontSize: "13px", fontWeight: "700", color: "#0B0B0B", margin: 0 }}>{c.nombre} {c.apellido}</p>
                    <p style={{ fontSize: "11px", color: "#888", margin: 0 }}>{fechaLegible(c.creado_en)}</p>
                  </div>
                </div>
                <span style={{
                  fontSize: "11px", fontWeight: "700", padding: "3px 10px", borderRadius: "20px",
                  background: c.estado === "activo" ? "#E1F5EE" : c.estado === "pendiente" ? "#FDECEE" : "#F5F5F5",
                  color: c.estado === "activo" ? "#085041" : c.estado === "pendiente" ? "#9B1C24" : "#555"
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
              const coach = activos.find(a => a.id === c.coach_id);
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
                    background: c.estado === "Activo" ? "#E1F5EE" : "#F5F5F5",
                    color: c.estado === "Activo" ? "#085041" : "#555"
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
                  <p style={{ fontSize: "11px", fontWeight: "700", color: i === 0 ? "#E11D2E" : "#888", marginBottom: "8px" }}>
                    #{i + 1} ENTRENADOR
                  </p>
                  <p style={{ fontSize: "16px", fontWeight: "900", color: i === 0 ? "#FFFFFF" : "#0B0B0B", margin: "0 0 4px" }}>
                    {c.nombre} {c.apellido}
                  </p>
                  <p style={{ fontSize: "28px", fontWeight: "900", color: "#E11D2E", margin: 0 }}>{c.totalClientes}</p>
                  <p style={{ fontSize: "12px", color: i === 0 ? "#888" : "#555", margin: "4px 0 0" }}>clientes asignados</p>
                </div>
              ))}
            </div>
          )}
        </div>
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
        {avisoError}
        {coachSeleccionado ? (
          renderPerfilCoach(coachSeleccionado)
        ) : (
          <>
            <header style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "space-between", marginBottom: "18px" }}>
              <div>
                <h3 style={{ color: "#0B0B0B", fontSize: "20px", fontWeight: "900", margin: 0 }}>Directorio de entrenadores</h3>
                <p style={{ color: "#888", fontSize: "13px", margin: "4px 0 0" }}>Busca, filtra y gestiona a los entrenadores del gimnasio.</p>
              </div>
              <button type="button" onClick={() => { setMostrarInvitar((v) => !v); setAvisoInvitacion({ tipo: "", texto: "" }); }}
                style={{ background: "#0B0B0B", border: 0, borderRadius: "7px", color: "#FFFFFF", cursor: "pointer", fontSize: "12px", fontWeight: "800", padding: "9px 12px" }}>
                Nuevo entrenador
              </button>
            </header>

            {avisoInvitacion.texto && (
              <Aviso tipo={avisoInvitacion.tipo === "error" ? "error" : "ok"} onCerrar={() => setAvisoInvitacion({ tipo: "", texto: "" })}>
                {avisoInvitacion.texto}
              </Aviso>
            )}

            {mostrarInvitar && (
              <ModalInvitacion
                rol="coach"
                onCerrar={() => setMostrarInvitar(false)}
                onEnviada={(email) => {
                  setMostrarInvitar(false);
                  setAvisoInvitacion({ tipo: "ok", texto: `Invitación enviada a ${email}. El entrenador crea su contraseña desde el enlace del correo.` });
                }}
              />
            )}

            <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "18px" }}>
              <div style={{ flex: "1 1 280px", position: "relative" }}>
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ left: "16px", pointerEvents: "none", position: "absolute", top: "50%", transform: "translateY(-50%)" }}>
                  <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
                </svg>
                <input
                  type="search"
                  aria-label="Buscar entrenadores"
                  placeholder="Buscar por nombre, apellido o correo"
                  value={busquedaEnt}
                  onChange={(e) => setBusquedaEnt(e.target.value)}
                  style={{ background: "#FFFFFF", border: "1px solid #E5E5E5", borderRadius: "999px", boxSizing: "border-box", color: "#0B0B0B", fontSize: "14px", outline: "none", padding: "13px 18px 13px 46px", width: "100%" }}
                  onFocus={(e) => { e.target.style.borderColor = "#E11D2E"; e.target.style.boxShadow = "0 0 0 3px rgba(225, 29, 46, 0.25)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "#E5E5E5"; e.target.style.boxShadow = "none"; }}
                />
              </div>
              <div role="group" aria-label="Filtrar por estado" style={{ background: "#FFFFFF", border: "1px solid #E5E5E5", borderRadius: "999px", display: "flex", flexWrap: "wrap", gap: "4px", padding: "4px" }}>
                {[["todos", "Todos"], ["activo", "Activos"], ["inactivo", "Inactivos"]].map(([valor, etiqueta]) => {
                  const seleccionado = filtroEnt === valor;
                  return (
                    <button key={valor} type="button" aria-pressed={seleccionado} onClick={() => setFiltroEnt(valor)}
                      style={{ background: seleccionado ? "#0B0B0B" : "transparent", border: "none", borderRadius: "999px", color: seleccionado ? "#FFFFFF" : "#666", cursor: "pointer", fontSize: "13px", fontWeight: seleccionado ? "800" : "600", padding: "9px 16px", transition: "background 0.15s" }}>
                      {etiqueta}
                    </button>
                  );
                })}
              </div>
            </div>

            {(() => {
              const visibles = [
                ...(filtroEnt === "inactivo" ? [] : activosFiltrados),
                ...(filtroEnt === "activo" ? [] : inactivosFiltrados),
              ];
              return visibles.length === 0 ? (
                <div style={{ background: "#FFF", border: "1px solid #E5E5E5", borderRadius: "12px", color: "#777", padding: "38px", textAlign: "center" }}>No hay entrenadores para mostrar.</div>
              ) : (
                <div style={{ display: "grid", gap: "8px" }}>
                  {visibles.map((c) => <CardCoach key={c.id} coach={c} onClick={() => setCoachSeleccionado(c)} />)}
                </div>
              );
            })()}
          </>
        )}
      </div>
    );
  }

  // ===== CLIENTES =====
  if (seccion === "Clientes") {
    const textoCliente = busquedaClientesEstable.trim().toLowerCase();
    const clientesEncontrados = clientes.filter((cliente) => {
      if (!textoCliente) return true;
      const nombreCompleto = `${cliente.nombre || ""} ${cliente.apellido || ""}`.toLowerCase();
      return nombreCompleto.includes(textoCliente) ||
        (cliente.email || "").toLowerCase().includes(textoCliente);
    });
    const inicioPagina = (paginaClientes - 1) * CLIENTES_ADMIN_POR_PAGINA;
    const clientesVisibles = clientesEncontrados.slice(
      inicioPagina,
      inicioPagina + CLIENTES_ADMIN_POR_PAGINA
    );

    return (
    <div>
      {avisoError}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <h3 style={{ fontSize: "20px", fontWeight: "900", color: "#0B0B0B", margin: 0 }}>
          Clientes ({clientes.filter(c => c.estado === "Activo").length} activos)
        </h3>
        <button onClick={() => {
          setMostrarFormCliente(true);
          setClienteSeleccionado(null);
          setFormCliente({ nombre: "", apellido: "", email: "", telefono: "", coachId: "" });
        }} style={estiloBoton("#0B0B0B", "#FFFFFF")}>
          Nuevo cliente
        </button>
      </div>

      <div style={{ ...estiloCard, marginBottom: "18px", padding: "14px 18px" }}>
        <input
          type="search"
          value={busquedaClientes}
          onChange={(evento) => { setBusquedaClientes(evento.target.value); setPaginaClientes(1); }}
          placeholder="Buscar cliente por nombre o correo..."
          aria-label="Buscar cliente"
          style={{ ...estiloInput, marginBottom: 0 }}
        />
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
            maxLength={10}
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
            <button onClick={guardarCliente} style={estiloBoton("#0B0B0B", "#FFFFFF")}>
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

      {clientesEncontrados.length === 0 ? (
        <div style={{ ...estiloCard, textAlign: "center", padding: "60px" }}>
          <p style={{ color: "#888" }}>No hay clientes registrados</p>
        </div>
      ) : (
        <div>
          {clientesVisibles.map(c => {
            const coachAsignado = activos.find(a => a.id === c.coach_id);
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
                    background: c.estado === "Activo" ? "#E1F5EE" : "#F5F5F5",
                    color: c.estado === "Activo" ? "#085041" : "#555"
                  }}>
                    {c.estado?.toUpperCase()}
                  </span>
                  <button onClick={() => abrirHistorial(c)} style={estiloBoton("#F5F5F5", "#0B0B0B")}>
                    Ver Historial
                  </button>
                  <button onClick={() => {
                    setClienteSeleccionado(c);
                    setFormCliente({ nombre: c.nombre, apellido: c.apellido, email: c.email, telefono: c.telefono || "", coachId: c.coach_id || "" });
                    setMostrarFormCliente(true);
                  }} style={estiloBoton("#F5F5F5", "#0B0B0B")}>
                    Editar
                  </button>
                  <button onClick={() => cambiarEstadoCliente(c.id, c.estado === "Activo" ? "Inactivo" : "Activo")}
                    style={estiloBoton(c.estado === "Activo" ? "#FFF0F0" : "#E1F5EE", c.estado === "Activo" ? "#CC0000" : "#085041")}>
                    {c.estado === "Activo" ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </div>
            );
          })}
          <Paginacion
            pagina={paginaClientes}
            total={clientesEncontrados.length}
            porPagina={CLIENTES_ADMIN_POR_PAGINA}
            onCambiar={setPaginaClientes}
          />
        </div>
      )}

      {renderModalHistorial()}
    </div>
    );
  }

  return null;
}