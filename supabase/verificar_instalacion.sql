-- Coaches Connection - verificacion posterior a supabase/setup.sql
-- Ejecuta este archivo completo en Supabase > SQL Editor.
-- Todos los resultados de la columna correcto deben ser true.

select 'Tabla usuarios' as comprobacion,
       to_regclass('public.usuarios') is not null as correcto
union all
select 'Tabla clientes', to_regclass('public.clientes') is not null
union all
select 'Tabla rutinas', to_regclass('public.rutinas') is not null
union all
select 'Tabla mediciones', to_regclass('public.mediciones') is not null
union all
select 'Tabla eventos', to_regclass('public.eventos') is not null
union all
select 'Historial de migraciones', to_regclass('public.app_migraciones') is not null
union all
select 'Funcion de perfiles', to_regprocedure('public.crear_perfil_desde_auth(uuid,text,jsonb)') is not null
union all
select 'Funcion del trigger', to_regprocedure('public.al_crear_usuario_auth()') is not null
union all
select 'Funcion de reparacion', to_regprocedure('public.reparar_perfiles_faltantes()') is not null
union all
select 'Diagnostico para la aplicacion', to_regprocedure('public.estado_backend()') is not null
union all
select 'Trigger de nuevos usuarios', exists (
  select 1
  from pg_trigger
  where tgname = 'crear_perfil_usuario'
    and not tgisinternal
)
union all
select 'RLS usuarios', coalesce((select relrowsecurity from pg_class where oid = 'public.usuarios'::regclass), false)
union all
select 'RLS clientes', coalesce((select relrowsecurity from pg_class where oid = 'public.clientes'::regclass), false)
union all
select 'RLS rutinas', coalesce((select relrowsecurity from pg_class where oid = 'public.rutinas'::regclass), false)
union all
select 'RLS mediciones', coalesce((select relrowsecurity from pg_class where oid = 'public.mediciones'::regclass), false)
union all
select 'RLS eventos', coalesce((select relrowsecurity from pg_class where oid = 'public.eventos'::regclass), false);

-- Deben aparecer cinco filas si Realtime esta habilitado en el proyecto.
select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and schemaname = 'public'
  and tablename in ('usuarios', 'clientes', 'rutinas', 'mediciones', 'eventos')
order by tablename;

-- Debe devolver cero. Si devuelve un valor mayor, ejecuta:
-- select public.reparar_perfiles_faltantes();
select count(*) as cuentas_auth_sin_perfil
from auth.users a
left join public.usuarios u on u.id = a.id
where u.id is null;

-- Debe mostrar la version 1.1.0.
select *
from public.app_migraciones
order by aplicada_en desc;

-- Diagnostico de duplicados. Cada consulta debe devolver cero filas.
select coach_id, lower(email) as email, count(*) as cantidad
from public.clientes
where email is not null
group by coach_id, lower(email)
having count(*) > 1;

select coach_id, lower(nombre) as nombre, count(*) as cantidad
from public.rutinas
where nombre is not null
group by coach_id, lower(nombre)
having count(*) > 1;
