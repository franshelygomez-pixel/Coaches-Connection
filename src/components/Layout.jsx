import { lazy, Suspense, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { normalizarRol, ROLES_PERMITIDOS } from "../utils/permisos";

const Calendario = lazy(() => import("./Calendario"));
const DashboardAdmin = lazy(() => import("../pages/DashboardAdmin"));
const InicioEntrenador = lazy(() => import("./InicioEntrenador"));
const ClientesEntrenador = lazy(() => import("./ClientesEntrenador"));
const RutinasEntrenador = lazy(() => import("./RutinasEntrenador"));
const SesionesEntrenador = lazy(() => import("./SesionesEntrenador"));
const PortalCliente = lazy(() => import("./PortalCliente"));
const CentroNotificaciones = lazy(() => import("./CentroNotificaciones"));
const ReportesFase4 = lazy(() => import("./ReportesFase4"));
const ClientesAdminPaginados = lazy(() => import("./admin/ClientesAdminPaginados"));
const CalendarioAdmin = lazy(() => import("./admin/CalendarioAdmin"));
const InicioAdminFase4 = lazy(() => import("./admin/InicioAdminFase4"));
const CentroAyudaPiloto = lazy(() => import("./CentroAyudaPiloto"));

const CargandoVista = () => (
  <div style={{ color: "#888", padding: "24px", textAlign: "center" }}>
    Cargando sección...
  </div>
);

const menuCoach = [
  { label: "Inicio", icon: "ti-home" },
  { label: "Clientes", icon: "ti-users" },
  { label: "Calendario", icon: "ti-calendar" },
  { label: "Sesiones", icon: "ti-calendar-check" },
  { label: "Rutinas", icon: "ti-clipboard-list" },
  { label: "Reportes", icon: "ti-chart-bar" },
  { label: "Notificaciones", icon: "ti-bell" },
  { label: "Ayuda", icon: "ti-help-circle" },
];

const menuCliente = [
  { label: "Resumen", icon: "ti-home" },
  { label: "Mi rutina", icon: "ti-clipboard-list" },
  { label: "Mis sesiones", icon: "ti-calendar-check" },
  { label: "Calendario", icon: "ti-calendar" },
  { label: "Seguimiento", icon: "ti-chart-line" },
  { label: "Privacidad", icon: "ti-shield-lock" },
  { label: "Notificaciones", icon: "ti-bell" },
  { label: "Ayuda", icon: "ti-help-circle" },
];

const menuAdmin = [
  { label: "Inicio", icon: "ti-home" },
  { label: "Notificaciones", icon: "ti-bell" },
  { label: "Administradores", icon: "ti-shield-lock" },
  { label: "Entrenadores", icon: "ti-users" },
  { label: "Clientes", icon: "ti-user-plus" },
  { label: "Calendario", icon: "ti-calendar" },
  { label: "Reportes", icon: "ti-chart-bar" },
  { label: "Ayuda", icon: "ti-help-circle" },
];

export default function Layout({ usuario, rol, datosUsuario }) {
  const [activo, setActivo] = useState("Inicio");
  const [collapsed, setCollapsed] = useState(false);
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);
  const [notificacionesPendientes, setNotificacionesPendientes] = useState(0);

  const rolNormalizado = normalizarRol(rol);
  const menu = rolNormalizado === ROLES_PERMITIDOS.ADMIN
    ? menuAdmin
    : rolNormalizado === ROLES_PERMITIDOS.CLIENTE
      ? menuCliente
      : menuCoach;

  useEffect(() => {
    const sincronizarRuta = () => {
      const seccionRuta = decodeURIComponent(window.location.hash.replace(/^#\/?/, ""));
      const seccionInicial = rolNormalizado === ROLES_PERMITIDOS.CLIENTE ? "Resumen" : "Inicio";
      setActivo(menu.some((item) => item.label === seccionRuta) ? seccionRuta : seccionInicial);
    };
    sincronizarRuta();
    window.addEventListener("hashchange", sincronizarRuta);
    window.addEventListener("popstate", sincronizarRuta);
    return () => {
      window.removeEventListener("hashchange", sincronizarRuta);
      window.removeEventListener("popstate", sincronizarRuta);
    };
  }, [menu, rolNormalizado]);

  // Los administradores generan los avisos de invitaciones sin aceptar (24 horas) y vencidas.
  // La función es idempotente: no repite avisos ya enviados.
  useEffect(() => {
    if (rolNormalizado !== ROLES_PERMITIDOS.ADMIN) return undefined;
    const generar = () => { void supabase.rpc("generar_avisos_invitaciones"); };
    generar();
    const intervalo = window.setInterval(generar, 10 * 60 * 1000);
    return () => window.clearInterval(intervalo);
  }, [rolNormalizado]);

  useEffect(() => {
    if (!usuario?.id) return undefined;
    const cargarPendientes = async () => {
      const { count, error } = await supabase
        .from("notificaciones")
        .select("id", { count: "exact", head: true })
        .eq("destinatario_id", usuario.id)
        .eq("leida", false);
      if (!error) setNotificacionesPendientes(count || 0);
    };
    const temporizador = window.setTimeout(() => void cargarPendientes(), 0);
    const canal = supabase
      .channel(`contador-notificaciones-${usuario.id}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "notificaciones", filter: `destinatario_id=eq.${usuario.id}`,
      }, () => void cargarPendientes())
      .subscribe();
    return () => {
      window.clearTimeout(temporizador);
      void supabase.removeChannel(canal);
    };
  }, [usuario?.id]);

  const navegar = (seccion) => {
    setActivo(seccion);
    window.history.pushState(null, "", `#/${encodeURIComponent(seccion)}`);
    setMenuMovilAbierto(false);
  };

  // Con Supabase, `usuario` (session.user) no trae displayName como Firebase.
  // El nombre para mostrar viene de la fila de `usuarios` (datosUsuario.nombre).
  const nombreMostrar = datosUsuario?.nombre || usuario.email;

  const renderVistaCoach = () => {
    switch (activo) {
      case "Inicio": return <InicioEntrenador usuario={usuario} datosUsuario={datosUsuario} setSeccion={navegar} />;
      case "Clientes": return <ClientesEntrenador usuario={usuario} />;
      case "Calendario": return <Calendario usuario={usuario} />;
      case "Sesiones": return <SesionesEntrenador usuario={usuario} />;
      case "Rutinas": return <RutinasEntrenador usuario={usuario} />;
      case "Reportes": return <ReportesFase4 rol={rolNormalizado} coachId={usuario.id} />;
      case "Notificaciones": return <CentroNotificaciones usuario={usuario} />;
      default: return <InicioEntrenador usuario={usuario} datosUsuario={datosUsuario} setSeccion={navegar} />;
    }
  };

  if (!rolNormalizado) {
    return (
      <main role="alert" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px" }}>
        <p>No tienes permiso para abrir este panel.</p>
      </main>
    );
  }

  return (
    <div className="app-shell" style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#F5F5F5" }}>

      <a className="skip-link" href="#contenido-principal">
        Saltar al contenido principal
      </a>

      {menuMovilAbierto && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Cerrar menú"
          onClick={() => setMenuMovilAbierto(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`app-sidebar ${menuMovilAbierto ? "mobile-open" : ""}`} style={{
        width: collapsed ? "64px" : "220px", background: "#0B0B0B",
        display: "flex", flexDirection: "column", transition: "width 0.3s",
        flexShrink: 0, height: "100vh", overflowY: "auto"
      }}>
        <div style={{
          padding: collapsed ? "16px 8px" : "20px 16px", borderBottom: "0.5px solid #2C2C2C",
          display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between",
          flexDirection: collapsed ? "column" : "row", gap: collapsed ? "10px" : 0
        }}>
          <div style={{ alignItems: "center", display: "flex", gap: "10px", minWidth: 0 }}>
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Logo de Fittrainer" width="34" height="34" style={{ borderRadius: "50%", flexShrink: 0, height: "34px", width: "34px" }} />
            {!collapsed && (
              <span style={{ fontSize: "16px", fontWeight: "900", color: "#FFFFFF", letterSpacing: "-0.5px" }}>
                Fit<span style={{ color: "#FF5A64" }}>trainer</span>
              </span>
            )}
          </div>
          <button type="button" aria-label={collapsed ? "Expandir menú lateral" : "Contraer menú lateral"} onClick={() => setCollapsed(!collapsed)} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "#888", fontSize: "18px", marginLeft: collapsed ? 0 : "auto"
          }}>
            <i className={`ti ${collapsed ? "ti-layout-sidebar-right" : "ti-layout-sidebar"}`} aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Navegación principal" style={{ flex: 1, padding: "16px 8px" }}>
          {menu.map((item) => (
            <button key={item.label} aria-current={activo === item.label ? "page" : undefined} onClick={() => navegar(item.label)} style={{
              display: "flex", alignItems: "center", gap: "12px",
              width: "100%", padding: "12px", borderRadius: "8px",
              border: "none", cursor: "pointer", marginBottom: "4px",
              background: activo === item.label ? "#E11D2E" : "transparent",
              color: activo === item.label ? "#FFFFFF" : "#888",
              fontWeight: activo === item.label ? "700" : "400",
              fontSize: "14px", transition: "all 0.15s"
            }}>
              <i className={`ti ${item.icon}`} style={{ fontSize: "18px", flexShrink: 0 }} aria-hidden="true" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div style={{ padding: "16px 8px", borderTop: "0.5px solid #2C2C2C" }}>
          {!collapsed && (
            <div style={{ padding: "8px", marginBottom: "8px" }}>
              <p style={{ color: "#FFFFFF", fontSize: "13px", fontWeight: "500", margin: 0 }}>
                {nombreMostrar}
              </p>
              <p style={{ color: "#FF5A64", fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", margin: "2px 0 0" }}>
                {rol}
              </p>
            </div>
          )}
          <button onClick={() => supabase.auth.signOut()} style={{
            display: "flex", alignItems: "center", gap: "12px",
            width: "100%", padding: "12px", borderRadius: "8px",
            border: "none", cursor: "pointer", background: "transparent",
            color: "#888", fontSize: "14px"
          }}>
            <i className="ti ti-logout" style={{ fontSize: "18px" }} aria-hidden="true" />
            {!collapsed && <span>Cerrar sesión</span>}
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <div className="app-main" style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, height: "100vh" }}>
        <header className="app-topbar" style={{
          background: "#FFFFFF", borderBottom: "0.5px solid #E5E5E5",
          padding: "0 32px", height: "64px", display: "flex",
          alignItems: "center", justifyContent: "space-between"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button type="button" className="mobile-menu-button" onClick={() => setMenuMovilAbierto(true)} aria-label="Abrir menú">
              <i className="ti ti-menu-2" aria-hidden="true" />
            </button>
            <h2 style={{ fontSize: "18px", fontWeight: "900", color: "#0B0B0B", textTransform: "uppercase", letterSpacing: "1px" }}>
              {activo}
            </h2>
          </div>
          <div style={{ alignItems: "center", display: "flex", gap: "9px" }}>
            <button type="button" aria-label={`${notificacionesPendientes} notificaciones no leídas`} onClick={() => navegar("Notificaciones")} style={{ background: "#F5F5F5", border: "1px solid #E5E5E5", borderRadius: "50%", cursor: "pointer", height: "36px", position: "relative", width: "36px" }}>
              <span aria-hidden="true">!</span>
              {notificacionesPendientes > 0 && <span style={{ background: "#B00020", borderRadius: "10px", color: "#FFF", fontSize: "9px", fontWeight: "900", minWidth: "17px", padding: "2px 4px", position: "absolute", right: "-5px", top: "-5px" }}>{notificacionesPendientes > 99 ? "99+" : notificacionesPendientes}</span>}
            </button>
            <div style={{
              width: "36px", height: "36px", borderRadius: "50%",
              background: "#E11D2E", display: "flex", alignItems: "center",
              justifyContent: "center", fontWeight: "900", fontSize: "14px", color: "#FFFFFF"
            }}>
              {nombreMostrar?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        <main id="contenido-principal" tabIndex="-1" className="app-content" style={{ flex: 1, minHeight: 0, padding: "32px", overflowY: "auto" }}>
          <div style={{ margin: "0 auto", maxWidth: "1100px", width: "100%" }}>
          <Suspense fallback={<CargandoVista />}>
            {activo === "Ayuda" ? (
              <CentroAyudaPiloto rol={rolNormalizado} />
            ) : activo === "Notificaciones" ? (
              <CentroNotificaciones usuario={usuario} />
            ) : rolNormalizado === ROLES_PERMITIDOS.ADMIN && activo === "Reportes" ? (
              <ReportesFase4 rol={rolNormalizado} />
            ) : rolNormalizado === ROLES_PERMITIDOS.ADMIN && activo === "Calendario" ? (
              <CalendarioAdmin />
            ) : rolNormalizado === ROLES_PERMITIDOS.ADMIN && activo === "Clientes" ? (
              <ClientesAdminPaginados />
            ) : rolNormalizado === ROLES_PERMITIDOS.ADMIN && activo === "Inicio" ? (
              <InicioAdminFase4 setSeccion={navegar} />
            ) : rolNormalizado === ROLES_PERMITIDOS.ADMIN ? (
              <DashboardAdmin seccion={activo} setSeccion={navegar} />
            ) : rolNormalizado === ROLES_PERMITIDOS.CLIENTE ? (
              <PortalCliente datosUsuario={datosUsuario} seccion={activo} setSeccion={navegar} />
            ) : (
              renderVistaCoach()
            )}
          </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}