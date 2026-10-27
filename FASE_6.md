# Fase 6: piloto y evidencias para la tesis

## Objetivo

Cerrar el desarrollo de Coaches Connection con un paquete reproducible para ejecutar el piloto institucional, orientar a cada rol, aplicar los instrumentos de evaluación y organizar evidencias anonimizadas que permitan redactar resultados y discusión.

La versión del frontend es `1.6.0`. El backend continúa en `1.4.0`: esta fase no crea tablas, no cambia relaciones y no modifica datos existentes.

## Componentes incorporados

- Configuración de despliegue de prueba para Vercel y Netlify.
- Vista **Ayuda** con orientación específica para administrador, entrenador y cliente.
- Lista local de preparación del piloto para el administrador.
- Exportaciones anonimizadas de entrenadores y sesiones para uso académico.
- Manual técnico, manual administrativo y manual de usuario.
- Matriz de requerimientos, trazabilidad, pruebas y evidencias.
- Plan del piloto para una institución con 6 administradores, 20 entrenadores y hasta 1000 clientes registrados.
- Casos de aceptación con resultados en blanco para completar durante el piloto real.
- Instrumentos de usabilidad, aceptación, observación e incidencias.
- Guía de anonimización y plantilla del capítulo de resultados.
- Acta de cierre del piloto.
- Verificador automático de los entregables documentales.

## Despliegue de prueba

El sistema es una aplicación estática de Vite conectada al backend existente de Supabase. Antes de publicar:

1. Ejecutar `npm run check`.
2. Confirmar el backend `1.4.0` o superior con `supabase/verificar_fase5_calidad.sql`.
3. Crear cuentas exclusivas de prueba para cada rol.
4. Configurar en el proveedor solamente `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
5. Configurar en Supabase la URL exacta del despliegue como URL autorizada de redirección.
6. Realizar una prueba de humo con registro, aprobación, sesión, rutina, reportes y cierre de sesión.

No debe publicarse una clave `service_role`, una contraseña ni un archivo `.env`.

## Evaluación del piloto

La evaluación combina:

- Casos funcionales por rol.
- Comprobación de restricciones de acceso.
- Registro de tiempos y errores en tareas seleccionadas.
- Evaluación de usabilidad con un instrumento autorizado por la universidad.
- Cuestionario de aceptación y utilidad percibida.
- Observación e incidencias.
- Evidencias de compatibilidad en escritorio y dispositivo móvil.

## Regla académica

**No inventar resultados.** Las plantillas contienen campos vacíos porque deben completarse únicamente con valores obtenidos durante el piloto. Las pruebas automáticas demuestran calidad técnica, pero no sustituyen la opinión de participantes reales ni prueban beneficios económicos o retención a largo plazo.

## Comprobación

```powershell
npm install
npm run check
npm run test:coverage
```

La integración opcional con el Supabase real continúa disponible mediante `npm run test:integration`. Utiliza únicamente cuentas de prueba activas y nunca una clave privada.

## Resultado de la validación local

| Control | Resultado |
|---|---:|
| Archivos de prueba | 20 aprobados |
| Pruebas automáticas | 94 aprobadas |
| Sentencias cubiertas | 73.15 % |
| Ramas cubiertas | 71.61 % |
| Funciones cubiertas | 77.87 % |
| Líneas cubiertas | 78.67 % |
| Mayor archivo JavaScript | 237.54 kB |
| JavaScript total | 820.76 kB |
| CSS total | 11.88 kB |
| Requerimientos trazados | 32 |
| Vulnerabilidades de dependencias | 0 |

También se comprobó el servidor de vista previa de producción. La integración con las cuentas institucionales y la aceptación de usuarios deben ejecutarse en el entorno real del piloto; no se incluyen credenciales ni resultados simulados.

## Documentación

Empieza por `docs/INDICE_FASE_6.md`. Allí se indica cuándo usar cada manual, instrumento y plantilla.
