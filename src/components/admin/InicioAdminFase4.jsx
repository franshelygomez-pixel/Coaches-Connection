import { useCallback, useEffect, useState } from "react";
import { supabase, traducirErrorSupabase } from "../../supabaseClient";

export default function InicioAdminFase4({ setSeccion }) {
  const [usuarios, setUsuarios] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    const [resultadoUsuarios, resultadoClientes] = await Promise.all([
      supabase.from("usuarios")
        .select("id,nombre,apellido,rol,estado,creado_en")
        .order("creado_en", { ascending: false }).limit(5),
      supabase.from("clientes")
        .select("id,nombre,apellido,estado,creado_en")
        .order("creado_en", { ascending: false }).limit(5),
    ]);
    const fallo = resultadoUsuarios.error || resultadoClientes.error;
    if (fallo) {
      setError(traducirErrorSupabase(fallo));
    } else {
      setError("");
      setUsuarios(resultadoUsuarios.data || []);
      setClientes(resultadoClientes.data || []);
    }
    setCargando(false);
  }, []);

  // Datos en vivo: se actualiza con cualquier alta o cambio de cuentas y clientes.
  useEffect(() => {
    const inicio = window.setTimeout(() => void cargar(), 0);
    let canal = supabase.channel("inicio-admin-actividad");
    ["usuarios", "clientes", "entrenadores", "administradores"].forEach((tabla) => {
      canal = canal.on("postgres_changes", { event: "*", schema: "public", table: tabla }, () => void cargar());
    });
    canal.subscribe();
    const intervalo = window.setInterval(() => void cargar(), 60_000);
    return () => {
      window.clearTimeout(inicio);
      window.clearInterval(intervalo);
      void supabase.removeChannel(canal);
    };
  }, [cargar]);

  if (cargando) return <p style={{ color: "#777", padding: "40px", textAlign: "center" }}>Cargando actividad reciente...</p>;

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
    if (clave === "pendiente") return ["#FDECEE", "#9B1C24"];
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
      <h4 style={{ color: "#0B0B0B", fontSize: "16px", fontWeight: "900", margin: "28px 0 4px" }}>Actividad reciente</h4>
      <p style={{ color: "#888", fontSize: "13px", margin: "0 0 14px" }}>Las últimas cuentas de personal y los últimos clientes registrados.</p>
      {error && <p role="alert" style={{ background: "#FFF0F0", borderRadius: "8px", color: "#B00020", padding: "12px" }}>{error}</p>}

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