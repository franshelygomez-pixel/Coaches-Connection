# Plan de trabajo: piloto institucional completo

Este proyecto se desarrollará en seis fases. Cada fase debe conservar el funcionamiento de las anteriores y terminar con pruebas automatizadas.

## Fase 1. Supabase estable y reproducible

- Esquema completo para instalaciones nuevas.
- Compatibilidad con las tablas de la versión anterior.
- Creación automática de perfiles desde Authentication.
- Reparación de cuentas existentes sin perfil.
- Historial de migraciones.
- Diagnóstico previo al registro y al inicio de sesión.
- Archivo independiente de verificación.

Estado: completada en la versión 1.1.0 del backend. La ejecución en el proyecto real de Supabase debe realizarla el responsable autorizado del proyecto.

## Fase 2. Roles, solicitudes, RLS y auditoría

- Registro público solamente para entrenadores.
- Invitación de administradores desde una cuenta administrativa.
- Separación entre rol solicitado y rol efectivo.
- Motivo y responsable de aprobaciones y rechazos.
- Auditoría de operaciones importantes.
- Validación de propiedad entre entrenadores, clientes, rutinas y eventos.
- Pruebas de la matriz de permisos.

Estado: completada en la versión 1.2.0 del backend. Falta ejecutar y verificar `supabase/fase2_seguridad.sql` dentro del proyecto real de Supabase.

## Fase 3. Procesos funcionales completos

- Sesiones de entrenamiento.
- Asistencia y estados de sesión.
- Historial de asignaciones y versiones de rutinas.
- Rol y portal del cliente.
- Consentimiento para el tratamiento de datos.

Estado: completada en la versión 1.3.1 del backend. Incluye la corrección de las funciones de invitación. Falta ejecutar y verificar `supabase/fase3_procesos.sql` dentro del proyecto real de Supabase; las instalaciones 1.3.0 pueden aplicar `supabase/correccion_fase3_invitaciones.sql`.

## Fase 4. Notificaciones, reportes y rendimiento

- Notificaciones internas.
- Reportes por periodos.
- Indicadores de sesiones, asistencia y rutinas.
- Paginación administrativa desde Supabase.
- Consultas agregadas para la escala esperada de 20 entrenadores, 1000 clientes y 6 administradores.

Estado: completada en la versión 1.4.0 del backend. Falta ejecutar y verificar `supabase/fase4_reportes_notificaciones.sql` dentro del proyecto real de Supabase.

## Fase 5. Calidad y pruebas

- Pruebas de componentes React.
- Pruebas de integración con Supabase.
- Pruebas completas de registro, aprobación y acceso.
- Pruebas RLS entre distintos usuarios.
- Pruebas de rendimiento, compatibilidad y accesibilidad.

Estado: completada en la versión 1.5.0 del frontend. Incluye 82 pruebas automáticas, cobertura con umbrales, prueba opcional contra el Supabase real, verificación SQL de solo lectura y matriz de aceptación. Falta ejecutar las pruebas de integración y compatibilidad en el entorno real del piloto.

## Fase 6. Piloto y evidencias para la tesis

- Despliegue de prueba.
- Manual técnico, manual administrativo y manual de usuario.
- Matriz de requerimientos y trazabilidad.
- Casos de prueba y criterios de aceptación.
- Instrumentos de usabilidad y aceptación.
- Evidencias anonimizadas para resultados y discusión.

Estado: completada en la versión 1.6.0 del frontend. Incluye configuración de despliegue de prueba, ayuda por rol, lista de preparación, exportaciones anonimizadas, manuales, trazabilidad, instrumentos, casos de aceptación y plantillas de resultados. La ejecución del piloto y el llenado de resultados corresponden al entorno institucional real y no se simulan en el código.
