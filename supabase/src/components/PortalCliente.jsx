import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, traducirErrorSupabase } from "../supabaseClient";
import { consentimientoActual, resumirAsistencia } from "../utils/sesiones";
import { detalleDeRutina, enlaceGoogleCalendar } from "../utils/googleEnlace";

const tarjeta = {
  background: "#FFFFFF", border: "0.5px solid #E5E5E5", borderRadius: "12px", padding: "20px 24px",
};

const fechaLegible = (valor) => valor
  ? new Date(valor).toLocaleString("es-DO", { dateStyle: "medium", timeStyle: "short" })
  : "Sin fecha";

const hora = (valor) => valor
  ? new Date(valor).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })
  : "";

const numero = (valor) => (valor === null || valor === undefined || valor === "" ? null : Number(valor));
const formato = (valor, unidad = "") => {
  const n = numero(valor);
  return n === null || Number.isNaN(n) ? "Sin dato" : `${Number(n.toFixed(2))}${unidad ? ` ${unidad}` : ""}`;
};

const estadoColor = (estado) => ({
  programada: ["#EEF5FF", "#275A91"], completada: ["#E1F5EE", "#085041"],
  cancelada: ["#F1F1F1", "#555"], presente: ["#E1F5EE", "#085041"],
  ausente: ["#FFF0F0", "#B02A2A"], justificada: ["#FDECEE", "#9B1C24"],
  pendiente: ["#FDECEE", "#9B1C24"], activa: ["#E1F5EE", "#085041"], finalizada: ["#F1F1F1", "#555"],
}[`${estado || ""}`.toLowerCase()] || ["#F1F1F1", "#555"]);

function Insignia({ valor }) {
  if (!valor) return null;
  const [fondo, color] = estadoColor(valor);
  return (
    <span style={{ background: fondo, borderRadius: "20px", color, fontSize: "10px", fontWeight: "800", padding: "4px 10px", textTransform: "uppercase", whiteSpace: "nowrap" }}>
      {`${valor}`.replaceAll("_", " ")}
    </span>
  );
}

function Encabezado({ titulo, descripcion }) {
  return (
    <header style={{ marginBottom: "20px" }}>
      <h3 style={{ color: "#0B0B0B", fontSize: "20px", fontWeight: "900", margin: 0 }}>{titulo}</h3>
      <p style={{ color: "#888", fontSize: "13px", margin: "4px 0 0" }}>{descripcion}</p>
    </header>
  );
}

function Vacio({ titulo, texto, accion }) {
  return (
    <div style={{ alignItems: "center", background: "#FFF", border: "1px dashed #DDD", borderRadius: "14px", display: "flex", flexDirection: "column", gap: "6px", padding: "40px 24px", textAlign: "center" }}>
      <strong style={{ color: "#0B0B0B", fontSize: "15px" }}>{titulo}</strong>
      <p style={{ color: "#888", fontSize: "13px", lineHeight: 1.5, margin: 0, maxWidth: "340px" }}>{texto}</p>
      {accion}
    </div>
  );
}

function Fecha({ valor, activa = true }) {
  const fecha = valor ? new Date(valor) : null;
  return (
    <div aria-hidden="true" style={{ alignItems: "center", background: activa ? "#0B0B0B" : "#F1F1F1", borderRadius: "10px", color: activa ? "#FF5A64" : "#666", display: "flex", flexDirection: "column", flexShrink: 0, height: "52px", justifyContent: "center", width: "52px" }}>
      <strong style={{ fontSize: "18px", lineHeight: 1 }}>{fecha ? fecha.getDate() : "-"}</strong>
      <span style={{ fontSize: "10px", fontWeight: "700", marginTop: "3px", textTransform: "uppercase" }}>
        {fecha ? fecha.toLocaleDateString("es-DO", { month: "short" }).replace(".", "") : ""}
      </span>
    </div>
  );
}

function Filtro({ opciones, valor, onCambiar, etiqueta }) {
  return (
    <div role="group" aria-label={etiqueta} style={{ background: "#FFF", border: "1px solid #E5E5E5", borderRadius: "999px", display: "inline-flex", flexWrap: "wrap", gap: "4px", marginBottom: "16px", padding: "4px" }}>
      {opciones.map(([clave, texto]) => {
        const activo = valor === clave;
        return (
          <button key={clave} type="button" aria-pressed={activo} onClick={() => onCambiar(clave)} style={{ background: activo ? "#0B0B0B" : "transparent", border: "none", borderRadius: "999px", color: activo ? "#FFFFFF" : "#666", cursor: "pointer", fontSize: "13px", fontWeight: activo ? "800" : "600", padding: "9px 16px" }}>
            {texto}
          </button>
        );
      })}
    </div>
  );
}

