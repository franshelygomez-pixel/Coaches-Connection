import { useState } from "react";

export default function InicioEntrenador({ usuario, datosUsuario }) {
  // Extraer el nombre real desde los props de sesión o Firestore
  const nombreEntrenador =
    datosUsuario?.nombre ||
    usuario?.displayName ||
    usuario?.email?.split("@")[0] ||
    "Entrenador";

  // Datos simulados (Mock Data) de la jornada
  const [tareasHoy] = useState([
    {
      id: 1,
      hora: "08:30 AM",
      cliente: "Juan Pérez",
      tipo: "Evaluación Física Inicial",
      estado: "Pendiente",
      tag: "P4.0",
    },
    {
      id: 2,
      hora: "10:00 AM",
      cliente: "María Gómez",
      tipo: "Renovación de Rutina (Mes 2)",
      estado: "En Proceso",
      tag: "P5.0",
    },
    {
      id: 3,
      hora: "03:00 PM",
      cliente: "Pedro Martínez",
      tipo: "Seguimiento de Métricas",
      estado: "Pendiente",
      tag: "P6.0",
    },
  ]);

  const [resumenClientes] = useState([
    {
      id: "CLI-101",
      nombre: "Juan Pérez",
      plan: "Hipertrofia - Torso Pierna",
      estado: "Activo",
    },
    {
      id: "CLI-102",
      nombre: "María Gómez",
      plan: "Pérdida de Grasa - Guiado",
      estado: "Por Vencer",
    },
    {
      id: "CLI-103",
      nombre: "Pedro Martínez",
      plan: "Resistencia Cardiovascular",
      estado: "Activo",
    },
  ]);

  return (
    /* Fondo Cálido Suave (-margin para cubrir todo el contenedor si es necesario) */
    <div className="space-y-8 font-sans text-stone-800 bg-[#FAF8F5] p-6 sm:p-8 rounded-xl border border-stone-200/60">
      
      {/* 1. Header de Bienvenida Amplio con Tono Marfil/Cálido */}
      <div className="bg-[#F4EFEA] border border-stone-300/70 rounded-lg py-10 px-8 shadow-sm">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-3">
              <span className="bg-[#FFC800] text-black text-xs font-bold px-3 py-1 rounded-sm uppercase tracking-wide">
                Smart Fit • La Vega
              </span>
              <span className="text-stone-600 text-xs font-medium uppercase tracking-wider">
                | Entrenador Personal
              </span>
            </div>
            
            <h1 className="text-3xl lg:text-4xl font-bold text-stone-900 tracking-tight leading-snug">
              Bienvenido, <span className="capitalize">{nombreEntrenador}</span>
            </h1>
            
            <p className="text-stone-600 text-base leading-relaxed">
              Consulta tu programa de trabajo diario, atiende las evaluaciones pendientes y gestiona el seguimiento de tus clientes asignados.
            </p>
          </div>

          {/* Botones de Acción Rápida */}
          <div className="flex flex-wrap gap-4 w-full lg:w-auto pt-2 lg:pt-0">
            <button className="flex-1 lg:flex-none bg-[#FFC800] text-stone-900 font-semibold px-6 py-3.5 rounded-md text-base hover:bg-[#e6b400] transition shadow-sm border border-amber-400">
              + Nueva Evaluación
            </button>
            <button className="flex-1 lg:flex-none bg-stone-900 text-stone-50 font-semibold px-6 py-3.5 rounded-md text-base hover:bg-stone-800 transition">
              + Prescribir Rutina
            </button>
          </div>
        </div>
      </div>

      {/* 2. Tarjetas de Resumen Rápido con Fondos Suaves */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg p-6 border border-stone-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-stone-500 text-sm font-medium uppercase tracking-wider">
              Agenda de Hoy
            </p>
            <h3 className="text-3xl font-bold text-stone-900 mt-1">
              {tareasHoy.length} Citas
            </h3>
          </div>
          <div className="text-2xl text-stone-700 bg-amber-50/80 p-3 rounded-md border border-amber-100">
            <i className="ti ti-calendar-event" />
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-stone-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-stone-500 text-sm font-medium uppercase tracking-wider">
              Clientes Activos
            </p>
            <h3 className="text-3xl font-bold text-stone-900 mt-1">24</h3>
          </div>
          <div className="text-2xl text-stone-700 bg-stone-100 p-3 rounded-md border border-stone-200">
            <i className="ti ti-users" />
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-stone-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-stone-500 text-sm font-medium uppercase tracking-wider">
              Rutinas por Vencer
            </p>
            <h3 className="text-3xl font-bold text-amber-800 mt-1">2</h3>
          </div>
          <div className="text-2xl text-amber-800 bg-amber-100/60 p-3 rounded-md border border-amber-200">
            <i className="ti ti-clock-alert" />
          </div>
        </div>
      </div>

      {/* 3. Sección Principal de Trabajo */}
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Lista Ampliada del Programa Diario */}
        <div className="flex-1 bg-white rounded-lg p-8 border border-stone-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-stone-200 pb-5">
            <div>
              <h2 className="font-bold text-stone-900 text-xl">
                Programa de Actividades de Hoy
              </h2>
              <p className="text-stone-500 text-sm mt-1">
                Listado de citas agendadas para toma de métricas y entrenamiento
              </p>
            </div>
            <span className="text-sm bg-stone-100 text-stone-700 px-4 py-2 rounded-md font-semibold border border-stone-200">
              {new Date().toLocaleDateString("es-DO", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </span>
          </div>

          <div className="space-y-4">
            {tareasHoy.map((tarea) => (
              <div
                key={tarea.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-6 rounded-md border border-stone-200/80 bg-[#FAF8F5]/60 hover:bg-white hover:border-stone-400 transition gap-6"
              >
                <div className="flex items-center gap-5">
                  <div className="bg-stone-900 text-[#FFC800] font-bold text-sm px-4 py-3 rounded-md whitespace-nowrap">
                    {tarea.hora}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <p className="font-bold text-stone-900 text-lg">
                        {tarea.cliente}
                      </p>
                      <span className="text-xs bg-stone-200 text-stone-800 font-bold px-2.5 py-0.5 rounded-sm">
                        {tarea.tag}
                      </span>
                    </div>
                    <p className="text-stone-600 text-base">
                      {tarea.tipo}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-4 sm:pt-0 border-stone-200">
                  <span
                    className={`text-xs px-3.5 py-1.5 rounded-sm font-bold uppercase tracking-wider ${
                      tarea.estado === "En Proceso"
                        ? "bg-amber-100 text-amber-900 border border-amber-300"
                        : "bg-stone-200 text-stone-800 border border-stone-300"
                    }`}
                  >
                    {tarea.estado}
                  </span>
                  <button className="bg-stone-900 text-white hover:bg-[#FFC800] hover:text-black font-semibold text-sm px-5 py-2.5 rounded-md transition border border-stone-900">
                    Atender →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Panel Lateral de Clientes Asignados */}
        <div className="w-full lg:w-96 bg-white rounded-lg p-8 border border-stone-200 shadow-sm h-fit space-y-6">
          <div className="flex justify-between items-center border-b border-stone-200 pb-5">
            <div>
              <h2 className="font-bold text-stone-900 text-lg">
                Mis Clientes
              </h2>
              <p className="text-stone-500 text-xs mt-0.5">Expedientes activos</p>
            </div>
            <button className="text-sm text-stone-900 font-bold hover:underline">
              Ver todos
            </button>
          </div>

          <div className="space-y-4">
            {resumenClientes.map((cliente) => (
              <div
                key={cliente.id}
                className="p-5 border border-stone-200/80 rounded-md bg-[#FAF8F5]/60 hover:bg-white hover:border-stone-300 transition space-y-3"
              >
                <div className="flex justify-between items-start">
                  <p className="font-bold text-stone-900 text-base">
                    {cliente.nombre}
                  </p>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-sm ${
                      cliente.estado === "Por Vencer"
                        ? "bg-amber-100 text-amber-900 border border-amber-200"
                        : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                    }`}
                  >
                    {cliente.estado}
                  </span>
                </div>
                <p className="text-stone-600 text-sm">{cliente.plan}</p>

                <div className="pt-3 border-t border-stone-200 flex justify-between items-center">
                  <span className="text-xs text-stone-400 font-mono">
                    {cliente.id}
                  </span>
                  <button className="text-sm font-semibold text-stone-900 hover:text-amber-600 transition">
                    Ver Expediente →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}