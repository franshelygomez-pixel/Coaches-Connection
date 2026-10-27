-- Coaches Connection - Fase 5
-- Verificacion de contratos, RLS e integridad del backend existente.
-- Este archivo es de solo lectura: no crea, modifica ni elimina datos.

select public.estado_backend() as estado_backend_esperado_1_4_0_o_superior;

select
  to_regclass('public.usuarios') is not null as tabla_usuarios,
  to_regclass('public.clientes') is not null as tabla_clientes,
  to_regclass('public.rutinas') is not null as tabla_rutinas,
  to_regclass('public.sesiones_entrenamiento') is not null as tabla_sesiones,
  to_regclass('public.cuentas_clientes') is not null as tabla_portal_cliente,
  to_regclass('public.notificaciones') is not null as tabla_notificaciones,
  to_regclass('public.auditoria') is not null as tabla_auditoria;

select
  to_regprocedure('public.estado_backend()') is not null as funcion_estado_backend,
  to_regprocedure('public.resolver_solicitud(uuid,text,text)') is not null as funcion_resolver_solicitud,
  to_regprocedure('public.resolver_solicitudes(uuid[],text,text)') is not null as funcion_resolver_solicitudes,
  to_regprocedure('public.obtener_mi_perfil_cliente()') is not null as funcion_perfil_cliente,
  to_regprocedure('public.reporte_resumen_operativo(date,date,uuid)') is not null as funcion_reporte_resumen,
  to_regprocedure('public.reporte_entrenadores_paginado(date,date,integer,integer)') is not null as funcion_reporte_entrenadores,
  to_regprocedure('public.reporte_sesiones_paginado(date,date,integer,integer,text,uuid)') is not null as funcion_reporte_sesiones;

select
  c.relname as tabla,
  c.relrowsecurity as rls_activo
from pg_class as c
join pg_namespace as n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'usuarios', 'clientes', 'rutinas', 'mediciones', 'eventos',
    'sesiones_entrenamiento', 'cuentas_clientes', 'historial_rutinas',
    'consentimientos_datos', 'notificaciones', 'auditoria'
  )
order by c.relname;

with politicas_requeridas(tabla, politica) as (
  values
    ('usuarios', 'usuarios_leer'),
    ('clientes', 'clientes_leer'),
    ('rutinas', 'rutinas_leer'),
    ('sesiones_entrenamiento', 'sesiones_leer'),
    ('cuentas_clientes', 'cuentas_clientes_leer'),
    ('historial_rutinas', 'historial_rutinas_leer'),
    ('consentimientos_datos', 'consentimientos_leer'),
    ('notificaciones', 'notificaciones_leer_propias')
)
select
  r.tabla,
  r.politica,
  p.policyname is not null as instalada
from politicas_requeridas as r
left join pg_policies as p
  on p.schemaname = 'public'
 and p.tablename = r.tabla
 and p.policyname = r.politica
order by r.tabla, r.politica;

select
  not has_table_privilege('anon', 'public.notificaciones', 'select') as anon_sin_notificaciones,
  not has_table_privilege('authenticated', 'public.notificaciones', 'insert') as usuario_sin_insercion_notificaciones,
  not has_table_privilege('authenticated', 'public.notificaciones', 'update') as usuario_sin_actualizacion_directa,
  not has_table_privilege('authenticated', 'public.notificaciones', 'delete') as usuario_sin_eliminacion_directa,
  not has_function_privilege('anon', 'public.crear_notificacion_interna(uuid,text,text,text,text,uuid)', 'execute') as funcion_interna_no_anonima,
  not has_function_privilege('authenticated', 'public.crear_notificacion_interna(uuid,text,text,text,text,uuid)', 'execute') as funcion_interna_no_autenticada;

select
  exists (
    select 1 from pg_trigger
    where tgname = 'notificar_cambio_usuario' and not tgisinternal
  ) as trigger_solicitudes,
  exists (
    select 1 from pg_trigger
    where tgname = 'notificar_sesion_cliente' and not tgisinternal
  ) as trigger_sesiones,
  exists (
    select 1 from pg_trigger
    where tgname = 'notificar_rutina_cliente' and not tgisinternal
  ) as trigger_rutinas;

select
  exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'clientes_coach_estado_nombre_idx') as indice_clientes,
  exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'sesiones_coach_inicio_estado_idx') as indice_sesiones_coach,
  exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'sesiones_cliente_inicio_estado_idx') as indice_sesiones_cliente,
  exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'notificaciones_destinatario_estado_fecha_idx') as indice_notificaciones;

select
  (select count(*) from public.usuarios as u left join auth.users as a on a.id = u.id where a.id is null) as perfiles_sin_auth_esperado_0,
  (select count(*) from public.clientes as c left join public.usuarios as u on u.id = c.coach_id where u.id is null) as clientes_sin_coach_esperado_0,
  (select count(*) from public.sesiones_entrenamiento as s left join public.clientes as c on c.id = s.cliente_id where c.id is null) as sesiones_sin_cliente_esperado_0,
  (select count(*) from public.notificaciones as n left join auth.users as a on a.id = n.destinatario_id where a.id is null) as notificaciones_sin_destinatario_esperado_0;