function GraficaPeso({ puntos }) {
  if (puntos.length < 2) return null;
  const ancho = 640;
  const alto = 170;
  const margen = { izq: 44, der: 16, arriba: 16, abajo: 28 };
  const valores = puntos.map((punto) => punto.peso);
  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);
  const rango = maximo - minimo || 1;
  const x = (indice) => margen.izq + (indice * (ancho - margen.izq - margen.der)) / (puntos.length - 1);
  const y = (valor) => margen.arriba + (1 - (valor - minimo) / rango) * (alto - margen.arriba - margen.abajo);
  const trazado = puntos.map((punto, indice) => `${x(indice)},${y(punto.peso)}`).join(" ");
  const corto = (fecha) => new Date(`${fecha}T12:00:00`).toLocaleDateString("es-DO", { day: "numeric", month: "short" });
  return (
    <svg role="img" aria-label={`Evolución del peso entre ${corto(puntos[0].fecha)} y ${corto(puntos[puntos.length - 1].fecha)}`} viewBox={`0 0 ${ancho} ${alto}`} style={{ display: "block", height: "auto", width: "100%" }}>
      {[minimo, (minimo + maximo) / 2, maximo].map((valor) => (
        <g key={valor}>
          <line x1={margen.izq} x2={ancho - margen.der} y1={y(valor)} y2={y(valor)} stroke="#EEE" />
          <text x={margen.izq - 8} y={y(valor) + 4} textAnchor="end" fontSize="11" fill="#999">{Number(valor.toFixed(1))}</text>
        </g>
      ))}
      <polyline points={trazado} fill="none" stroke="#0B0B0B" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {puntos.map((punto, indice) => (
        <circle key={`${punto.fecha}-${indice}`} cx={x(indice)} cy={y(punto.peso)} r="5" fill="#E11D2E" stroke="#0B0B0B" strokeWidth="2" />
      ))}
      <text x={margen.izq} y={alto - 8} fontSize="11" fill="#999">{corto(puntos[0].fecha)}</text>
      <text x={ancho - margen.der} y={alto - 8} textAnchor="end" fontSize="11" fill="#999">{corto(puntos[puntos.length - 1].fecha)}</text>
    </svg>
  );
}

