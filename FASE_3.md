# Fase 3: procesos funcionales completos

## Objetivo

Completar los procesos principales del piloto: sesiones, asistencia, historial de rutinas, acceso del cliente y evidencia de consentimiento.

## Flujo del entrenador

1. Registra al cliente desde **Clientes**.
2. Crea rutinas y asigna una al cliente. Cada cambio conserva una copia histórica.
3. Abre **Sesiones** para programar una actividad con fecha, hora, duración y rutina.
4. Después de la actividad registra presencia, ausencia, justificación o cancelación.
5. Abre **Accesos clientes** y genera un código temporal para el correo registrado.

## Flujo del cliente

1. Recibe del entrenador un código que comienza con `CLI-`.
2. En la pantalla de registro selecciona **Cliente invitado**.
3. Escribe el mismo correo del expediente, el código y una contraseña.
4. Confirma el correo cuando Supabase lo requiera.
5. Inicia sesión y consulta **Resumen**, **Mi rutina**, **Mis sesiones**, **Seguimiento** y **Privacidad**.

## Controles incorporados

- Los clientes no se guardan como administradores ni entrenadores.
- Cada cuenta de Authentication puede vincularse con un solo expediente.
- Cada expediente puede tener una sola cuenta de portal.
- Los códigos se guardan como hash, vencen y solo pueden utilizarse una vez.
- Solamente el entrenador propietario puede invitar al cliente.
- El entrenador propietario o un administrador puede desactivar y reactivar el portal.
- Las sesiones se crean y cierran mediante funciones protegidas.
- Una sesión no puede asociar un cliente o una rutina de otro entrenador.
- Una rutina asignada conserva nombre, nivel y ejercicios aunque luego sea editada.
- Los consentimientos se registran como eventos históricos y pueden revocarse.
- Las tablas nuevas tienen RLS y no permiten escritura directa desde el navegador.
- Las operaciones quedan registradas en la auditoría de la Fase 2.

## Alcance de salud

La pantalla de seguimiento muestra únicamente datos registrados y no emite diagnósticos ni recomendaciones médicas. Los resultados de la tesis deben presentarse de forma anonimizada.

## Verificación obligatoria

Después de ejecutar `supabase/fase3_procesos.sql`, ejecuta `supabase/verificar_fase3.sql`. Todas las comprobaciones booleanas deben mostrar `true`, los conteos deben ser `0` y `estado_backend` debe indicar la versión `1.3.1`.

Si ya habías instalado la versión 1.3.0 y fallaba **Generar invitación**, ejecuta solamente `supabase/correccion_fase3_invitaciones.sql`. El parche conserva los datos y corrige las referencias ambiguas de las funciones de invitación.
