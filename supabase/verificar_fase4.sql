-- Verificacion de Coaches Connection - Fase 4.
-- Ejecuta este archivo despues de fase4_reportes_notificaciones.sql.
-- Todos los valores booleanos deben ser true y los conteos deben ser 0.

select 'Tabla notificaciones' as comprobacion,
  to_regclass('public.notificaciones') is not null as correcto
union all
select 'Funcion marcar notificacion',
  to_regprocedure('public.marcar_notificacion_leida(uuid)') is not null
union all
select 'Funcion marcar todas',
  to_regprocedure('public.marcar_todas_notificaciones_leidas()') is not null
union all
select 'Funcion resumen operativo',
  to_regprocedure('public.reporte_resumen_operativo(date,date,uuid)') is not null
union all
select 'Funcion reporte entrenadores',
  to_regprocedure('public.reporte_entrenadores_paginado(date,date,integer,integer)') is not null
union all
select 'Funcion reporte sesiones',
  to_regprocedure('public.reporte_sesiones_paginado(date,date,integer,integer,text,uuid)') is not null
union all
select 'Trigger solicitudes y cuentas', exists (
  select 1 from pg_trigger
  where tgrelid = 'public.usuarios'::regclass
    and tgname = 'notificar_cambio_usuario'
    and not tgisinternal
)
union all
select 'Trigger sesiones', exists (
  select 1 from pg_trigger
  where tgrelid = 'public.sesiones_entrenamiento'::regclass
    and tgname = 'notificar_sesion_cliente'
    and not tgisinternal
)
union all
select 'Trigger rutinas', exists (
  select 1 from pg_trigger
  where tgrelid = 'public.historial_rutinas'::regclass
    and tgname = 'notificar_rutina_cliente'
    and not tgisinternal
)
union all
select 'RLS notificaciones', relrowsecurity
  from pg_class where oid = 'public.notificaciones'::regclass
union all
select 'Sin escritura directa en notificaciones',
  not has_table_privilege('authenticated', 'public.notificaciones', 'INSERT')
  and not has_table_privilege('authenticated', 'public.notificaciones', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.notificaciones', 'DELETE')
union all
select 'Lectura de notificaciones autorizada',
  has_table_privilege('authenticated', 'public.notificaciones', 'SELECT')
union all
select 'Ejecucion resumen autorizada',
  has_function_privilege(
    'authenticated',
    'public.reporte_resumen_operativo(date,date,uuid)',
    'EXECUTE'
  )
union all
select 'Indice clientes por entrenador',
  to_regclass('public.clientes_coach_estado_nombre_idx') is not null
union all
select 'Indice sesiones por entrenador',
  to_regclass('public.sesiones_coach_inicio_estado_idx') is not null
union all
select 'Indice bandeja de notificaciones',
  to_regclass('public.notificaciones_destinatario_estado_fecha_idx') is not null
union all
select 'Version 1.4.0 registrada', exists (
  select 1 from public.app_migraciones where version = '1.4.0'
)
order by comprobacion;

select 'Notificaciones sin destinatario Auth' as comprobacion, count(*) as cantidad
from public.notificaciones as n
left join auth.users as a on a.id = n.destinatario_id
where a.id is null
union all
select 'Notificaciones con lectura incoherente', count(*)
from public.notificaciones as n
where (n.leida = false and n.leida_en is not null)
   or (n.leida = true and n.leida_en is null)
union all
select 'Notificaciones con tipo invalido', count(*)
from public.notificaciones as n
where n.tipo not in ('sistema', 'solicitud', 'cuenta', 'sesion', 'asistencia', 'rutina', 'acceso');

select public.estado_backend() as estado_backend_esperado_1_4_0;
