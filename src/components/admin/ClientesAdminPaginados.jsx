import { useCallback, useEffect, useState } from "react";
import { supabase, traducirErrorSupabase } from "../../supabaseClient";
import useDebounce from "../../hooks/useDebounce";
import Paginacion from "../Paginacion";
import Aviso from "../Aviso";
import { normalizarCorreo } from "../../utils/validaciones";
import { invitarUsuario } from "../../utils/invitaciones";

const POR_PAGINA = 25;
const formularioVacio = { nombre: "", apellido: "", email: "", telefono: "", coachId: "", estadoCliente: "Activo" };
const ESTADOS_CLIENTE = [["Activo", "Activo"], ["Inactivo", "Inactivo"]];
const estiloCampo = { background: "#FAFAFA", border: "1px solid #E5E5E5", borderRadius: "10px", boxSizing: "border-box", color: "#0B0B0B", fontSize: "14px", outline: "none", padding: "12px 14px", width: "100%" };
const etiquetaCampo = { color: "#666", display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "6px" };
const etiquetaSeccion = { color: "#E11D2E", fontSize: "11px", fontWeight: "800", letterSpacing: "1.5px", margin: "22px 0 12px", textTransform: "uppercase" };
const resaltar = (evento) => { evento.target.style.borderColor = "#E11D2E"; };
const atenuar = (evento) => { evento.target.style.borderColor = "#E5E5E5"; };
const estiloBoton = (fondo = "#0B0B0B", color = "#FFFFFF") => ({ background: fondo, border: 0, borderRadius: "7px", color, cursor: "pointer", fontSize: "12px", fontWeight: "800", padding: "9px 12px" });

const FILTROS_ESTADO = [
  ["", "Todos"],
  ["Activo", "Activos"],
  ["Inactivo", "Inactivos"],
];

const ACCESO_ESTILOS = {
  "Acceso activo": ["#E1F5EE", "#085041"],
  "Acceso suspendido": ["#FFF0F0", "#CC0000"],
  "Invitación enviada": ["#FDECEE", "#9B1C24"],
  "Invitación vencida": ["#F5F5F5", "#555"],
  "Sin invitar": ["#F5F5F5", "#888"],
};

const estadoAcceso = (cuenta, invitacion) => {
  if (cuenta) return cuenta.estado === "activo" ? "Acceso activo" : "Acceso suspendido";
  if (!invitacion) return "Sin invitar";
  if (invitacion.estado === "pendiente" && new Date(invitacion.vence_en) > new Date()) return "Invitación enviada";
  return invitacion.estado === "revocada" ? "Sin invitar" : "Invitación vencida";
};

const botonAntiguo = (fondo, color) => ({ background: fondo, border: "none", borderRadius: "8px", color, cursor: "pointer", fontSize: "13px", fontWeight: "700", padding: "8px 16px" });

