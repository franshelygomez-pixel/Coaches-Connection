-- Verificacion de Coaches Connection - Fase 3.
-- Ejecuta este archivo despues de fase3_procesos.sql.
-- Todos los valores booleanos deben ser true y los conteos deben ser 0.

select 'Tabla cuentas de clientes' as comprobacion,
  to_regclass('public.cuentas_clientes') is not null as correcto
union all
select 'Tabla invitaciones de clientes',
  to_regclass('public.invitaciones_clientes') is not null
union all
select 'Tabla sesiones de entrenamiento',
  to_regclass('public.sesiones_entrenamiento') is not null
union all
select 'Tabla historial de rutinas',
  to_regclass('public.historial_rutinas') is not null
union all
select 'Tabla consentimientos',
  to_regclass('public.consentimientos_datos') is not null
union all
select 'Funcion perfil de cliente',
  to_regprocedure('public.obtener_mi_perfil_cliente()') is not null
union all
select 'Funcion crear invitacion cliente',
  to_regprocedure('public.crear_invitacion_cliente(uuid,integer)') is not null
union all
select 'Funcion validar invitacion cliente',
  to_regprocedure('public.validar_invitacion_cliente(text,text)') is not null
union all
select 'Funcion cambiar estado del portal',
  to_regprocedure('public.cambiar_estado_portal_cliente(uuid,text)') is not null
union all
select 'Funcion asignar rutina',
  to_regprocedure('public.asignar_rutina_cliente(uuid,uuid)') is not null
union all
select 'Funcion crear sesion',
  to_regprocedure('public.crear_sesion_entrenamiento(uuid,timestamptz,timestamptz,text,uuid,text)') is not null
union all
select 'Funcion resultado de sesion',
  to_regprocedure('public.actualizar_resultado_sesion(uuid,text,text,text)') is not null
union all
select 'Funcion consentimiento',
  to_regprocedure('public.registrar_consentimiento_cliente(text,boolean,text)') is not null
union all
select 'Trigger historial de rutina', exists (
  select 1 from pg_trigger
  where tgrelid = 'public.clientes'::regclass
    and tgname = 'historial_asignacion_rutina'
    and not tgisinternal
)
union all
select 'RLS cuentas de clientes', relrowsecurity
  from pg_class where oid = 'public.cuentas_clientes'::regclass
union all
select 'RLS sesiones', relrowsecurity
  from pg_class where oid = 'public.sesiones_entrenamiento'::regclass
union all
select 'RLS historial', relrowsecurity
  from pg_class where oid = 'public.historial_rutinas'::regclass
union all
select 'RLS consentimientos', relrowsecurity
  from pg_class where oid = 'public.consentimientos_datos'::regclass
union all
select 'Sin escritura directa en sesiones',
  not has_table_privilege('authenticated', 'public.sesiones_entrenamiento', 'INSERT')
  and not has_table_privilege('authenticated', 'public.sesiones_entrenamiento', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.sesiones_entrenamiento', 'DELETE')
union all
select 'Ejecucion de crear sesion',
  has_function_privilege(
    'authenticated',
    'public.crear_sesion_entrenamiento(uuid,timestamptz,timestamptz,text,uuid,text)',
    'EXECUTE'
  )
union all
select 'Ejecucion de registrar consentimiento',
  has_function_privilege(
    'authenticated',
    'public.registrar_consentimiento_cliente(text,boolean,text)',
    'EXECUTE'
  )
union all
select 'Version 1.3.1 registrada', exists (
  select 1 from public.app_migraciones where version = '1.3.1'
)
order by comprobacion;

select 'Sesiones con rango invalido' as comprobacion, count(*) as cantidad
from public.sesiones_entrenamiento
where fin <= inicio or fin > inicio + interval '8 hours'
union all
select 'Sesiones de otro entrenador', count(*)
from public.sesiones_entrenamiento s
join public.clientes c on c.id = s.cliente_id
where c.coach_id is distinct from s.coach_id
union all
select 'Rutinas de sesion de otro entrenador', count(*)
from public.sesiones_entrenamiento s
join public.rutinas r on r.id = s.rutina_id
where r.coach_id is distinct from s.coach_id
union all
select 'Clientes con varias cuentas de portal', count(*)
from (
  select cliente_id from public.cuentas_clientes
  group by cliente_id having count(*) > 1
) duplicados
union all
select 'Clientes con varios historiales activos', count(*)
from (
  select cliente_id from public.historial_rutinas
  where estado = 'activa'
  group by cliente_id having count(*) > 1
) duplicados
union all
select 'Cuentas Auth sin perfil de personal o cliente', count(*)
from auth.users a
left join public.usuarios u on u.id = a.id
left join public.cuentas_clientes cc on cc.usuario_id = a.id
where u.id is null and cc.usuario_id is null;

select public.estado_backend() as estado_backend_esperado_1_3_1;
