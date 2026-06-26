import { useState } from "react";
import { auth, provider } from "../firebase";
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

export default function Login() {
  const [isRegistro, setIsRegistro] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleGoogle = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      setError("Error al iniciar sesión con Google");
    }
  };

  const handleEmailAuth = async () => {
    setError("");
    try {
      if (isRegistro) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (e) {
      setError("Correo o contraseña incorrectos");
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
      <h1 className="text-4xl font-bold text-white mb-1">Coaches Connection</h1>
      <p className="text-gray-400 mb-10">Tu plataforma de gestión deportiva</p>

      {/* Coach - Google */}
      <div className="w-full max-w-sm bg-gray-900 rounded-2xl p-6 mb-4">
        <p className="text-white font-semibold mb-1">¿Eres entrenador?</p>
        <p className="text-gray-400 text-sm mb-4">Accede con tu cuenta de Google</p>
        <button
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-semibold px-6 py-3 rounded-xl hover:bg-gray-100 transition"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          Iniciar sesión con Google
        </button>
      </div>

      {/* Gimnasio - Email */}
      <div className="w-full max-w-sm bg-gray-900 rounded-2xl p-6">
        <p className="text-white font-semibold mb-1">¿Eres gimnasio?</p>
        <p className="text-gray-400 text-sm mb-4">Accede con correo y contraseña</p>
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-gray-800 text-white px-4 py-3 rounded-xl mb-3 outline-none focus:ring-2 focus:ring-orange-400"
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-gray-800 text-white px-4 py-3 rounded-xl mb-3 outline-none focus:ring-2 focus:ring-orange-400"
        />
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        <button
          onClick={handleEmailAuth}
          className="w-full bg-orange-500 text-white font-semibold py-3 rounded-xl hover:bg-orange-600 transition"
        >
          {isRegistro ? "Registrarse" : "Iniciar sesión"}
        </button>
        <p
          onClick={() => setIsRegistro(!isRegistro)}
          className="text-center text-gray-400 text-sm mt-3 cursor-pointer hover:text-white"
        >
          {isRegistro ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Regístrate"}
        </p>
      </div>
    </div>
  );
}