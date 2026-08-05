import { useState } from "react";

export default function RutinasEntrenador() {
  const [modoCrear, setModoCrear] = useState(false);
  const [filtroObjetivo, setFiltroObjetivo] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");

  // Rutinas de plantilla
  const [rutinas] = useState([
    {
      id: "RUT-01",
      nombre: "Hipertrofia • Torso / Pierna",
      nivel: "Intermedio",
      objetivo: "Masa Muscular",
      diassemana: 4,
      ejerciciosTotales: 18,
      actualizado: "Hace 2 días",
    },
    {
      id: "RUT-02",
      nombre: "Reacondicionamiento Físico",
      nivel: "Principiante",
      objetivo: "Salud / Movilidad",
      diassemana: 3,
      ejerciciosTotales: 12,
      actualizado: "Hace 1 semana",
    },
    {
      id: "RUT-03",
      nombre: "Fuerza Máxima • Powerbuilding",
      nivel: "Avanzado",
      objetivo: "Fuerza",
      diassemana: 5,
      ejerciciosTotales: 22,
      actualizado: "Hace 3 semanas",
    },
  ]);

  // Lista borrador de ejercicios en el creador
  const [ejerciciosBorrador, setEjerciciosBorrador] = useState([
    { id: 1, nombre: "Sentadilla Trasera con Barra", grupo: "Piernas", series: "4", reps: "8-10", descanso: "90s" },
    { id: 2, nombre: "Press de Banca Plano", grupo: "Pecho", series: "4", reps: "6-8", descanso: "120s" },
    { id: 3, nombre: "Remo con Barra T", grupo: "Espalda", series: "3", reps: "10-12", descanso: "60s" },
  ]);

  const agregarEjercicio = () => {
    const nuevoEjercicio = {
      id: Date.now(),
      nombre: "Nuevo Ejercicio Prescrito",
      grupo: "General",
      series: "3",
      reps: "10-12",
      descanso: "60s",
    };
    setEjerciciosBorrador([...ejerciciosBorrador, nuevoEjercicio]);
  };

  const eliminarEjercicio = (id) => {
    setEjerciciosBorrador(ejerciciosBorrador.filter((ej) => ej.id !== id));
  };

  // Filtrado dinámico
  const rutinasFiltradas = rutinas.filter((r) => {
    const cumpleFiltro = filtroObjetivo === "Todos" || r.objetivo === filtroObjetivo;
    const cumpleBusqueda = r.nombre.toLowerCase().includes(busqueda.toLowerCase());
    return cumpleFiltro && cumpleBusqueda;
  });

  return (
    <div className="space-y-8 font-sans text-stone-800 bg-[#FAF8F5] p-6 sm:p-8 rounded-xl border border-stone-200/60 min-h-full">
      
      {/* 1. Header de Bienvenida / Módulo con Tono Marfil */}
      <div className="bg-[#F4EFEA] border border-stone-300/70 rounded-lg py-8 px-8 shadow-sm">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-3">
              <span className="bg-[#FFC800] text-stone-900 text-xs font-bold px-3 py-1 rounded-sm uppercase tracking-wide">
                Smart Fit • Prescripción
              </span>
              <span className="text-stone-600 text-xs font-medium uppercase tracking-wider">
                | Módulo de Rutinas
              </span>
            </div>
            
            <h1 className="text-3xl lg:text-4xl font-bold text-stone-900 tracking-tight leading-snug">
              {modoCrear ? "Diseñador de Rutinas" : "Biblioteca de Rutinas"}
            </h1>
            
            <p className="text-stone-600 text-base leading-relaxed">
              {modoCrear
                ? "Estructura los días de entrenamiento, selecciona ejercicios y ajusta parámetros de carga de forma cómoda."
                : "Gestione, edite y prescriba programas de entrenamiento personalizados para sus atletas."}
            </p>
          </div>

          <button
            onClick={() => setModoCrear(!modoCrear)}
            className="bg-stone-900 text-stone-50 font-semibold px-6 py-3.5 rounded-md text-base hover:bg-stone-800 transition shadow-sm cursor-pointer shrink-0"
          >
            {modoCrear ? "← Volver a Biblioteca" : "+ Crear Nueva Rutina"}
          </button>
        </div>
      </div>

      {/* VISTA 1: BIBLIOTECA DE RUTINAS */}
      {!modoCrear ? (
        <div className="space-y-6">
          
          {/* Filtros y Búsqueda */}
          <div className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
              {["Todos", "Masa Muscular", "Fuerza", "Salud / Movilidad"].map((categoria) => (
                <button
                  key={categoria}
                  onClick={() => setFiltroObjetivo(categoria)}
                  className={`text-xs font-bold px-4 py-2.5 rounded-md transition-all whitespace-nowrap cursor-pointer ${
                    filtroObjetivo === categoria
                      ? "bg-[#FFC800] text-stone-900 border border-amber-400"
                      : "bg-[#FAF8F5] text-stone-600 border border-stone-200/80 hover:bg-stone-100 hover:text-stone-900"
                  }`}
                >
                  {categoria}
                </button>
              ))}
            </div>

            <div className="w-full sm:w-80">
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre..."
                className="w-full bg-[#FAF8F5] border border-stone-200/80 rounded-md px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:border-stone-400 transition-colors placeholder:text-stone-400"
              />
            </div>
          </div>

          {/* Lista de Plantillas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rutinasFiltradas.map((rutina) => (
              <div
                key={rutina.id}
                className="bg-white rounded-lg border border-stone-200 shadow-sm p-6 hover:border-stone-300 transition flex flex-col justify-between space-y-6"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono font-bold text-stone-400">
                      {rutina.id}
                    </span>
                    <span className="bg-stone-100 text-stone-800 border border-stone-200 text-xs font-bold px-2.5 py-1 rounded-sm">
                      {rutina.nivel}
                    </span>
                  </div>

                  <h3 className="font-bold text-stone-900 text-lg leading-snug">
                    {rutina.nombre}
                  </h3>

                  <p className="text-sm text-stone-600">
                    Objetivo: <span className="text-stone-900 font-semibold">{rutina.objetivo}</span>
                  </p>
                </div>

                <div className="pt-4 border-t border-stone-200 space-y-5">
                  <div className="grid grid-cols-2 gap-4 text-sm text-stone-600 bg-[#FAF8F5]/60 p-3.5 rounded-md border border-stone-200/80">
                    <div>
                      <span className="block text-xs text-stone-500 font-medium uppercase tracking-wider mb-0.5">
                        Frecuencia
                      </span>
                      <span className="font-bold text-stone-900 text-sm">{rutina.diassemana} días / sem</span>
                    </div>
                    <div>
                      <span className="block text-xs text-stone-500 font-medium uppercase tracking-wider mb-0.5">
                        Ejercicios
                      </span>
                      <span className="font-bold text-stone-900 text-sm">{rutina.ejerciciosTotales} ejercicios</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button className="flex-1 bg-stone-900 text-white hover:bg-[#FFC800] hover:text-stone-900 font-semibold text-sm py-2.5 rounded-md transition border border-stone-900 cursor-pointer">
                      Asignar Cliente
                    </button>
                    <button className="bg-[#FAF8F5] text-stone-600 hover:text-stone-900 p-2.5 rounded-md border border-stone-200 transition cursor-pointer">
                      <i className="ti ti-edit text-lg" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* VISTA 2: CREADOR / EDITOR DE RUTINA */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Panel Principal */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1. Datos de la Rutina */}
            <div className="bg-white rounded-lg p-8 border border-stone-200 shadow-sm space-y-6">
              <h2 className="font-bold text-stone-900 text-xl border-b border-stone-200 pb-4">
                1. Configuración General
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">
                    Nombre del Programa
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Hipertrofia Intermedia - Bloque 1"
                    className="w-full bg-[#FAF8F5] border border-stone-200/80 rounded-md p-3 text-sm text-stone-900 focus:outline-none focus:border-stone-400 transition-colors placeholder:text-stone-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">
                    Nivel de Dificultad
                  </label>
                  <select className="w-full bg-[#FAF8F5] border border-stone-200/80 rounded-md p-3 text-sm text-stone-900 focus:outline-none focus:border-stone-400 transition-colors">
                    <option>Principiante</option>
                    <option>Intermedio</option>
                    <option>Avanzado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">
                    Objetivo Principal
                  </label>
                  <select className="w-full bg-[#FAF8F5] border border-stone-200/80 rounded-md p-3 text-sm text-stone-900 focus:outline-none focus:border-stone-400 transition-colors">
                    <option>Hipertrofia / Masa Muscular</option>
                    <option>Pérdida de Grasa</option>
                    <option>Fuerza Máxima</option>
                    <option>Acondicionamiento Físico</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 2. Estructura de Ejercicios */}
            <div className="bg-white rounded-lg p-8 border border-stone-200 shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b border-stone-200 pb-4">
                <h2 className="font-bold text-stone-900 text-xl">
                  2. Prescripción de Ejercicios
                </h2>
                <button
                  onClick={agregarEjercicio}
                  className="bg-[#FFC800] text-stone-900 font-semibold text-xs px-4 py-2 rounded-md hover:bg-[#e6b400] transition border border-amber-400 cursor-pointer"
                >
                  + Agregar Ejercicio
                </button>
              </div>

              {/* Lista Borrador */}
              <div className="space-y-4">
                {ejerciciosBorrador.map((ej, index) => (
                  <div
                    key={ej.id}
                    className="p-5 rounded-md border border-stone-200/80 bg-[#FAF8F5]/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-stone-300 transition"
                  >
                    <div className="flex items-center gap-4">
                      <span className="w-8 h-8 bg-stone-900 text-[#FFC800] font-bold text-sm rounded-md flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-bold text-stone-900 text-base">{ej.nombre}</p>
                        <span className="text-xs text-stone-500 font-medium">Grupo: {ej.grupo}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-stone-200">
                      <div className="flex gap-2 text-xs font-bold">
                        <span className="bg-white border border-stone-200 px-3 py-1.5 rounded-sm text-stone-800">
                          {ej.series} Series
                        </span>
                        <span className="bg-white border border-stone-200 px-3 py-1.5 rounded-sm text-stone-800">
                          {ej.reps} Reps
                        </span>
                        <span className="bg-white border border-stone-200 px-3 py-1.5 rounded-sm text-stone-800">
                          Desc: {ej.descanso}
                        </span>
                      </div>

                      <button
                        onClick={() => eliminarEjercicio(ej.id)}
                        className="text-stone-400 hover:text-red-600 transition p-1.5 cursor-pointer ml-2"
                        title="Eliminar ejercicio"
                      >
                        <i className="ti ti-trash text-lg" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Acciones */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setModoCrear(false)}
                className="bg-white border border-stone-200 text-stone-600 hover:text-stone-900 font-semibold text-sm px-6 py-3 rounded-md transition cursor-pointer"
              >
                Cancelar
              </button>
              <button className="bg-stone-900 text-stone-50 font-semibold text-sm px-7 py-3 rounded-md hover:bg-stone-800 transition cursor-pointer">
                Guardar Rutina
              </button>
            </div>
          </div>

          {/* Panel Lateral: Asignación Directa */}
          <div className="bg-white rounded-lg p-8 border border-stone-200 shadow-sm h-fit space-y-6">
            <h2 className="font-bold text-stone-900 text-lg border-b border-stone-200 pb-4">
              Asignación Directa
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">
                  Cliente Destino
                </label>
                <select className="w-full bg-[#FAF8F5] border border-stone-200/80 rounded-md p-3 text-sm text-stone-900 focus:outline-none focus:border-stone-400 transition-colors">
                  <option>Juan Pérez (CLI-101)</option>
                  <option>María Gómez (CLI-102)</option>
                  <option>Pedro Martínez (CLI-103)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">
                  Instrucciones Adicionales
                </label>
                <textarea
                  rows="4"
                  placeholder="Escriba indicaciones o notas técnicas para el atleta..."
                  className="w-full bg-[#FAF8F5] border border-stone-200/80 rounded-md p-3 text-sm text-stone-900 focus:outline-none focus:border-stone-400 transition-colors leading-relaxed placeholder:text-stone-400"
                ></textarea>
              </div>

              <button className="w-full bg-[#FFC800] text-stone-900 font-semibold text-sm py-3.5 rounded-md hover:bg-[#e6b400] transition border border-amber-400 shadow-sm cursor-pointer">
                Guardar y Asignar
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}