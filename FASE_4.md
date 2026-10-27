# Fase 4: notificaciones, reportes y rendimiento

## Objetivo

Preparar el piloto para trabajar con la escala institucional prevista de 20 entrenadores, 1000 clientes y 6 administradores, sin descargar todos los expedientes para producir listados o indicadores.

## Funciones incorporadas

- Centro de notificaciones para administradores, entrenadores y clientes.
- Avisos automáticos por solicitudes, decisiones de cuentas, sesiones, asistencia y rutinas.
- Contador de notificaciones pendientes en el encabezado.
- Lectura individual y lectura masiva mediante funciones protegidas.
- Reportes por fecha para administradores y entrenadores.
- Indicadores de clientes, rutinas, sesiones y asistencia.
- Comparación operativa de entrenadores para el administrador.
- Detalle de sesiones paginado desde PostgreSQL.
- Exportación CSV del resumen, comparación y página de sesiones.
- Directorio administrativo de clientes con búsqueda, filtros y paginación desde Supabase.
- Índices para las consultas principales del piloto.

## Seguridad

- Cada usuario solamente puede consultar sus propias notificaciones.
- El navegador no puede insertar, modificar ni eliminar directamente las notificaciones.
- Los reportes verifican el rol dentro de PostgreSQL.
- Un entrenador solamente recibe indicadores de sus propios clientes y sesiones.
- La comparación entre entrenadores está limitada a administradores activos.
- El periodo máximo de un reporte es de 367 días.

## Alcance de los indicadores

Los reportes miden actividad operativa durante el periodo seleccionado. No demuestran rentabilidad, retención a largo plazo ni resultados médicos. Los datos que se presenten en la tesis deben anonimizarse.

## Instalación

Si la Fase 3 corregida ya funciona, ejecuta únicamente estos archivos en SQL Editor:

1. `supabase/fase4_reportes_notificaciones.sql`.
2. `supabase/verificar_fase4.sql`.

Todas las comprobaciones booleanas deben mostrar `true`, los conteos deben ser `0` y `estado_backend` debe indicar la versión `1.4.0`.
