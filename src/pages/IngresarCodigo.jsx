import { useState } from "react";
import { db, auth } from "../firebase";
import { doc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";

export default function IngresarCodigo({ onCodigoIngresado }) {
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleEnviar = async () => {
    setError("");
    if (!codigo) { setError("Ingresa el código del gimnasio"); return; }
    setCargando(true);
    try {
      const q = query(
        collection(db, "usuarios"),
        where("codigoGimnasio", "==", codigo.toUpperCase()),
        where("rol", "==", "gimnasio")
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        setError("Código no válido. Verifica con tu gimnasio.");
        setCargando(false);
        return;
      }
      await updateDoc(doc(db, "usuarios", auth.currentUser.uid), {
        codigoGimnasio: codigo.toUpperCase(),
        estado: "pendiente",
      });
      onCodigoIngresado();
    } catch (e) {
      setError("Error al enviar la solicitud.");
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-sm border border-gray-200">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Únete a un gimnasio</h2>
          <p className="text-gray-400 text-sm mt-2">Ingresa el código que te proporcionó tu gimnasio para enviar tu solicitud</p>
        </div>
        <input
          placeholder="Ej: GYM-A3X9"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-center text-xl font-bold tracking-widest outline-none focus:ring-2 focus:ring-blue-900 mb-3"
        />
        {error && <p className="text-red-400 text-sm text-center mb-3">{error}</p>}
        <button
          onClick={handleEnviar}
          disabled={cargando}
          className="w-full bg-blue-900 hover:bg-blue-800 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
        >
          {cargando ? "Enviando..." : "Enviar solicitud"}
        </button>
      </div>
    </div>
  );
}