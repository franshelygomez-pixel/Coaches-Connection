# Matriz de requerimientos y trazabilidad

## Objetivos técnicos de referencia

- **OE1:** identificar y validar requerimientos de los actores.
- **OE2:** diseñar arquitectura, datos, roles y procesos.
- **OE3:** implementar los módulos funcionales del piloto.
- **OE4:** evaluar funcionalidad, usabilidad, rendimiento y seguridad.

## Requerimientos funcionales

| ID | Requerimiento verificable | Actor | Objetivo | Implementación principal | Prueba o criterio | Evidencia esperada |
|---|---|---|---|---|---|---|
| RF-01 | Registrar una solicitud de entrenador con correo y datos obligatorios | Público | OE3 | `Registro.jsx`, `registrarConCorreo` | CP-01 | Captura anónima y fila pendiente |
| RF-02 | Registrar administradores únicamente mediante invitación válida | Admin/público | OE2, OE3 | `SeguridadAdmin.jsx`, RPC de invitaciones | CP-02 | Invitación utilizada una vez |
| RF-03 | Autenticar usuarios por correo y contraseña | Todos | OE3 | `Login.jsx`, Supabase Auth | CP-03 | Inicio correcto por rol |
| RF-04 | Recuperar y actualizar la contraseña | Todos | OE3 | `Login.jsx`, `App.jsx` | CP-04 | Mensaje y acceso posterior |
| RF-05 | Aprobar, rechazar o reabrir solicitudes con motivo y responsable | Admin | OE3 | `DashboardAdmin.jsx`, RPC de solicitudes | CP-05 | Estado y auditoría |
| RF-06 | Consultar y cambiar el estado de entrenadores autorizados | Admin | OE3 | `DashboardAdmin.jsx`, `SeguridadAdmin.jsx` | CP-06 | Cambio visible y acceso controlado |
| RF-07 | Registrar, buscar y actualizar clientes | Admin/coach | OE3 | `ClientesAdminPaginados.jsx`, `ClientesEntrenador.jsx` | CP-07 | Registro recuperable por búsqueda |
| RF-08 | Registrar seguimiento autorizado de un cliente | Admin/coach | OE3 | `ClientesEntrenador.jsx`, `DashboardAdmin.jsx` | CP-08 | Historial del cliente autorizado |
| RF-09 | Crear, editar y eliminar rutinas propias | Coach | OE3 | `RutinasEntrenador.jsx` | CP-09 | Rutina disponible para asignar |
| RF-10 | Asignar rutinas y conservar historial de versiones | Coach | OE3 | RPC `asignar_rutina_cliente` | CP-10 | Historial ordenado |
| RF-11 | Crear y administrar eventos del calendario | Coach | OE3 | `Calendario.jsx` | CP-11 | Evento en agenda interna |
| RF-12 | Programar sesiones, crear su recordatorio de calendario y registrar estado y asistencia | Coach | OE3 | `SesionesEntrenador.jsx`, `sesiones.js` | CP-12 | Sesión y recordatorio guardados |
| RF-13 | Crear y revocar invitaciones de portal de clientes | Coach | OE3 | `AccesosClientes.jsx` | CP-13 | Código temporal y revocación |
| RF-14 | Permitir al cliente consultar únicamente su portal | Cliente | OE2, OE3 | `PortalCliente.jsx`, RLS | CP-14 | Acceso propio y rechazo de datos ajenos |
| RF-15 | Registrar y revocar consentimiento para tratamiento de datos | Cliente | OE3 | `PortalCliente.jsx`, RPC de consentimiento | CP-15 | Estado y fecha de decisión |
| RF-16 | Generar y leer notificaciones internas por destinatario | Todos | OE3 | `CentroNotificaciones.jsx` | CP-16 | Aviso propio y contador actualizado |
| RF-17 | Consultar reportes operativos por periodo y rol | Admin/coach | OE3, OE4 | `ReportesFase4.jsx`, RPC de reportes | CP-17 | Indicadores coherentes con filtro |
| RF-18 | Exportar reportes operativos en CSV | Admin/coach | OE3, OE4 | `csv.js`, `ReportesFase4.jsx` | CP-18 | Archivo sin fórmulas inyectables |
| RF-19 | Exportar evidencia académica sin nombres, correos ni UUID | Admin | OE4 | `evidencias.js` | CP-19 | Alias `ENT` y `CLI` |
| RF-20 | Consultar la auditoría de acciones importantes | Admin | OE2, OE4 | `SeguridadAdmin.jsx`, tabla auditoría | CP-20 | Fecha, actor y acción autorizados |
| RF-21 | Paginar listados y reportes de gran volumen | Admin | OE3, OE4 | `Paginacion.jsx`, consultas paginadas | CP-21 | Navegación sin descargar todo el conjunto |
| RF-22 | Mostrar orientación de uso según el rol | Todos | OE1, OE4 | `CentroAyudaPiloto.jsx` | CP-22 | Guía correcta por perfil |

## Requerimientos no funcionales

| ID | Requerimiento verificable | Objetivo | Mecanismo | Criterio previo al piloto | Evidencia |
|---|---|---|---|---|---|
| RNF-01 | Aplicar mínimo privilegio y aislamiento por usuario | OE2, OE4 | RLS y funciones protegidas | Matriz RLS aprobada | Verificador SQL e integración |
| RNF-02 | Validar entradas y traducir errores sin revelar detalles internos | OE3, OE4 | Utilidades de validación y errores | Pruebas automáticas aprobadas | Salida de Vitest |
| RNF-03 | Responder adecuadamente para la escala prevista | OE4 | Índices, paginación y agregaciones | Consultas críticas registradas en el entorno real | Registro de tiempos |
| RNF-04 | Mantener un presupuesto de carga del frontend | OE4 | `verificar-rendimiento.mjs` | JS individual ≤ 400 kB, JS total ≤ 900 kB, CSS ≤ 100 kB | Salida de `npm run check` |
| RNF-05 | Ser utilizable por teclado y sin errores automáticos críticos de accesibilidad | OE4 | Semántica, foco, axe-core | Pruebas automáticas aprobadas y revisión manual | Informe de accesibilidad |
| RNF-06 | Funcionar en navegadores modernos y diseño móvil | OE4 | Objetivos de compilación y CSS adaptable | Chrome, Edge, Firefox y vista móvil comprobados | Matriz de compatibilidad |
| RNF-07 | Registrar acciones institucionales importantes | OE2, OE4 | Auditoría del backend | Operaciones seleccionadas generan registro | Captura anonimizada |
| RNF-08 | Proteger datos personales en evidencias | OE4 | Exportación anónima y guía documental | Sin nombres, correos, documentos, teléfonos ni UUID | Revisión del archivo exportado |
| RNF-09 | Permitir respaldo y recuperación controlados | OE4 | Procedimiento del manual técnico | Responsable y prueba documentados | Acta o bitácora de respaldo |
| RNF-10 | Permitir un despliegue reproducible por HTTPS | OE3, OE4 | Vite, Vercel/Netlify y variables de entorno | Compilación y prueba de humo aprobadas | URL y acta de despliegue |

## Regla de cierre de trazabilidad

Un requerimiento se considera aceptado solamente cuando posee: implementación identificada, caso ejecutado, resultado real, evidencia anonimizada y responsable de validación. La existencia del código no equivale por sí sola a aceptación institucional.
