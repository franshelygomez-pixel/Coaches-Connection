import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, traducirErrorSupabase } from "../supabaseClient";
import { invitacionEstaVigente } from "../utils/seguridad";

const estiloBoton = (fondo = "#0B0B0B", color = "#FFFFFF") => ({
  background: fondo, border: 0, borderRadius: "7px", color, cursor: "pointer",
  fontSize: "12px", fontWeight: "800", padding: "9px 12px",
});

export default function AccesosClientes({ usuario }) {
  const coachId = usuario?.id;
  const [clientes, setClientes] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [invitaciones, setInvitaciones] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [codigoCreado, setCodigoCreado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const cargar = useCallback(async () => {
    if (!coachId) return;
    const [respuestaClientes, respuestaCuentas, respuestaInvitaciones] = await Promise.all([
      supabase.from("clientes")
        .select("id,nombre,apellido,email,estado")
        .eq("coach_id", coachId).order("nombre"),
      supabase.from("cuentas_clientes")
        .select("id,cliente_id,estado,creado_en"),
      supabase.from("invitaciones_clientes")
        .select("id,cliente_id,email,estado,vence_en,creado_en")
        .eq("creado_por", coachId).order("creado_en", { ascending: false }),
    ]);
    const fallo = respuestaClientes.error || respuestaCuentas.error || respuestaInvitaciones.error;
    if (fallo) {
      console.error("Error cargando accesos de clientes:", fallo);
      setError(traducirErrorSupabase(fallo));
    } else {
      setClientes(respuestaClientes.data || []);
      setCuentas(respuestaCuentas.data || []);
      setInvitaciones(respuestaInvitaciones.data || []);
      setError("");
    }
    setCargando(false);
  }, [coachId]);

  useEffect(() => {
    if (!coachId) return undefined;
    const temporizador = window.setTimeout(() => void cargar(), 0);
    const canal = supabase
      .channel(`accesos-clientes-${coachId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "invitaciones_clientes", filter: `creado_por=eq.${coachId}` }, () => void cargar())
      .on("postgres_changes", { event: "*", schema: "public", table: "cuentas_clientes" }, () => void cargar())
      .subscribe();
    return () => {
      window.clearTimeout(temporizador);
      void supabase.removeChannel(canal);
    };
  }, [cargar, coachId]);

  const clientesFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return clientes;
    return clientes.filter((cliente) => `${cliente.nombre} ${cliente.apellido} ${cliente.email}`.toLowerCase().includes(texto));
  }, [busqueda, clientes]);

  const generarInvitacion = async (cliente) => {
    setError("");
    setMensaje("");
    setCodigoCreado(null);
    setProcesandoId(cliente.id);
    const { data, error: errorCreacion } = await supabase.rpc("crear_invitacion_cliente", {
      p_cliente_id: cliente.id,
      p_dias_vigencia: 7,
    });
    setProcesandoId("");
    if (errorCreacion || !data?.[0]) {
      console.error("Error generando la invitación del cliente:", errorCreacion);
      setError(traducirErrorSupabase(errorCreacion || { message: "No se creó la invitación" }));
      return;
    }
    setCodigoCreado({ cliente, ...data[0] });
    setMensaje("Invitación creada. Copia el código ahora; después no podrá recuperarse.");
    await cargar();
  };

  const revocar = async (invitacion) => {
    setError("");
    setMensaje("");
    setProcesandoId(invitacion.id);
    const { data, error: errorRevocacion } = await supabase.rpc("revocar_invitacion_cliente", {
      p_invitacion_id: invitacion.id,
    });
    setProcesandoId("");
    if (errorRevocacion || !data) {
      setError(traducirErrorSupabase(errorRevocacion || { message: "No se revocó la invitación" }));
      return;
    }
    setMensaje("Invitación revocada.");
    await cargar();
  };

  const copiarCodigo = async () => {
    if (!codigoCreado?.codigo) return;
    try {
      await navigator.clipboard.writeText(codigoCreado.codigo);
      setMensaje("Código copiado al portapapeles.");
    } catch {
      setMensaje("Selecciona y copia manualmente el código mostrado.");
    }
  };

  const cambiarEstadoPortal = async (cliente, estado) => {
    setError("");
    setMensaje("");
    setProcesandoId(cliente.id);
    const { data, error: errorCambio } = await supabase.rpc("cambiar_estado_portal_cliente", {
      p_cliente_id: cliente.id,
      p_estado: estado,
    });
    setProcesandoId("");
    if (errorCambio || !data) {
      setError(traducirErrorSupabase(errorCambio || { message: "No se cambió el portal" }));
      return;
    }
    setMensaje(estado === "activo" ? "Portal reactivado." : "Portal desactivado.");
    await cargar();
  };

  if (cargando) return <p style={{ color: "#777", padding: "40px", textAlign: "center" }}>Cargando accesos...</p>;

  return (
    <section>
      <header style={{ marginBottom: "22px" }}>
        <h3 style={{ fontSize: "22px", margin: 0 }}>Acceso de clientes</h3>
        <p style={{ color: "#777", fontSize: "13px", marginTop: "5px" }}>
          Genera un código temporal para que un cliente active su portal.
        </p>
      </header>

      {error && <p role="alert" style={{ background: "#FFF0F0", borderRadius: "8px", color: "#B00020", padding: "12px" }}>{error}</p>}
      {mensaje && <p role="status" style={{ background: "#EEFFF3", borderRadius: "8px", color: "#126B2D", padding: "12px" }}>{mensaje}</p>}

      {codigoCreado && (
        <div style={{ background: "#FDECEE", border: "1px solid #E11D2E", borderRadius: "12px", marginBottom: "18px", padding: "18px" }}>
          <p style={{ fontSize: "12px", margin: "0 0 6px" }}>Código para {codigoCreado.cliente.nombre} {codigoCreado.cliente.apellido}</p>
          <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: "10px" }}>
            <code style={{ background: "#0B0B0B", borderRadius: "7px", color: "#FF5A64", fontSize: "17px", fontWeight: "900", letterSpacing: "1px", padding: "10px 14px" }}>{codigoCreado.codigo}</code>
            <button type="button" onClick={() => void copiarCodigo()} style={estiloBoton()}>Copiar código</button>
            <button type="button" onClick={() => setCodigoCreado(null)} style={estiloBoton("#EEE", "#333")}>Ocultar</button>
          </div>
          <p style={{ color: "#9B1C24", fontSize: "11px", marginBottom: 0 }}>
            Vence: {new Date(codigoCreado.vence_en).toLocaleString("es-DO")}. Debe usarse con el correo {codigoCreado.cliente.email}.
          </p>
        </div>
      )}

      <input aria-label="Buscar cliente" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder="Buscar por nombre o correo" style={{ width: "100%", background: "#FFF", border: "1px solid #DDD", borderRadius: "8px", boxSizing: "border-box", marginBottom: "14px", padding: "12px" }} />

      {clientesFiltrados.length === 0 ? (
        <div style={{ background: "#FFF", border: "1px solid #E5E5E5", borderRadius: "12px", color: "#777", padding: "36px", textAlign: "center" }}>No hay clientes para mostrar.</div>
      ) : (
        <div style={{ display: "grid", gap: "10px" }}>
          {clientesFiltrados.map((cliente) => {
            const cuenta = cuentas.find((item) => item.cliente_id === cliente.id);
            const invitacion = invitaciones.find((item) => item.cliente_id === cliente.id && invitacionEstaVigente(item));
            return (
              <article key={cliente.id} style={{ alignItems: "center", background: "#FFF", border: "1px solid #E5E5E5", borderRadius: "12px", display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "space-between", padding: "16px" }}>
                <div>
                  <strong>{cliente.nombre} {cliente.apellido}</strong>
                  <p style={{ color: "#777", fontSize: "12px", margin: "4px 0 0" }}>{cliente.email}</p>
                  <span style={{ color: cuenta ? "#126B2D" : invitacion ? "#9B1C24" : "#777", fontSize: "11px", fontWeight: "800" }}>
                    {cuenta ? `Portal ${cuenta.estado}` : invitacion ? "Invitación pendiente" : "Sin acceso al portal"}
                  </span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {!cuenta && (
                    <button type="button" disabled={Boolean(procesandoId)} onClick={() => void generarInvitacion(cliente)} style={{ ...estiloBoton(), opacity: procesandoId ? 0.6 : 1 }}>
                      {procesandoId === cliente.id ? "Generando..." : invitacion ? "Generar nuevo código" : "Generar invitación"}
                    </button>
                  )}
                  {invitacion && (
                    <button type="button" disabled={Boolean(procesandoId)} onClick={() => void revocar(invitacion)} style={estiloBoton("#FFF0F0", "#B00020")}>Revocar</button>
                  )}
                  {cuenta && (
                    <button
                      type="button"
                      disabled={Boolean(procesandoId)}
                      onClick={() => void cambiarEstadoPortal(cliente, cuenta.estado === "activo" ? "inactivo" : "activo")}
                      style={estiloBoton(cuenta.estado === "activo" ? "#FFF0F0" : "#EEFFF3", cuenta.estado === "activo" ? "#B00020" : "#126B2D")}
                    >
                      {procesandoId === cliente.id ? "Guardando..." : cuenta.estado === "activo" ? "Desactivar portal" : "Reactivar portal"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
