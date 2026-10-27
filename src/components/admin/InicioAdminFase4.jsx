import { useEffect, useState } from "react";
import { supabase, traducirErrorSupabase } from "../../supabaseClient";
import { fechaLocalISO } from "../../utils/reportes";

const haceDias = (cantidad) => {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - cantidad);
  return fechaLocalISO(fecha);
};

export default function InicioAdminFase4({ setSeccion }) {
  const [resumen, setResumen] = useState({});
  const [usuarios, setUsuarios] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [entrenadoresActivos, setEntrenadoresActivos] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const cargar = async () => {
      const [resultadoResumen, resultadoUsuarios, resultadoClientes, resultadoEntrenadores] = await Promise.all([
        supabase.rpc("reporte_resumen_operativo", {
          p_desde: haceDias(29), p_hasta: fechaLocalISO(), p_coach_id: null,
        }),
        supabase.from("usuarios")
          .select("id,nombre,apellido,rol,estado,creado_en")
          .order("creado_en", { ascending: false }).limit(5),
        supabase.from("clientes")
          .select("id,nombre,apellido,estado,creado_en")
          .order("creado_en", { ascending: false }).limit(5),
        supabase.from("entrenadores").select("id", { count: "exact", head: true }).eq("estado", "activo"),
      ]);
      const fallo = resultadoResumen.error || resultadoUsuarios.error || resultadoClientes.error || resultadoEntrenadores.error;
      if (fallo) {
        setError(traducirErrorSupabase(fallo));
      } else {
        setResumen(resultadoResumen.data || {});
        setUsuarios(resultadoUsuarios.data || []);
        setClientes(resultadoClientes.data || []);
        setEntrenadoresActivos(resultadoEntrenadores.count || 0);
      }
      setCargando(false);
    };
    const temporizador = window.setTimeout(() => void cargar(), 0);
    return () => window.clearTimeout(temporizador);
  }, []);

  if (cargando) return <p style={{ color: "#777", padding: "40px", textAlign: "center" }}>Cargando resumen...</p>;

  const tarjetas = [
    ["Clientes registrados", resumen.clientes_total || 0, "#378ADD", "#EEF5FF", "Clientes"],
    ["Entrenadores", entrenadoresActivos, "#1D9E75", "#E1F5EE", "Entrenadores"],
    ["Sesiones últimos 30 días", resumen.sesiones_total || 0, "#69469B", "#F7F0FF", "Reportes", { dias: 30 }],
    ["Sesiones completadas", resumen.sesiones_completadas || 0, "#126B2D", "#EEFFF3", "Reportes", { dias: 30, estado: "completada" }],
  ];

  // Deja el filtro para que Reportes abra ya en el periodo y estado de la tarjeta.
  const abrirTarjeta = (destino, filtro) => {
    try {
      if (filtro) window.sessionStorage.setItem("reportes:filtro-inicial", JSON.stringify(filtro));
    } catch { /* sin almacenamiento: Reportes abre con sus valores por defecto */ }
    setSeccion(destino);
  };

  const tarjetaBase = { background: "#FFFFFF", border: "0.5px solid #E5E5E5", borderRadius: "12px", padding: "20px 24px" };
  const avatar = (nombre) => (
    <div aria-hidden="true" style={{ alignItems: "center", background: "#0B0B0B", borderRadius: "50%", color: "#FF5A64", display: "flex", flexShrink: 0, fontSize: "14px", fontWeight: "900", height: "38px", justifyContent: "center", width: "38px" }}>
      {nombre?.[0]?.toUpperCase()}
    </div>
  );
  const insignia = (texto, fondo, color) => (
    <span style={{ background: fondo, borderRadius: "20px", color, fontSize: "10px", fontWeight: "800", padding: "3px 10px" }}>{texto}</span>
  );
  const colorEstado = (estado) => {
    const clave = `${estado || ""}`.toLowerCase();
    if (clave === "activo") return ["#E1F5EE", "#085041"];
    if (clave === "pendiente" || clave === "en evaluación") return ["#FDECEE", "#9B1C24"];
    return ["#F5F5F5", "#555"];
  };
  const titulo = (texto, accion, destino) => (
    <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
      <h4 style={{ color: "#0B0B0B", fontSize: "15px", fontWeight: "900", margin: 0 }}>{texto}</h4>
      <button type="button" onClick={() => setSeccion(destino)} style={{ background: "none", border: 0, color: "#888", cursor: "pointer", fontSize: "12px", fontWeight: "700" }}>{accion}</button>
    </div>
  );

  return (
    <section>
      <header style={{ marginBottom: "22px" }}>
        <h3 style={{ color: "#0B0B0B", fontSize: "20px", fontWeight: "900", margin: 0 }}>Resumen administrativo</h3>
        <p style={{ color: "#888", fontSize: "13px", margin: "4px 0 0" }}>Así va tu gimnasio en los últimos 30 días.</p>
      </header>
      {error && <p role="alert" style={{ background: "#FFF0F0", borderRadius: "8px", color: "#B00020", padding: "12px" }}>{error}</p>}

      <div style={{ display: "grid", gap: "14px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: "22px" }}>
        {tarjetas.map(([etiqueta, valor, color, fondo, destino, filtro]) => (
          <button key={etiqueta} type="button" onClick={() => abrirTarjeta(destino, filtro)} style={{ ...tarjetaBase, borderTop: `4px solid ${color}`, cursor: "pointer", textAlign: "left" }}>
            <span style={{ color: "#888", display: "block", fontSize: "11px", fontWeight: "700", textTransform: "uppercase" }}>{etiqueta}</span>
            <strong style={{ color, display: "block", fontSize: "32px", fontWeight: "900", marginTop: "6px" }}>{valor}</strong>
            <span style={{ background: fondo, borderRadius: "20px", color, display: "inline-block", fontSize: "10px", fontWeight: "800", marginTop: "6px", padding: "2px 9px" }}>Ver detalle</span>
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gap: "18px", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <article style={tarjetaBase}>
          {titulo("Últimas cuentas de personal", "Ver todo", "Entrenadores")}
          {usuarios.length === 0 ? <p style={{ color: "#888", fontSize: "13px" }}>No hay cuentas.</p> : usuarios.map((usuario) => {
            const [fondo, color] = colorEstado(usuario.estado);
            return (
              <div key={usuario.id} style={{ alignItems: "center", borderBottom: "1px solid #F0F0F0", display: "flex", gap: "12px", padding: "11px 0" }}>
                {avatar(usuario.nombre)}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ color: "#0B0B0B", fontSize: "13px" }}>{usuario.nombre} {usuario.apellido}</strong>
                  <p style={{ color: "#888", fontSize: "11px", margin: "2px 0 0", textTransform: "uppercase" }}>{usuario.rol}</p>
                </div>
                {insignia(`${usuario.estado || ""}`.toUpperCase(), fondo, color)}
              </div>
            );
          })}
        </article>
        <article style={tarjetaBase}>
          {titulo("Últimos clientes registrados", "Ver todos", "Clientes")}
          {clientes.length === 0 ? <p style={{ color: "#888", fontSize: "13px" }}>No hay clientes.</p> : clientes.map((cliente) => {
            const [fondo, color] = colorEstado(cliente.estado);
            return (
              <div key={cliente.id} style={{ alignItems: "center", borderBottom: "1px solid #F0F0F0", display: "flex", gap: "12px", padding: "11px 0" }}>
                {avatar(cliente.nombre)}
                <strong style={{ color: "#0B0B0B", flex: 1, fontSize: "13px" }}>{cliente.nombre} {cliente.apellido}</strong>
                {insignia(`${cliente.estado || ""}`.toUpperCase(), fondo, color)}
              </div>
            );
          })}
        </article>
      </div>
    </section>
  );
}