const GUIAS = {
  admin: {
    titulo: "Guía del administrador",
    descripcion: "Gestionas a las personas del gimnasio y supervisas toda la actividad.",
    pasos: [
      "Invita a entrenadores y administradores con su correo. El enlace vence a los 7 días; si no lo usan, puedes reenviar la invitación.",
      "Al registrar un cliente, recibe su invitación por correo. Cada cliente tiene un solo entrenador; para cambiarlo, usa Editar en su tarjeta.",
      "Las sesiones solo se agendan dentro del horario de atención. En el Calendario ves la carga de cada entrenador, día por día.",
      "Si una invitación lleva más de 24 horas sin aceptarse, o vence, te llega un aviso en Notificaciones.",
      "En Inicio elige el periodo y exporta en CSV. La evidencia anónima oculta nombres y correos.",
    ],
  },
  coach: {
    titulo: "Guía del entrenador",
    descripcion: "Acompañas a tus clientes: rutinas, sesiones y seguimiento.",
    pasos: [
      "Crea tus rutinas y asígnalas a cada cliente desde su expediente.",
      "Agenda las sesiones dentro del horario de atención; fuera de él el sistema no las acepta. En un mismo horario puede haber como máximo dos clientes con la misma rutina.",
      "Al terminar cada sesión, registra la asistencia del cliente: presente, ausente o justificada.",
      "Anota las mediciones de tus clientes para seguir su progreso.",
      "En Reportes ves solo tus propios clientes, sesiones y asistencia.",
    ],
  },
  cliente: {
    titulo: "Guía del cliente",
    descripcion: "Aquí ves tu rutina, tus sesiones y tu progreso.",
    pasos: [
      "Tu entrenador te asigna una rutina; en Mi rutina ves sus ejercicios, series y descansos.",
      "En Calendario ves tus sesiones por día. Pulsa Agregar a Google Calendar para guardar una en tu propio calendario.",
      "Tu entrenador registra tus mediciones y en Seguimiento ves tu evolución. Son datos de seguimiento, no un diagnóstico médico.",
      "En Privacidad puedes consultar y administrar el uso de tus datos.",
    ],
  },
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

  return (
    <section aria-labelledby="titulo-ayuda-piloto">
      <header style={{ alignItems: "start", display: "flex", flexWrap: "wrap", gap: "14px", justifyContent: "space-between", marginBottom: "18px" }}>
        <div>
          <h3 id="titulo-ayuda-piloto" style={{ color: "#0B0B0B", fontSize: "20px", fontWeight: "900", margin: 0 }}>Centro de ayuda</h3>
          <p style={{ color: "#666", fontSize: "13px", lineHeight: 1.6, margin: "4px 0 0", maxWidth: "620px" }}>
            Aquí encuentras los pasos recomendados y las respuestas a las dudas más comunes según tu rol.
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