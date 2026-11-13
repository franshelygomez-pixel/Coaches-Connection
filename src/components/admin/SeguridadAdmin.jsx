import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import ModalInvitacion from "./ModalInvitacion";
import Aviso from "../Aviso";
import { invitacionEstaVigente } from "../../utils/seguridad";
import { InsigniaPerfil, datosPerfil } from "../../utils/perfilCompleto";

const fechaLegible = (valor) => valor
  ? new Date(valor).toLocaleString("es-DO", { dateStyle: "medium", timeStyle: "short" })
  : "—";

export default function SeguridadAdmin({ seccion }) {
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioActualId, setUsuarioActualId] = useState(null);
  const [invitaciones, setInvitaciones] = useState([]);
  const [mostrarInvitar, setMostrarInvitar] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  // Solo la primera carga muestra "Cargando": las recargas son silenciosas para no
  // desmontar el panel (eso hacía perder el foco mientras se escribía).
  const cargar = useCallback(async () => {
    setError("");

    const [respuestaAdmins, respuestaInvitaciones] = await Promise.all([
      supabase
        .from("usuarios")
        .select("id,nombre,apellido,email,rol,rol_solicitado,estado,creado_en")
        .or("rol.eq.admin,rol_solicitado.eq.admin")
        .order("creado_en", { ascending: false }),
      supabase
        .from("invitaciones_acceso")
        .select("id,email,estado,creado_en,vence_en,usado_en,revocado_en")
        .eq("rol", "admin")
        .order("creado_en", { ascending: false })
        .limit(50),
    ]);

    const primerError = respuestaAdmins.error || respuestaInvitaciones.error;
    if (primerError) {
      console.error(primerError);
      setError("No se pudo cargar la información de administradores. Verifica que la migración de roles esté aplicada.");
    } else {
      const perfiles = await datosPerfil(supabase);
      setUsuarios((respuestaAdmins.data || []).map((u) => ({ ...u, ...(perfiles[u.id] || {}) })));
      setInvitaciones(respuestaInvitaciones.data || []);
    }
    setCargando(false);
  }, []);

  useEffect(() => {
    const temporizador = window.setTimeout(() => { void cargar(); }, 0);

    // Solo se escucha invitaciones_acceso para no recargar el panel con otros cambios.
    const canal = supabase
      .channel("admin-seguridad")
      .on("postgres_changes", { event: "*", schema: "public", table: "invitaciones_acceso" }, () => void cargar())
      .subscribe();

    supabase.auth.getUser().then(({ data }) => setUsuarioActualId(data?.user?.id || null));

    return () => {
      window.clearTimeout(temporizador);
      void supabase.removeChannel(canal);
    };
  }, [cargar]);

  const administradores = usuarios.filter((usuario) =>
    usuario.rol === "admin" || usuario.rol_solicitado === "admin"
  );

  const revocar = async (id) => {
    setError("");
    const confirmado = window.confirm("¿Deseas revocar esta invitación administrativa?");
    if (!confirmado) return;
    const { data, error: errorRevocacion } = await supabase.rpc("revocar_invitacion", {
      p_id: id,
    });
    if (errorRevocacion || !data) {
      setError("No se pudo revocar la invitación.");
      return;
    }
    setMensaje("Invitación revocada.");
    await cargar();
  };

  const administradoresActivos = administradores.filter(
    (usuario) => usuario.rol === "admin" && usuario.estado === "activo"
  ).length;

  // Regla de seguridad (la base de datos debe reforzarla también): un administrador
  // no puede desactivarse a sí mismo ni dejar al sistema sin administradores activos.
  const motivoBloqueo = (usuario) => {
    if (usuario.estado !== "activo") return "";
    if (usuario.id === usuarioActualId) return "No puedes desactivar tu propia cuenta.";
    if (administradoresActivos <= 1) return "Debe quedar al menos un administrador activo.";
    return "";
  };

  const cambiarEstadoAdmin = async (usuario) => {
    if (motivoBloqueo(usuario)) {
      setError(motivoBloqueo(usuario));
      return;
    }
    const nuevoEstado = usuario.estado === "activo" ? "inactivo" : "activo";
    const confirmado = window.confirm(`¿Deseas marcar esta cuenta administrativa como ${nuevoEstado}?`);
    if (!confirmado) return;
    setError("");
    const { data, error: errorCambio } = await supabase.rpc("cambiar_estado_usuario", {
      p_usuario_id: usuario.id,
      p_estado: nuevoEstado,
      p_motivo: "Cambio desde la gestión de administradores",
    });
    if (errorCambio || !data) {
      console.error(errorCambio);
      setError(errorCambio?.message || "No se pudo cambiar el estado del administrador.");
      return;
    }
    setMensaje(`Cuenta administrativa marcada como ${nuevoEstado}.`);
    await cargar();
  };

  if (cargando) return <p style={{ color: "#888" }}>Cargando seguridad...</p>;

  if (seccion === "Administradores") {
    const insignia = (texto, fondo, color) => (
      <span style={{ background: fondo, borderRadius: "20px", color, fontSize: "10px", fontWeight: "800", padding: "3px 10px", whiteSpace: "nowrap" }}>{texto}</span>
    );
    const tieneInvitacionPendiente = (usuario) => invitaciones.some((invitacion) =>
      invitacion.estado === "pendiente" && invitacionEstaVigente(invitacion)
      && `${invitacion.email}`.toLowerCase() === `${usuario.email}`.toLowerCase());
    const estadoCuenta = (usuario) => {
      if (tieneInvitacionPendiente(usuario)) return insignia("INVITACIÓN ENVIADA", "#FDECEE", "#9B1C24");
      if (usuario.rol !== "admin") return insignia("SOLICITUD PENDIENTE", "#FDECEE", "#9B1C24");
      if (usuario.estado === "activo") return insignia("ACTIVO", "#E1F5EE", "#085041");
      if (usuario.estado === "pendiente") return insignia("PENDIENTE", "#FDECEE", "#9B1C24");
      return insignia(`${usuario.estado || ""}`.toUpperCase(), "#F5F5F5", "#555");
    };
    const texto = busqueda.trim().toLowerCase();
    const coincide = (...partes) => !texto || partes.join(" ").toLowerCase().includes(texto);
    const cuentas = administradores.filter((usuario) => coincide(usuario.nombre, usuario.apellido, usuario.email)
      && (filtro === "todos" || (filtro === "activo" && usuario.estado === "activo") || (filtro === "inactivo" && usuario.estado !== "activo")));
    // Solo se listan las invitaciones que siguen abiertas; las usadas ya son cuentas y las revocadas no aportan.
    const invitacionesAbiertas = invitaciones
      .filter((invitacion) => invitacion.estado === "pendiente" && coincide(invitacion.email)
        && filtro === "todos");
    const hayResultados = cuentas.length + invitacionesAbiertas.length > 0;
    const botonLista = { background: "#F5F5F5", border: "none", borderRadius: "8px", color: "#0B0B0B", cursor: "pointer", fontSize: "13px", fontWeight: "700", padding: "8px 16px" };
    const estiloTarjeta = { alignItems: "center", background: "#FFFFFF", border: "0.5px solid #E5E5E5", borderRadius: "12px", display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "space-between", padding: "20px 24px" };
    const avatar = (letra) => (
      <div aria-hidden="true" style={{ alignItems: "center", background: "#0B0B0B", borderRadius: "50%", color: "#FF5A64", display: "flex", flexShrink: 0, fontSize: "14px", fontWeight: "900", height: "40px", justifyContent: "center", width: "40px" }}>
        {letra?.toUpperCase()}
      </div>
    );

    return (
      <div>
        <header style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "space-between", marginBottom: "18px" }}>
          <div>
            <h3 style={{ color: "#0B0B0B", fontSize: "20px", fontWeight: "900", margin: 0 }}>Directorio de administradores</h3>
            <p style={{ color: "#888", fontSize: "13px", margin: "4px 0 0" }}>Busca, filtra y gestiona las cuentas administrativas.</p>
          </div>
          <button type="button" onClick={() => { setMostrarInvitar(true); setMensaje(""); setError(""); }}
            style={{ background: "#0B0B0B", border: 0, borderRadius: "7px", color: "#FFFFFF", cursor: "pointer", fontSize: "12px", fontWeight: "800", padding: "9px 12px" }}>
            Nuevo administrador
          </button>
        </header>

        {error && <Aviso tipo="error" onCerrar={() => setError("")}>{error}</Aviso>}
        {mensaje && <Aviso onCerrar={() => setMensaje("")}>{mensaje}</Aviso>}

        {mostrarInvitar && (
          <ModalInvitacion
            rol="admin"
            onCerrar={() => setMostrarInvitar(false)}
            onEnviada={(email) => {
              setMostrarInvitar(false);
              setMensaje(`Invitación enviada a ${email}. La persona crea su contraseña desde el enlace del correo.`);
              void cargar();
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
              aria-label="Buscar administradores"
              placeholder="Buscar por nombre, apellido o correo"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              style={{ background: "#FFFFFF", border: "1px solid #E5E5E5", borderRadius: "999px", boxSizing: "border-box", color: "#0B0B0B", fontSize: "14px", outline: "none", padding: "13px 18px 13px 46px", width: "100%" }}
              onFocus={(evento) => { evento.target.style.borderColor = "#E11D2E"; evento.target.style.boxShadow = "0 0 0 3px rgba(225, 29, 46, 0.25)"; }}
              onBlur={(evento) => { evento.target.style.borderColor = "#E5E5E5"; evento.target.style.boxShadow = "none"; }}
            />
          </div>
          <div role="group" aria-label="Filtrar" style={{ background: "#FFFFFF", border: "1px solid #E5E5E5", borderRadius: "999px", display: "flex", flexWrap: "wrap", gap: "4px", padding: "4px" }}>
            {[["todos", "Todos"], ["activo", "Activos"], ["inactivo", "Inactivos"]].map(([valor, etiqueta]) => {
              const seleccionado = filtro === valor;
              return (
                <button key={valor} type="button" aria-pressed={seleccionado} onClick={() => setFiltro(valor)}
                  style={{ background: seleccionado ? "#0B0B0B" : "transparent", border: "none", borderRadius: "999px", color: seleccionado ? "#FFFFFF" : "#666", cursor: "pointer", fontSize: "13px", fontWeight: seleccionado ? "800" : "600", padding: "9px 16px", transition: "background 0.15s" }}>
                  {etiqueta}
                </button>
              );
            })}
          </div>
        </div>

        {!hayResultados ? (
          <div style={{ background: "#FFF", border: "1px solid #E5E5E5", borderRadius: "12px", color: "#777", padding: "38px", textAlign: "center" }}>No hay administradores para mostrar.</div>
        ) : (
          <div style={{ display: "grid", gap: "8px" }}>
            {cuentas.map((usuario) => {
              const bloqueo = motivoBloqueo(usuario);
              const esYo = usuario.id === usuarioActualId;
              return (
                <article key={usuario.id} style={estiloTarjeta}>
                  <div style={{ alignItems: "center", display: "flex", gap: "12px", minWidth: 0 }}>
                    {avatar(usuario.nombre?.[0])}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ color: "#0B0B0B", fontSize: "14px", fontWeight: "700", margin: 0 }}>{usuario.nombre} {usuario.apellido}{esYo ? " (tú)" : ""}</p>
                      <p style={{ color: "#888", fontSize: "12px", margin: "2px 0 0", overflowWrap: "anywhere" }}>{usuario.email}</p>
                    </div>
                  </div>
                  <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {estadoCuenta(usuario)}
                    {usuario.rol === "admin" && !tieneInvitacionPendiente(usuario) && <InsigniaPerfil persona={usuario} />}
                    {usuario.rol === "admin" && ["activo", "inactivo"].includes(usuario.estado) && (
                      <button type="button" disabled={Boolean(bloqueo)} title={bloqueo || undefined} onClick={() => void cambiarEstadoAdmin(usuario)}
                        style={{ ...botonLista, cursor: bloqueo ? "not-allowed" : "pointer", opacity: bloqueo ? 0.5 : 1 }}>
                        {usuario.estado === "activo" ? "Desactivar" : "Activar"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
            {invitacionesAbiertas.map((invitacion) => {
              const vigente = invitacionEstaVigente(invitacion);
              return (
                <article key={invitacion.id} style={estiloTarjeta}>
                  <div style={{ alignItems: "center", display: "flex", gap: "12px", minWidth: 0 }}>
                    {avatar(invitacion.email?.[0])}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ color: "#0B0B0B", fontSize: "14px", fontWeight: "700", margin: 0, overflowWrap: "anywhere" }}>{invitacion.email}</p>
                      <p style={{ color: "#888", fontSize: "12px", margin: "2px 0 0" }}>{vigente ? "Vence" : "Venció"} {fechaLegible(invitacion.vence_en)}</p>
                    </div>
                  </div>
                  <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {vigente ? insignia("INVITACIÓN ENVIADA", "#FDECEE", "#9B1C24") : insignia("INVITACIÓN VENCIDA", "#F5F5F5", "#555")}
                    {vigente && <button type="button" onClick={() => void revocar(invitacion.id)} style={botonLista}>Revocar</button>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return null;
}