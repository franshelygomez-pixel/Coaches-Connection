import { useMemo } from "react";
import { obtenerGuiaRol, VERSION_APLICACION, VERSION_BACKEND_PILOTO } from "../utils/piloto";

const SECCIONES_POR_ROL = {
  admin: [
    ["Inicio", "Resumen del gimnasio: clientes, sesiones del último mes y las solicitudes de cuenta pendientes de aprobación."],
    ["Notificaciones", "Avisos internos del sistema dirigidos a tu cuenta, como nuevas solicitudes o cambios importantes."],
    ["Solicitudes", "Cuentas nuevas de entrenadores y administradores que esperan tu decisión. Puedes aprobarlas o rechazarlas."],
    ["Administradores", "Gestiona las cuentas de administrador y crea invitaciones para sumar nuevos administradores."],
    ["Entrenadores", "Lista de entrenadores con su estado y los clientes que tienen asignados. Desde aquí puedes activarlos o desactivarlos."],
    ["Clientes", "Directorio de todos los clientes: busca, filtra por estado, edita sus datos, asigna entrenador y consulta su historial de mediciones."],
    ["Reportes", "Indicadores por periodo de clientes, rutinas, sesiones y asistencia. Se exportan en CSV, con opción de evidencia anónima."],
  ],
  coach: [
    ["Inicio", "Tu resumen del día: clientes, actividades programadas y accesos rápidos."],
    ["Clientes", "Consulta a los clientes que el administrador te asignó, abre su expediente, anota mediciones y asígnales una rutina."],
    ["Calendario", "Agenda tus sesiones. Si conectas tu Google Calendar, también verás esos eventos aquí."],
    ["Sesiones", "Consulta tus sesiones y registra la asistencia de cada cliente."],
    ["Rutinas", "Tu biblioteca de rutinas: crea, edita y asígnalas a tus clientes."],
    ["Reportes", "Indicadores de tus propios clientes, sesiones y asistencia, con exportación a CSV."],
    ["Notificaciones", "Avisos internos sobre tus clientes, sesiones y cuenta."],
  ],
  cliente: [
    ["Resumen", "Tus próximas sesiones y tu participación registrada."],
    ["Mi rutina", "La rutina que tu entrenador te asignó y las anteriores."],
    ["Mis sesiones", "Historial de tus sesiones y la asistencia registrada."],
    ["Seguimiento", "Tus mediciones registradas por tu entrenador. Son datos de seguimiento, no un diagnóstico médico."],
    ["Privacidad", "Consulta y administra los consentimientos sobre el uso de tus datos."],
    ["Notificaciones", "Avisos de tu entrenador y del sistema."],
  ],
};

const PREGUNTAS_FRECUENTES = [
  ["No puedo iniciar sesión o olvidé mi contraseña.", "En la pantalla de inicio escribe tu correo y pulsa \"¿Olvidaste tu contraseña?\". Recibirás un enlace para crear una nueva. Los enlaces vencen; si ya expiró, solicita otro."],
  ["Mi cuenta aparece como pendiente.", "Las cuentas de entrenador y administrador deben ser aprobadas por un administrador antes de poder usar el sistema."],
  ["¿Quién puede ver mis datos?", "Cada rol solo ve lo que le corresponde: el entrenador, a sus clientes; el cliente, su propio expediente; el administrador gestiona las cuentas y las invitaciones."],
];

const tarjeta = {
  background: "#FFF",
  border: "1px solid #E5E5E5",
  borderRadius: "12px",
  padding: "20px",
};

