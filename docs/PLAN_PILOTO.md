# Plan del piloto institucional

## 1. Propósito

Evaluar en un entorno controlado si Coaches Connection cumple sus requerimientos funcionales y presenta niveles aceptables de usabilidad, rendimiento, seguridad y utilidad percibida para los procesos incluidos en la investigación.

## 2. Contexto

- Institución: Smart Fit, sucursal La Vega, según la autorización disponible.
- Periodo: 2026.
- Población institucional declarada: 6 administradores, 20 entrenadores y aproximadamente 1000 clientes.
- Modalidad: piloto controlado, no despliegue corporativo definitivo.

La cantidad final de participantes debe anotarse después del reclutamiento autorizado. No debe afirmarse que toda la población participó si no existe evidencia.

## 3. Participantes

| Grupo | Población disponible | Participantes invitados | Participantes que completaron | Tipo de selección | Justificación |
|---|---:|---:|---:|---|---|
| Administradores | 6 | ___ | ___ | ___ | ___ |
| Entrenadores | 20 | ___ | ___ | ___ | ___ |
| Clientes | 1000 aprox. | ___ | ___ | ___ | ___ |

Cada participante recibirá un código: `ADM-###`, `ENT-###` o `CLI-###`. La tabla que relacione códigos con identidades, si fuese necesaria, debe mantenerse separada, protegida y fuera de los anexos públicos.

## 4. Criterios de inclusión

- Pertenecer al grupo autorizado por la institución.
- Utilizar voluntariamente el sistema dentro del periodo del piloto.
- Aceptar el consentimiento informado correspondiente.
- Poder completar las tareas asignadas con el dispositivo autorizado.

## 5. Criterios de exclusión

- No otorgar consentimiento.
- No pertenecer al grupo institucional definido.
- Utilizar una cuenta compartida o no verificable.
- No completar las tareas mínimas necesarias para el análisis.

La exclusión no debe afectar el acceso normal a servicios de la institución.

## 6. Responsables

| Responsabilidad | Persona o cargo | Sustituto | Medio institucional |
|---|---|---|---|
| Autorizar el piloto | ___ | ___ | ___ |
| Administrar cuentas | ___ | ___ | ___ |
| Soporte técnico | ___ | ___ | ___ |
| Aplicar instrumentos | ___ | ___ | ___ |
| Custodiar evidencias | ___ | ___ | ___ |
| Analizar resultados | ___ | ___ | ___ |

## 7. Preparación

1. Confirmar autorización y alcance.
2. Revisar consentimiento e instrumentos con el asesor.
3. Ejecutar `npm run check` y guardar la salida.
4. Ejecutar el verificador SQL de solo lectura.
5. Confirmar respaldo y procedimiento de recuperación.
6. Crear cuentas de prueba independientes por rol.
7. Publicar el despliegue HTTPS de prueba.
8. Ejecutar la prueba de humo.
9. Preparar códigos anónimos y calendario.
10. Explicar a los participantes cómo reportar incidencias.

## 8. Tareas del piloto

### Administrador

- Revisar y resolver una solicitud preparada para prueba.
- Consultar entrenadores y clientes.
- Filtrar un reporte por periodo.
- Exportar evidencia anónima.
- Consultar una acción en auditoría.

### Entrenador

- Consultar o registrar un cliente de prueba autorizado.
- Crear una rutina de prueba y asignarla.
- Programar una sesión.
- Registrar resultado y asistencia.
- Generar o revocar una invitación de cliente.

### Cliente

- Activar el portal mediante invitación.
- Iniciar sesión.
- Consultar rutina y sesiones propias.
- Revisar el apartado de privacidad.
- Consultar y marcar una notificación propia.

## 9. Mediciones

| Dimensión | Indicador | Instrumento | Momento | Criterio propuesto |
|---|---|---|---|---|
| Funcionalidad | Casos aprobados / ejecutados × 100 | Casos de aceptación | Durante | ≥ 90 % y 100 % de los críticos |
| Eficiencia | Tiempo por tarea | Observación | Durante | Registrar línea base y distribución real |
| Errores | Errores por tarea | Observación/incidencias | Durante | Sin errores bloqueantes abiertos |
| Usabilidad | Puntuación del instrumento elegido | Instrumento autorizado | Después | Umbral definido antes de aplicar |
| Aceptación | Respuestas favorables | Cuestionario | Después | Umbral definido antes de aplicar |
| Seguridad | Pruebas de acceso rechazadas | Integración/RLS | Antes y durante | 100 % de accesos indebidos rechazados |
| Rendimiento | Tiempo de consultas críticas | Integración | Antes y durante | Umbral definido con el entorno real |

Los criterios definitivos deben aprobarse antes de observar los resultados para evitar ajustarlos después.

## 10. Calendario

| Actividad | Fecha prevista | Fecha real | Responsable | Estado |
|---|---|---|---|---|
| Preparación técnica | ___ | ___ | ___ | Pendiente |
| Capacitación | ___ | ___ | ___ | Pendiente |
| Aplicación a administradores | ___ | ___ | ___ | Pendiente |
| Aplicación a entrenadores | ___ | ___ | ___ | Pendiente |
| Aplicación a clientes | ___ | ___ | ___ | Pendiente |
| Cierre de incidencias | ___ | ___ | ___ | Pendiente |
| Análisis y discusión | ___ | ___ | ___ | Pendiente |

## 11. Suspensión

El piloto debe suspenderse temporalmente si ocurre acceso a información ajena, pérdida de datos, indisponibilidad prolongada, error bloqueante o incumplimiento del consentimiento. Se registrará la incidencia, se protegerán las evidencias y solo se reanudará después de comprobar la corrección.

## 12. Cierre

El cierre requiere resultados reales, incidencias clasificadas, archivos anonimizados, revisión de requerimientos y acta firmada. Las funciones no ejecutadas deben declararse como no evaluadas, no como aprobadas.