export default function ClientesAdminPaginados() {
  const [clientes, setClientes] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const busquedaEstable = useDebounce(busqueda, 350);
  const [estado, setEstado] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [clienteEditado, setClienteEditado] = useState(null);
  const [formulario, setFormulario] = useState(formularioVacio);
  const [guardando, setGuardando] = useState(false);
  const [historial, setHistorial] = useState(null);
  const [mediciones, setMediciones] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [errorHistorial, setErrorHistorial] = useState("");
  const [accesos, setAccesos] = useState({});
  const [invitandoId, setInvitandoId] = useState("");

  const cargarAccesos = useCallback(async (ids) => {
    if (!ids.length) { setAccesos({}); return; }
    const [cuentas, invitaciones] = await Promise.all([
      supabase.from("cuentas_clientes").select("cliente_id,estado").in("cliente_id", ids),
      supabase.from("invitaciones_acceso").select("cliente_id,estado,vence_en,creado_en")
        .eq("rol", "cliente").in("cliente_id", ids).order("creado_en", { ascending: false }),
    ]);
    const mapa = {};
    ids.forEach((id) => { mapa[id] = { cuenta: null, invitacion: null }; });
    (cuentas.data || []).forEach((fila) => { mapa[fila.cliente_id].cuenta = fila; });
    (invitaciones.data || []).forEach((fila) => { if (!mapa[fila.cliente_id].invitacion) mapa[fila.cliente_id].invitacion = fila; });
    setAccesos(mapa);
  }, []);

  const cargarClientes = useCallback(async () => {
    setCargando(true);
    const desde = (pagina - 1) * POR_PAGINA;
    let consulta = supabase
      .from("clientes")
      .select("id,nombre,apellido,email,telefono,coach_id,estado,creado_en", { count: "exact" })
      .order("nombre", { ascending: true })
      .order("apellido", { ascending: true })
      .range(desde, desde + POR_PAGINA - 1);
    if (estado) consulta = consulta.eq("estado", estado);
    const texto = busquedaEstable.replace(/[,%()]/g, " ").trim();
    if (texto) {
      consulta = consulta.or(`nombre.ilike.*${texto}*,apellido.ilike.*${texto}*,email.ilike.*${texto}*`);
    }
    const { data, count, error: errorConsulta } = await consulta;
    if (errorConsulta) {
      console.error("Error cargando el directorio paginado:", errorConsulta);
      setError(traducirErrorSupabase(errorConsulta));
      setClientes([]);
      setTotal(0);
    } else {
      setError("");
      setClientes(data || []);
      setTotal(count || 0);
      await cargarAccesos((data || []).map((fila) => fila.id));
    }
    setCargando(false);
  }, [busquedaEstable, estado, pagina, cargarAccesos]);

  const cargarCoaches = useCallback(async () => {
    const { data, error: errorConsulta } = await supabase
      .from("entrenadores")
      .select("id,nombre,apellido")
      .eq("estado", "activo")
      .order("nombre");
    if (errorConsulta) {
      setError(traducirErrorSupabase(errorConsulta));
      return;
    }
    setCoaches(data || []);
  }, []);

  useEffect(() => {
    const temporizador = window.setTimeout(() => {
      void cargarClientes();
      void cargarCoaches();
    }, 0);
    const canal = supabase
      .channel("clientes-admin-paginados")
      .on("postgres_changes", { event: "*", schema: "public", table: "clientes" }, () => void cargarClientes())
      .on("postgres_changes", { event: "*", schema: "public", table: "cuentas_clientes" }, () => void cargarClientes())
      .on("postgres_changes", { event: "*", schema: "public", table: "invitaciones_acceso" }, () => void cargarClientes())
      .subscribe();
    return () => {
      window.clearTimeout(temporizador);
      void supabase.removeChannel(canal);
    };
  }, [cargarClientes, cargarCoaches]);

  const abrirNuevo = () => {
    setClienteEditado(null);
    setFormulario(formularioVacio);
    setMostrarFormulario(true);
    setError("");
  };

  const abrirEdicion = (cliente) => {
    setClienteEditado(cliente);
    setFormulario({
      nombre: cliente.nombre || "",
      apellido: cliente.apellido || "",
      email: cliente.email || "",
      telefono: cliente.telefono || "",
      coachId: cliente.coach_id || "",
      estadoCliente: cliente.estado === "Inactivo" ? "Inactivo" : "Activo",
    });
    setMostrarFormulario(true);
    setError("");
  };

  const guardar = async (evento) => {
    evento.preventDefault();
    setError("");
    setMensaje("");
    const datos = {
      nombre: formulario.nombre.trim(),
      apellido: formulario.apellido.trim(),
      email: normalizarCorreo(formulario.email),
      telefono: formulario.telefono.replace(/\D/g, "") || null,
      coach_id: formulario.coachId || null,
    };
    if (clienteEditado) datos.estado = formulario.estadoCliente;
    if (!datos.nombre || !/^\S+@\S+\.\S+$/.test(datos.email)) {
      setError("Escribe un nombre y un correo electrónico válido.");
      return;
    }
    if (datos.telefono && datos.telefono.length > 10) {
      setError("El teléfono no puede tener más de 10 dígitos.");
      return;
    }

    let consultaDuplicado = supabase.from("clientes").select("id").ilike("email", datos.email).limit(1);
    if (clienteEditado) consultaDuplicado = consultaDuplicado.neq("id", clienteEditado.id);
    const { data: duplicados, error: errorDuplicado } = await consultaDuplicado;
    if (errorDuplicado || duplicados?.length) {
      setError(errorDuplicado ? traducirErrorSupabase(errorDuplicado) : "Ese correo ya pertenece a otro cliente.");
      return;
    }

    setGuardando(true);
    const respuesta = clienteEditado
      ? await supabase.from("clientes").update(datos).eq("id", clienteEditado.id).select("id").maybeSingle()
      : await supabase.from("clientes").insert({ ...datos, estado: "Activo" }).select("id").single();
    if (respuesta.error || !respuesta.data) {
      setGuardando(false);
      setError(traducirErrorSupabase(respuesta.error || { message: "Cliente no guardado" }));
      return;
    }

    // Un cliente nuevo recibe su invitación de inmediato.
    let resultadoInvitacion = null;
    if (!clienteEditado) {
      resultadoInvitacion = await invitarUsuario({ rol: "cliente", clienteId: respuesta.data.id });
    }
    setGuardando(false);
    setMostrarFormulario(false);
    setClienteEditado(null);
    setFormulario(formularioVacio);
    if (resultadoInvitacion?.error) {
      setError(`El cliente quedó registrado, pero no se pudo enviar la invitación: ${resultadoInvitacion.error} Puedes reenviarla desde Editar.`);
    } else if (resultadoInvitacion) {
      setMensaje(`Cliente registrado. Invitación enviada a ${datos.email}.`);
    } else {
      setMensaje("Cliente actualizado.");
    }
    await cargarClientes();
  };

  const invitar = async (cliente) => {
    setError("");
    setMensaje("");
    setInvitandoId(cliente.id);
    const { error: errorInvitacion } = await invitarUsuario({ rol: "cliente", clienteId: cliente.id });
    setInvitandoId("");
    if (errorInvitacion) {
      setError(errorInvitacion);
      return;
    }
    setMensaje(`Invitación enviada a ${cliente.email}.`);
    await cargarClientes();
  };

  const abrirHistorial = async (cliente) => {
    setHistorial(cliente);
    setMediciones([]);
    setErrorHistorial("");
    setCargandoHistorial(true);
    // select("*") (como en la versión anterior): no depende de que existan columnas
    // concretas como imc/icc, que era lo que hacía fallar la consulta.
    const { data, error: errorConsulta } = await supabase
      .from("mediciones")
      .select("*")
      .eq("cliente_id", cliente.id)
      .order("fecha", { ascending: false })
      .limit(50);
    if (errorConsulta) {
      console.error("Error cargando historial de mediciones:", errorConsulta);
      setErrorHistorial(traducirErrorSupabase(errorConsulta));
    } else {
      setMediciones(data || []);
    }
    setCargandoHistorial(false);
  };

  const cerrarHistorial = () => {
    setHistorial(null);
    setMediciones([]);
    setErrorHistorial("");
  };

  // Sin categorías clínicas: son registros de seguimiento, no un diagnóstico.
  const clasificarIMC = (imc) =>
    imc == null
      ? { label: "--", bg: "#F5F5F5", color: "#888" }
      : { label: "Registrado", bg: "#F5F5F5", color: "#555" };

  return (
    <section>
      <header style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "space-between", marginBottom: "18px" }}>
        <div>
          <h3 style={{ color: "#0B0B0B", fontSize: "20px", fontWeight: "900", margin: 0 }}>Directorio de clientes</h3>
          <p style={{ color: "#888", fontSize: "13px", margin: "4px 0 0" }}>Busca, filtra y gestiona a los clientes de todos los entrenadores.</p>
        </div>
        <button type="button" onClick={abrirNuevo} style={estiloBoton()}>Nuevo cliente</button>
      </header>

      {!mostrarFormulario && error && <Aviso tipo="error" onCerrar={() => setError("")}>{error}</Aviso>}
      {mensaje && <Aviso onCerrar={() => setMensaje("")}>{mensaje}</Aviso>}

      <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "18px" }}>
        <div style={{ flex: "1 1 280px", position: "relative" }}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ left: "16px", pointerEvents: "none", position: "absolute", top: "50%", transform: "translateY(-50%)" }}>
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            aria-label="Buscar clientes"
            placeholder="Buscar por nombre, apellido o correo"
            value={busqueda}
            onChange={(evento) => { setBusqueda(evento.target.value); setPagina(1); }}
            className="buscador-clientes"
            style={{ background: "#FFFFFF", border: "1px solid #E5E5E5", borderRadius: "999px", boxSizing: "border-box", color: "#0B0B0B", fontSize: "14px", outline: "none", padding: "13px 18px 13px 46px", width: "100%" }}
            onFocus={(evento) => { evento.target.style.borderColor = "#E11D2E"; evento.target.style.boxShadow = "0 0 0 3px rgba(225, 29, 46, 0.25)"; }}
            onBlur={(evento) => { evento.target.style.borderColor = "#E5E5E5"; evento.target.style.boxShadow = "none"; }}
          />
        </div>
        <div role="group" aria-label="Filtrar por estado" style={{ background: "#FFFFFF", border: "1px solid #E5E5E5", borderRadius: "999px", display: "flex", flexWrap: "wrap", gap: "4px", padding: "4px" }}>
          {FILTROS_ESTADO.map(([valor, etiqueta]) => {
            const seleccionado = estado === valor;
            return (
              <button
                key={etiqueta}
                type="button"
                aria-pressed={seleccionado}
                onClick={() => { setEstado(valor); setPagina(1); }}
                style={{ background: seleccionado ? "#0B0B0B" : "transparent", border: "none", borderRadius: "999px", color: seleccionado ? "#FFFFFF" : "#666", cursor: "pointer", fontSize: "13px", fontWeight: seleccionado ? "800" : "600", padding: "9px 16px", transition: "background 0.15s" }}
              >
                {etiqueta}
              </button>
            );
          })}
        </div>
      </div>

      {mostrarFormulario && (() => {
        const acceso = clienteEditado ? (accesos[clienteEditado.id] || {}) : {};
        const etiquetaAcceso = estadoAcceso(acceso.cuenta, acceso.invitacion);
        const [fondoAcceso, colorAcceso] = ACCESO_ESTILOS[etiquetaAcceso];
        const puedeInvitar = Boolean(clienteEditado) && !acceso.cuenta && clienteEditado.estado === "Activo";
        const cambiarCampo = (nombre) => (evento) => setFormulario((actual) => ({ ...actual, [nombre]: evento.target.value }));
        const correoBloqueado = Boolean(clienteEditado && (acceso.cuenta || etiquetaAcceso === "Invitación enviada"));
        return (
          <div role="dialog" aria-modal="true" aria-label={clienteEditado ? "Editar cliente" : "Nuevo cliente"} style={{ alignItems: "center", background: "rgba(11,11,11,0.45)", display: "flex", inset: 0, justifyContent: "center", padding: "16px", position: "fixed", zIndex: 80 }}>
            <form onSubmit={guardar} style={{ background: "#FFFFFF", border: "0.5px solid #E5E5E5", borderRadius: "12px", boxSizing: "border-box", maxHeight: "90vh", maxWidth: "640px", overflowY: "auto", padding: "28px", width: "100%" }}>
              <p style={etiquetaSeccion}>{clienteEditado ? "Edición" : "Registro"}</p>
              <h4 style={{ color: "#0B0B0B", fontSize: "22px", fontWeight: "900", margin: "0 0 4px" }}>{clienteEditado ? "Editar cliente" : "Nuevo cliente"}</h4>
              <p style={{ color: "#888", fontSize: "13px", margin: "0 0 4px" }}>
                {clienteEditado ? `${clienteEditado.nombre} ${clienteEditado.apellido || ""}`.trim() : "Al guardar, se le envía la invitación por correo."}
              </p>

              <p style={etiquetaSeccion}>Datos personales</p>
              <div style={{ display: "grid", gap: "14px", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
                <div>
                  <label htmlFor="cliente-nombre" style={etiquetaCampo}>Nombre *</label>
                  <input id="cliente-nombre" required placeholder="Nombre" value={formulario.nombre} onChange={cambiarCampo("nombre")} onFocus={resaltar} onBlur={atenuar} style={estiloCampo} />
                </div>
                <div>
                  <label htmlFor="cliente-apellido" style={etiquetaCampo}>Apellido</label>
                  <input id="cliente-apellido" placeholder="Apellido" value={formulario.apellido} onChange={cambiarCampo("apellido")} onFocus={resaltar} onBlur={atenuar} style={estiloCampo} />
                </div>
                <div>
                  <label htmlFor="cliente-correo" style={etiquetaCampo}>Correo electrónico *</label>
                  <input id="cliente-correo" required type="email" placeholder="nombre@correo.com" disabled={correoBloqueado}
                    title={correoBloqueado ? "El correo no se puede cambiar mientras exista una cuenta o una invitación vigente." : undefined}
                    value={formulario.email} onChange={cambiarCampo("email")} onFocus={resaltar} onBlur={atenuar}
                    style={{ ...estiloCampo, opacity: correoBloqueado ? 0.6 : 1 }} />
                </div>
                <div>
                  <label htmlFor="cliente-telefono" style={etiquetaCampo}>Teléfono</label>
                  <input id="cliente-telefono" inputMode="numeric" maxLength={10} placeholder="10 dígitos" value={formulario.telefono}
                    onChange={(evento) => setFormulario((actual) => ({ ...actual, telefono: evento.target.value.replace(/\D/g, "") }))} onFocus={resaltar} onBlur={atenuar} style={estiloCampo} />
                </div>
              </div>

              <p style={etiquetaSeccion}>Asignación</p>
              <label htmlFor="cliente-coach" style={etiquetaCampo}>Entrenador</label>
              <select id="cliente-coach" value={formulario.coachId} onChange={cambiarCampo("coachId")} onFocus={resaltar} onBlur={atenuar} style={estiloCampo}>
                <option value="">Sin entrenador asignado</option>
                {coaches.map((coach) => <option key={coach.id} value={coach.id}>{coach.nombre} {coach.apellido}</option>)}
              </select>

              {clienteEditado && (
                <>
                  <p style={etiquetaSeccion}>Estado del cliente</p>
                  <div role="group" aria-label="Estado del cliente" style={{ background: "#FAFAFA", border: "1px solid #E5E5E5", borderRadius: "999px", display: "inline-flex", flexWrap: "wrap", gap: "4px", padding: "4px" }}>
                    {ESTADOS_CLIENTE.map(([valor, etiqueta]) => {
                      const seleccionado = formulario.estadoCliente === valor;
                      return (
                        <button key={valor} type="button" aria-pressed={seleccionado}
                          onClick={() => setFormulario((actual) => ({ ...actual, estadoCliente: valor }))}
                          style={{ background: seleccionado ? "#0B0B0B" : "transparent", border: "none", borderRadius: "999px", color: seleccionado ? "#FFFFFF" : "#666", cursor: "pointer", fontSize: "13px", fontWeight: seleccionado ? "800" : "600", padding: "8px 18px" }}>
                          {etiqueta}
                        </button>
                      );
                    })}
                  </div>

                  <p style={etiquetaSeccion}>Acceso al portal</p>
                  <div style={{ alignItems: "center", background: "#FAFAFA", border: "0.5px solid #E5E5E5", borderRadius: "12px", display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "space-between", padding: "14px 16px" }}>
                    <div>
                      <span style={{ background: fondoAcceso, borderRadius: "20px", color: colorAcceso, fontSize: "11px", fontWeight: "700", padding: "3px 10px" }}>{etiquetaAcceso.toUpperCase()}</span>
                      <p style={{ color: "#888", fontSize: "12px", lineHeight: 1.5, margin: "8px 0 0", maxWidth: "340px" }}>
                        {acceso.cuenta
                          ? "El cliente ya creó su contraseña y puede entrar al portal."
                          : `Se enviará un correo a ${clienteEditado.email} con un enlace para crear su contraseña.`}
                      </p>
                    </div>
                    {puedeInvitar && (
                      <button type="button" disabled={invitandoId === clienteEditado.id} onClick={() => void invitar(clienteEditado)}
                        style={{ background: "#0B0B0B", border: 0, borderRadius: "999px", color: "#FFFFFF", cursor: "pointer", fontSize: "13px", fontWeight: "800", opacity: invitandoId === clienteEditado.id ? 0.6 : 1, padding: "10px 20px" }}>
                        {invitandoId === clienteEditado.id ? "Enviando..." : etiquetaAcceso === "Sin invitar" ? "Enviar invitación" : "Reenviar invitación"}
                      </button>
                    )}
                  </div>
                </>
              )}

              {error && <p role="alert" style={{ background: "#FFF0F0", borderRadius: "8px", color: "#B00020", fontSize: "13px", margin: "18px 0 0", padding: "12px" }}>{error}</p>}

              <div style={{ borderTop: "0.5px solid #E5E5E5", display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "24px", paddingTop: "18px" }}>
                <button type="button" onClick={() => setMostrarFormulario(false)} style={{ background: "#FFFFFF", border: "1px solid #D5D5D5", borderRadius: "999px", color: "#333", cursor: "pointer", fontSize: "13px", fontWeight: "800", padding: "11px 22px" }}>Cancelar</button>
                <button type="submit" disabled={guardando} style={{ background: "#0B0B0B", border: 0, borderRadius: "999px", color: "#FFFFFF", cursor: "pointer", fontSize: "13px", fontWeight: "800", opacity: guardando ? 0.6 : 1, padding: "11px 26px" }}>{guardando ? (clienteEditado ? "Guardando..." : "Enviando...") : (clienteEditado ? "Guardar" : "Guardar y enviar invitación")}</button>
              </div>
            </form>
          </div>
        );
      })()}

      {cargando ? <p style={{ color: "#777", padding: "36px", textAlign: "center" }}>Cargando clientes...</p> : clientes.length === 0 ? (
        <div style={{ background: "#FFF", border: "1px solid #E5E5E5", borderRadius: "12px", color: "#777", padding: "38px", textAlign: "center" }}>No hay clientes para mostrar.</div>
      ) : (
        <div style={{ display: "grid", gap: "8px" }}>
          {clientes.map((cliente) => {
            const coach = coaches.find((item) => item.id === cliente.coach_id);
            const activo = cliente.estado === "Activo";
            return (
              <article key={cliente.id} style={{ alignItems: "center", background: "#FFFFFF", border: "0.5px solid #E5E5E5", borderRadius: "12px", display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "space-between", padding: "20px 24px" }}>
                <div style={{ alignItems: "center", display: "flex", gap: "12px" }}>
                  <div aria-hidden="true" style={{ alignItems: "center", background: "#0B0B0B", borderRadius: "50%", color: "#FF5A64", display: "flex", flexShrink: 0, fontSize: "14px", fontWeight: "900", height: "40px", justifyContent: "center", width: "40px" }}>
                    {cliente.nombre?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p style={{ color: "#0B0B0B", fontSize: "14px", fontWeight: "700", margin: 0 }}>{cliente.nombre} {cliente.apellido}</p>
                    <p style={{ color: "#888", fontSize: "12px", margin: "2px 0 0" }}>
                      {cliente.email} {coach ? `· Coach: ${coach.nombre}` : "· Sin coach asignado"}
                    </p>
                  </div>
                </div>
                <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  <span style={{ background: activo ? "#E1F5EE" : "#F5F5F5", borderRadius: "20px", color: activo ? "#085041" : "#555", fontSize: "11px", fontWeight: "700", padding: "3px 10px" }}>
                    {cliente.estado?.toUpperCase()}
                  </span>
                  <button type="button" onClick={() => void abrirHistorial(cliente)} style={botonAntiguo("#F5F5F5", "#0B0B0B")}>Ver Historial</button>
                  <button type="button" onClick={() => abrirEdicion(cliente)} style={botonAntiguo("#F5F5F5", "#0B0B0B")}>Editar</button>
                </div>
              </article>
            );
          })}
          <Paginacion pagina={pagina} total={total} porPagina={POR_PAGINA} onCambiar={setPagina} />
        </div>
      )}

      {historial && (
        <div role="dialog" aria-modal="true" aria-label="Historial de mediciones" style={{ alignItems: "center", background: "rgba(11,11,11,0.45)", display: "flex", inset: 0, justifyContent: "center", padding: "16px", position: "fixed", zIndex: 80 }}>
          <div style={{ background: "#FFFFFF", border: "0.5px solid #E5E5E5", borderRadius: "12px", maxHeight: "85vh", maxWidth: "520px", overflowY: "auto", padding: "20px 24px", width: "100%" }}>
            <div style={{ alignItems: "flex-start", borderBottom: "0.5px solid #E5E5E5", display: "flex", justifyContent: "space-between", marginBottom: "16px", paddingBottom: "16px" }}>
              <div>
                <h3 style={{ color: "#0B0B0B", fontSize: "18px", fontWeight: "900", margin: 0 }}>{historial.nombre} {historial.apellido}</h3>
                <p style={{ color: "#888", fontSize: "12px", margin: "2px 0 0" }}>Historial de mediciones antropométricas</p>
              </div>
              <button type="button" aria-label="Cerrar historial" onClick={cerrarHistorial} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: "18px" }}>✕</button>
            </div>
            <p style={{ color: "#777", fontSize: "11px", lineHeight: 1.5, margin: "0 0 12px" }}>Estos datos son registros de seguimiento y no constituyen un diagnóstico médico.</p>
            {errorHistorial && <p role="alert" style={{ background: "#FFF0F0", borderRadius: "8px", color: "#B00020", fontSize: "13px", padding: "12px" }}>{errorHistorial}</p>}
            {cargandoHistorial ? (
              <p style={{ color: "#888", fontSize: "13px" }}>Cargando historial...</p>
            ) : !errorHistorial && mediciones.length === 0 ? (
              <div style={{ background: "#F5F5F5", borderRadius: "10px", padding: "24px", textAlign: "center" }}>
                <p style={{ color: "#888", fontSize: "13px", margin: 0 }}>Este cliente aún no tiene mediciones registradas por su entrenador.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {mediciones.map((medicion) => {
                  const clasif = clasificarIMC(medicion.imc);
                  const dato = (etiqueta, valor, unidad) => (
                    <div key={etiqueta}>
                      <p style={{ color: "#888", fontSize: "10px", margin: "0 0 2px", textTransform: "uppercase" }}>{etiqueta}</p>
                      <p style={{ color: "#0B0B0B", fontWeight: "700", margin: 0 }}>{valor ? `${valor} ${unidad}` : "--"}</p>
                    </div>
                  );
                  return (
                    <div key={medicion.id} style={{ background: "#F5F5F5", borderRadius: "10px", padding: "14px 16px" }}>
                      <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                        <span style={{ color: "#0B0B0B", fontSize: "13px", fontWeight: "900" }}>{medicion.fecha}</span>
                        <span style={{ background: clasif.bg, borderRadius: "20px", color: clasif.color, fontSize: "10px", fontWeight: "700", padding: "3px 10px" }}>
                          IMC {medicion.imc ?? "--"} · {clasif.label}
                        </span>
                      </div>
                      <div style={{ color: "#555", display: "grid", fontSize: "12px", gap: "8px", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))" }}>
                        {dato("Peso", medicion.peso, "kg")}
                        {dato("Estatura", medicion.estatura, "cm")}
                        {dato("Cintura", medicion.cintura, "cm")}
                        {dato("Cadera", medicion.cadera, "cm")}
                      </div>
                      {medicion.icc && (
                        <p style={{ color: "#555", fontSize: "12px", margin: "8px 0 0" }}>Índice Cintura-Cadera: <strong style={{ color: "#0B0B0B" }}>{medicion.icc}</strong></p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}