export default function CentroAyudaPiloto({ rol }) {
  const guia = useMemo(() => obtenerGuiaRol(rol), [rol]);
  const secciones = SECCIONES_POR_ROL[rol] || [];

  return (
    <section aria-labelledby="titulo-ayuda-piloto">
      <header style={{ alignItems: "start", display: "flex", flexWrap: "wrap", gap: "14px", justifyContent: "space-between", marginBottom: "18px" }}>
        <div>
          <h3 id="titulo-ayuda-piloto" style={{ color: "#0B0B0B", fontSize: "20px", fontWeight: "900", margin: 0 }}>Centro de ayuda</h3>
          <p style={{ color: "#666", fontSize: "13px", lineHeight: 1.6, margin: "4px 0 0", maxWidth: "620px" }}>
            Aquí encuentras cómo usar Coaches Connection según tu rol: qué hace cada sección del menú, los pasos recomendados y respuestas a dudas comunes.
          </p>
          <p style={{ color: "#999", fontSize: "11px", margin: "4px 0 0" }}>
            Versión {VERSION_APLICACION} · requiere backend {VERSION_BACKEND_PILOTO} o superior
          </p>
        </div>
        <button type="button" onClick={() => window.print()} style={{ background: "#0B0B0B", border: 0, borderRadius: "999px", color: "#FF5A64", cursor: "pointer", fontSize: "13px", fontWeight: "800", padding: "10px 18px" }}>
          Imprimir guía
        </button>
      </header>

      <article style={{ ...tarjeta, marginBottom: "18px" }}>
        <h4 style={{ color: "#0B0B0B", fontSize: "17px", fontWeight: "900", margin: "0 0 6px" }}>{guia.titulo}</h4>
        <p style={{ color: "#666", fontSize: "13px", lineHeight: 1.6, margin: 0 }}>{guia.descripcion}</p>
        <ol style={{ display: "grid", gap: "12px", listStyle: "none", margin: "16px 0 0", padding: 0 }}>
          {guia.pasos.map((paso, indice) => (
            <li key={paso} style={{ alignItems: "flex-start", display: "flex", gap: "12px", lineHeight: 1.55 }}>
              <span aria-hidden="true" style={{ alignItems: "center", background: "#E11D2E", borderRadius: "50%", color: "#FFFFFF", display: "flex", flexShrink: 0, fontSize: "12px", fontWeight: "900", height: "26px", justifyContent: "center", width: "26px" }}>{indice + 1}</span>
              <span style={{ color: "#222", fontSize: "14px", paddingTop: "2px" }}>{paso}</span>
            </li>
          ))}
        </ol>
      </article>

      {secciones.length > 0 && (
        <article style={{ ...tarjeta, marginBottom: "18px" }}>
          <h4 style={{ color: "#0B0B0B", fontSize: "17px", fontWeight: "900", margin: "0 0 4px" }}>Qué hace cada sección</h4>
          <p style={{ color: "#888", fontSize: "13px", margin: "0 0 14px" }}>Corresponden a las opciones del menú lateral.</p>
          <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            {secciones.map(([nombre, descripcion]) => (
              <div key={nombre} style={{ background: "#FAFAFA", border: "1px solid #EEE", borderLeft: "4px solid #E11D2E", borderRadius: "10px", padding: "12px 14px" }}>
                <strong style={{ color: "#0B0B0B", fontSize: "13px" }}>{nombre}</strong>
                <p style={{ color: "#666", fontSize: "12px", lineHeight: 1.5, margin: "4px 0 0" }}>{descripcion}</p>
              </div>
            ))}
          </div>
        </article>
      )}

      <article style={{ ...tarjeta, marginBottom: "18px" }}>
        <h4 style={{ color: "#0B0B0B", fontSize: "17px", fontWeight: "900", margin: "0 0 12px" }}>Preguntas frecuentes</h4>
        <div style={{ display: "grid", gap: "8px" }}>
          {PREGUNTAS_FRECUENTES.map(([pregunta, respuesta]) => (
            <details key={pregunta} style={{ background: "#FAFAFA", border: "1px solid #EEE", borderRadius: "10px", padding: "12px 14px" }}>
              <summary style={{ color: "#0B0B0B", cursor: "pointer", fontSize: "13px", fontWeight: "700" }}>{pregunta}</summary>
              <p style={{ color: "#666", fontSize: "13px", lineHeight: 1.6, margin: "8px 0 0" }}>{respuesta}</p>
            </details>
          ))}
        </div>
      </article>
    </section>
  );
}