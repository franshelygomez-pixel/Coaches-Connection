const GUIAS = {
  admin: {
    titulo: "Guía del administrador",
    descripcion: "Gestionas a las personas del gimnasio y supervisas toda la actividad.",
    pasos: [
      "Invita a los entrenadores desde Entrenadores con el botón Nuevo entrenador. Reciben un correo para crear su contraseña.",
      "Registra a los clientes en Clientes con Nuevo cliente. Al guardar, el cliente recibe su invitación por correo.",
      "Asigna cada cliente a un entrenador desde Editar en su tarjeta.",
      "Revisa el Calendario para ver, día por día, qué entrenador tiene sesión y a qué hora.",
      "Consulta Notificaciones y Reportes para dar seguimiento a invitaciones, asistencia y actividad.",
    ],
  },
  coach: {
    titulo: "Guía del entrenador",
    descripcion: "Acompañas a tus clientes: rutinas, sesiones y seguimiento.",
    pasos: [
      "Entra a Clientes para ver a las personas que tienes asignadas y su historial.",
      "Crea tus rutinas en Rutinas y asígnalas a cada cliente.",
      "Agenda las sesiones en Sesiones o en Calendario, dentro del horario de atención del gimnasio.",
      "Después de cada sesión, registra la asistencia del cliente.",
      "Registra las mediciones de tus clientes y revisa su progreso en Reportes.",
    ],
  },
  cliente: {
    titulo: "Guía del cliente",
    descripcion: "Aquí ves tu rutina, tus sesiones y tu progreso.",
    pasos: [
      "Consulta en Mi rutina los ejercicios que tu entrenador te asignó.",
      "Revisa en Calendario tus sesiones por día y la rutina que te toca.",
      "Pulsa Agregar a Google Calendar para guardar una sesión en tu propio calendario.",
      "Sigue tu evolución en Seguimiento, con las mediciones que registra tu entrenador.",
      "En Privacidad puedes consultar y administrar el uso de tus datos.",
    ],
  },
};

const SECCIONES_POR_ROL = {
  admin: [
    ["Inicio", "Resumen del gimnasio: clientes, entrenadores y sesiones del último mes."],
    ["Notificaciones", "Avisos del sistema: cuando alguien acepta su invitación o completa su perfil, y las invitaciones que llevan más de 24 horas sin aceptarse o que vencieron."],
    ["Administradores", "Gestiona las cuentas de administrador y crea invitaciones para sumar nuevos administradores."],
    ["Entrenadores", "Lista de entrenadores con su estado y los clientes que tienen asignados. Desde aquí puedes activarlos o desactivarlos."],
    ["Clientes", "Directorio de todos los clientes: busca, filtra por estado, edita sus datos, asigna entrenador, envía la invitación al portal y consulta su historial de mediciones."],
    ["Calendario", "Agenda del día de todos los entrenadores: qué cliente tiene cada uno y a qué hora. Cambia de día para ver otras fechas; el horario de atención es lunes a viernes de 5:00 a. m. a 10:00 p. m. y sábados de 6:00 a. m. a 5:00 p. m."],
    ["Reportes", "Indicadores por periodo de clientes, rutinas, sesiones y asistencia. Se exportan en CSV, con opción de evidencia anónima."],
  ],
  coach: [
    ["Inicio", "Tu resumen del día: clientes, actividades programadas y accesos rápidos."],
    ["Clientes", "Consulta a los clientes que el administrador te asignó, abre su expediente, anota mediciones y asígnales una rutina."],
    ["Calendario", "Agenda tus sesiones y eventos. Solo se pueden programar dentro del horario de atención: lunes a viernes de 5:00 a. m. a 10:00 p. m. y sábados de 6:00 a. m. a 5:00 p. m."],
    ["Sesiones", "Consulta tus sesiones y registra la asistencia de cada cliente."],
    ["Rutinas", "Tu biblioteca de rutinas: crea, edita y asígnalas a tus clientes."],
    ["Reportes", "Indicadores de tus propios clientes, sesiones y asistencia, con exportación a CSV."],
    ["Notificaciones", "Avisos internos sobre tus clientes, sesiones y cuenta."],
  ],
  cliente: [
    ["Resumen", "Tus próximas sesiones y tu participación registrada."],
    ["Mi rutina", "La rutina que tu entrenador te asignó y las anteriores."],
    ["Mis sesiones", "Historial de tus sesiones y la asistencia registrada."],
    ["Calendario", "Tus sesiones por día con la rutina que te toca. Usa \"Agregar a Google Calendar\" para guardarlas en tu propio calendario."],
    ["Seguimiento", "Tus mediciones registradas por tu entrenador. Son datos de seguimiento, no un diagnóstico médico."],
    ["Privacidad", "Consulta y administra los consentimientos sobre el uso de tus datos."],
    ["Notificaciones", "Avisos de tu entrenador y del sistema."],
  ],
};

const PREGUNTAS_FRECUENTES = [
  ["No puedo iniciar sesión o olvidé mi contraseña.", "En la pantalla de inicio escribe tu correo y pulsa \"¿Olvidaste tu contraseña?\". Recibirás un enlace para crear una nueva. Los enlaces vencen; si ya expiró, solicita otro."],
  ["No me llegó el correo de invitación.", "Revisa la carpeta de spam. Si no aparece, pide a un administrador que te reenvíe la invitación; el enlace vence a los 7 días."],
  ["¿Cuándo puedo agendar sesiones?", "Lunes a viernes de 5:00 a. m. a 10:00 p. m. y sábados de 6:00 a. m. a 5:00 p. m. Los domingos no hay atención."],
  ["¿Quién puede ver mis datos?", "Cada rol solo ve lo que le corresponde: el entrenador, a sus clientes; el cliente, su propio expediente; el administrador gestiona las cuentas y las invitaciones."],
];

const tarjeta = {
  background: "#FFF",
  border: "1px solid #E5E5E5",
  borderRadius: "12px",
  padding: "20px",
};

export default function CentroAyudaPiloto({ rol }) {
  const guia = GUIAS[rol] || GUIAS.cliente;
  const secciones = SECCIONES_POR_ROL[rol] || [];

  return (
    <section aria-labelledby="titulo-ayuda-piloto">
      <header style={{ alignItems: "start", display: "flex", flexWrap: "wrap", gap: "14px", justifyContent: "space-between", marginBottom: "18px" }}>
        <div>
          <h3 id="titulo-ayuda-piloto" style={{ color: "#0B0B0B", fontSize: "20px", fontWeight: "900", margin: 0 }}>Centro de ayuda</h3>
          <p style={{ color: "#666", fontSize: "13px", lineHeight: 1.6, margin: "4px 0 0", maxWidth: "620px" }}>
            Aquí encuentras cómo usar Fittrainer según tu rol: qué hace cada sección del menú, los pasos recomendados y respuestas a dudas comunes.
          </p>
        </div>
        <button type="button" onClick={() => window.print()} style={{ background: "#0B0B0B", border: 0, borderRadius: "999px", color: "#FFFFFF", cursor: "pointer", fontSize: "13px", fontWeight: "800", padding: "10px 18px" }}>
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