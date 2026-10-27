# Casos de aceptación de la Fase 6

## Instrucciones

Ejecuta estos casos en el despliegue del piloto con cuentas y datos de prueba autorizados. Completa los campos de resultado durante la ejecución. No marques un caso como aprobado sin evidencia.

Estados permitidos: `No ejecutado`, `Aprobado`, `Fallido`, `Bloqueado` o `No aplica`.

## Registro de ejecución

| Dato | Valor |
|---|---|
| Versión del frontend | 1.6.0 |
| Versión del backend | ___ |
| URL o entorno | ___ |
| Navegador y versión | ___ |
| Dispositivo | ___ |
| Fecha | ___ |
| Evaluador | ___ |

## Casos

| Caso | Prioridad | Rol | Preparación | Acción principal | Resultado esperado | Estado real | Evidencia anónima | Incidencia |
|---|---|---|---|---|---|---|---|---|
| CP-01 | Crítica | Público | Correo nuevo | Registrar entrenador | Se crea solicitud pendiente y se informa el siguiente paso | No ejecutado | ___ | ___ |
| CP-02 | Crítica | Admin/público | Invitación admin vigente | Registrar usando la invitación | Se crea el perfil solicitado y la invitación no puede reutilizarse | No ejecutado | ___ | ___ |
| CP-03 | Crítica | Todos | Cuenta activa | Iniciar sesión | Se abre el panel correspondiente al rol | No ejecutado | ___ | ___ |
| CP-04 | Alta | Todos | Correo registrado | Solicitar y completar recuperación | La contraseña cambia y permite iniciar sesión | No ejecutado | ___ | ___ |
| CP-05 | Crítica | Admin | Solicitud pendiente | Aprobar, rechazar o reabrir | Estado, motivo, responsable y fecha quedan registrados | No ejecutado | ___ | ___ |
| CP-06 | Crítica | Admin/coach | Dos entrenadores activos | Intentar consultar información ajena | RLS rechaza o filtra los datos no autorizados | No ejecutado | ___ | ___ |
| CP-07 | Alta | Admin/coach | Cliente de prueba | Crear, buscar y actualizar | El cliente aparece una sola vez con datos actualizados | No ejecutado | ___ | ___ |
| CP-08 | Alta | Coach | Cliente propio | Registrar seguimiento autorizado | El registro aparece solo en el historial correcto | No ejecutado | ___ | ___ |
| CP-09 | Alta | Coach | Cuenta activa | Crear, editar y eliminar rutina de prueba | Cada operación muestra el resultado esperado | No ejecutado | ___ | ___ |
| CP-10 | Alta | Coach | Cliente y rutina propios | Asignar rutina dos veces con cambios | El historial conserva las asignaciones y fechas | No ejecutado | ___ | ___ |
| CP-11 | Media | Coach | Cliente propio | Crear y modificar evento | El calendario refleja el evento sin duplicarlo | No ejecutado | ___ | ___ |
| CP-12 | Crítica | Coach | Cliente y rutina propios | Crear sesión y registrar asistencia | La sesión crea un recordatorio en Calendario; estado y asistencia quedan actualizados | No ejecutado | ___ | ___ |
| CP-13 | Alta | Coach/cliente | Cliente sin portal | Crear, usar y revocar invitación | Solo una cuenta autorizada queda vinculada | No ejecutado | ___ | ___ |
| CP-14 | Crítica | Cliente | Portal activo | Consultar resumen, rutina y sesiones | Solo aparecen registros del cliente iniciado | No ejecutado | ___ | ___ |
| CP-15 | Crítica | Cliente | Portal activo | Registrar y revocar consentimiento | La decisión y fecha se actualizan sin afectar otros perfiles | No ejecutado | ___ | ___ |
| CP-16 | Alta | Todos | Notificación propia | Abrir y marcar como leída | Contenido y contador se actualizan | No ejecutado | ___ | ___ |
| CP-17 | Alta | Admin/coach | Datos en un periodo | Aplicar filtros de reporte | Indicadores corresponden al rol y periodo | No ejecutado | ___ | ___ |
| CP-18 | Alta | Admin/coach | Reporte cargado | Exportar CSV interno | El archivo abre y evita fórmulas inyectables | No ejecutado | ___ | ___ |
| CP-19 | Crítica | Admin | Reporte con datos de prueba | Exportar evidencia anónima | No aparecen nombres, correos, documentos, teléfonos ni UUID | No ejecutado | ___ | ___ |
| CP-20 | Alta | Admin | Operación auditable realizada | Buscarla en auditoría | Se identifica acción, actor y fecha autorizados | No ejecutado | ___ | ___ |
| CP-21 | Media | Admin | Más de una página de datos | Cambiar página y filtro | No hay duplicados ni saltos atribuibles a la interfaz | No ejecutado | ___ | ___ |
| CP-22 | Media | Todos | Cuenta activa | Abrir Ayuda | Aparece la guía correspondiente al rol | No ejecutado | ___ | ___ |
| CP-23 | Crítica | Todos | Sesión iniciada | Cerrar sesión y volver al historial | El panel protegido no queda accesible | No ejecutado | ___ | ___ |
| CP-24 | Alta | Todos | Navegadores definidos | Repetir flujo crítico | Funciona en Chrome, Edge, Firefox y vista móvil | No ejecutado | ___ | ___ |
| CP-25 | Alta | Todos | Navegación por teclado | Recorrer menú y formularios | El foco es visible y las acciones son utilizables | No ejecutado | ___ | ___ |

## Resumen

| Indicador | Valor real |
|---|---:|
| Casos ejecutados | ___ |
| Casos aprobados | ___ |
| Casos fallidos | ___ |
| Casos bloqueados | ___ |
| Casos críticos aprobados | ___ / ___ |
| Porcentaje de aprobación | ___ % |

Fórmula: `casos aprobados / casos ejecutados × 100`. Los casos `No aplica` no entran en el denominador, pero deben justificarse.

## Decisión

- [ ] Aceptado para continuar el piloto.
- [ ] Aceptado con incidencias menores documentadas.
- [ ] Suspendido hasta corregir incidencias críticas.

Observaciones: ___

Responsable institucional: ___  
Tesista/evaluador: ___  
Fecha: ___
