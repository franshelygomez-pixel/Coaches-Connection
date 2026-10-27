# Coaches Connection — Opción B

Aplicación web para el piloto institucional de gestión de solicitudes, entrenadores, clientes, rutinas, sesiones, asistencia, notificaciones, reportes, mediciones y consentimiento. El frontend utiliza React, Vite y Supabase.

El desarrollo completo está dividido en fases. Consulta `PLAN_OPCION_B.md` para conocer el alcance y el estado de cada una.

## Actualización desde la Fase 5

Si tu Fase 5 ya funciona con Supabase, no vuelvas a ejecutar las migraciones anteriores. Haz solamente lo siguiente:

1. Copia el archivo `.env` de la carpeta de la Fase 5 a esta carpeta.
2. Instala y comprueba el proyecto con `npm install` y `npm run check`.
3. En Supabase, abre **SQL Editor** y ejecuta todo el contenido de `supabase/verificar_fase5_calidad.sql`.
4. Inicia la aplicación con `npm run dev`.

La Fase 6 no modifica la base de datos. El verificador debe mostrar valores booleanos `true`, conteos de inconsistencias en `0` y la versión del backend `1.4.0` o superior. Si todavía tienes la versión `1.3.1`, ejecuta primero `supabase/fase4_reportes_notificaciones.sql`.

## Instalación completa desde cero en Windows

1. Descomprime el ZIP en una carpeta fuera de OneDrive, por ejemplo:

   `C:\Proyectos\Coaches-Connection-Opcion-B-Fase-6`

2. Antes de abrir el sistema por primera vez, entra en Supabase, abre **SQL Editor** y ejecuta completo el archivo `supabase/setup.sql`.

3. Después ejecuta `supabase/verificar_instalacion.sql`. Todas las comprobaciones deben mostrar `true` y la cantidad de cuentas sin perfil debe ser `0`.

4. Ejecuta completo `supabase/fase2_seguridad.sql` y después `supabase/verificar_fase2.sql`.

5. Ejecuta completo `supabase/fase3_procesos.sql` y después `supabase/verificar_fase3.sql`.

6. Ejecuta completo `supabase/fase4_reportes_notificaciones.sql` y después `supabase/verificar_fase4.sql`.

7. Ejecuta `supabase/verificar_fase5_calidad.sql` para comprobar los contratos y políticas requeridos.

8. Si todavía no tienes un administrador activo, registra una cuenta y ejecuta:

   ```sql
   update public.usuarios
   set rol = 'admin', rol_solicitado = 'admin', estado = 'activo'
   where lower(email) = lower('TU-CORREO-REAL');
   ```

9. Crea `.env` a partir de `.env.example` y coloca la URL y la clave pública de tu proyecto.

10. Abre PowerShell dentro de la carpeta del proyecto y ejecuta:

   ```powershell
   npm install
   npm run check
   npm run dev
   ```

11. Abre `http://localhost:5173`.

Crea el archivo `.env` a partir de `.env.example` y coloca la URL y la clave pública de tu proyecto. No coloques una clave `service_role` ni una clave secreta en este archivo.

## Qué corrige esta versión

