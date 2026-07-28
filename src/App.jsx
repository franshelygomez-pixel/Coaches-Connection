import { useEffect, useState } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import Login from "./pages/Login";
import Layout from "./components/Layout";

const ADMIN_EMAIL = "franshelygomez@gmail.com";

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

function App() {
  const [usuario, setUsuario] = useState(null);
  const [rol, setRol] = useState(null);
  const [datosUsuario, setDatosUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  const cargarDatos = async (user) => {
    if (user.email === ADMIN_EMAIL) {
      setRol("admin");
      setDatosUsuario({ nombre: "Administrador", email: user.email, rol: "admin" });
      return;
    }
    const snap = await getDoc(doc(db, "usuarios", user.uid));
    if (snap.exists()) {
      setRol(snap.data().rol);
      setDatosUsuario(snap.data());
    } else {
      setRol(null);
      setDatosUsuario(null);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUsuario(user);
        await cargarDatos(user);
      } else {
        setUsuario(null);
        setRol(null);
        setDatosUsuario(null);
      }
      setCargando(false);
    });
    return () => unsub();
  }, []);

  if (cargando) return (
    <PantallaBase>
      <p style={{ color: "#888", fontSize: "16px" }}>Cargando...</p>
    </PantallaBase>
  );

  if (!usuario) return <Login />;

  if (rol === "coach" && datosUsuario?.estado === "pendiente") return (
    <PantallaBase>
      <Card>
        <h2 style={{ fontSize: "22px", fontWeight: "900", color: "#0B0B0B", marginBottom: "12px" }}>
          Tu solicitud está siendo procesada
        </h2>
        <p style={{ fontSize: "14px", color: "#888", lineHeight: 1.6, marginBottom: "24px" }}>
          El administrador revisará tu solicitud pronto. Por favor espera.
        </p>
        <button onClick={() => signOut(auth)} style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: "13px", color: "#888"
        }}>
          Cerrar sesión
        </button>
      </Card>
    </PantallaBase>
  );

  if (rol === "coach" && (datosUsuario?.estado === "rechazado" || datosUsuario?.estado === "inactivo")) return (
    <PantallaBase>
      <Card>
        <div style={{ width: "48px", height: "48px", background: "#FFF0F0", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <span style={{ color: "#CC0000", fontSize: "22px", fontWeight: "900" }}>X</span>
        </div>
        <h2 style={{ fontSize: "22px", fontWeight: "900", color: "#0B0B0B", marginBottom: "12px" }}>
          Acceso denegado
        </h2>
        <p style={{ fontSize: "14px", color: "#888", lineHeight: 1.6, marginBottom: "24px" }}>
          Tu acceso ha sido denegado. Contacta al administrador para más información.
        </p>
        <button onClick={() => signOut(auth)} style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: "13px", color: "#888"
        }}>
          Cerrar sesión
        </button>
      </Card>
    </PantallaBase>
  );

  if (!rol) return (
    <PantallaBase>
      <Card>
        <p style={{ color: "#888" }}>No tienes un rol asignado.</p>
      </Card>
    </PantallaBase>
  );

  return <Layout usuario={usuario} rol={rol} datosUsuario={datosUsuario} />;
}

export default App;