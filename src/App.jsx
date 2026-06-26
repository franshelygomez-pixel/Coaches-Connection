import { useEffect, useState } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import Login from "./pages/Login";
import SeleccionRol from "./pages/SeleccionRol";

function App() {
  const [usuario, setUsuario] = useState(null);
  const [rol, setRol] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUsuario(user);
        const ref = doc(db, "usuarios", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setRol(snap.data().rol);
        } else {
          setRol(null);
        }
      } else {
        setUsuario(null);
        setRol(null);
      }
      setCargando(false);
    });
    return () => unsub();
  }, []);

  if (cargando) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-white">Cargando...</p>
    </div>
  );

  if (!usuario) return <Login />;
  if (!rol) return <SeleccionRol onRolSeleccionado={setRol} />;

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <p className="text-white text-xl">Bienvenido, {usuario.displayName || usuario.email}</p>
        <p className="text-orange-400 mt-2">Rol: {rol}</p>
        <p className="text-gray-400 mt-1">Aquí irá tu dashboard</p>
      </div>
    </div>
  );
}

export default App;