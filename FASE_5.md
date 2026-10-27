# Fase 5: calidad y pruebas

## Objetivo

Comprobar de forma reproducible la calidad funcional y técnica de Coaches Connection antes del piloto institucional, manteniendo React, Vite, Supabase y todos los datos de las fases anteriores.

La versión del frontend es `1.5.0`. La base de datos continúa en `1.4.0` porque esta fase no necesita cambiar tablas ni registros.

## Elementos incorporados

- Pruebas de componentes React para inicio de sesión, registro y paginación.
- Pruebas automáticas de accesibilidad con `axe-core`.
- Pruebas del contrato entre el frontend y Supabase.
- Prueba de integración opcional y de solo lectura contra el proyecto real.
- Verificación de aislamiento RLS para administrador, entrenador y cliente.
- Verificador SQL de tablas, funciones, políticas, permisos, índices e integridad.
- Reporte de cobertura de código con umbrales mínimos.
- Presupuesto automático del tamaño de los archivos compilados.
- Objetivos explícitos de compatibilidad para navegadores modernos.
- Matriz de pruebas funcionales y criterios de aceptación para la tesis.
- Corrección de la duplicación del prefijo `CLI-` al escribir invitaciones de clientes.
- Mejoras de navegación por teclado, idioma del documento y reducción de movimiento.
- Flujo automático de calidad para Node 20.19, 22 y 24 mediante GitHub Actions.

## Comprobación local obligatoria

Ejecuta:

```powershell
npm install
npm run check
npm run test:coverage
```

`npm run check` ejecuta análisis estático, 82 pruebas automatizadas, compilación de producción y presupuesto de carga.

Los umbrales mínimos de cobertura son:

| Medida | Mínimo |
|---|---:|
| Sentencias | 65 % |
| Ramas | 60 % |
| Funciones | 70 % |
| Líneas | 70 % |

## Resultado de la validación local

| Control | Resultado |
|---|---:|
| Archivos de prueba | 17 aprobados |
| Pruebas automatizadas | 82 aprobadas |
| Sentencias cubiertas | 70.20 % |
| Ramas cubiertas | 69.30 % |
| Funciones cubiertas | 75.28 % |
| Líneas cubiertas | 76.14 % |
| Mayor archivo JavaScript | 297.69 kB |
| JavaScript total | 695.93 kB |
| CSS total | 11.88 kB |
| Vulnerabilidades de dependencias | 0 |

También se comprobó una instalación limpia mediante `npm ci`. La integración con las cuentas del Supabase institucional queda pendiente de ejecución por el responsable autorizado, ya que sus credenciales no se incluyen en el proyecto.

## Verificación de Supabase

En **Supabase → SQL Editor**, copia y ejecuta todo el contenido de:

```text
supabase/verificar_fase5_calidad.sql
```

Este archivo es de solo lectura. Los campos booleanos deben mostrar `true`, los conteos de inconsistencias deben ser `0` y `estado_backend` debe indicar `1.4.0` o una versión superior.

## Integración real y RLS

Esta prueba utiliza tres cuentas exclusivas de prueba que ya deben existir y estar activas: un administrador, un entrenador y un cliente con portal.

```powershell
Copy-Item ".env.test.integration.example" ".env.test.integration"
notepad ".env.test.integration"
npm run test:integration
```

Completa el archivo con la misma URL y clave pública de Supabase, además de las credenciales de las cuentas de prueba. No coloques una clave `service_role`.

La prueba no crea, modifica ni elimina registros. Comprueba:

- Versión del backend.
- Inicio de sesión y perfil de cada rol.
- Acceso administrativo.
- Aislamiento de clientes del entrenador mediante RLS.
- Aislamiento de sesiones del cliente mediante RLS.
- Rechazo de reportes administrativos para entrenador y cliente.
- Tiempo de respuesta de las consultas principales.

## Evidencias para la tesis

Utiliza `docs/MATRIZ_PRUEBAS_FASE_5.md` para registrar los resultados reales. Las capturas y exportaciones no deben mostrar contraseñas, tokens, claves, documentos de identidad ni datos identificables de participantes.

Las pruebas automáticas demuestran comportamiento técnico. Las pruebas de aceptación con los 6 administradores y 20 entrenadores corresponden al piloto y deben documentarse con resultados reales, sin inventar valores.
