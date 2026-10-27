# Configuración de Supabase

La instalación y verificación completa hasta la Fase 5 utiliza diez archivos:

- `setup.sql`: crea o actualiza el esquema y repara perfiles faltantes.
- `verificar_instalacion.sql`: comprueba que la instalación terminó correctamente.
- `fase2_seguridad.sql`: instala invitaciones, decisiones, auditoría e integridad.
- `verificar_fase2.sql`: verifica todos los elementos de seguridad nuevos.
- `fase3_procesos.sql`: instala sesiones, asistencia, historial, portal y consentimiento.
- `correccion_fase3_invitaciones.sql`: actualiza una instalación 1.3.0 sin borrar datos.
- `verificar_fase3.sql`: comprueba las tablas, funciones, permisos e integridad de la Fase 3.
- `fase4_reportes_notificaciones.sql`: instala notificaciones, reportes e índices de rendimiento.
- `verificar_fase4.sql`: comprueba la instalación y la integridad de la Fase 4.
- `verificar_fase5_calidad.sql`: verifica sin modificar datos los contratos, RLS, permisos, índices e integridad requeridos por las pruebas.

## Instalación o actualización

1. Crea una copia de seguridad si la base contiene información importante.
2. Abre el proyecto correcto en Supabase.
3. Entra en **SQL Editor** y crea una consulta nueva.
4. Copia todo el contenido de `setup.sql` y presiona **Run** una sola vez.
5. Crea otra consulta, copia `verificar_instalacion.sql` y presiona **Run**.
6. Confirma que todas las comprobaciones indiquen `true` y que `cuentas_auth_sin_perfil` sea `0`.
7. Copia y ejecuta completo `fase2_seguridad.sql`.
8. Copia y ejecuta `verificar_fase2.sql`.
9. Confirma que sus comprobaciones indiquen `true` y que los conteos de inconsistencias sean `0`.
10. Copia y ejecuta completo `fase3_procesos.sql`.
11. Copia y ejecuta `verificar_fase3.sql`.
12. Confirma que los controles indiquen `true`, los conteos sean `0` y el backend muestre `1.3.1`.
13. Copia y ejecuta completo `fase4_reportes_notificaciones.sql`.
14. Copia y ejecuta `verificar_fase4.sql`.
15. Confirma que sus controles indiquen `true`, los conteos sean `0` y el backend muestre `1.4.0`.
16. Copia y ejecuta `verificar_fase5_calidad.sql`.
17. Confirma que todas las políticas y contratos requeridos aparezcan en `true` y que los conteos de inconsistencias sean `0`.

Si `fase3_procesos.sql` ya se había ejecutado antes de recibir la versión 1.3.1, no repitas toda la instalación: copia y ejecuta completo `correccion_fase3_invitaciones.sql` y después vuelve a ejecutar `verificar_fase3.sql`.

El proceso no elimina tablas ni registros. Si detecta clientes o rutinas duplicados, conserva la información y muestra una advertencia para que los duplicados se corrijan manualmente.

Las Fases 5 y 6 no incluyen una nueva migración: el backend permanece en la versión `1.4.0`. El archivo SQL de la Fase 5 es exclusivamente de verificación y puede ejecutarse nuevamente cuando sea necesario. La Fase 6 agrega documentación, despliegue y evidencias sin cambiar tablas, relaciones ni datos.

## Primer administrador

Si todavía no existe un administrador activo, registra la cuenta y ejecuta en SQL Editor:

```sql
update public.usuarios
set rol = 'admin', rol_solicitado = 'admin', estado = 'activo'
where lower(email) = lower('TU-CORREO-REAL');
```

Después, cierra la sesión en la aplicación y vuelve a iniciarla.

## Resultado esperado

- Las cuentas nuevas se crean en `auth.users` y `public.usuarios`.
- Las cuentas antiguas sin perfil se recuperan automáticamente.
- Las solicitudes pendientes aparecen en el panel administrativo.
- El frontend comprueba la versión del backend antes de registrar o autenticar usuarios.
- El error `function public.al_crear_usuario_auth() does not exist` deja de producirse.
- Solamente los entrenadores pueden solicitar una cuenta públicamente.
- Los administradores nuevos utilizan códigos de invitación de un solo uso.
- Las decisiones administrativas quedan identificadas y auditadas.
- El acceso directo para cambiar roles o estados queda revocado.
- Los entrenadores pueden invitar clientes a un portal separado.
- Las sesiones y la asistencia se administran mediante funciones seguras.
- Las asignaciones de rutinas conservan un historial de versiones.
- Los clientes pueden registrar y revocar sus consentimientos.
- Cada usuario recibe solamente sus propias notificaciones internas.
- Los reportes se calculan en Supabase y respetan el rol autenticado.
- Los directorios y detalles extensos utilizan paginación desde la base de datos.

No coloques claves `service_role` ni claves secretas dentro del frontend o del archivo `.env`.
