import { useCallback, useEffect, useState } from "react";
import { supabase, traducirErrorSupabase } from "../supabaseClient";
import Paginacion from "./Paginacion";
import { etiquetaNotificacion, fechaNotificacion } from "../utils/notificaciones";

const POR_PAGINA = 10;

const colores = {
  solicitud: ["#FDECEE", "#9B1C24"],
  cuenta: ["#F1F1F1", "#0B0B0B"],
  sesion: ["#F1F1F1", "#0B0B0B"],
  asistencia: ["#EEFFF3", "#126B2D"],
  rutina: ["#F7F0FF", "#69469B"],
  acceso: ["#0B0B0B", "#FFFFFF"],
  sistema: ["#F5F5F5", "#555"],
};

const Campana = ({ tamano = 20, color = "currentColor" }) => (
  <svg aria-hidden="true" width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

export default function CentroNotificaciones({ usuario }) {
  const usuarioId = usuario?.id;
  const [notificaciones, setNotificaciones] = useState([]);
  const [total, setTotal] = useState(0);
  const [noLeidas, setNoLeidas] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [soloNoLeidas, setSoloNoLeidas] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    if (!usuarioId) return;
    const desde = (pagina - 1) * POR_PAGINA;
    let consulta = supabase
      .from("notificaciones")
      .select("id,tipo,titulo,mensaje,enlace,leida,leida_en,creado_en", { count: "exact" })
      .eq("destinatario_id", usuarioId)
      .order("creado_en", { ascending: false })
      .range(desde, desde + POR_PAGINA - 1);
    if (soloNoLeidas) consulta = consulta.eq("leida", false);
    const [{ data, count, error: errorConsulta }, { count: sinLeer }] = await Promise.all([
      consulta,
      supabase.from("notificaciones").select("id", { count: "exact", head: true })
        .eq("destinatario_id", usuarioId).eq("leida", false),
    ]);
    setNoLeidas(sinLeer || 0);
    if (errorConsulta) {
      console.error("Error cargando notificaciones:", errorConsulta);
      setError(traducirErrorSupabase(errorConsulta));
      setNotificaciones([]);
      setTotal(0);
    } else {
      setError("");
      setNotificaciones(data || []);
      setTotal(count || 0);
    }
    setCargando(false);
  }, [pagina, soloNoLeidas, usuarioId]);

  useEffect(() => {
    if (!usuarioId) return undefined;
    const temporizador = window.setTimeout(() => void cargar(), 0);
    const canal = supabase
      .channel(`notificaciones-${usuarioId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "notificaciones", filter: `destinatario_id=eq.${usuarioId}`,
      }, () => void cargar())
      .subscribe();
    return () => {
      window.clearTimeout(temporizador);
      void supabase.removeChannel(canal);
    };
  }, [cargar, usuarioId]);

  const abrir = async (notificacion) => {
    if (!notificacion.leida) {
      const { error: errorLectura } = await supabase.rpc("marcar_notificacion_leida", {
        p_notificacion_id: notificacion.id,
      });
      if (errorLectura) {
        setError(traducirErrorSupabase(errorLectura));
        return;
      }
    }
    if (notificacion.enlace?.startsWith("#/")) {
      window.location.assign(notificacion.enlace);
      return;
    }
    await cargar();
  };

  const marcarTodas = async () => {
    setProcesando(true);
    setError("");
    const { error: errorLectura } = await supabase.rpc("marcar_todas_notificaciones_leidas");
    setProcesando(false);
    if (errorLectura) {
      setError(traducirErrorSupabase(errorLectura));
      return;
    }
    setPagina(1);
    await cargar();
  };

  const filtros = [[false, "Todas"], [true, "No leídas"]];

  return (
    <section>
      <header style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: "14px", justifyContent: "space-between", marginBottom: "22px" }}>
        <div style={{ alignItems: "center", display: "flex", gap: "14px" }}>
          <div style={{ alignItems: "center", background: "#0B0B0B", borderRadius: "50%", color: "#FF5A64", display: "flex", flexShrink: 0, height: "48px", justifyContent: "center", width: "48px" }}>
            <Campana tamano={22} />
          </div>
          <div>
            <h3 style={{ color: "#0B0B0B", fontSize: "20px", fontWeight: "900", margin: 0 }}>Centro de notificaciones</h3>
            <p style={{ color: "#888", fontSize: "13px", margin: "4px 0 0" }}>
              {noLeidas > 0
                ? `Tienes ${noLeidas} ${noLeidas === 1 ? "aviso sin leer" : "avisos sin leer"}.`
                : "Estás al día, no tienes avisos pendientes."}
            </p>
          </div>
        </div>
        <button type="button" disabled={procesando || noLeidas === 0} onClick={() => void marcarTodas()} style={{ background: "#0B0B0B", border: 0, borderRadius: "999px", color: "#FFFFFF", cursor: procesando || noLeidas === 0 ? "default" : "pointer", fontSize: "13px", fontWeight: "800", opacity: procesando || noLeidas === 0 ? 0.4 : 1, padding: "11px 18px" }}>
          {procesando ? "Guardando..." : "Marcar todas como leídas"}
        </button>
      </header>

      {error && <p role="alert" style={{ background: "#FFF0F0", borderRadius: "8px", color: "#B00020", padding: "12px" }}>{error}</p>}

      <div role="group" aria-label="Filtrar notificaciones" style={{ background: "#FFF", border: "1px solid #E5E5E5", borderRadius: "999px", display: "inline-flex", gap: "4px", marginBottom: "18px", padding: "4px" }}>
        {filtros.map(([valor, etiqueta]) => {
          const activo = soloNoLeidas === valor;
          return (
            <button key={etiqueta} type="button" aria-pressed={activo} onClick={() => { setSoloNoLeidas(valor); setPagina(1); }} style={{ alignItems: "center", background: activo ? "#0B0B0B" : "transparent", border: "none", borderRadius: "999px", color: activo ? "#FFFFFF" : "#666", cursor: "pointer", display: "flex", fontSize: "13px", fontWeight: activo ? "800" : "600", gap: "7px", padding: "9px 16px" }}>
              {etiqueta}
              {valor && noLeidas > 0 && (
                <span style={{ background: activo ? "#0B0B0B" : "#E11D2E", borderRadius: "10px", color: activo ? "#FF5A64" : "#FFFFFF", fontSize: "11px", fontWeight: "900", minWidth: "18px", padding: "1px 6px", textAlign: "center" }}>{noLeidas}</span>
              )}
            </button>
          );
        })}
      </div>

      {cargando ? (
        <p style={{ color: "#777", padding: "36px", textAlign: "center" }}>Cargando notificaciones...</p>
      ) : notificaciones.length === 0 ? (
        <div style={{ alignItems: "center", background: "#FFF", border: "1px dashed #DDD", borderRadius: "14px", display: "flex", flexDirection: "column", gap: "10px", padding: "48px 24px", textAlign: "center" }}>
          <div style={{ alignItems: "center", background: "#FDECEE", borderRadius: "50%", color: "#C4161F", display: "flex", height: "64px", justifyContent: "center", width: "64px" }}>
            <Campana tamano={30} />
          </div>
          <strong style={{ color: "#0B0B0B", fontSize: "16px" }}>
            {soloNoLeidas ? "No tienes avisos sin leer" : "Aún no hay notificaciones"}
          </strong>
          <p style={{ color: "#888", fontSize: "13px", lineHeight: 1.5, margin: 0, maxWidth: "340px" }}>
            {soloNoLeidas
              ? "Todo está al día. Cuando llegue algo nuevo lo verás aquí."
              : "Aquí aparecerán los avisos de invitaciones, accesos, sesiones y rutinas."}
          </p>
          {soloNoLeidas && (
            <button type="button" onClick={() => { setSoloNoLeidas(false); setPagina(1); }} style={{ background: "none", border: 0, color: "#0B0B0B", cursor: "pointer", fontSize: "13px", fontWeight: "800", textDecoration: "underline" }}>
              Ver todas
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gap: "10px" }}>
          {notificaciones.map((notificacion) => {
            const [fondo, color] = colores[notificacion.tipo] || colores.sistema;
            return (
              <article key={notificacion.id} style={{ background: notificacion.leida ? "#FFF" : "#FFF5F5", border: `1px solid ${notificacion.leida ? "#E5E5E5" : "#F4B3B9"}`, borderLeft: `4px solid ${notificacion.leida ? "#E5E5E5" : "#E11D2E"}`, borderRadius: "12px", padding: "16px 18px" }}>
                <div style={{ alignItems: "flex-start", display: "flex", gap: "14px", justifyContent: "space-between" }}>
                  <div style={{ alignItems: "flex-start", display: "flex", gap: "14px", minWidth: 0 }}>
                    <div style={{ alignItems: "center", background: fondo, borderRadius: "50%", color, display: "flex", flexShrink: 0, height: "38px", justifyContent: "center", width: "38px" }}>
                      <Campana tamano={17} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "5px" }}>
                        <span style={{ background: fondo, borderRadius: "20px", color, fontSize: "10px", fontWeight: "800", padding: "3px 9px" }}>
                          {etiquetaNotificacion(notificacion.tipo).toUpperCase()}
                        </span>
                        {!notificacion.leida && <span style={{ color: "#C4161F", fontSize: "10px", fontWeight: "800" }}>NUEVA</span>}
                      </div>
                      <h4 style={{ color: "#0B0B0B", fontSize: "15px", fontWeight: notificacion.leida ? "700" : "900", margin: "0 0 4px" }}>{notificacion.titulo}</h4>
                      <p style={{ color: "#666", fontSize: "13px", lineHeight: 1.5, margin: 0 }}>{notificacion.mensaje}</p>
                      <p style={{ color: "#999", fontSize: "11px", margin: "8px 0 0" }}>{fechaNotificacion(notificacion.creado_en)}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => void abrir(notificacion)} style={{ background: notificacion.leida ? "#F5F5F5" : "#0B0B0B", border: 0, borderRadius: "999px", color: notificacion.leida ? "#555" : "#FFFFFF", cursor: "pointer", flexShrink: 0, fontSize: "12px", fontWeight: "800", padding: "8px 14px" }}>
                    {notificacion.enlace ? "Abrir" : notificacion.leida ? "Leída" : "Marcar leída"}
                  </button>
                </div>
              </article>
            );
          })}
          <Paginacion pagina={pagina} total={total} porPagina={POR_PAGINA} onCambiar={setPagina} />
        </div>
      )}
    </section>
  );
}