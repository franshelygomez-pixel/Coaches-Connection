-- Coaches Connection - verificacion de la Fase 2.
-- Ejecutar despues de supabase/fase2_seguridad.sql.

select 'Columna rol solicitado' as comprobacion, exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'usuarios' and column_name = 'rol_solicitado'
) as correcto
union all
select 'Tabla invitaciones', to_regclass('public.invitaciones_admin') is not null
union all
select 'Tabla auditoria', to_regclass('public.auditoria') is not null
union all
select 'Funcion crear invitacion', to_regprocedure('public.crear_invitacion_admin(text,integer)') is not null
union all
select 'Funcion validar invitacion', to_regprocedure('public.validar_invitacion_admin(text,text)') is not null
union all
select 'Funcion resolver solicitud', to_regprocedure('public.resolver_solicitud(uuid,text,text)') is not null
union all
select 'Funcion resolver solicitudes', to_regprocedure('public.resolver_solicitudes(uuid[],text,text)') is not null
union all
select 'Funcion cambiar estado', to_regprocedure('public.cambiar_estado_usuario(uuid,text,text)') is not null
union all
select 'Trigger integridad clientes', exists (
  select 1 from pg_trigger where tgname = 'validar_cliente_propiedad' and not tgisinternal
)
union all
select 'Trigger integridad eventos', exists (
  select 1 from pg_trigger where tgname = 'validar_evento_propiedad' and not tgisinternal
)
union all
select 'Trigger integridad mediciones', exists (
  select 1 from pg_trigger where tgname = 'validar_medicion_propiedad' and not tgisinternal
)
union all
select 'RLS invitaciones', coalesce((
  select relrowsecurity from pg_class where oid = 'public.invitaciones_admin'::regclass
), false)
union all
select 'RLS auditoria', coalesce((
  select relrowsecurity from pg_class where oid = 'public.auditoria'::regclass
), false)
union all
select 'UPDATE directo de usuarios revocado', not has_table_privilege('authenticated', 'public.usuarios', 'UPDATE')
union all
select 'Ejecucion de crear invitacion', has_function_privilege('authenticated', 'public.crear_invitacion_admin(text,integer)', 'EXECUTE')
union all
select 'Anon puede validar invitacion', has_function_privilege('anon', 'public.validar_invitacion_admin(text,text)', 'EXECUTE')
union all
select 'Seis tablas auditadas', (
  select count(*) = 6
  from pg_trigger
  where tgname = 'auditoria_cambios' and not tgisinternal
);

select *
from public.app_migraciones
order by aplicada_en desc;

-- Debe devolver cero: ninguna cuenta debe quedar sin rol solicitado.
select count(*) as usuarios_sin_rol_solicitado
from public.usuarios
where rol_solicitado is null;

-- Los tres resultados deben ser cero. Corrige los registros antiguos si no lo son.
select count(*) as clientes_con_rutina_de_otro_coach
from public.clientes c
join public.rutinas r on r.id = c.rutina_id
where c.coach_id is distinct from r.coach_id;

select count(*) as eventos_con_cliente_de_otro_coach
from public.eventos e
join public.clientes c on c.id = e.cliente_id
where e.coach_id is distinct from c.coach_id;

select count(*) as mediciones_con_cliente_de_otro_coach
from public.mediciones m
join public.clientes c on c.id = m.cliente_id
where m.coach_id is distinct from c.coach_id;
