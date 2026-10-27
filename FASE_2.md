# Fase 2: roles, solicitudes, RLS y auditoría

## Objetivo

Controlar el ciclo de vida de las cuentas institucionales y demostrar que las operaciones sensibles tienen autorización, integridad y trazabilidad.

## Flujo de entrenador

1. La persona completa el registro público.
2. Supabase crea la cuenta de Authentication y su perfil pendiente.
3. La solicitud aparece en el panel administrativo.
4. El administrador aprueba o rechaza e indica un motivo cuando corresponde.
5. La persona recibe acceso automáticamente cuando su perfil cambia a activo.

## Flujo de administrador invitado

1. Un administrador activo abre **Administradores**.
2. Escribe el correo de la persona y genera un código temporal.
3. Comparte el código únicamente con la persona invitada.
4. La persona abre **Tengo una invitación administrativa** durante el registro.
5. El correo y el código se validan antes de crear la cuenta.
6. Otro administrador aprueba la solicitud pendiente.

## Controles incorporados

- Los códigos se almacenan como hash y no pueden recuperarse desde la base.
- Cada código corresponde a un correo, tiene vencimiento y solo puede utilizarse una vez.
- Un administrador no puede desactivar su propia cuenta.
- No se puede desactivar el último administrador activo.
- Las actualizaciones directas sobre roles y estados están revocadas.
- Las decisiones pasan por funciones RPC protegidas.
- Las acciones sobre usuarios, clientes, rutinas, mediciones, eventos e invitaciones se registran en auditoría.
- La bitácora omite documentos, direcciones, teléfonos y mediciones corporales.
- Una rutina debe pertenecer al mismo entrenador asignado al cliente.
- Los eventos y mediciones no pueden asociar clientes de otro entrenador.

## Verificación obligatoria

Después de ejecutar `supabase/fase2_seguridad.sql`, ejecuta `supabase/verificar_fase2.sql`. Todas las comprobaciones booleanas deben mostrar `true` y los conteos de inconsistencias deben ser `0`.
