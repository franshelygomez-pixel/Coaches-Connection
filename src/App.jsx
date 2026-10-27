import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import {
  actualizarContrasena,
  CONFIGURACION_SUPABASE_VALIDA,
  obtenerOCrearPerfil,
  supabase,
  traducirErrorSupabase,
} from "./supabaseClient";
import { ACCESOS, evaluarAcceso, normalizarRol } from "./utils/permisos";

const Login = lazy(() => import("./pages/Login"));
const Layout = lazy(() => import("./components/Layout"));
const CompletarPerfil = lazy(() => import("./components/CompletarPerfil"));

const PantallaBase = ({ children }) => (
  <div style={{ minHeight: "100vh", background: "#F5F5F5", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
    {children}
  </div>
);

const Card = ({ children }) => (
  <div style={{ background: "#FFFFFF", borderRadius: "12px", padding: "40px", width: "100%", maxWidth: "440px", border: "0.5px solid #E5E5E5", textAlign: "center" }}>
    {children}
  </div>
);

// El enlace de invitación llega como #access_token=...&type=invite.
// Se lee al cargar el módulo, antes de que Supabase limpie la URL.
const ENLACE_INVITACION = typeof window !== "undefined"
  && /[#&?]type=invite(&|$)/.test(`${window.location.hash}${window.location.search}`);

function App() {
  const [usuario, setUsuario] = useState(null);
  const [rol, setRol] = useState(null);
  const [datosUsuario, setDatosUsuario] = useState(null);
  const [cargando, setCargando] = useState(CONFIGURACION_SUPABASE_VALIDA);
  const [errorPerfil, setErrorPerfil] = useState("");
  const [recuperandoContrasena, setRecuperandoContrasena] = useState(false);
  const [esInvitacion, setEsInvitacion] = useState(false);
  const [estadoPerfil, setEstadoPerfil] = useState({ pendiente: false });
  const [nuevaContrasena, setNuevaContrasena] = useState("");
  const [confirmarContrasena, setConfirmarContrasena] = useState("");
  const [verContrasena, setVerContrasena] = useState(false);
  const [guardandoContrasena, setGuardandoContrasena] = useState(false);
  const [mensajeRecuperacion, setMensajeRecuperacion] = useState("");
  const solicitudSesion = useRef(0);

  const manejarSesion = useCallback(async (session) => {
    const solicitudActual = solicitudSesion.current + 1;
    solicitudSesion.current = solicitudActual;
    if (!session) {
      setUsuario(null);
      setRol(null);
      setDatosUsuario(null);
      setEstadoPerfil({ pendiente: false });
      setCargando(false);
      setErrorPerfil("");
      return;
    }

    const user = session.user;

    // Recupera el perfil existente o completa el perfil pendiente después
    // de que el usuario confirma su correo e inicia sesión por primera vez.
    const { data: fila, error } = await obtenerOCrearPerfil(user);

    if (solicitudActual !== solicitudSesion.current) return;

    if (error) {
      console.error("No se pudo cargar el perfil:", error);
      setUsuario(user);
      setRol(null);
      setDatosUsuario(null);
      setErrorPerfil(traducirErrorSupabase(error, "perfil"));
      setCargando(false);
      return;
    }

    const rolNormalizado = normalizarRol(fila?.rol);
    // ¿Falta completar teléfono, dirección, fecha de nacimiento y documento?
    // Si la función aún no existe en la base de datos, no se bloquea el acceso.
    let perfil = { pendiente: false };
    if (rolNormalizado) {
      const { data: estado, error: errorEstado } = await supabase.rpc("estado_mi_perfil");
      if (solicitudActual !== solicitudSesion.current) return;
      if (errorEstado) console.warn("No se pudo consultar el estado del perfil:", errorEstado.message);
      else if (estado) perfil = estado;
    }
    setEstadoPerfil(perfil);
    setUsuario(user);
    setRol(rolNormalizado);
    setDatosUsuario(fila || null);
    setErrorPerfil(
      !fila
        ? "Tu cuenta no tiene un perfil asociado en la aplicación."
        : !rolNormalizado
          ? "Tu perfil no tiene un rol permitido. Contacta al administrador."
          : ""
    );
    setCargando(false);
  }, []);

  useEffect(() => {
    if (!CONFIGURACION_SUPABASE_VALIDA) {
      return undefined;
    }
    supabase.auth.getSession().then(({ data: { session } }) => void manejarSesion(session));

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") setRecuperandoContrasena(true);
      if (event === "SIGNED_IN" && ENLACE_INVITACION && session) {
        setEsInvitacion(true);
        setRecuperandoContrasena(true);
      }
      void manejarSesion(session);
    });

    return () => listener.subscription.unsubscribe();
  }, [manejarSesion]);

  useEffect(() => {
    if (!usuario?.id) return undefined;

    const esCliente = rol === "cliente";
    const tablaPerfil = esCliente ? "cuentas_clientes" : "usuarios";
    const filtroPerfil = esCliente ? `usuario_id=eq.${usuario.id}` : `id=eq.${usuario.id}`;

    const canalPerfil = supabase
      .channel(`perfil-propio-${usuario.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: tablaPerfil, filter: filtroPerfil },
        async () => {
          const { data: { session } } = await supabase.auth.getSession();
          void manejarSesion(session);
        }
      )
      .subscribe();

    return () => { void supabase.removeChannel(canalPerfil); };
  }, [manejarSesion, rol, usuario?.id]);

  const guardarNuevaContrasena = async (evento) => {
    evento.preventDefault();
    setMensajeRecuperacion("");
    if (nuevaContrasena.length < 8) {
      setMensajeRecuperacion("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (nuevaContrasena !== confirmarContrasena) {
      setMensajeRecuperacion("Las contraseñas no coinciden.");
      return;
    }
    setGuardandoContrasena(true);
    const { error } = await actualizarContrasena(nuevaContrasena);
    setGuardandoContrasena(false);
    if (error) {
      setMensajeRecuperacion(traducirErrorSupabase(error));
      return;
    }
    setRecuperandoContrasena(false);
    setEsInvitacion(false);
    setNuevaContrasena("");
    setConfirmarContrasena("");
  };

  if (cargando) return (
    <PantallaBase>
      <p style={{ color: "#888", fontSize: "16px" }}>Cargando...</p>
    </PantallaBase>
  );

  if (recuperandoContrasena) {
    const cumpleLargo = nuevaContrasena.length >= 8;
    const coinciden = confirmarContrasena.length > 0 && nuevaContrasena === confirmarContrasena;
    const estiloCampo = { background: "#2C2C2C", border: "0.5px solid #3C3C3C", borderRadius: "8px", boxSizing: "border-box", color: "#FFFFFF", display: "block", fontSize: "14px", outline: "none", padding: "14px", width: "100%" };
    const etiqueta = { color: "#CCC", display: "block", fontSize: "12px", marginBottom: "6px" };
    const requisito = (cumple, texto) => (
      <li style={{ alignItems: "center", color: cumple ? "#BDEBC9" : "#888", display: "flex", fontSize: "12px", gap: "8px", listStyle: "none" }}>
        <span aria-hidden="true" style={{ background: cumple ? "#BDEBC9" : "#3C3C3C", borderRadius: "50%", display: "inline-block", height: "8px", width: "8px" }} />
        {texto}
      </li>
    );
    return (
      <main style={{ alignItems: "center", background: "#0B0B0B", display: "flex", justifyContent: "center", minHeight: "100vh", padding: "24px" }}>
        <div style={{ width: "100%", maxWidth: "440px" }}>
          <div style={{ marginBottom: "32px", textAlign: "center" }}>
            <span style={{ color: "#FFFFFF", fontSize: "28px", fontWeight: "900", letterSpacing: "-1px" }}>
              Fit<span style={{ color: "#FF5A64" }}>trainer</span>
            </span>
          </div>
          <form onSubmit={guardarNuevaContrasena} style={{ background: "#1A1A1A", border: "0.5px solid #2C2C2C", borderRadius: "12px", padding: "32px" }}>
            <h1 style={{ color: "#FFFFFF", fontSize: "24px", fontWeight: "900", margin: "0 0 8px" }}>
              {esInvitacion ? "Crea tu contraseña" : "Crear nueva contraseña"}
            </h1>
            <p style={{ color: "#888", fontSize: "13px", lineHeight: 1.6, margin: "0 0 24px" }}>
              {esInvitacion
                ? "Tu invitación fue aceptada. Elige una contraseña para entrar a Fittrainer."
                : "Elige una contraseña nueva para tu cuenta."}
            </p>

            <label htmlFor="nueva-contrasena" style={etiqueta}>Contraseña</label>
            <div style={{ marginBottom: "14px", position: "relative" }}>
              <input id="nueva-contrasena" type={verContrasena ? "text" : "password"} autoComplete="new-password" minLength={8}
                value={nuevaContrasena} onChange={(evento) => setNuevaContrasena(evento.target.value)}
                style={{ ...estiloCampo, paddingRight: "84px" }} />
              <button type="button" onClick={() => setVerContrasena((v) => !v)} aria-pressed={verContrasena}
                style={{ background: "none", border: 0, color: "#FF5A64", cursor: "pointer", fontSize: "12px", fontWeight: "700", position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)" }}>
                {verContrasena ? "Ocultar" : "Mostrar"}
              </button>
            </div>

            <label htmlFor="confirmar-contrasena" style={etiqueta}>Confirmar contraseña</label>
            <input id="confirmar-contrasena" type={verContrasena ? "text" : "password"} autoComplete="new-password"
              value={confirmarContrasena} onChange={(evento) => setConfirmarContrasena(evento.target.value)}
              style={{ ...estiloCampo, marginBottom: "16px" }} />

            <ul style={{ display: "grid", gap: "6px", margin: "0 0 20px", padding: 0 }}>
              {requisito(cumpleLargo, "Mínimo 8 caracteres")}
              {requisito(coinciden, "Las dos contraseñas coinciden")}
            </ul>

            {mensajeRecuperacion && <p role="alert" style={{ color: "#FF6666", fontSize: "13px", margin: "0 0 14px" }}>{mensajeRecuperacion}</p>}

            <button type="submit" disabled={guardandoContrasena}
              style={{ background: "#FFFFFF", border: "none", borderRadius: "8px", color: "#0B0B0B", cursor: guardandoContrasena ? "default" : "pointer", fontSize: "14px", fontWeight: "900", letterSpacing: "0.5px", opacity: guardandoContrasena ? 0.7 : 1, padding: "14px", width: "100%" }}>
              {guardandoContrasena ? "GUARDANDO..." : "GUARDAR CONTRASEÑA"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  if (!CONFIGURACION_SUPABASE_VALIDA) return (
    <PantallaBase>
      <Card>
        <div style={{ background: "#FDECEE", borderRadius: "50%", display: "grid", height: "52px", margin: "0 auto 18px", placeItems: "center", width: "52px" }}>
          <strong style={{ color: "#9B1C24", fontSize: "22px" }}>!</strong>
        </div>
        <h1 style={{ fontSize: "22px", marginBottom: "12px" }}>Configuración pendiente</h1>
        <p role="alert" style={{ color: "#666", fontSize: "14px", lineHeight: 1.6, marginBottom: "14px" }}>
          La aplicación no encontró una configuración válida de Supabase.
        </p>
        <p style={{ background: "#F5F5F5", borderRadius: "8px", color: "#333", fontSize: "12px", lineHeight: 1.7, padding: "12px", textAlign: "left" }}>
          Crea el archivo <strong>.env</strong> y completa <strong>VITE_SUPABASE_URL</strong> y <strong>VITE_SUPABASE_ANON_KEY</strong>. Después reinicia <strong>npm run dev</strong>.
        </p>
      </Card>
    </PantallaBase>
  );

  if (!usuario) return (
    <Suspense fallback={<PantallaBase><p style={{ color: "#888" }}>Cargando acceso...</p></PantallaBase>}>
      <Login />
    </Suspense>
  );

  const acceso = evaluarAcceso(rol, datosUsuario?.estado);

  if (acceso === ACCESOS.PENDIENTE) return (
    <PantallaBase>
      <Card>
        <h2 style={{ fontSize: "22px", fontWeight: "900", color: "#0B0B0B", marginBottom: "12px" }}>
          Tu solicitud está siendo procesada
        </h2>
        <p style={{ fontSize: "14px", color: "#888", lineHeight: 1.6, marginBottom: "24px" }}>
          La institución revisará tu solicitud y activará el acceso correspondiente. Por favor espera.
        </p>
        <button onClick={() => supabase.auth.signOut()} style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: "13px", color: "#888"
        }}>
          Cerrar sesión
        </button>
      </Card>
    </PantallaBase>
  );

  if (acceso === ACCESOS.DENEGADO) return (
    <PantallaBase>
      <Card>
        <div style={{ width: "48px", height: "48px", background: "#FFF0F0", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <span style={{ color: "#CC0000", fontSize: "22px", fontWeight: "900" }}>X</span>
        </div>
        <h2 style={{ fontSize: "22px", fontWeight: "900", color: "#0B0B0B", marginBottom: "12px" }}>
          Acceso denegado
        </h2>
        <p style={{ fontSize: "14px", color: "#888", lineHeight: 1.6, marginBottom: "24px" }}>
          Tu acceso está inactivo o fue rechazado. Contacta al administrador para más información.
        </p>
        <button onClick={() => supabase.auth.signOut()} style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: "13px", color: "#888"
        }}>
          Cerrar sesión
        </button>
      </Card>
    </PantallaBase>
  );

  if (acceso !== ACCESOS.AUTORIZADO) return (
    <PantallaBase>
      <Card>
        <h2 style={{ fontSize: "21px", marginBottom: "12px" }}>No se pudo abrir tu panel</h2>
        <p role="alert" style={{ color: "#777", lineHeight: 1.6, marginBottom: "20px" }}>
          {errorPerfil || "No tienes un rol asignado."}
        </p>
        <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "10px" }}>
          <button type="button" onClick={() => window.location.reload()} style={{ background: "#0B0B0B", color: "#FFFFFF", border: 0, borderRadius: "8px", cursor: "pointer", fontWeight: "800", padding: "11px 16px" }}>
            Intentar nuevamente
          </button>
          <button type="button" onClick={() => supabase.auth.signOut()} style={{ background: "#EEE", border: 0, borderRadius: "8px", cursor: "pointer", padding: "11px 16px" }}>
            Cerrar sesión
          </button>
        </div>
      </Card>
    </PantallaBase>
  );

  if (estadoPerfil.pendiente) return (
    <Suspense fallback={<PantallaBase><p style={{ color: "#888" }}>Cargando...</p></PantallaBase>}>
      <CompletarPerfil
        nombre={estadoPerfil.nombre}
        telefonoInicial={estadoPerfil.telefono}
        onListo={() => setEstadoPerfil({ pendiente: false })}
      />
    </Suspense>
  );

  return (
    <Suspense fallback={<PantallaBase><p style={{ color: "#888" }}>Cargando panel...</p></PantallaBase>}>
      <Layout usuario={usuario} rol={rol} datosUsuario={datosUsuario} />
    </Suspense>
  );
}

export default App;