# Guía de evidencias y anonimización

## 1. Objetivo

Conservar evidencias suficientes para demostrar la ejecución del piloto sin publicar información que identifique a administradores, entrenadores o clientes.

## 2. Estructura de carpetas sugerida

```text
EVIDENCIAS-PILOTO/
  01-autorizacion/
  02-configuracion-tecnica/
  03-pruebas-automaticas/
  04-casos-aceptacion/
  05-usabilidad/
  06-incidencias/
  07-reportes-anonimos/
  08-acta-cierre/
```

La carpeta original debe tener acceso restringido. Para anexos y defensa, prepara una copia revisada y anonimizada.

## 3. Nombres de archivos

Formato: `AAAA-MM-DD_TIPO_ROL_CODIGO_VERSION.ext`.

Ejemplos:

- `2026-09-12_CASO_ADMIN_ADM-001_v1.png`
- `2026-09-12_SUS_COACH_ENT-004_v1.pdf`
- `2026-09-12_REPORTE_SESIONES_ANONIMO_v1.csv`

No incluyas nombres, correos ni documentos en el nombre del archivo.

## 4. Información prohibida en anexos públicos

- Contraseñas y códigos de recuperación.
- Tokens, cabeceras de autorización y claves de Supabase.
- Correos personales.
- Nombres completos.
- Teléfonos, direcciones y documentos de identidad.
- UUID, códigos de invitación activos y enlaces privados.
- Información de seguimiento asociada a una identidad.
- Listas que permitan relacionar códigos anónimos con personas.

## 5. Procedimiento de revisión

1. Duplica la evidencia original dentro de una carpeta de trabajo restringida.
2. Oculta o recorta los campos prohibidos.
3. Sustituye personas por códigos `ADM-###`, `ENT-###` y `CLI-###`.
4. Revisa metadatos y nombre del archivo.
5. Abre el archivo final y verifica visualmente que el contenido oculto no pueda recuperarse.
6. Pide una segunda revisión a una persona autorizada.
7. Registra el identificador de la evidencia en la matriz de trazabilidad.

No se recomienda colocar rectángulos transparentes sobre información sensible. Utiliza una copia rasterizada o una herramienta que elimine realmente el contenido oculto.

## 6. Exportaciones de la aplicación

En **Reportes**, el botón **Evidencia anónima**:

- Sustituye entrenadores por `ENT-###`.
- Sustituye clientes por `CLI-###`.
- Excluye correos y UUID de la exportación.
- Conserva indicadores y estados necesarios para el análisis.

Los alias son consistentes únicamente dentro de cada archivo exportado. Revisa títulos de actividades y rutinas por si una persona escribió allí información identificable.

## 7. Capturas

Antes de capturar:

- Utiliza cuentas y datos de prueba.
- Cierra paneles del navegador que muestren correos personales.
- Oculta la barra de marcadores y otras pestañas.
- Verifica que no aparezca la URL con parámetros privados.
- Captura solo el módulo necesario.

## 8. Matriz de control

| Evidencia | Objetivo/requisito | Fecha | Responsable | Anonimizada | Segunda revisión | Ubicación protegida |
|---|---|---|---|---|---|---|
| EV-___ | ___ | ___ | ___ | Sí / No | ___ | ___ |

## 9. Conservación y eliminación

El protocolo debe definir una fecha o condición de eliminación, la persona responsable y el método. Las copias temporales, exportaciones de prueba y archivos de la papelera también deben incluirse en el cierre.
