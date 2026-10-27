-- Coaches Connection - correccion 1.3.1 de invitaciones.
-- Ejecuta este archivo si la Fase 3 ya esta instalada y el boton
-- "Generar invitacion" muestra un error.
-- No elimina tablas, usuarios ni registros existentes.

begin;

create or replace function public.crear_invitacion_cliente(
  p_cliente_id uuid,
  p_dias_vigencia integer default 7
)
returns table(invitacion_id uuid, codigo text, vence_en timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  cliente_objetivo public.clientes%rowtype;
  codigo_generado text;
  id_generado uuid;
  fecha_vencimiento timestamptz;
begin
  if not public.usuario_activo_con_rol('coach') then
    raise exception 'Solo un entrenador activo puede invitar clientes';
  end if;
  if p_dias_vigencia < 1 or p_dias_vigencia > 30 then
    raise exception 'La vigencia debe estar entre 1 y 30 dias';
  end if;

  select * into cliente_objetivo
  from public.clientes as c
  where c.id = p_cliente_id and c.coach_id = auth.uid()
  for update;

  if not found then
    raise exception 'El cliente no pertenece al entrenador autenticado';
  end if;
  if lower(trim(coalesce(cliente_objetivo.email, ''))) !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' then
    raise exception 'El cliente no tiene un correo valido';
  end if;
  if exists (
    select 1
    from public.cuentas_clientes as cc
    where cc.cliente_id = p_cliente_id
  ) then
    raise exception 'El cliente ya tiene acceso al portal';
  end if;

  update public.invitaciones_clientes as i
  set estado = 'vencida'
  where i.estado = 'pendiente' and i.vence_en <= now();

  update public.invitaciones_clientes as i
  set estado = 'revocada', revocado_en = now()
  where i.cliente_id = p_cliente_id and i.estado = 'pendiente';

  codigo_generado := 'CLI-' || upper(encode(extensions.gen_random_bytes(8), 'hex'));
  fecha_vencimiento := now() + make_interval(days => p_dias_vigencia);

  insert into public.invitaciones_clientes (
    cliente_id, email, token_hash, creado_por, vence_en
  ) values (
    p_cliente_id,
    lower(trim(cliente_objetivo.email)),
    encode(extensions.digest(convert_to(codigo_generado, 'UTF8'), 'sha256'), 'hex'),
    auth.uid(),
    fecha_vencimiento
  ) returning id into id_generado;

  return query
  select id_generado, codigo_generado, fecha_vencimiento;
end;
$$;

-- La funcion administrativa tenia el mismo nombre de salida y se corrige
-- preventivamente para evitar el mismo error en esa pantalla.
create or replace function public.crear_invitacion_admin(
  p_email text,
  p_dias_vigencia integer default 7
)
returns table(invitacion_id uuid, codigo text, vence_en timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  correo_normalizado text := lower(trim(coalesce(p_email, '')));
  codigo_generado text;
  id_generado uuid;
  fecha_vencimiento timestamptz;
begin
  if not public.usuario_activo_con_rol('admin') then
    raise exception 'Solo un administrador activo puede crear invitaciones';
  end if;
  if correo_normalizado !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' then
    raise exception 'El correo de la invitacion no es valido';
  end if;
  if p_dias_vigencia < 1 or p_dias_vigencia > 30 then
    raise exception 'La vigencia debe estar entre 1 y 30 dias';
  end if;
  if exists (
    select 1
    from public.usuarios as u
    where lower(u.email) = correo_normalizado
      and u.rol = 'admin'::public.rol_usuario
      and u.estado = 'activo'::public.estado_usuario
  ) then
    raise exception 'El correo ya pertenece a un administrador activo';
  end if;

  update public.invitaciones_admin as i
  set estado = 'vencida'
  where i.estado = 'pendiente' and i.vence_en <= now();

  update public.invitaciones_admin as i
  set estado = 'revocada', revocado_en = now()
  where lower(i.email) = correo_normalizado and i.estado = 'pendiente';

  codigo_generado := upper(encode(extensions.gen_random_bytes(12), 'hex'));
  fecha_vencimiento := now() + make_interval(days => p_dias_vigencia);

  insert into public.invitaciones_admin (
    email, token_hash, creado_por, vence_en
  ) values (
    correo_normalizado,
    encode(extensions.digest(convert_to(codigo_generado, 'UTF8'), 'sha256'), 'hex'),
    auth.uid(),
    fecha_vencimiento
  ) returning id into id_generado;

  return query
  select id_generado, codigo_generado, fecha_vencimiento;
end;
$$;

revoke all on function public.crear_invitacion_cliente(uuid, integer) from public;
revoke all on function public.crear_invitacion_admin(text, integer) from public;
grant execute on function public.crear_invitacion_cliente(uuid, integer) to authenticated;
grant execute on function public.crear_invitacion_admin(text, integer) to authenticated;

insert into public.app_migraciones (version, descripcion)
values ('1.3.1', 'Correccion de referencias ambiguas en invitaciones de clientes y administradores')
on conflict (version) do update
set descripcion = excluded.descripcion,
    aplicada_en = now();

notify pgrst, 'reload schema';

commit;
