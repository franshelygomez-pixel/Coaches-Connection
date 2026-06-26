import { db, auth } from "../firebase";
import { doc, setDoc } from "firebase/firestore";

export default function SeleccionRol({ onRolSeleccionado }) {
  const handleRol = async (rol) => {
    const user = auth.currentUser;
    await setDoc(doc(db, "usuarios", user.uid), {
      nombre: user.displayName || user.email,
      email: user.email,
      rol: rol,
      creadoEn: new Date(),
    });
    onRolSeleccionado(rol);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
      <h2 className="text-3xl font-bold text-white mb-2">¿Cuál es tu rol?</h2>
      <p className="text-gray-400 mb-10">Selecciona cómo usarás Coaches Connection</p>
      <div className="flex gap-6">
        <button
          onClick={() => handleRol("coach")}
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-10 py-6 rounded-2xl text-lg transition"
        >
           Soy Coach
        </button>
        <button
          onClick={() => handleRol("gimnasio")}
          className="bg-gray-700 hover:bg-gray-600 text-white font-bold px-10 py-6 rounded-2xl text-lg transition"
        >
           Soy Gimnasio
        </button>
      </div>
    </div>
  );
}