- Creación automática del perfil `usuarios` al registrarse.
- Reparación de cuentas que existen en Authentication sin perfil.
- Solicitudes pendientes para los roles entrenador y administrador.
- Aprobación y rechazo de ambos tipos de cuenta.
- Políticas RLS para impedir el acceso a registros ajenos.
- Recuperación de contraseña.
- Rutinas con nivel, ejercicios, series, repeticiones y descanso.
- Mediciones guardadas de forma transaccional.
- Eventos asociados opcionalmente con clientes.
- Integración opcional con Google Calendar mediante `VITE_GOOGLE_CLIENT_ID`.
- Navegación mediante la URL, validaciones y exportación CSV protegida.
- Esquema reproducible desde una base nueva.
- Historial de versión del backend.
- Verificación automática antes del registro y el inicio de sesión.
- Reparación inmediata de todas las cuentas existentes sin perfil.
- Registro público limitado a entrenadores.
- Registro administrativo mediante invitaciones de un solo uso.
- Separación entre rol solicitado y rol autorizado.
- Aprobaciones, rechazos y reaperturas mediante funciones seguras.
- Motivo, responsable y fecha de las decisiones institucionales.
- Bitácora de auditoría sin duplicar datos corporales o documentos sensibles.
- Validación de propiedad entre clientes, rutinas, eventos y mediciones.
- Gestión de administradores y auditoría desde el panel.
- Actualización automática de la pantalla cuando una solicitud es aprobada.
- Invitaciones de un solo uso para activar el portal del cliente.
- Portal separado para consultar rutina, sesiones, seguimiento y privacidad.
- Programación de sesiones con asistencia y estados controlados.
- Creación automática de un recordatorio en el calendario interno al programar una sesión.
- Historial automático de cada rutina asignada.
- Registro y revocación de consentimientos para tratamiento de datos.
- RLS, funciones protegidas y auditoría para todas las tablas de la Fase 3.
- Centro de notificaciones internas con avisos automáticos.
- Reportes operativos por periodos y rol.
- Comparación administrativa por entrenador.
- Listados y sesiones paginados desde Supabase.
- Índices adecuados para la escala institucional prevista.
- Pruebas de componentes, contratos y accesibilidad.
- Integración real opcional con tres cuentas de prueba.
- Verificación conductual de RLS entre roles.
- Cobertura mínima y presupuesto de carga automatizados.
- Matriz de casos y criterios de aceptación para la tesis.
- Corrección del prefijo duplicado en invitaciones `CLI-`.
- Vista de ayuda con instrucciones específicas para cada rol.
- Lista administrativa de preparación del piloto guardada localmente.
- Exportaciones anónimas para evidencias de entrenadores y sesiones.
- Configuración reproducible de despliegue para Vercel y Netlify.
- Manual técnico, manual administrativo y manual de usuario.
- Matriz de requerimientos, trazabilidad y casos de aceptación.
- Instrumentos de usabilidad, aceptación, observación e incidencias.
- Guía de anonimización, plantilla de resultados y acta de cierre.

## Google Calendar opcional

El calendario interno funciona sin Google y recibe automáticamente los recordatorios creados desde el módulo **Sesiones**. Para habilitar la conexión externa, crea un cliente OAuth web en Google Cloud, autoriza `http://localhost:5173` como origen y completa `VITE_GOOGLE_CLIENT_ID` en `.env`.

## Comandos

- `npm run dev`: servidor de desarrollo.
- `npm run lint`: análisis estático.
- `npm run test`: pruebas automatizadas.
- `npm run test:coverage`: pruebas con informe de cobertura.
- `npm run test:integration`: integración de solo lectura con el Supabase real.
- `npm run test:performance`: compilación y presupuesto de carga.
- `npm run test:deliverables`: comprueba los documentos y configuraciones de la Fase 6.
- `npm run build`: compilación de producción.
- `npm run check`: ejecuta lint, pruebas, compilación, presupuesto de carga y verificación de entregables.
- `npm run preview:network`: abre la compilación para una prueba controlada en la red local.

## Importante

El código puede validarse localmente, pero las políticas, los triggers y las funciones se ejecutan dentro de tu proyecto de Supabase. En una instalación nueva deben ejecutarse `supabase/setup.sql`, `supabase/fase2_seguridad.sql`, `supabase/fase3_procesos.sql` y `supabase/fase4_reportes_notificaciones.sql`, en ese orden. Las Fases 5 y 6 verifican ese backend y no alteran sus datos.

## Cierre de la Fase 6

Lee `FASE_6.md` y después `docs/INDICE_FASE_6.md`. Los instrumentos y tablas tienen campos vacíos porque deben completarse con resultados reales del piloto. No presentes datos simulados como resultados de la tesis.
