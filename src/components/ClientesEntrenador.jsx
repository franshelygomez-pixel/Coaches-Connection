import { useState } from "react";

export default function ClientesEntrenador() {
  const [modoCrear, setModoCrear] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  // Lista de clientes
  const [clientes, setClientes] = useState([
    {
      id: "CLI-101",
      nombre: "Juan Pérez",
      email: "juan.perez@email.com",
      telefono: "+1 (809) 555-0192",
      estado: "Activo",
      plan: "Personalizado Premium",
      objetivo: "Hipertrofia",
      pesoInicial: "82 kg",
      pesoActual: "78.5 kg",
      rutinaAsignada: "Hipertrofia • Torso / Pierna",
      fechaRegistro: "12 May 2026",
    },
    {
      id: "CLI-102",
      nombre: "María Gómez",
      email: "maria.gomez@email.com",
      telefono: "+1 (829) 555-0143",
      estado: "En Evaluación",
      plan: "Acondicionamiento Base",
      objetivo: "Pérdida de Grasa",
      pesoInicial: "68 kg",
      pesoActual: "67.2 kg",
      rutinaAsignada: "Reacondicionamiento Físico",
      fechaRegistro: "28 Jun 2026",
    },
    {
      id: "CLI-103",
      nombre: "Pedro Martínez",
      email: "pedro.m@email.com",
      telefono: "+1 (849) 555-0881",
      estado: "Activo",
      plan: "Fuerza Elite",
      objetivo: "Fuerza Máxima",
      pesoInicial: "90 kg",
      pesoActual: "91.2 kg",
      rutinaAsignada: "Fuerza Máxima • Powerbuilding",
      fechaRegistro: "03 Feb 2026",
    },
    {
      id: "CLI-104",
      nombre: "Carla Sánchez",
      email: "carla.s@email.com",
      telefono: "+1 (809) 555-0322",
      estado: "Inactivo",
      plan: "Salud Integral",
      objetivo: "Movilidad",
      pesoInicial: "62 kg",
      pesoActual: "62 kg",
      rutinaAsignada: "Sin Asignar",
      fechaRegistro: "15 Ene 2026",
    },
  ]);

  // Estado local para los campos del formulario
  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: "",
    email: "",
    telefono: "",
    estado: "En Evaluación",
    pesoActual: "",
    estatura: "",
    porcentajeGrasa: "",
    edad: "",
    objetivo: "Hipertrofia / Masa Muscular",
    plan: "Personalizado Premium",
    observaciones: "",
  });

  // Función para guardar el nuevo cliente
  const handleGuardarCliente = (e) => {
    e.preventDefault();
    if (!nuevoCliente.nombre || !nuevoCliente.email) return;

    const clienteCreado = {
      id: `CLI-${100 + clientes.length + 1}`,
      nombre: nuevoCliente.nombre,
      email: nuevoCliente.email,
      telefono: nuevoCliente.telefono || "+1 (800) 000-0000",
      estado: nuevoCliente.estado,
      plan: nuevoCliente.plan,
      objetivo: nuevoCliente.objetivo,
      pesoInicial: nuevoCliente.pesoActual ? `${nuevoCliente.pesoActual} kg` : "--",
      pesoActual: nuevoCliente.pesoActual ? `${nuevoCliente.pesoActual} kg` : "--",
      rutinaAsignada: "Sin Asignar",
      fechaRegistro: new Date().toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    };

    // Uso de setClientes para actualizar la lista local
    setClientes([clienteCreado, ...clientes]);

    // Limpieza de campos y retorno al directorio
    setNuevoCliente({
      nombre: "",
      email: "",
      telefono: "",
      estado: "En Evaluación",
      pesoActual: "",
      estatura: "",
      porcentajeGrasa: "",
      edad: "",
      objetivo: "Hipertrofia / Masa Muscular",
      plan: "Personalizado Premium",
      observaciones: "",
    });
    setModoCrear(false);
  };

  // Filtrado de clientes por estado y búsqueda
  const clientesFiltrados = clientes.filter((c) => {
    const cumpleFiltro = filtroEstado === "Todos" || c.estado === filtroEstado;
    const cumpleBusqueda =
      c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.id.toLowerCase().includes(busqueda.toLowerCase());
    return cumpleFiltro && cumpleBusqueda;
  });

  return (
    <div className="space-y-8 font-sans text-stone-800 bg-[#FAF8F5] p-6 sm:p-8 rounded-xl border border-stone-200/60 min-h-full">
      
      {/* Header estilo Warm Marfil */}
      <div className="bg-[#F4EFEA] border border-stone-300/70 rounded-lg py-8 px-8 shadow-xs">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-3">
              <span className="bg-[#FFC800] text-stone-900 text-xs font-bold px-3 py-1 rounded-xs uppercase tracking-wide">
                Smart Fit • Gestión
              </span>
              <span className="text-stone-600 text-xs font-medium uppercase tracking-wider">
                | Directorio de Atletas
              </span>
            </div>

            <h1 className="text-3xl lg:text-4xl font-bold text-stone-900 tracking-tight leading-snug">
              {modoCrear ? "Registro de Nuevo Cliente" : "Gestión de Clientes"}
            </h1>

            <p className="text-stone-600 text-base leading-relaxed">
              {modoCrear
                ? "Ingrese la información personal, datos antropométricos e historial para dar de alta un nuevo perfil."
                : "Consulte expedientes, asigne rutinas y realice el seguimiento antropométrico de sus clientes."}
            </p>
          </div>

          <button
            onClick={() => setModoCrear(!modoCrear)}
            className="bg-stone-900 text-stone-50 font-semibold px-6 py-3.5 rounded-md text-base hover:bg-stone-800 transition shadow-xs cursor-pointer shrink-0"
          >
            {modoCrear ? "← Volver al Directorio" : "+ Nuevo Cliente"}
          </button>
        </div>
      </div>

      {/* VISTA 1: DIRECTORIO DE CLIENTES */}
      {!modoCrear ? (
        <div className="space-y-6">
          
          {/* Métricas Rápidas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-xs font-medium text-stone-500 uppercase tracking-wider block">Activos</span>
                <span className="text-2xl font-bold text-stone-900">
                  {clientes.filter((c) => c.estado === "Activo").length}
                </span>
              </div>
              <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-md flex items-center justify-center font-bold text-lg">
                ✓
              </div>
            </div>

            <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-xs font-medium text-stone-500 uppercase tracking-wider block">En Evaluación</span>
                <span className="text-2xl font-bold text-stone-900">
                  {clientes.filter((c) => c.estado === "En Evaluación").length}
                </span>
              </div>
              <div className="w-10 h-10 bg-amber-50 text-amber-700 rounded-md flex items-center justify-center font-bold text-lg">
                ⏱
              </div>
            </div>

            <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-xs font-medium text-stone-500 uppercase tracking-wider block">Total Registrados</span>
                <span className="text-2xl font-bold text-stone-900">{clientes.length}</span>
              </div>
              <div className="w-10 h-10 bg-[#FAF8F5] text-stone-700 border border-stone-200 rounded-md flex items-center justify-center font-bold text-lg">
                👥
              </div>
            </div>
          </div>

          {/* Filtros de Búsqueda y Estado */}
          <div className="bg-white p-6 rounded-lg border border-stone-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
              {["Todos", "Activo", "En Evaluación", "Inactivo"].map((estado) => (
                <button
                  key={estado}
                  onClick={() => setFiltroEstado(estado)}
                  className={`text-xs font-bold px-4 py-2.5 rounded-md transition-all whitespace-nowrap cursor-pointer ${
                    filtroEstado === estado
                      ? "bg-[#FFC800] text-stone-900 border border-amber-400"
                      : "bg-[#FAF8F5] text-stone-600 border border-stone-200/80 hover:bg-stone-100 hover:text-stone-900"
                  }`}
                >
                  {estado}
                </button>
              ))}
            </div>

            <div className="w-full sm:w-80">
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por cliente o código..."
                className="w-full bg-[#FAF8F5] border border-stone-200/80 rounded-md px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:border-stone-400 transition-colors placeholder:text-stone-400"
              />
            </div>
          </div>

          {/* Tarjetas de Clientes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {clientesFiltrados.map((cliente) => (
              <div
                key={cliente.id}
                className="bg-white rounded-lg border border-stone-200 shadow-xs p-6 hover:border-stone-300 transition flex flex-col justify-between space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono font-bold text-stone-400">
                      {cliente.id}
                    </span>
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-xs border ${
                        cliente.estado === "Activo"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : cliente.estado === "En Evaluación"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : "bg-stone-100 text-stone-600 border-stone-200"
                      }`}
                    >
                      {cliente.estado}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-stone-900 text-xl leading-snug">
                      {cliente.nombre}
                    </h3>
                    <p className="text-xs text-stone-500 mt-0.5">{cliente.email} • {cliente.telefono}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-[#FAF8F5]/70 p-3.5 rounded-md border border-stone-200/80 text-xs">
                    <div>
                      <span className="block text-stone-500 font-medium uppercase tracking-wider mb-0.5">
                        Objetivo
                      </span>
                      <span className="font-bold text-stone-900 text-sm">{cliente.objetivo}</span>
                    </div>
                    <div>
                      <span className="block text-stone-500 font-medium uppercase tracking-wider mb-0.5">
                        Plan Actual
                      </span>
                      <span className="font-bold text-stone-900 text-sm">{cliente.plan}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-stone-600 pt-1 px-1">
                    <span>Rutina: <strong className="text-stone-900">{cliente.rutinaAsignada}</strong></span>
                    <span>Peso: <strong className="text-stone-900">{cliente.pesoActual}</strong></span>
                  </div>
                </div>

                <div className="pt-4 border-t border-stone-200 flex items-center gap-3">
                  <button 
                    onClick={() => setClienteSeleccionado(cliente)}
                    className="flex-1 bg-stone-900 text-white hover:bg-[#FFC800] hover:text-stone-900 font-semibold text-sm py-2.5 rounded-md transition border border-stone-900 cursor-pointer"
                  >
                    Ver Expediente
                  </button>
                  <button className="bg-[#FAF8F5] text-stone-700 hover:text-stone-900 font-medium px-4 py-2.5 rounded-md border border-stone-200 text-xs transition cursor-pointer">
                    Asignar Rutina
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* VISTA 2: FORMULARIO DE ALTA / CREAR CLIENTE */
        <div className="bg-white rounded-lg p-8 border border-stone-200 shadow-xs max-w-4xl mx-auto space-y-8">
          
          <div className="border-b border-stone-200 pb-4">
            <h2 className="font-bold text-stone-900 text-xl">Expediente Inicial del Cliente</h2>
            <p className="text-sm text-stone-500">Complete los campos obligatorios para registrar al cliente en la base de datos local.</p>
          </div>

          <form className="space-y-6" onSubmit={handleGuardarCliente}>
            
            {/* Sección 1: Datos Personales */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider border-l-2 border-[#FFC800] pl-2">
                1. Información Personal
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1.5">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={nuevoCliente.nombre}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })}
                    placeholder="Ej. Carlos Rodríguez"
                    className="w-full bg-[#FAF8F5] border border-stone-200/80 rounded-md p-3 text-sm text-stone-900 focus:outline-none focus:border-stone-400 transition-colors placeholder:text-stone-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1.5">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    value={nuevoCliente.email}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, email: e.target.value })}
                    placeholder="carlos@email.com"
                    className="w-full bg-[#FAF8F5] border border-stone-200/80 rounded-md p-3 text-sm text-stone-900 focus:outline-none focus:border-stone-400 transition-colors placeholder:text-stone-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1.5">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={nuevoCliente.telefono}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })}
                    placeholder="+1 (809) 000-0000"
                    className="w-full bg-[#FAF8F5] border border-stone-200/80 rounded-md p-3 text-sm text-stone-900 focus:outline-none focus:border-stone-400 transition-colors placeholder:text-stone-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1.5">
                    Estado Inicial
                  </label>
                  <select
                    value={nuevoCliente.estado}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, estado: e.target.value })}
                    className="w-full bg-[#FAF8F5] border border-stone-200/80 rounded-md p-3 text-sm text-stone-900 focus:outline-none focus:border-stone-400 transition-colors"
                  >
                    <option value="En Evaluación">En Evaluación</option>
                    <option value="Activo">Activo</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Sección 2: Antropometría Inicial */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider border-l-2 border-[#FFC800] pl-2">
                2. Evaluación Antropométrica Inicial
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1.5">
                    Peso (kg)
                  </label>
                  <input
                    type="number"
                    value={nuevoCliente.pesoActual}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, pesoActual: e.target.value })}
                    placeholder="75.0"
                    className="w-full bg-[#FAF8F5] border border-stone-200/80 rounded-md p-3 text-sm text-stone-900 focus:outline-none focus:border-stone-400 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1.5">
                    Estatura (cm)
                  </label>
                  <input
                    type="number"
                    value={nuevoCliente.estatura}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, estatura: e.target.value })}
                    placeholder="175"
                    className="w-full bg-[#FAF8F5] border border-stone-200/80 rounded-md p-3 text-sm text-stone-900 focus:outline-none focus:border-stone-400 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1.5">
                    % Grasa (Est.)
                  </label>
                  <input
                    type="number"
                    value={nuevoCliente.porcentajeGrasa}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, porcentajeGrasa: e.target.value })}
                    placeholder="18"
                    className="w-full bg-[#FAF8F5] border border-stone-200/80 rounded-md p-3 text-sm text-stone-900 focus:outline-none focus:border-stone-400 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1.5">
                    Edad
                  </label>
                  <input
                    type="number"
                    value={nuevoCliente.edad}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, edad: e.target.value })}
                    placeholder="26"
                    className="w-full bg-[#FAF8F5] border border-stone-200/80 rounded-md p-3 text-sm text-stone-900 focus:outline-none focus:border-stone-400 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Sección 3: Objetivos y Observaciones */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider border-l-2 border-[#FFC800] pl-2">
                3. Objetivos & Restricciones
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1.5">
                    Objetivo Principal
                  </label>
                  <select
                    value={nuevoCliente.objetivo}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, objetivo: e.target.value })}
                    className="w-full bg-[#FAF8F5] border border-stone-200/80 rounded-md p-3 text-sm text-stone-900 focus:outline-none focus:border-stone-400 transition-colors"
                  >
                    <option value="Hipertrofia / Masa Muscular">Hipertrofia / Masa Muscular</option>
                    <option value="Pérdida de Grasa">Pérdida de Grasa</option>
                    <option value="Fuerza Máxima">Fuerza Máxima</option>
                    <option value="Salud y Movilidad">Salud y Movilidad</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1.5">
                    Suscripción / Plan
                  </label>
                  <select
                    value={nuevoCliente.plan}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, plan: e.target.value })}
                    className="w-full bg-[#FAF8F5] border border-stone-200/80 rounded-md p-3 text-sm text-stone-900 focus:outline-none focus:border-stone-400 transition-colors"
                  >
                    <option value="Personalizado Premium">Personalizado Premium</option>
                    <option value="Acondicionamiento Base">Acondicionamiento Base</option>
                    <option value="Fuerza Elite">Fuerza Elite</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1.5">
                  Observaciones / Lesiones Previas
                </label>
                <textarea
                  rows="3"
                  value={nuevoCliente.observaciones}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, observaciones: e.target.value })}
                  placeholder="Detalle cualquier condición física o contraindicación relevante..."
                  className="w-full bg-[#FAF8F5] border border-stone-200/80 rounded-md p-3 text-sm text-stone-900 focus:outline-none focus:border-stone-400 transition-colors placeholder:text-stone-400"
                ></textarea>
              </div>
            </div>

            {/* Botones de Formulario */}
            <div className="flex justify-end gap-3 pt-4 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setModoCrear(false)}
                className="bg-white border border-stone-200 text-stone-600 hover:text-stone-900 font-semibold text-sm px-6 py-3 rounded-md transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-stone-900 text-stone-50 font-semibold text-sm px-7 py-3 rounded-md hover:bg-stone-800 transition cursor-pointer"
              >
                Guardar Cliente
              </button>
            </div>

          </form>
        </div>
      )}

      {/* MODAL DETALLE DE EXPEDIENTE */}
      {clienteSeleccionado && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg border border-stone-200 p-6 max-w-lg w-full space-y-6 shadow-xl">
            <div className="flex justify-between items-start border-b border-stone-200 pb-4">
              <div>
                <span className="text-xs font-mono font-bold text-stone-400">{clienteSeleccionado.id}</span>
                <h3 className="text-2xl font-bold text-stone-900">{clienteSeleccionado.nombre}</h3>
                <p className="text-xs text-stone-500">{clienteSeleccionado.email}</p>
              </div>
              <button
                onClick={() => setClienteSeleccionado(null)}
                className="text-stone-400 hover:text-stone-800 text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 bg-[#FAF8F5] p-4 rounded-md border border-stone-200/80">
                <div>
                  <span className="block text-xs font-medium text-stone-500 uppercase">Estado</span>
                  <span className="font-bold text-stone-900">{clienteSeleccionado.estado}</span>
                </div>
                <div>
                  <span className="block text-xs font-medium text-stone-500 uppercase">Teléfono</span>
                  <span className="font-bold text-stone-900">{clienteSeleccionado.telefono}</span>
                </div>
                <div>
                  <span className="block text-xs font-medium text-stone-500 uppercase">Peso Registrado</span>
                  <span className="font-bold text-stone-900">{clienteSeleccionado.pesoActual}</span>
                </div>
                <div>
                  <span className="block text-xs font-medium text-stone-500 uppercase">Rutina Vigente</span>
                  <span className="font-bold text-stone-900">{clienteSeleccionado.rutinaAsignada}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setClienteSeleccionado(null)}
                className="bg-stone-900 text-white font-semibold text-xs px-5 py-2.5 rounded-md hover:bg-stone-800 transition cursor-pointer"
              >
                Cerrar Expediente
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}