import { useState } from "react";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import Calendario from "./Calendario";
import DashboardAdmin from "../pages/DashboardAdmin";

const menuCoach = [
  { label: "Inicio", icon: "ti-home" },
  { label: "Clientes", icon: "ti-users" },
  { label: "Calendario", icon: "ti-calendar" },
  { label: "Rutinas", icon: "ti-clipboard-list" },
];

const menuAdmin = [
  { label: "Inicio", icon: "ti-home" },
  { label: "Solicitudes", icon: "ti-bell" },
  { label: "Entrenadores", icon: "ti-users" },
  { label: "Clientes", icon: "ti-user-plus" },
  { label: "Reportes", icon: "ti-chart-bar" },
];

export default function Layout({ usuario, rol, datosUsuario }) {
  const [activo, setActivo] = useState("Inicio");
  const [collapsed, setCollapsed] = useState(false);

  const menu = rol === "admin" ? menuAdmin : menuCoach;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F5F5F5" }}>

      {/* Sidebar */}
      <div style={{
        width: collapsed ? "64px" : "220px", background: "#0B0B0B",
        display: "flex", flexDirection: "column", transition: "width 0.3s",
        flexShrink: 0
      }}>
        {/* Logo */}
        <div style={{
          padding: "24px 16px", borderBottom: "0.5px solid #2C2C2C",
          display: "flex", alignItems: "center", justifyContent: "space-between"
        }}>
          {!collapsed && (
            <span style={{ fontSize: "16px", fontWeight: "900", color: "#FFFFFF", letterSpacing: "-0.5px" }}>
              coaches<span style={{ color: "#FFC800" }}>conn</span>
            </span>
          )}
          <button onClick={() => setCollapsed(!collapsed)} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "#888", fontSize: "18px", marginLeft: "auto"
          }}>
            <i className={`ti ${collapsed ? "ti-layout-sidebar-right" : "ti-layout-sidebar"}`} aria-hidden="true" />
          </button>
        </div>

        {/* Menu */}
        <nav style={{ flex: 1, padding: "16px 8px" }}>
          {menu.map((item) => (
            <button key={item.label} onClick={() => setActivo(item.label)} style={{
              display: "flex", alignItems: "center", gap: "12px",
              width: "100%", padding: "12px", borderRadius: "8px",
              border: "none", cursor: "pointer", marginBottom: "4px",
              background: activo === item.label ? "#FFC800" : "transparent",
              color: activo === item.label ? "#0B0B0B" : "#888",
              fontWeight: activo === item.label ? "700" : "400",
              fontSize: "14px", transition: "all 0.15s"
            }}>
              <i className={`ti ${item.icon}`} style={{ fontSize: "18px", flexShrink: 0 }} aria-hidden="true" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Usuario */}
        <div style={{ padding: "16px 8px", borderTop: "0.5px solid #2C2C2C" }}>
          {!collapsed && (
            <div style={{ padding: "8px", marginBottom: "8px" }}>
              <p style={{ color: "#FFFFFF", fontSize: "13px", fontWeight: "500", margin: 0 }}>
                {usuario.displayName || usuario.email}
              </p>
              <p style={{ color: "#FFC800", fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", margin: "2px 0 0" }}>
                {rol}
              </p>
            </div>
          )}
          <button onClick={() => signOut(auth)} style={{
            display: "flex", alignItems: "center", gap: "12px",
            width: "100%", padding: "12px", borderRadius: "8px",
            border: "none", cursor: "pointer", background: "transparent",
            color: "#888", fontSize: "14px"
          }}>
            <i className="ti ti-logout" style={{ fontSize: "18px" }} aria-hidden="true" />
            {!collapsed && <span>Cerrar sesión</span>}
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

        {/* Topbar */}
        <div style={{
          background: "#FFFFFF", borderBottom: "0.5px solid #E5E5E5",
          padding: "0 32px", height: "64px", display: "flex",
          alignItems: "center", justifyContent: "space-between"
        }}>
          <h2 style={{ fontSize: "18px", fontWeight: "900", color: "#0B0B0B", textTransform: "uppercase", letterSpacing: "1px" }}>
            {activo}
          </h2>
          <div style={{
            width: "36px", height: "36px", borderRadius: "50%",
            background: "#FFC800", display: "flex", alignItems: "center",
            justifyContent: "center", fontWeight: "900", fontSize: "14px", color: "#0B0B0B"
          }}>
            {(usuario.displayName || usuario.email)?.[0]?.toUpperCase()}
          </div>
        </div>

        {/* Área de contenido */}
        <div style={{ flex: 1, padding: "32px" }}>
          {rol === "admin" ? (
            <DashboardAdmin seccion={activo} setSeccion={setActivo} />
          ) : activo === "Calendario" ? (
            <Calendario />
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <p style={{ color: "#888", fontSize: "16px" }}>Selecciona una sección del menú</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}