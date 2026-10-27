const TOKEN_KEY = "coachesConnectionGoogleCalendarToken";
const SCRIPT_ID = "google-identity-services";

export function obtenerTokenGoogle() {
  return sessionStorage.getItem(TOKEN_KEY) || "";
}

export function guardarTokenGoogle(token) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
}

export function eliminarTokenGoogle() {
  sessionStorage.removeItem(TOKEN_KEY);
}

function cargarGoogleIdentityServices() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existente = document.getElementById(SCRIPT_ID);
    if (existente) {
      existente.addEventListener("load", resolve, { once: true });
      existente.addEventListener("error", () => reject(new Error("No se pudo cargar Google Identity Services")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("No se pudo cargar Google Identity Services"));
    document.head.appendChild(script);
  });
}

export async function solicitarTokenGoogle(clientId) {
  if (!clientId) throw new Error("Falta VITE_GOOGLE_CLIENT_ID");
  await cargarGoogleIdentityServices();
  return new Promise((resolve, reject) => {
    const cliente = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/calendar.events",
      callback: (respuesta) => {
        if (respuesta.error || !respuesta.access_token) {
          reject(new Error(respuesta.error_description || respuesta.error || "Google no devolvió un token"));
          return;
        }
        guardarTokenGoogle(respuesta.access_token);
        resolve(respuesta.access_token);
      },
      error_callback: () => reject(new Error("La conexión con Google fue cancelada")),
    });
    cliente.requestAccessToken({ prompt: "consent" });
  });
}