export default function PortalCliente({ datosUsuario, seccion, setSeccion }) {
  const clienteId = datosUsuario?.cliente_id;
  const [cliente, setCliente] = useState(null);
  const [sesiones, setSesiones] = useState([]);
  const [mediciones, setMediciones] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [consentimientos, setConsentimientos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [momentoCarga] = useState(() => Date.now());
  const [filtroSesiones, setFiltroSesiones] = useState("todas");
  const [limiteSesiones, setLimiteSesiones] = useState(10);

  const cargar = useCallback(async () => {
    if (!clienteId) return;
    const [rCliente, rSesiones, rMediciones, rHistorial, rConsentimientos] = await Promise.all([
      supabase.from("clientes")
        .select("id,nombre,apellido,email,telefono,estado,objetivo,plan,rutina_id,rutinas(id,nombre,nivel,contenido)")
        .eq("id", clienteId).maybeSingle(),
      supabase.from("sesiones_entrenamiento")
        .select("id,titulo,inicio,fin,estado,asistencia,observaciones,rutinas(nombre)")
        .eq("cliente_id", clienteId).order("inicio", { ascending: false }).limit(200),
      supabase.from("mediciones")
        .select("id,fecha,peso,estatura,cintura,cadera,imc,icc")
        .eq("cliente_id", clienteId).order("fecha", { ascending: false }).limit(100),
      supabase.from("historial_rutinas")
        .select("id,nombre_rutina,nivel,contenido,estado,asignada_en,finalizada_en")
        .eq("cliente_id", clienteId).order("asignada_en", { ascending: false }),
      supabase.from("consentimientos_datos")
        .select("id,tipo,estado,version_documento,otorgado_en,revocado_en,creado_en")
        .eq("cliente_id", clienteId).order("creado_en", { ascending: false }),
    ]);

    const fallo = rCliente.error || rSesiones.error || rMediciones.error || rHistorial.error || rConsentimientos.error;
    if (fallo) {
      console.error("No se pudo cargar el portal:", fallo);
      setError(traducirErrorSupabase(fallo));
    } else {
      setCliente(rCliente.data || null);
      setSesiones(rSesiones.data || []);
      setMediciones(rMediciones.data || []);
      setHistorial(rHistorial.data || []);
      setConsentimientos(rConsentimientos.data || []);
      setError("");
    }
    setCargando(false);
  }, [clienteId]);

  useEffect(() => {
    if (!clienteId) return undefined;
    const temporizador = window.setTimeout(() => void cargar(), 0);
    const canal = supabase
      .channel(`portal-cliente-${clienteId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "sesiones_entrenamiento", filter: `cliente_id=eq.${clienteId}` }, () => void cargar())
      .on("postgres_changes", { event: "*", schema: "public", table: "historial_rutinas", filter: `cliente_id=eq.${clienteId}` }, () => void cargar())
      .on("postgres_changes", { event: "*", schema: "public", table: "mediciones", filter: `cliente_id=eq.${clienteId}` }, () => void cargar())
      .on("postgres_changes", { event: "*", schema: "public", table: "consentimientos_datos", filter: `cliente_id=eq.${clienteId}` }, () => void cargar())
      .subscribe();
    return () => {
      window.clearTimeout(temporizador);
      void supabase.removeChannel(canal);
    };
  }, [cargar, clienteId]);

  const resumen = useMemo(() => resumirAsistencia(sesiones), [sesiones]);
  const proximas = useMemo(() => sesiones
    .filter((sesion) => sesion.estado === "programada" && new Date(sesion.inicio).getTime() >= momentoCarga)
    .slice().sort((a, b) => new Date(a.inicio) - new Date(b.inicio)), [momentoCarga, sesiones]);

  const registrarConsentimiento = async (tipo, aceptar) => {
    setError("");
    setMensaje("");
    setProcesando(tipo);
    const { error: errorRegistro } = await supabase.rpc("registrar_consentimiento_cliente", {
      p_tipo: tipo,
      p_aceptar: aceptar,
      p_version_documento: "1.0",
    });
    setProcesando("");
    if (errorRegistro) {
      setError(traducirErrorSupabase(errorRegistro));
      return;
    }
    setMensaje(aceptar ? "Consentimiento registrado." : "Revocación registrada.");
    await cargar();
  };

  if (cargando) return <p style={{ color: "#777", padding: "40px", textAlign: "center" }}>Cargando tu portal...</p>;

  // El error de carga se muestra antes que "no se encontró el expediente": si la
  // consulta falló no significa que el expediente no exista.
  if (error && !cliente) {
    return (
      <Vacio
        titulo="No pudimos cargar tu información"
        texto={error}
        accion={<button type="button" onClick={() => { setCargando(true); void cargar(); }} style={{ background: "#0B0B0B", border: 0, borderRadius: "999px", color: "#FFFFFF", cursor: "pointer", fontSize: "13px", fontWeight: "800", marginTop: "10px", padding: "10px 20px" }}>Intentar nuevamente</button>}
      />
    );
  }
  if (!clienteId || !cliente) {
    return <Vacio titulo="No encontramos tu expediente" texto="Tu cuenta aún no está vinculada a un expediente de cliente. Contacta a tu entrenador." />;
  }

  const irA = (nombre) => (typeof setSeccion === "function" ? () => setSeccion(nombre) : undefined);
  const botonEnlace = (texto, destino) => irA(destino) && (
    <button type="button" onClick={irA(destino)} style={{ background: "none", border: 0, color: "#0B0B0B", cursor: "pointer", fontSize: "12px", fontWeight: "800", padding: 0, textDecoration: "underline" }}>{texto}</button>
  );
  const ejercicios = Array.isArray(cliente.rutinas?.contenido) ? cliente.rutinas.contenido : [];
  const titulo4 = { color: "#0B0B0B", fontSize: "15px", fontWeight: "900", margin: "0 0 12px" };

  // La rutina del día va en la descripción del evento: si la sesión usa la rutina actual
  // del cliente se incluyen sus ejercicios; si no, solo el nombre.
  const enlaceGoogleDe = (sesion) => {
    const usaRutinaActual = cliente.rutinas && (!sesion.rutinas?.nombre || sesion.rutinas.nombre === cliente.rutinas.nombre);
    const detalle = usaRutinaActual
      ? detalleDeRutina(cliente.rutinas, ejercicios)
      : detalleDeRutina(sesion.rutinas?.nombre ? { nombre: sesion.rutinas.nombre } : null);
    return enlaceGoogleCalendar({ titulo: sesion.titulo, inicio: sesion.inicio, fin: sesion.fin, detalle });
  };
  const botonGoogle = (sesion) => (
    <a href={enlaceGoogleDe(sesion)} target="_blank" rel="noopener noreferrer"
      style={{ background: "#FFFFFF", border: "1px solid #D5D5D5", borderRadius: "999px", color: "#333", fontSize: "12px", fontWeight: "800", padding: "7px 14px", textDecoration: "none", whiteSpace: "nowrap" }}>
      Agregar a Google Calendar
    </a>
  );

  const renderResumen = () => {
    const tarjetas = [
      ["Próximas sesiones", proximas.length, "#378ADD"],
      ["Sesiones registradas", resumen.total, "#69469B"],
      ["Asistencias", resumen.presentes, "#1D9E75"],
      ["Participación", `${resumen.porcentajeAsistencia}%`, "#C4161F"],
    ];
    return (
      <>
        <div style={{ background: "#0B0B0B", borderRadius: "14px", color: "#FFF", marginBottom: "20px", padding: "24px 28px" }}>
          <p style={{ color: "#FF5A64", fontSize: "11px", fontWeight: "800", letterSpacing: "1.5px", margin: 0, textTransform: "uppercase" }}>Tu portal</p>
          <h3 style={{ fontSize: "26px", fontWeight: "900", margin: "6px 0 4px" }}>Hola, {cliente.nombre}</h3>
          <p style={{ color: "#AAA", fontSize: "13px", margin: 0 }}>Consulta tu planificación y el historial registrado por tu entrenador.</p>
          {(cliente.objetivo || cliente.plan || cliente.estado) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "14px" }}>
              {cliente.estado && <span style={{ background: "#E11D2E", borderRadius: "20px", color: "#FFFFFF", fontSize: "11px", fontWeight: "800", padding: "4px 12px" }}>{`${cliente.estado}`.toUpperCase()}</span>}
              {cliente.plan && <span style={{ background: "#2C2C2C", borderRadius: "20px", color: "#EEE", fontSize: "11px", fontWeight: "700", padding: "4px 12px" }}>Plan: {cliente.plan}</span>}
              {cliente.objetivo && <span style={{ background: "#2C2C2C", borderRadius: "20px", color: "#EEE", fontSize: "11px", fontWeight: "700", padding: "4px 12px" }}>Objetivo: {cliente.objetivo}</span>}
            </div>
          )}
        </div>

        <div style={{ display: "grid", gap: "14px", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", marginBottom: "20px" }}>
          {tarjetas.map(([etiqueta, valor, color]) => (
            <div key={etiqueta} style={{ ...tarjeta, borderTop: `4px solid ${color}`, padding: "16px 20px" }}>
              <p style={{ color: "#888", fontSize: "11px", fontWeight: "700", margin: 0, textTransform: "uppercase" }}>{etiqueta}</p>
              <strong style={{ color, display: "block", fontSize: "30px", fontWeight: "900", marginTop: "6px" }}>{valor}</strong>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
          <article style={tarjeta}>
            <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
              <h4 style={{ ...titulo4, margin: 0 }}>Rutina actual</h4>
              {cliente.rutinas && botonEnlace("Ver rutina", "Mi rutina")}
            </div>
            {cliente.rutinas ? (
              <>
                <strong style={{ color: "#0B0B0B", fontSize: "17px" }}>{cliente.rutinas.nombre}</strong>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "10px" }}>
                  <span style={{ background: "#FDECEE", borderRadius: "20px", color: "#9B1C24", fontSize: "11px", fontWeight: "800", padding: "4px 12px" }}>Nivel: {cliente.rutinas.nivel || "No especificado"}</span>
                  <span style={{ background: "#F1F1F1", borderRadius: "20px", color: "#555", fontSize: "11px", fontWeight: "700", padding: "4px 12px" }}>{ejercicios.length} ejercicios</span>
                </div>
              </>
            ) : <p style={{ color: "#888", fontSize: "13px", margin: 0 }}>Aún no tienes una rutina asignada.</p>}
          </article>

          <article style={tarjeta}>
            <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
              <h4 style={{ ...titulo4, margin: 0 }}>Próximas sesiones</h4>
              {proximas.length > 0 && botonEnlace("Ver todas", "Mis sesiones")}
            </div>
            {proximas.length === 0 ? <p style={{ color: "#888", fontSize: "13px", margin: 0 }}>No tienes sesiones próximas.</p> : (
              <div style={{ display: "grid", gap: "12px" }}>
                {proximas.slice(0, 3).map((sesion) => (
                  <div key={sesion.id} style={{ alignItems: "center", display: "flex", gap: "12px" }}>
                    <Fecha valor={sesion.inicio} />
                    <div>
                      <strong style={{ color: "#0B0B0B", fontSize: "14px" }}>{sesion.titulo}</strong>
                      <p style={{ color: "#888", fontSize: "12px", margin: "2px 0 0" }}>{hora(sesion.inicio)}{sesion.rutinas?.nombre ? ` · ${sesion.rutinas.nombre}` : ""}</p>
                    </div>
                    <div style={{ marginLeft: "auto" }}>{botonGoogle(sesion)}</div>
                  </div>
                ))}
              </div>
            )}
          </article>
        </div>

        {resumen.total > 0 && (
          <article style={{ ...tarjeta, marginTop: "16px" }}>
            <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
              <h4 style={{ ...titulo4, margin: 0 }}>Participación registrada</h4>
              <strong style={{ color: "#0B0B0B", fontSize: "14px" }}>{resumen.porcentajeAsistencia}%</strong>
            </div>
            <div role="progressbar" aria-label="Participación registrada" aria-valuemin={0} aria-valuemax={100} aria-valuenow={resumen.porcentajeAsistencia} style={{ background: "#EEE", borderRadius: "999px", height: "10px", overflow: "hidden" }}>
              <div style={{ background: "#E11D2E", height: "100%", width: `${resumen.porcentajeAsistencia}%` }} />
            </div>
            <p style={{ color: "#888", fontSize: "12px", margin: "8px 0 0" }}>{resumen.presentes} asistencias de {resumen.total} sesiones registradas.</p>
          </article>
        )}
      </>
    );
  };

  const renderRutina = () => (
    <>
      <Encabezado titulo="Mi rutina" descripcion="Consulta la versión de la rutina que tienes asignada actualmente." />
      {!cliente.rutinas ? (
        <Vacio titulo="Aún no tienes rutina" texto="Tu entrenador todavía no te ha asignado una rutina. Cuando lo haga, aparecerá aquí." />
      ) : (
        <>
          <div style={{ background: "#0B0B0B", borderRadius: "14px", color: "#FFF", marginBottom: "16px", padding: "22px 26px" }}>
            <p style={{ color: "#FF5A64", fontSize: "11px", fontWeight: "800", letterSpacing: "1.5px", margin: 0, textTransform: "uppercase" }}>Rutina asignada</p>
            <h4 style={{ fontSize: "22px", fontWeight: "900", margin: "6px 0 10px" }}>{cliente.rutinas.nombre}</h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              <span style={{ background: "#E11D2E", borderRadius: "20px", color: "#FFFFFF", fontSize: "11px", fontWeight: "800", padding: "4px 12px" }}>Nivel: {cliente.rutinas.nivel || "No especificado"}</span>
              <span style={{ background: "#2C2C2C", borderRadius: "20px", color: "#EEE", fontSize: "11px", fontWeight: "700", padding: "4px 12px" }}>{ejercicios.length} ejercicios</span>
            </div>
          </div>
          <div style={{ display: "grid", gap: "10px" }}>
            {ejercicios.length === 0 ? <Vacio titulo="Sin ejercicios registrados" texto="Esta rutina todavía no tiene ejercicios cargados." /> : ejercicios.map((item, indice) => (
              <article key={`${item.ejercicio || "ejercicio"}-${indice}`} style={{ ...tarjeta, alignItems: "flex-start", display: "flex", gap: "16px", padding: "16px 20px" }}>
                <div aria-hidden="true" style={{ alignItems: "center", background: "#E11D2E", borderRadius: "50%", color: "#FFFFFF", display: "flex", flexShrink: 0, fontSize: "14px", fontWeight: "900", height: "36px", justifyContent: "center", width: "36px" }}>{indice + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ color: "#0B0B0B", fontSize: "15px" }}>{item.ejercicio || `Ejercicio ${indice + 1}`}</strong>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
                    {[["Series", item.series], ["Repeticiones", item.repeticiones], ["Descanso", item.descanso]].filter(([, valor]) => valor).map(([etiqueta, valor]) => (
                      <span key={etiqueta} style={{ background: "#F5F5F5", borderRadius: "8px", color: "#333", fontSize: "12px", padding: "5px 10px" }}>
                        <span style={{ color: "#888" }}>{etiqueta}: </span><strong>{valor}</strong>
                      </span>
                    ))}
                  </div>
                  {item.notas && <p style={{ color: "#777", fontSize: "12px", lineHeight: 1.5, margin: "8px 0 0" }}>{item.notas}</p>}
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      <h4 style={{ ...titulo4, marginTop: "28px" }}>Historial de asignaciones</h4>
      <div style={{ display: "grid", gap: "10px" }}>
        {historial.length === 0 ? <Vacio titulo="Sin asignaciones anteriores" texto="Aquí verás las rutinas que has tenido a lo largo del tiempo." /> : historial.map((item) => (
          <article key={item.id} style={{ ...tarjeta, alignItems: "center", display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "space-between", padding: "14px 20px" }}>
            <div>
              <strong style={{ color: "#0B0B0B", fontSize: "14px" }}>{item.nombre_rutina}</strong>
              <p style={{ color: "#888", fontSize: "12px", margin: "3px 0 0" }}>
                Asignada el {fechaLegible(item.asignada_en)} · Nivel: {item.nivel || "No especificado"}
                {item.finalizada_en ? ` · Finalizada el ${fechaLegible(item.finalizada_en)}` : ""}
              </p>
            </div>
            <Insignia valor={item.estado} />
          </article>
        ))}
      </div>
    </>
  );

  const renderSesiones = () => {
    const filtradas = sesiones.filter((sesion) => {
      if (filtroSesiones === "todas") return true;
      if (filtroSesiones === "proximas") return sesion.estado === "programada" && new Date(sesion.inicio).getTime() >= momentoCarga;
      return sesion.estado === filtroSesiones;
    });
    const visibles = filtradas.slice(0, limiteSesiones);
    return (
      <>
        <Encabezado titulo="Mis sesiones" descripcion="Agenda e historial de asistencia registrados por tu entrenador." />
        <Filtro etiqueta="Filtrar sesiones" valor={filtroSesiones} onCambiar={(clave) => { setFiltroSesiones(clave); setLimiteSesiones(10); }}
          opciones={[["todas", "Todas"], ["proximas", "Próximas"], ["completada", "Completadas"], ["cancelada", "Canceladas"]]} />
        <div style={{ display: "grid", gap: "10px" }}>
          {filtradas.length === 0 ? (
            <Vacio titulo="No hay sesiones para mostrar" texto={sesiones.length === 0 ? "Cuando tu entrenador programe sesiones, las verás aquí." : "Prueba con otro filtro."} />
          ) : visibles.map((sesion) => (
            <article key={sesion.id} style={{ ...tarjeta, alignItems: "center", display: "flex", flexWrap: "wrap", gap: "14px", padding: "14px 20px" }}>
              <Fecha valor={sesion.inicio} activa={sesion.estado === "programada"} />
              <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                <strong style={{ color: "#0B0B0B", fontSize: "15px" }}>{sesion.titulo}</strong>
                <p style={{ color: "#888", fontSize: "12px", margin: "3px 0 0" }}>
                  {hora(sesion.inicio)}{sesion.fin ? ` a ${hora(sesion.fin)}` : ""} · {sesion.rutinas?.nombre || "Sin rutina especificada"}
                </p>
                {sesion.observaciones && <p style={{ color: "#666", fontSize: "12px", lineHeight: 1.5, margin: "6px 0 0" }}>{sesion.observaciones}</p>}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                <Insignia valor={sesion.estado} />
                {sesion.asistencia && sesion.asistencia !== sesion.estado && <Insignia valor={sesion.asistencia} />}
                {sesion.estado === "programada" && new Date(sesion.inicio).getTime() >= momentoCarga && botonGoogle(sesion)}
              </div>
            </article>
          ))}
        </div>
        {filtradas.length > visibles.length && (
          <div style={{ marginTop: "16px", textAlign: "center" }}>
            <button type="button" onClick={() => setLimiteSesiones((actual) => actual + 10)} style={{ background: "#FFF", border: "1px solid #D9D9D9", borderRadius: "999px", color: "#333", cursor: "pointer", fontSize: "13px", fontWeight: "700", padding: "10px 22px" }}>
              Mostrar más ({filtradas.length - visibles.length} restantes)
            </button>
          </div>
        )}
      </>
    );
  };

  const renderProgreso = () => {
    const ultima = mediciones[0];
    const anterior = mediciones[1];
    const diferencia = (clave, unidad) => {
      const actual = numero(ultima?.[clave]);
      const previo = numero(anterior?.[clave]);
      if (actual === null || previo === null) return null;
      const cambio = Number((actual - previo).toFixed(2));
      return cambio === 0 ? "Sin cambios" : `${cambio > 0 ? "+" : ""}${cambio} ${unidad}`.trim();
    };
    const resumenMedidas = ultima ? [
      ["Peso", formato(ultima.peso, "kg"), diferencia("peso", "kg")],
      ["Estatura", formato(ultima.estatura, "cm"), null],
      ["Cintura", formato(ultima.cintura, "cm"), diferencia("cintura", "cm")],
      ["Cadera", formato(ultima.cadera, "cm"), diferencia("cadera", "cm")],
      ["IMC registrado", formato(ultima.imc), diferencia("imc", "")],
      ["ICC registrado", formato(ultima.icc), null],
    ] : [];
    const puntosPeso = mediciones.filter((m) => numero(m.peso) !== null).slice().reverse()
      .map((m) => ({ fecha: m.fecha, peso: Number(m.peso) }));

    return (
      <>
        <Encabezado titulo="Seguimiento" descripcion="Consulta tus mediciones históricas registradas por tu entrenador." />
        <p style={{ background: "#EEF5FF", borderLeft: "3px solid #378ADD", borderRadius: "0 8px 8px 0", color: "#275A91", fontSize: "12px", lineHeight: 1.5, margin: "0 0 18px", padding: "11px 14px" }}>
          Estos datos son informativos y no constituyen un diagnóstico. Para interpretar información de salud consulta a un profesional autorizado.
        </p>

        {mediciones.length === 0 ? (
          <Vacio titulo="Aún no hay mediciones" texto="Cuando tu entrenador registre tus medidas, podrás ver aquí su evolución." />
        ) : (
          <>
            <p style={{ color: "#888", fontSize: "12px", margin: "0 0 10px" }}>Última medición: {ultima.fecha}</p>
            <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", marginBottom: "18px" }}>
              {resumenMedidas.map(([etiqueta, valor, cambio]) => (
                <div key={etiqueta} style={{ ...tarjeta, padding: "14px 18px" }}>
                  <p style={{ color: "#888", fontSize: "11px", fontWeight: "700", margin: 0, textTransform: "uppercase" }}>{etiqueta}</p>
                  <strong style={{ color: "#0B0B0B", display: "block", fontSize: "22px", fontWeight: "900", marginTop: "5px" }}>{valor}</strong>
                  {cambio && <span style={{ background: "#F5F5F5", borderRadius: "20px", color: "#555", display: "inline-block", fontSize: "10px", fontWeight: "700", marginTop: "6px", padding: "2px 9px" }}>{cambio} vs. anterior</span>}
                </div>
              ))}
            </div>

            {puntosPeso.length >= 2 && (
              <article style={{ ...tarjeta, marginBottom: "18px" }}>
                <h4 style={titulo4}>Evolución del peso (kg)</h4>
                <GraficaPeso puntos={puntosPeso} />
              </article>
            )}

            <article style={{ ...tarjeta, overflowX: "auto" }}>
              <h4 style={titulo4}>Historial de mediciones</h4>
              <table style={{ borderCollapse: "collapse", fontSize: "13px", minWidth: "620px", width: "100%" }}>
                <thead>
                  <tr>{["Fecha", "Peso (kg)", "Estatura (cm)", "Cintura (cm)", "Cadera (cm)", "IMC", "ICC"].map((titulo, indice) => (
                    <th key={titulo} style={{ borderBottom: "1px solid #E5E5E5", color: "#888", fontSize: "11px", fontWeight: "700", padding: "10px 9px", textAlign: indice === 0 ? "left" : "center", textTransform: "uppercase" }}>{titulo}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {mediciones.map((medicion) => (
                    <tr key={medicion.id}>
                      <td style={{ borderBottom: "1px solid #F0F0F0", color: "#0B0B0B", fontWeight: "700", padding: "11px 9px" }}>{medicion.fecha}</td>
                      {["peso", "estatura", "cintura", "cadera", "imc", "icc"].map((clave) => (
                        <td key={clave} style={{ borderBottom: "1px solid #F0F0F0", color: medicion[clave] == null ? "#BBB" : "#333", padding: "11px 9px", textAlign: "center" }}>{medicion[clave] ?? "-"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          </>
        )}
      </>
    );
  };

  const renderPrivacidad = () => {
    const tipos = [
      ["tratamiento_datos", "Tratamiento de datos", "Autoriza el uso de tus datos para operar y evaluar este piloto académico."],
      ["seguimiento_corporal", "Seguimiento corporal", "Autoriza el registro y consulta de mediciones realizadas durante el seguimiento."],
    ];
    return (
      <>
        <Encabezado titulo="Privacidad y consentimiento" descripcion="Puedes otorgar o revocar cada autorización. Todos los cambios quedan registrados." />
        <div style={{ display: "grid", gap: "14px" }}>
          {tipos.map(([tipo, titulo, descripcion]) => {
            const actual = consentimientoActual(consentimientos, tipo);
            const vigente = actual?.estado === "otorgado" && !actual?.revocado_en;
            const [fondo, color, texto] = vigente
              ? ["#E1F5EE", "#085041", "OTORGADO"]
              : actual ? ["#FFF0F0", "#B02A2A", "REVOCADO"] : ["#FDECEE", "#9B1C24", "SIN RESPUESTA"];
            const fechaEstado = vigente ? actual?.otorgado_en : actual?.revocado_en;
            return (
              <article key={tipo} style={{ ...tarjeta, borderLeft: `4px solid ${vigente ? "#1D9E75" : "#E5E5E5"}` }}>
                <div style={{ alignItems: "flex-start", display: "flex", flexWrap: "wrap", gap: "16px", justifyContent: "space-between" }}>
                  <div style={{ flex: "1 1 320px" }}>
                    <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "6px" }}>
                      <h4 style={{ color: "#0B0B0B", fontSize: "16px", fontWeight: "900", margin: 0 }}>{titulo}</h4>
                      <span style={{ background: fondo, borderRadius: "20px", color, fontSize: "10px", fontWeight: "800", padding: "3px 10px" }}>{texto}</span>
                    </div>
                    <p style={{ color: "#666", fontSize: "13px", lineHeight: 1.5, margin: 0 }}>{descripcion}</p>
                    <p style={{ color: "#999", fontSize: "11px", margin: "8px 0 0" }}>
                      Versión del documento 1.0{fechaEstado ? ` · ${vigente ? "Otorgado" : "Revocado"} el ${fechaLegible(fechaEstado)}` : ""}
                    </p>
                  </div>
                  <button type="button" disabled={Boolean(procesando)} onClick={() => void registrarConsentimiento(tipo, !vigente)} style={{ background: vigente ? "#FFF" : "#0B0B0B", border: vigente ? "1px solid #F0C2C2" : "none", borderRadius: "999px", color: vigente ? "#B02A2A" : "#FFFFFF", cursor: procesando ? "default" : "pointer", fontSize: "13px", fontWeight: "800", opacity: procesando ? 0.6 : 1, padding: "11px 20px" }}>
                    {procesando === tipo ? "Guardando..." : vigente ? "Revocar" : "Otorgar consentimiento"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </>
    );
  };

  const contenido = {
    Resumen: renderResumen, "Mi rutina": renderRutina, "Mis sesiones": renderSesiones,
    Seguimiento: renderProgreso, Privacidad: renderPrivacidad,
  }[seccion] || renderResumen;

  return (
    <section>
      {error && <p role="alert" style={{ background: "#FFF0F0", borderRadius: "8px", color: "#B00020", fontSize: "13px", padding: "12px 14px" }}>{error}</p>}
      {mensaje && <p role="status" style={{ background: "#EEFFF3", borderRadius: "8px", color: "#126B2D", fontSize: "13px", padding: "12px 14px" }}>{mensaje}</p>}
      {contenido()}
    </section>
  );
}
