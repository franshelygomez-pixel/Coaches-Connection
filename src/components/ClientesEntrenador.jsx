import { useState, useEffect, useCallback } from "react";
import { supabase, traducirErrorSupabase } from "../supabaseClient";
import Paginacion from "./Paginacion";
import useDebounce from "../hooks/useDebounce";
import { obtenerRangoPagina } from "../utils/paginacion";
import { perteneceAlCoach } from "../utils/permisos";
import { normalizarCorreo } from "../utils/validaciones";
import { fechaLocalDe } from "../utils/agenda";
import { construirRangoSesion, crearSesionConRecordatorio } from "../utils/sesiones";
import { TEXTO_HORARIO, sumarDias } from "../utils/horario";
import {
  DIAS_PLAN, DURACIONES_SESION, PERIODOS_PLAN, generarFechasPlan, horasComunes, planInicial, validarPlan,
} from "../utils/planRutina";

// --- Mismo lenguaje de diseño que InicioEntrenador.jsx ---
const estiloCard = {
  background: "#FFFFFF",
  border: "0.5px solid #E5E5E5",
  borderRadius: "12px",
  padding: "20px 24px",
};

const inputStyle = {
  width: "100%",
  background: "#F5F5F5",
  border: "0.5px solid #E5E5E5",
  borderRadius: "8px",
  padding: "10px 12px",
  fontSize: "13px",
  color: "#0B0B0B",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle = {
  fontSize: "11px",
  fontWeight: "700",
  color: "#888",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  marginBottom: "6px",
  display: "block",
};

const ESTADO_COLORES = {
  "Activo": { bg: "#E1F5EE", color: "#085041" },
  "Inactivo": { bg: "#F5F5F5", color: "#555" },
};

const ESTADO_POR_DEFECTO = { bg: "#F5F5F5", color: "#555" };

// Acepta "activo", "ACTIVO", "en evaluacion", etc. y devuelve el valor canónico.
const normalizarEstadoCliente = (valor) => {
  const clave = `${valor || ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  if (clave === "activo") return "Activo";
  if (clave === "inactivo") return "Inactivo";
  return "Activo";
};

const FILTROS = ["Todos", "Activo", "Inactivo"];
const CLIENTES_POR_PAGINA = 20;
const MAX_DIGITOS_TELEFONO = 11; // +1 (809) 000-0000 → 1 + 10 dígitos

// Se conserva el punto para poder buscar correos completos (juan@gmail.com).
const limpiarBusqueda = (valor) =>
  valor.replace(/[(),%*\\]/g, " ").replace(/\s+/g, " ").trim();

// Adapta una fila de la tabla `clientes` al shape que ya usa la UI
const adaptarCliente = (data) => ({
  docId: data.id,
  nombre: `${data.nombre || ""} ${data.apellido || ""}`.trim() || "Sin nombre",
  email: data.email || "",
  telefono: data.telefono || "--",
  estado: normalizarEstadoCliente(data.estado),
  plan: data.plan || "Sin plan asignado",
  objetivo: data.objetivo || "Sin definir",
  pesoActual: data.peso_actual ? `${data.peso_actual} kg` : "--",
  rutinaAsignada: data.rutinas?.nombre || data.rutina_asignada || "Sin Asignar",
  rutinaId: data.rutina_id || "",
  coachId: data.coach_id || "",
});

// Rangos admitidos para una persona adulta en el gimnasio (antropometría). Un valor fuera de
// estos rangos casi siempre es un error de digitación.
const LIMITES_MEDICION = {
  peso: { min: 20, max: 300, unidad: "kg", nombre: "El peso" },
  estatura: { min: 100, max: 250, unidad: "cm", nombre: "La estatura" },
  cintura: { min: 40, max: 200, unidad: "cm", nombre: "La cintura" },
  cadera: { min: 50, max: 200, unidad: "cm", nombre: "La cadera" },
};
const FORMATO_MEDIDA = /^\d{1,3}(\.\d)?$/; // hasta 3 enteros y 1 decimal

// Deja pasar solo dígitos y un punto decimal (la coma se convierte en punto), con 3 enteros y 1 decimal.
const limpiarDecimal = (texto) => {
  const limpio = `${texto}`.replace(",", ".").replace(/[^\d.]/g, "");
  const [entero = "", ...resto] = limpio.split(".");
  const parteEntera = entero.slice(0, 3);
  return resto.length > 0 ? `${parteEntera}.${resto.join("").slice(0, 1)}` : parteEntera;
};

export default function ClientesEntrenador({ usuario }) {
  const [modoCrear, setModoCrear] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");
  const busquedaEstable = useDebounce(busqueda, 400);
  const [pagina, setPagina] = useState(1);
  const [totalResultados, setTotalResultados] = useState(0);
  const [resumen, setResumen] = useState({ total: 0, activos: 0, inactivos: 0 });
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  const [clientes, setClientes] = useState([]);
  const [rutinas, setRutinas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const [clienteParaAsignarRutina, setClienteParaAsignarRutina] = useState(null);
  const [rutinaSeleccionada, setRutinaSeleccionada] = useState("");
  const [asignandoRutina, setAsignandoRutina] = useState(false);
  const [plan, setPlan] = useState(planInicial);
  const [progresoPlan, setProgresoPlan] = useState("");
  const [errorPlan, setErrorPlan] = useState("");
  const [completandoRutina, setCompletandoRutina] = useState(null);
  const [historialRutinas, setHistorialRutinas] = useState([]);
  const [clienteParaCompletar, setClienteParaCompletar] = useState(null);

  const coachId = usuario?.id;

  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    estado: "Activo",
    edad: "",
    objetivo: "Hipertrofia / Masa Muscular",
    plan: "Plan Smart",
    observaciones: "",
  });

  // --- Historial de mediciones (ficha antropométrica) del cliente en el expediente ---
  const [mediciones, setMediciones] = useState([]);
  const [cargandoMediciones, setCargandoMediciones] = useState(false);
  const [mostrarFormMedicion, setMostrarFormMedicion] = useState(false);
  const [guardandoMedicion, setGuardandoMedicion] = useState(false);
  const [nuevaMedicion, setNuevaMedicion] = useState({
    fecha: fechaLocalDe(new Date()),
    peso: "",
    estatura: "",
    cintura: "",
    cadera: "",
  });

  const cargarResumen = useCallback(async () => {
    if (!coachId) return;

    const contar = (estado) => {
      let consulta = supabase
        .from("clientes")
        .select("id", { count: "exact", head: true })
        .eq("coach_id", coachId);
      if (estado) consulta = consulta.eq("estado", estado);
      return consulta;
    };

    const [total, activos, inactivos] = await Promise.all([
      contar(null),
      contar("Activo"),
      contar("Inactivo"),
    ]);

    if (!total.error && !activos.error && !inactivos.error) {
      setResumen({
        total: total.count || 0,
        activos: activos.count || 0,
        inactivos: inactivos.count || 0,
      });
    }
  }, [coachId]);

  const cargarClientes = useCallback(async () => {
    if (!coachId) {
      setCargando(false);
      setError("No se detectó una sesión activa.");
      return;
    }
    const { desde, hasta } = obtenerRangoPagina(pagina, CLIENTES_POR_PAGINA);
    const texto = limpiarBusqueda(busquedaEstable);

    let consulta = supabase
      .from("clientes")
      .select("id,nombre,apellido,email,telefono,estado,edad,objetivo,plan,observaciones,coach_id,rutina_id,rutina_asignada,peso_actual,estatura,creado_en,rutinas(nombre,nivel)", { count: "exact" })
      .eq("coach_id", coachId)
      .order("nombre", { ascending: true })
      .range(desde, hasta);

    if (filtroEstado !== "Todos") consulta = consulta.eq("estado", filtroEstado);
    if (texto) {
      consulta = consulta.or(
        `nombre.ilike.%${texto}%,apellido.ilike.%${texto}%,email.ilike.%${texto}%`
      );
    }

    const { data, count, error: errLectura } = await consulta;

    if (errLectura) {
      console.error("Error al leer clientes:", errLectura);
      setError("No se pudieron cargar los clientes. Verifica las políticas RLS.");
    } else {
      setClientes((data || []).map(adaptarCliente));
      setTotalResultados(count || 0);
      setError(null);
      const ids = (data || []).map((c) => c.id);
      if (ids.length > 0) {
        const { data: filasHistorial, error: errHistorial } = await supabase
          .from("historial_rutinas")
          .select("id,cliente_id,rutina_id,nombre_rutina,nivel,estado,asignada_en,finalizada_en,fecha_fin")
          .in("cliente_id", ids)
          .order("asignada_en", { ascending: false });
        if (errHistorial) console.error("Error al leer historial de rutinas:", errHistorial);
        else setHistorialRutinas(filasHistorial || []);
      } else {
        setHistorialRutinas([]);
      }
    }
    void cargarResumen();
    setCargando(false);
  }, [busquedaEstable, cargarResumen, coachId, filtroEstado, pagina]);

  // --- Carga inicial + suscripción en tiempo real (reemplaza onSnapshot) ---
  useEffect(() => {
    if (!coachId) return;

    const temporizador = window.setTimeout(() => {
      void cargarClientes();
    }, 0);

    const canal = supabase
      .channel(`clientes-coach-${coachId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clientes", filter: `coach_id=eq.${coachId}` },
        () => cargarClientes()
      )
      .subscribe();

    return () => {
      window.clearTimeout(temporizador);
      void supabase.removeChannel(canal);
    };
  }, [coachId, cargarClientes]);

  // --- Rutinas del coach, para el modal de asignación ---
  useEffect(() => {
    if (!coachId) return;

    const cargarRutinas = async () => {
      const { data, error: errorRutinas } = await supabase
        .from("rutinas")
        .select("id,nombre,nivel,contenido,coach_id")
        .eq("coach_id", coachId)
        .order("nombre", { ascending: true });
      if (errorRutinas) {
        setError("No se pudieron cargar las rutinas.");
        return;
      }
      setRutinas((data || []).map((r) => ({ docId: r.id, ...r })));
    };
    cargarRutinas();

    const canal = supabase
      .channel(`rutinas-coach-${coachId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rutinas", filter: `coach_id=eq.${coachId}` },
        cargarRutinas
      )
      .subscribe();

    return () => supabase.removeChannel(canal);
  }, [coachId]);

  // --- Historial de mediciones del cliente que tiene el expediente abierto ---
  useEffect(() => {
    const clienteSeleccionadoId = clienteSeleccionado?.docId;
    if (!clienteSeleccionadoId) return;

    const cargarMediciones = async () => {
      setCargandoMediciones(true);
      const { data, error: errMed } = await supabase
        .from("mediciones")
        .select("*")
        .eq("cliente_id", clienteSeleccionadoId)
        .eq("coach_id", coachId)
        .order("fecha", { ascending: false });
      if (errMed) console.error("Error leyendo mediciones:", errMed);
      setMediciones((data || []).map((m) => ({ docId: m.id, ...m })));
      setCargandoMediciones(false);
    };
    cargarMediciones();

    const canal = supabase
      .channel(`mediciones-cliente-${clienteSeleccionadoId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mediciones", filter: `cliente_id=eq.${clienteSeleccionadoId}` },
        cargarMediciones
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(canal);
    };
  }, [clienteSeleccionado?.docId, coachId]);

  const handleGuardarCliente = async (e) => {
    e.preventDefault();
    setError(null);

    if (!nuevoCliente.nombre.trim() || !nuevoCliente.email.trim()) {
      setError("Nombre y correo son obligatorios.");
      return;
    }
    if (!coachId) {
      setError("No se detectó una sesión activa. Vuelve a iniciar sesión.");
      return;
    }

    const soloLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    if (!soloLetras.test(nuevoCliente.nombre.trim())) {
      setError("El nombre solo puede contener letras.");
      return;
    }
    if (nuevoCliente.apellido && !soloLetras.test(nuevoCliente.apellido.trim())) {
      setError("El apellido solo puede contener letras.");
      return;
    }

    const formatoCorreo = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!formatoCorreo.test(nuevoCliente.email.trim())) {
      setError("El formato del correo no es válido.");
      return;
    }

    if (nuevoCliente.telefono && nuevoCliente.telefono.replace(/\D/g, "").length > MAX_DIGITOS_TELEFONO) {
      setError(`El teléfono no puede tener más de ${MAX_DIGITOS_TELEFONO} dígitos.`);
      return;
    }

    // La comprobación se realiza en Supabase porque la lista visible está paginada.
    // Se usa .eq (no .ilike) porque _ y % son comodines en ilike. El correo ya
    // se guarda normalizado (minúsculas), y la BD tiene un índice único como respaldo.
    const { data: clienteDuplicado, error: errorDuplicado } = await supabase
      .from("clientes")
      .select("id")
      .eq("coach_id", coachId)
      .eq("email", normalizarCorreo(nuevoCliente.email))
      .limit(1)
      .maybeSingle();

    if (errorDuplicado) {
      setError("No se pudo comprobar el correo del cliente.");
      return;
    }
    if (clienteDuplicado) {
      setError("Ya tienes un cliente registrado con ese correo.");
      return;
    }

    setGuardando(true);
    const { data: clienteCreado, error: errInsert } = await supabase.from("clientes").insert({
      nombre: nuevoCliente.nombre.trim(),
      apellido: nuevoCliente.apellido.trim() || "",
      email: normalizarCorreo(nuevoCliente.email),
      telefono: nuevoCliente.telefono || "",
      estado: nuevoCliente.estado,
      coach_id: coachId,
      objetivo: nuevoCliente.objetivo,
      plan: nuevoCliente.plan,
      edad: nuevoCliente.edad || null,
      observaciones: nuevoCliente.observaciones || "",
      rutina_asignada: "Sin Asignar",
    }).select("id").single();

    if (errInsert || !clienteCreado) {
      console.error("Error al guardar cliente:", errInsert);
      setError(
        errInsert?.code === "23505"
          ? "Ya tienes un cliente registrado con ese correo."
          : "No se pudo guardar el cliente. Intenta de nuevo."
      );
    } else {
      setNuevoCliente({
        nombre: "", apellido: "", email: "", telefono: "",
        estado: "Activo", edad: "",
        objetivo: "Hipertrofia / Masa Muscular", plan: "Plan Smart", observaciones: "",
      });
      setModoCrear(false);
      cargarClientes();
    }
    setGuardando(false);
  };

  const rutinasActivasDe = (clienteId) => historialRutinas.filter((h) => h.cliente_id === clienteId && h.estado === "activa");
  const historialDe = (clienteId) => historialRutinas.filter((h) => h.cliente_id === clienteId);
  const fechaCorta = (valor) => (valor ? new Date(valor.length === 10 ? `${valor}T12:00:00` : valor).toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Santo_Domingo" }) : "--");

  const abrirAsignarRutina = (cliente) => {
    setClienteParaAsignarRutina(cliente);
    setRutinaSeleccionada("");
    setPlan(planInicial());
    setErrorPlan("");
    setProgresoPlan("");
  };

  const cambiarPlan = (cambios) => {
    setErrorPlan("");
    setPlan((actual) => {
      const nuevo = { ...actual, ...cambios };
      if ("desde" in cambios || "periodo" in cambios) {
        if (nuevo.periodo) nuevo.fin = sumarDias(nuevo.desde, Number(nuevo.periodo) - 1);
      } else if ("fin" in cambios) {
        nuevo.periodo = "";
      }
      if (nuevo.hora && !horasComunes(nuevo.dias, nuevo.duracion).includes(nuevo.hora)) nuevo.hora = "";
      return nuevo;
    });
  };

  const alternarDiaPlan = (numero) => {
    cambiarPlan({ dias: plan.dias.includes(numero) ? plan.dias.filter((d) => d !== numero) : [...plan.dias, numero].sort() });
  };

  const handleConfirmarAsignacion = async (e) => {
    e.preventDefault();
    if (!clienteParaAsignarRutina) return;
    if (!perteneceAlCoach(clienteParaAsignarRutina, coachId)) {
      setError("No tienes permiso para modificar este cliente.");
      return;
    }

    const rutinaElegida = rutinas.find((r) => r.docId === rutinaSeleccionada);
    if (!rutinaSeleccionada) {
      setErrorPlan("Selecciona la rutina que quieres asignar.");
      return;
    }
    if (rutinaSeleccionada) {
      const mensajePlan = validarPlan(plan);
      if (mensajePlan) {
        setErrorPlan(mensajePlan);
        return;
      }
    }

    setAsignandoRutina(true);
    const { data, error: errorAsignacion } = await supabase.rpc("asignar_rutina_cliente", {
      p_cliente_id: clienteParaAsignarRutina.docId,
      p_rutina_id: rutinaSeleccionada || null,
    });
    const errAsignar = errorAsignacion || (!data ? { message: "No se modificó el cliente." } : null);

    if (errAsignar) {
      console.error("Error al asignar rutina:", errAsignar);
      setError("No se pudo asignar la rutina.");
    } else {
      let fallidas = [];
      let total = 0;
      if (rutinaSeleccionada && rutinaElegida) {
        const fechas = generarFechasPlan(plan);
        total = fechas.length;
        for (let i = 0; i < fechas.length; i += 1) {
          setProgresoPlan(`Programando sesiones ${i + 1} de ${total}...`);
          const fecha = fechas[i];
          const rango = construirRangoSesion(fecha, plan.hora, plan.duracion);
          const resultado = await crearSesionConRecordatorio(supabase, {
            clienteId: clienteParaAsignarRutina.docId,
            coachId,
            titulo: `Rutina: ${rutinaElegida.nombre}`,
            fecha,
            inicio: rango.inicio,
            fin: rango.fin,
            rutinaId: rutinaSeleccionada,
            observaciones: "",
          });
          if (resultado.errorSesion || resultado.errorRecordatorio) {
            fallidas.push({ fecha, motivo: traducirErrorSupabase(resultado.errorSesion || resultado.errorRecordatorio) });
          }
        }
        setProgresoPlan("");
        const { error: errorFin } = await supabase.rpc("fijar_fin_rutina", {
          p_cliente_id: clienteParaAsignarRutina.docId,
          p_rutina_id: rutinaSeleccionada,
          p_fecha_fin: plan.fin,
        });
        if (errorFin) fallidas.push({ fecha: plan.fin, motivo: "no se pudo programar el aviso de fin de rutina" });
      }
      setClienteParaAsignarRutina(null);
      setRutinaSeleccionada("");
      if (fallidas.length > 0) {
        setError(`Rutina asignada. Se programaron ${total - fallidas.length} de ${total} sesiones. No se pudieron crear: ${fallidas.map((f) => `${f.fecha} (${f.motivo})`).join("; ")}`);
      }
      cargarClientes();
    }
    setAsignandoRutina(false);
  };

  const handleCompletarRutina = async (cliente, rutinaActiva) => {
    if (!perteneceAlCoach(cliente, coachId)) {
      setError("No tienes permiso para modificar este cliente.");
      return;
    }
    if (!window.confirm(`¿Marcar la rutina "${rutinaActiva.nombre_rutina}" de ${cliente.nombre} como completada?`)) return;
    setCompletandoRutina(rutinaActiva.id);
    const { error: errorCompletar } = await supabase.rpc("finalizar_rutina_cliente", {
      p_cliente_id: cliente.docId,
      p_historial_id: rutinaActiva.id,
    });
    if (errorCompletar) {
      console.error("Error al completar rutina:", errorCompletar);
      setError("No se pudo marcar la rutina como completada.");
    } else {
      setClienteParaCompletar(null);
      await cargarClientes();
    }
    setCompletandoRutina(null);
  };

  const handleGuardarMedicion = async (e) => {
    e.preventDefault();
    setError(null);

    if (!clienteSeleccionado) return;
    if (!perteneceAlCoach(clienteSeleccionado, coachId)) {
      setError("No tienes permiso para registrar mediciones de este cliente.");
      return;
    }

    if (!nuevaMedicion.fecha) {
      setError("Selecciona la fecha de la medición.");
      return;
    }
    if (nuevaMedicion.fecha > fechaLocalDe(new Date())) {
      setError("La fecha de la medición no puede ser futura.");
      return;
    }
    if (!nuevaMedicion.peso || !nuevaMedicion.estatura) {
      setError("Peso y estatura son obligatorios para registrar una medición.");
      return;
    }

    for (const [clave, limite] of Object.entries(LIMITES_MEDICION)) {
      const texto = `${nuevaMedicion[clave] ?? ""}`;
      if (texto === "" && (clave === "cintura" || clave === "cadera")) continue; // son opcionales
      const valor = Number(texto);
      if (!FORMATO_MEDIDA.test(texto) || valor < limite.min || valor > limite.max) {
        setError(`${limite.nombre} debe ser un número entre ${limite.min} y ${limite.max} ${limite.unidad} (máximo 1 decimal).`);
        return;
      }
    }
    const peso = Number(nuevaMedicion.peso);
    const estatura = Number(nuevaMedicion.estatura);
    const cintura = nuevaMedicion.cintura ? Number(nuevaMedicion.cintura) : null;
    const cadera = nuevaMedicion.cadera ? Number(nuevaMedicion.cadera) : null;

    setGuardandoMedicion(true);
    const { error: errMedicion } = await supabase.rpc("registrar_medicion_cliente", {
      p_cliente_id: clienteSeleccionado.docId,
      p_fecha: nuevaMedicion.fecha,
      p_peso: peso,
      p_estatura: estatura,
      p_cintura: cintura,
      p_cadera: cadera,
    });

    if (!errMedicion) {
      setNuevaMedicion({ fecha: fechaLocalDe(new Date()), peso: "", estatura: "", cintura: "", cadera: "" });
      setMostrarFormMedicion(false);
      cargarClientes();
    } else {
      console.error("Error al guardar medición:", errMedicion);
      setError(traducirErrorSupabase(errMedicion));
    }
    setGuardandoMedicion(false);
  };

  const clientesFiltrados = clientes;

  if (cargando) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px" }}>
        <p style={{ color: "#888" }}>Cargando...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Encabezado */}
      <div style={{ marginBottom: "28px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <p style={{ fontSize: "13px", color: "#888", margin: "0 0 4px" }}>
            {modoCrear ? "Nuevo registro" : "Directorio de atletas"}
          </p>
          <h2 style={{ fontSize: "26px", fontWeight: "900", color: "#0B0B0B", margin: 0 }}>
            {modoCrear ? "Registro de Cliente" : "Gestión de Clientes"}
          </h2>
          <p style={{ fontSize: "14px", color: "#888", marginTop: "6px" }}>
            {modoCrear
              ? "Ingresa la información del cliente para darlo de alta en Supabase."
              : "Consulta expedientes, asigna rutinas y da seguimiento a tus clientes. Las altas las realiza el administrador."}
          </p>
        </div>
      </div>

      {error && (
        <div style={{
          background: "#FDECEC", border: "0.5px solid #F3C4C4", color: "#B02A2A",
          borderRadius: "10px", padding: "12px 16px", fontSize: "13px", marginBottom: "20px",
        }}>
          {error}
        </div>
      )}

      {!modoCrear ? (
        <>
          {/* Cards resumen */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "16px", marginBottom: "24px",
          }}>
            {[
              { label: "Total registrados", valor: resumen.total, color: "#E11D2E" },
              { label: "Activos", valor: resumen.activos, color: "#1D9E75" },
              { label: "Inactivos", valor: resumen.inactivos, color: "#888888" },
            ].map((card) => (
              <div key={card.label} style={estiloCard}>
                <p style={{ fontSize: "12px", color: "#888", marginBottom: "8px" }}>{card.label}</p>
                <p style={{ fontSize: "36px", fontWeight: "900", color: card.color, margin: 0 }}>{card.valor}</p>
              </div>
            ))}
          </div>

          {/* Filtros y búsqueda */}
          <div style={{
            ...estiloCard, marginBottom: "20px", padding: "16px 20px",
            display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "12px",
          }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {FILTROS.map((f) => (
                <button
                  key={f}
                  onClick={() => { setFiltroEstado(f); setPagina(1); }}
                  style={{
                    fontSize: "12px", fontWeight: "700", padding: "8px 14px",
                    borderRadius: "8px", border: "none", cursor: "pointer",
                    background: filtroEstado === f ? "#0B0B0B" : "#F5F5F5",
                    color: filtroEstado === f ? "#FFFFFF" : "#333",
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
              placeholder="Buscar por nombre o correo..."
              style={{ ...inputStyle, width: "min(100%, 260px)" }}
            />
          </div>

          {/* Lista de clientes */}
          {clientesFiltrados.length === 0 ? (
            <div style={{ ...estiloCard, textAlign: "center", padding: "40px" }}>
              <p style={{ color: "#888", fontSize: "13px", margin: 0 }}>
                No hay clientes que coincidan con este filtro.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {clientesFiltrados.map((cliente) => {
                const colores = ESTADO_COLORES[cliente.estado] || ESTADO_POR_DEFECTO;
                return (
                  <div key={cliente.docId} style={estiloCard}>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                      <div style={{
                        width: "44px", height: "44px", borderRadius: "50%", background: "#F5F5F5",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#0B0B0B", fontWeight: "900", fontSize: "16px", flexShrink: 0,
                      }}>
                        {cliente.nombre.charAt(0).toUpperCase()}
                      </div>

                      <div style={{ flex: 1, minWidth: "220px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <p style={{ fontSize: "15px", fontWeight: "900", color: "#0B0B0B", margin: 0 }}>
                            {cliente.nombre}
                          </p>
                          <span style={{
                            fontSize: "10px", fontWeight: "700", padding: "3px 10px", borderRadius: "20px",
                            background: colores.bg, color: colores.color, textTransform: "uppercase",
                          }}>
                            {cliente.estado}
                          </span>
                        </div>
                        <p style={{ fontSize: "12px", color: "#888", margin: "2px 0 0" }}>
                          {cliente.email} · {cliente.telefono}
                        </p>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginTop: "10px", fontSize: "12px", color: "#555" }}>
                          <span>Objetivo: <strong style={{ color: "#0B0B0B" }}>{cliente.objetivo}</strong></span>
                          <span>Plan: <strong style={{ color: "#0B0B0B" }}>{cliente.plan}</strong></span>
                          <span>Rutinas activas: <strong style={{ color: "#0B0B0B" }}>{rutinasActivasDe(cliente.docId).map((h) => h.nombre_rutina).join(", ") || "Sin asignar"}</strong></span>
                          <span>Peso: <strong style={{ color: "#0B0B0B" }}>{cliente.pesoActual}</strong></span>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                        <button
                          onClick={() => setClienteSeleccionado(cliente)}
                          style={{
                            background: "#0B0B0B", color: "#FFF", fontWeight: "700", fontSize: "12px",
                            padding: "10px 16px", borderRadius: "8px", border: "none", cursor: "pointer",
                          }}
                        >
                          Ver Expediente
                        </button>
                        <button
                          onClick={() => abrirAsignarRutina(cliente)}
                          style={{
                            background: "#F5F5F5", color: "#0B0B0B", fontWeight: "700", fontSize: "12px",
                            padding: "10px 16px", borderRadius: "8px", border: "0.5px solid #E5E5E5", cursor: "pointer",
                          }}
                        >
                          Asignar Rutina
                        </button>
                        {rutinasActivasDe(cliente.docId).length > 0 && (
                          <button
                            onClick={() => setClienteParaCompletar(cliente)}
                            style={{
                              background: "#F5F5F5", color: "#0B0B0B", fontWeight: "700", fontSize: "12px",
                              padding: "10px 16px", borderRadius: "8px", border: "0.5px solid #E5E5E5", cursor: "pointer",
                            }}
                          >
                            Completar Rutina
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Paginacion
            pagina={pagina}
            total={totalResultados}
            porPagina={CLIENTES_POR_PAGINA}
            onCambiar={setPagina}
          />
        </>
      ) : (
        /* Formulario de alta */
        <div style={{ ...estiloCard, maxWidth: "720px" }}>
          <form onSubmit={handleGuardarCliente} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div>
              <p style={{ fontSize: "12px", fontWeight: "900", color: "#E11D2E", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "12px" }}>
                1. Información Personal
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
                <div>
                  <label style={labelStyle}>Nombre *</label>
                  <input
                    type="text" required style={inputStyle}
                    value={nuevoCliente.nombre}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })}
                    placeholder="Ej. Carlos"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Apellido</label>
                  <input
                    type="text" style={inputStyle}
                    value={nuevoCliente.apellido}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, apellido: e.target.value })}
                    placeholder="Ej. Rodríguez"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Correo Electrónico *</label>
                  <input
                    type="email" required style={inputStyle}
                    value={nuevoCliente.email}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, email: e.target.value })}
                    placeholder="carlos@email.com"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Teléfono</label>
                  <input
                    type="tel" inputMode="tel" autoComplete="tel" style={inputStyle}
                    value={nuevoCliente.telefono}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })}
                    placeholder="+1 (809) 000-0000"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Estado Inicial</label>
                  <select
                    style={inputStyle}
                    value={nuevoCliente.estado}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, estado: e.target.value })}
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Edad</label>
                  <input
                    type="number" style={inputStyle}
                    value={nuevoCliente.edad}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, edad: e.target.value })}
                    placeholder="26"
                  />
                </div>
              </div>
            </div>

            <div>
              <p style={{ fontSize: "12px", fontWeight: "900", color: "#E11D2E", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "12px" }}>
                2. Objetivos y Plan
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "14px" }}>
                <div>
                  <label style={labelStyle}>Objetivo Principal</label>
                  <select
                    style={inputStyle}
                    value={nuevoCliente.objetivo}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, objetivo: e.target.value })}
                  >
                    <option value="Hipertrofia / Masa Muscular">Hipertrofia / Masa Muscular</option>
                    <option value="Pérdida de Grasa">Pérdida de Grasa</option>
                    <option value="Fuerza Máxima">Fuerza Máxima</option>
                    <option value="Salud y Movilidad">Salud y Movilidad</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Suscripción / Plan</label>
                  <select
                    style={inputStyle}
                    value={nuevoCliente.plan}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, plan: e.target.value })}
                  >
                    <option value="Plan Smart">Plan Smart</option>
                    <option value="Plan Black">Plan Black</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Observaciones / Lesiones Previas</label>
                <textarea
                  rows="3"
                  style={{ ...inputStyle, resize: "vertical" }}
                  value={nuevoCliente.observaciones}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, observaciones: e.target.value })}
                  placeholder="Detalle cualquier condición física relevante..."
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "0.5px solid #E5E5E5", paddingTop: "18px" }}>
              <button
                type="button"
                onClick={() => setModoCrear(false)}
                style={{
                  background: "#FFF", color: "#555", fontWeight: "700", fontSize: "13px",
                  padding: "12px 20px", borderRadius: "8px", border: "0.5px solid #E5E5E5", cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                style={{
                  background: "#0B0B0B", color: "#FFFFFF", fontWeight: "900", fontSize: "13px",
                  padding: "12px 22px", borderRadius: "8px", border: "none",
                  cursor: guardando ? "default" : "pointer", opacity: guardando ? 0.6 : 1,
                }}
              >
                {guardando ? "Guardando..." : "Guardar Cliente"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Asignar Rutina */}
      {clienteParaAsignarRutina && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(11,11,11,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", zIndex: 50,
        }}>
          <div style={{ ...estiloCard, maxWidth: "480px", width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ borderBottom: "0.5px solid #E5E5E5", paddingBottom: "14px", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "900", color: "#0B0B0B", margin: 0 }}>
                Asignar Rutina
              </h3>
              <p style={{ fontSize: "12px", color: "#888", margin: "2px 0 0" }}>
                {clienteParaAsignarRutina.nombre}
              </p>
            </div>

            <form onSubmit={handleConfirmarAsignacion} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={labelStyle}>Rutina</label>
                <select
                  style={inputStyle}
                  value={rutinaSeleccionada}
                  onChange={(e) => { setRutinaSeleccionada(e.target.value); setErrorPlan(""); }}
                >
                  <option value="">Selecciona una rutina</option>
                  {rutinas.filter((r) => !rutinasActivasDe(clienteParaAsignarRutina.docId).some((h) => h.rutina_id === r.docId)).map((r) => (
                    <option key={r.docId} value={r.docId}>
                      {r.nombre} · {r.nivel}
                    </option>
                  ))}
                </select>
                {rutinas.length === 0 && (
                  <p style={{ fontSize: "11px", color: "#9B1C24", marginTop: "6px" }}>
                    Aún no tienes rutinas creadas. Ve a "Rutinas" en el menú para crear la primera.
                  </p>
                )}
              </div>

              {rutinaSeleccionada && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={labelStyle}>Inicia el</label>
                      <input type="date" style={inputStyle} min={fechaLocalDe(new Date())} value={plan.desde} onChange={(e) => cambiarPlan({ desde: e.target.value })} />
                    </div>
                    <div>
                      <label style={labelStyle}>Termina el</label>
                      <input type="date" style={inputStyle} min={plan.desde} value={plan.fin} onChange={(e) => cambiarPlan({ fin: e.target.value })} />
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>Duración rápida</label>
                    <select style={inputStyle} value={plan.periodo} onChange={(e) => cambiarPlan({ periodo: e.target.value ? Number(e.target.value) : "" })}>
                      <option value="">Personalizada</option>
                      {PERIODOS_PLAN.map((p) => <option key={p.dias} value={p.dias}>{p.etiqueta}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Días de entrenamiento</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {DIAS_PLAN.map((d) => {
                        const activo = plan.dias.includes(d.numero);
                        return (
                          <button
                            key={d.numero}
                            type="button"
                            onClick={() => alternarDiaPlan(d.numero)}
                            aria-pressed={activo}
                            style={{
                              fontSize: "12px", fontWeight: "700", padding: "8px 14px", borderRadius: "8px", cursor: "pointer",
                              background: activo ? "#0B0B0B" : "#FFF", color: activo ? "#FFF" : "#0B0B0B",
                              border: activo ? "1px solid #0B0B0B" : "1px solid #D5D5D5",
                            }}
                          >
                            {d.etiqueta}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={labelStyle}>Hora</label>
                      <select style={inputStyle} value={plan.hora} onChange={(e) => cambiarPlan({ hora: e.target.value })}>
                        <option value="">Selecciona</option>
                        {horasComunes(plan.dias, plan.duracion).map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Duración de cada sesión</label>
                      <select style={inputStyle} value={plan.duracion} onChange={(e) => cambiarPlan({ duracion: Number(e.target.value) })}>
                        {DURACIONES_SESION.map((m) => <option key={m} value={m}>{m} minutos</option>)}
                      </select>
                    </div>
                  </div>

                  <p style={{ fontSize: "11px", color: "#888", margin: 0 }}>
                    Horario de atención: {TEXTO_HORARIO}
                    {plan.dias.length > 0 && plan.hora && ` Se crearán ${generarFechasPlan(plan).length} sesiones con su evento en el calendario del cliente. El día de fin recibirás una notificación para reasignarle una rutina.`}
                  </p>
                  {errorPlan && <p role="alert" style={{ background: "#FDECEC", border: "0.5px solid #F3C4C4", borderRadius: "8px", color: "#B02A2A", fontSize: "12px", margin: 0, padding: "10px 12px" }}>{errorPlan}</p>}
                  {progresoPlan && <p style={{ fontSize: "12px", color: "#555", margin: 0 }}>{progresoPlan}</p>}
                </>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "4px" }}>
                <button
                  type="button"
                  onClick={() => { setClienteParaAsignarRutina(null); setRutinaSeleccionada(""); }}
                  style={{
                    background: "#FFF", color: "#555", fontWeight: "700", fontSize: "13px",
                    padding: "10px 18px", borderRadius: "8px", border: "0.5px solid #E5E5E5", cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={asignandoRutina}
                  style={{
                    background: "#0B0B0B", color: "#FFFFFF", fontWeight: "900", fontSize: "13px",
                    padding: "10px 20px", borderRadius: "8px", border: "none",
                    cursor: asignandoRutina ? "default" : "pointer", opacity: asignandoRutina ? 0.6 : 1,
                  }}
                >
                  {asignandoRutina ? "Guardando..." : "Asignar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Completar Rutina */}
      {clienteParaCompletar && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(11,11,11,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", zIndex: 50,
        }}>
          <div style={{ ...estiloCard, maxWidth: "480px", width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ borderBottom: "0.5px solid #E5E5E5", paddingBottom: "14px", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "900", color: "#0B0B0B", margin: 0 }}>Completar Rutina</h3>
              <p style={{ fontSize: "12px", color: "#888", margin: "2px 0 0" }}>{clienteParaCompletar.nombre}. Elige la rutina que terminó.</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {rutinasActivasDe(clienteParaCompletar.docId).map((h) => (
                <div key={h.id} style={{ alignItems: "center", background: "#F5F5F5", borderRadius: "10px", display: "flex", gap: "12px", justifyContent: "space-between", padding: "12px 14px" }}>
                  <div>
                    <p style={{ fontSize: "13px", fontWeight: "900", color: "#0B0B0B", margin: 0 }}>{h.nombre_rutina}</p>
                    <p style={{ fontSize: "11px", color: "#888", margin: "3px 0 0" }}>
                      Asignada el {fechaCorta(h.asignada_en)}{h.fecha_fin ? ` · termina el ${fechaCorta(h.fecha_fin)}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={completandoRutina === h.id}
                    onClick={() => void handleCompletarRutina(clienteParaCompletar, h)}
                    style={{ background: "#0B0B0B", color: "#FFF", fontWeight: "700", fontSize: "12px", padding: "10px 14px", borderRadius: "8px", border: "none", cursor: "pointer", opacity: completandoRutina === h.id ? 0.6 : 1, whiteSpace: "nowrap" }}
                  >
                    {completandoRutina === h.id ? "Guardando..." : "Marcar completada"}
                  </button>
                </div>
              ))}
              {rutinasActivasDe(clienteParaCompletar.docId).length === 0 && (
                <p style={{ fontSize: "13px", color: "#888", margin: 0 }}>Este cliente no tiene rutinas activas.</p>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
              <button type="button" onClick={() => setClienteParaCompletar(null)} style={{ background: "#FFF", color: "#555", fontWeight: "700", fontSize: "13px", padding: "10px 18px", borderRadius: "8px", border: "0.5px solid #E5E5E5", cursor: "pointer" }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal expediente */}
      {clienteSeleccionado && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(11,11,11,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", zIndex: 50,
        }}>
          <div style={{ ...estiloCard, maxWidth: "540px", width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "flex-start",
              borderBottom: "0.5px solid #E5E5E5", paddingBottom: "16px", marginBottom: "16px",
            }}>
              <div>
                <h3 style={{ fontSize: "20px", fontWeight: "900", color: "#0B0B0B", margin: 0 }}>
                  {clienteSeleccionado.nombre}
                </h3>
                <p style={{ fontSize: "12px", color: "#888", margin: "2px 0 0" }}>{clienteSeleccionado.email}</p>
              </div>
              <button
                onClick={() => setClienteSeleccionado(null)}
                style={{ background: "none", border: "none", color: "#888", fontSize: "18px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{
              display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "12px",
              background: "#F5F5F5", borderRadius: "10px", padding: "16px", marginBottom: "16px", fontSize: "13px",
            }}>
              <div>
                <p style={{ ...labelStyle, marginBottom: "2px" }}>Estado</p>
                <p style={{ fontWeight: "700", color: "#0B0B0B", margin: 0 }}>{clienteSeleccionado.estado}</p>
              </div>
              <div>
                <p style={{ ...labelStyle, marginBottom: "2px" }}>Teléfono</p>
                <p style={{ fontWeight: "700", color: "#0B0B0B", margin: 0 }}>{clienteSeleccionado.telefono}</p>
              </div>
              <div>
                <p style={{ ...labelStyle, marginBottom: "2px" }}>Peso Registrado</p>
                <p style={{ fontWeight: "700", color: "#0B0B0B", margin: 0 }}>{clienteSeleccionado.pesoActual}</p>
              </div>
              <div>
                <p style={{ ...labelStyle, marginBottom: "2px" }}>Rutinas activas</p>
                <p style={{ fontWeight: "700", color: "#0B0B0B", margin: 0 }}>{rutinasActivasDe(clienteSeleccionado.docId).map((h) => h.nombre_rutina).join(", ") || "Sin asignar"}</p>
              </div>
            </div>

            {/* Historial de rutinas asignadas */}
            <div style={{ marginBottom: "16px" }}>
              <p style={{ fontSize: "13px", fontWeight: "900", color: "#0B0B0B", margin: "0 0 10px" }}>Historial de rutinas</p>
              {historialDe(clienteSeleccionado.docId).length === 0 ? (
                <p style={{ fontSize: "12px", color: "#888", margin: 0 }}>Aún no se le han asignado rutinas.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {historialDe(clienteSeleccionado.docId).map((h) => (
                    <div key={h.id} style={{ alignItems: "center", background: "#F5F5F5", borderRadius: "8px", display: "flex", gap: "10px", justifyContent: "space-between", padding: "10px 12px" }}>
                      <div>
                        <p style={{ fontSize: "12px", fontWeight: "900", color: "#0B0B0B", margin: 0 }}>{h.nombre_rutina}</p>
                        <p style={{ fontSize: "11px", color: "#888", margin: "2px 0 0" }}>
                          Asignada {fechaCorta(h.asignada_en)}
                          {h.estado === "activa" && h.fecha_fin ? ` · termina ${fechaCorta(h.fecha_fin)}` : ""}
                          {h.finalizada_en ? ` · completada ${fechaCorta(h.finalizada_en)}` : ""}
                        </p>
                      </div>
                      <span style={{ background: h.estado === "activa" ? "#0B0B0B" : "#E5E5E5", borderRadius: "20px", color: h.estado === "activa" ? "#FFF" : "#333", fontSize: "10px", fontWeight: "700", padding: "3px 10px", textTransform: "uppercase" }}>
                        {h.estado === "activa" ? "Activa" : "Completada"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Historial de mediciones (ficha antropométrica) */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <p style={{ fontSize: "13px", fontWeight: "900", color: "#0B0B0B", margin: 0 }}>
                  Historial de Mediciones
                </p>
                <button
                  onClick={() => setMostrarFormMedicion(!mostrarFormMedicion)}
                  style={{
                    background: mostrarFormMedicion ? "#F5F5F5" : "#0B0B0B",
                    color: mostrarFormMedicion ? "#333" : "#FFFFFF", fontWeight: "700", fontSize: "11px",
                    padding: "6px 12px", borderRadius: "8px",
                    border: mostrarFormMedicion ? "0.5px solid #E5E5E5" : "none", cursor: "pointer",
                  }}
                >
                  {mostrarFormMedicion ? "Cancelar" : "Nueva Medición"}
                </button>
              </div>

              {mostrarFormMedicion && (
                <form
                  onSubmit={handleGuardarMedicion}
                  style={{
                    background: "#F5F5F5", borderRadius: "10px", padding: "14px",
                    marginBottom: "12px", display: "flex", flexDirection: "column", gap: "10px",
                  }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
                    <div>
                      <label style={labelStyle}>Fecha</label>
                      <input
                        type="date" required max={fechaLocalDe(new Date())} style={{ ...inputStyle, background: "#FFF" }}
                        value={nuevaMedicion.fecha}
                        onChange={(e) => setNuevaMedicion({ ...nuevaMedicion, fecha: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Peso (kg) *</label>
                      <input
                        type="text" inputMode="decimal" autoComplete="off" maxLength={5} required style={{ ...inputStyle, background: "#FFF" }}
                        value={nuevaMedicion.peso}
                        onChange={(e) => setNuevaMedicion({ ...nuevaMedicion, peso: limpiarDecimal(e.target.value) })}
                        placeholder="75.0"
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Estatura (cm) *</label>
                      <input
                        type="text" inputMode="decimal" autoComplete="off" maxLength={5} required style={{ ...inputStyle, background: "#FFF" }}
                        value={nuevaMedicion.estatura}
                        onChange={(e) => setNuevaMedicion({ ...nuevaMedicion, estatura: limpiarDecimal(e.target.value) })}
                        placeholder="175"
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Cintura (cm)</label>
                      <input
                        type="text" inputMode="decimal" autoComplete="off" maxLength={5} style={{ ...inputStyle, background: "#FFF" }}
                        value={nuevaMedicion.cintura}
                        onChange={(e) => setNuevaMedicion({ ...nuevaMedicion, cintura: limpiarDecimal(e.target.value) })}
                        placeholder="82"
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Cadera (cm)</label>
                      <input
                        type="text" inputMode="decimal" autoComplete="off" maxLength={5} style={{ ...inputStyle, background: "#FFF" }}
                        value={nuevaMedicion.cadera}
                        onChange={(e) => setNuevaMedicion({ ...nuevaMedicion, cadera: limpiarDecimal(e.target.value) })}
                        placeholder="98"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={guardandoMedicion}
                    style={{
                      background: "#0B0B0B", color: "#FFF", fontWeight: "700", fontSize: "12px",
                      padding: "10px", borderRadius: "8px", border: "none",
                      cursor: guardandoMedicion ? "default" : "pointer", opacity: guardandoMedicion ? 0.6 : 1,
                    }}
                  >
                    {guardandoMedicion ? "Guardando..." : "Guardar Medición"}
                  </button>
                </form>
              )}

              {cargandoMediciones ? (
                <p style={{ fontSize: "12px", color: "#888" }}>Cargando historial...</p>
              ) : mediciones.length === 0 ? (
                <p style={{ fontSize: "12px", color: "#888" }}>Aún no hay mediciones registradas.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "220px", overflowY: "auto" }}>
                  {mediciones.map((m) => (
                      <div key={m.docId} style={{
                        background: "#F5F5F5", borderRadius: "8px", padding: "10px 12px",
                        display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", flexWrap: "wrap", gap: "6px",
                      }}>
                        <span style={{ fontWeight: "700", color: "#0B0B0B" }}>{m.fecha}</span>
                        <span style={{ color: "#555" }}>Peso: <strong style={{ color: "#0B0B0B" }}>{m.peso} kg</strong></span>
                        {m.icc && (
                          <span style={{ color: "#555" }}>ICC: <strong style={{ color: "#0B0B0B" }}>{m.icc}</strong></span>
                        )}
                        <span style={{
                          fontSize: "10px", fontWeight: "700", padding: "3px 8px", borderRadius: "20px",
                          background: "#EAF2FB", color: "#2E5D9A",
                        }}>
                          IMC registrado: {m.imc}
                        </span>
                      </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
              <button
                onClick={() => setClienteSeleccionado(null)}
                style={{
                  background: "#0B0B0B", color: "#FFF", fontWeight: "700", fontSize: "12px",
                  padding: "10px 18px", borderRadius: "8px", border: "none", cursor: "pointer",
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}