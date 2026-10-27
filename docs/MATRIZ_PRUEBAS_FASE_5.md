# Matriz de pruebas de la Fase 5

## Criterios generales de aceptación

- El 100 % de las pruebas automáticas debe aprobarse.
- No debe existir ninguna violación crítica o seria detectada automáticamente en las pantallas evaluadas.
- La cobertura debe superar los umbrales definidos en `vite.config.js`.
- Ningún archivo JavaScript compilado debe superar 400 kB y el total debe permanecer por debajo de 900 kB.
- Las consultas remotas principales deben responder dentro del umbral configurado para el entorno de prueba.
- Ningún entrenador o cliente debe obtener datos pertenecientes a otro usuario.
- Los datos presentados como evidencia deben estar anonimizados.

## Casos funcionales y de seguridad

| ID | Actor | Caso | Resultado esperado | Tipo | Evidencia sugerida |
|---|---|---|---|---|---|
| AUT-01 | Entrenador | Registrar una cuenta con datos válidos | Se crea el perfil pendiente y llega una solicitud al administrador | Manual/Integración | Captura anonimizada de la solicitud |
| AUT-02 | Entrenador | Registrar correo duplicado | El sistema muestra un mensaje controlado y no duplica el perfil | Manual | Captura del mensaje |
| AUT-03 | Usuario | Iniciar sesión sin confirmar correo | El acceso se rechaza indicando que debe confirmar el correo | Manual | Captura del mensaje |
| AUT-04 | Usuario | Recuperar contraseña | Se confirma el envío sin revelar si el correo existe | Automática/Manual | Resultado de prueba |
| SOL-01 | Administrador | Aprobar solicitud pendiente | El rol queda activo y el usuario puede entrar a su panel | Manual | Antes y después anonimizados |
| SOL-02 | Administrador | Rechazar sin motivo suficiente | La operación se rechaza | Automática/Manual | Resultado de validación |
| SOL-03 | Administrador | Rechazar con motivo | Se guarda estado, motivo, responsable y auditoría | Manual/SQL | Consulta anonimizada |
| SOL-04 | Administrador | Reabrir solicitud rechazada | La solicitud vuelve a estado pendiente | Manual | Captura de la bandeja |
| INV-01 | Administrador | Registrar otro administrador sin invitación | El registro se rechaza | Automática | Prueba de contrato Supabase |
| INV-02 | Administrador | Registrar administrador con invitación vigente | Se crea la cuenta correspondiente al correo invitado | Manual | Evidencia anonimizada |
| INV-03 | Cliente | Escribir un código `CLI-` completo | El prefijo no se duplica y el código se valida correctamente | Automática | Prueba de componente |
| INV-04 | Cliente | Usar invitación vencida o utilizada | El registro se rechaza | Manual | Captura del mensaje |
| RLS-01 | Entrenador A | Consultar clientes | Solo aparecen clientes asignados al entrenador A | Integración | Salida `npm run test:integration` |
| RLS-02 | Entrenador A | Intentar comparar entrenadores | Supabase rechaza la operación | Integración | Salida de integración |
| RLS-03 | Cliente A | Consultar sesiones | Solo aparecen sesiones del cliente A | Integración | Salida de integración |
| RLS-04 | Cliente A | Intentar abrir reportes internos | Supabase rechaza la operación | Integración | Salida de integración |
| RLS-05 | Usuario | Consultar notificaciones | Solo aparecen notificaciones del usuario autenticado | Manual/SQL | Resultado anonimizado |
| SES-01 | Entrenador | Programar sesión válida | Se guarda la sesión y el cliente recibe una notificación | Manual | Capturas de ambos portales |
| SES-02 | Entrenador | Completar sesión sin asistencia | El sistema exige indicar la asistencia | Manual | Captura del mensaje |
| RUT-01 | Entrenador | Asignar una rutina | Se conserva el historial y el cliente recibe una notificación | Manual | Historial anonimizado |
| REP-01 | Administrador | Consultar periodo válido | Se muestran indicadores y detalle paginado | Integración/Manual | Reporte CSV anonimizado |
| REP-02 | Usuario | Consultar más de 367 días | El sistema rechaza el periodo | Automática | Resultado de prueba |
| PAG-01 | Administrador | Navegar un listado de más de 25 clientes | Cambia de página sin descargar todos los registros | Automática/Manual | Captura y red del navegador |

## Compatibilidad, accesibilidad y rendimiento

| ID | Prueba | Criterio de aceptación | Estado a registrar |
|---|---|---|---|
| COM-01 | Chrome, dos versiones recientes | Flujos críticos completos sin errores visuales o funcionales | Pendiente/Aprobada/Fallida |
| COM-02 | Microsoft Edge, dos versiones recientes | Flujos críticos completos sin errores visuales o funcionales | Pendiente/Aprobada/Fallida |
| COM-03 | Firefox, dos versiones recientes | Flujos críticos completos sin errores visuales o funcionales | Pendiente/Aprobada/Fallida |
| COM-04 | Safari, dos versiones recientes | Flujos críticos completos sin errores visuales o funcionales | Pendiente/Aprobada/Fallida |
| RES-01 | Pantalla de 360 px | No existe pérdida de controles o desplazamiento horizontal general | Pendiente/Aprobada/Fallida |
| RES-02 | Pantallas de 768 px y 1366 px | Navegación y tablas permanecen utilizables | Pendiente/Aprobada/Fallida |
| ACC-01 | Navegación solo con teclado | Todos los controles reciben foco visible y pueden activarse | Pendiente/Aprobada/Fallida |
| ACC-02 | Zoom del navegador al 200 % | El contenido sigue siendo legible y operable | Pendiente/Aprobada/Fallida |
| ACC-03 | Prueba automática con axe | Cero violaciones críticas o serias en las vistas evaluadas | Pendiente/Aprobada/Fallida |
| REN-01 | Presupuesto del paquete | Archivo JS ≤ 400 kB; JS total ≤ 900 kB; CSS total ≤ 100 kB | Pendiente/Aprobada/Fallida |
| REN-02 | Consultas de integración | Cada operación medida ≤ `INTEGRATION_MAX_MS` | Pendiente/Aprobada/Fallida |

## Registro de ejecución

Para cada sesión de prueba conserva: fecha, versión `1.5.0`, dispositivo, navegador, rol, identificador del caso, resultado, tiempo cuando corresponda, observación y referencia de la evidencia anonimizada.
