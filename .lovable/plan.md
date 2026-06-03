## Objetivo
Permitir que un mismo grupo realice **N evaluaciones independientes** a lo largo del curso (ej. inicial, intermedia, final) y que todas las vistas, exportaciones y estadísticas distingan cada evaluación por fecha/etiqueta.

## Modelo de datos

Nueva tabla `evaluaciones`:
- `id`, `grupo_id`, `nombre` (texto libre: "Inicial", "Trimestre 2"…), `fecha` (date), `anio_escolar`, `created_at`, `updated_at`
- RLS: profesor del grupo o admin
- GRANTs estándar (authenticated + service_role)

Cambios en `pruebas_eurofit` y `pruebas_cfs`:
- Añadir columna `evaluacion_id uuid` (nullable temporalmente para migración)
- Migración de datos: crear 1 evaluación "Evaluación 2024-2025" por cada grupo existente y asignar todas las filas actuales a ella
- Cambiar a `NOT NULL`
- Eliminar cualquier restricción/uso de "1 prueba por alumno" → ahora la unicidad es `(alumno_id, evaluacion_id)`

## Cambios de aplicación

### Selector de evaluación
- Nuevo componente `EvaluacionSelector` en cabecera de `Pruebas.tsx`, `Grupos.tsx` (detalle), página pública.
- Al entrar en un grupo: lista de evaluaciones + botón "Nueva evaluación" (modal con nombre + fecha).

### Páginas afectadas
- `src/pages/app/Pruebas.tsx`: leer/escribir filtrando por `evaluacion_id` seleccionada; cambiar lógica de upsert (clave `alumno_id + evaluacion_id`).
- `src/pages/app/Grupos.tsx`: listar evaluaciones del grupo, permitir crear/renombrar/borrar; botones PDF/Excel operan sobre la evaluación seleccionada.
- `src/pages/Publico.tsx`: si el alumno tiene varias evaluaciones, mostrar selector y permitir comparar (vista simple: tabla por evaluación).
- `src/lib/exportResultados.ts`: añadir columna "Evaluación" y "Fecha eval." en cada hoja; opción de exportar todas o una sola.
- `src/lib/pdf.ts`: cabecera del PDF incluye nombre/fecha de la evaluación.
- `get_alumno_by_codigo` RPC: devolver arrays de evaluaciones con sus pruebas en lugar de una única fila.
- `get_stats_publicas_filtradas`: añadir parámetro opcional `_evaluacion` (por nombre o id) — por defecto agrega todas.

### i18n
- Claves nuevas en es/en/val: `evaluaciones.titulo`, `nueva`, `nombre`, `fecha`, `seleccionar`, `ninguna`, etc.

## Migración (orden)
1. CREATE TABLE `evaluaciones` + GRANT + RLS + policies
2. ALTER pruebas_eurofit / pruebas_cfs: add `evaluacion_id`
3. INSERT 1 evaluación por grupo existente (nombre = "Evaluación inicial", fecha = today)
4. UPDATE pruebas_* set evaluacion_id = la creada para el grupo del alumno
5. ALTER columns SET NOT NULL
6. UNIQUE (alumno_id, evaluacion_id) en cada tabla
7. Recrear `get_alumno_by_codigo` y `get_stats_publicas_filtradas` con soporte de evaluación

## Fuera de alcance
- Comparativa visual evolutiva (gráficos longitudinales) entre evaluaciones → lo dejo como mejora posterior; ahora basta con verlas/exportarlas por separado.
- Edición masiva entre evaluaciones.

¿Apruebas el plan? Confirmo y empiezo por la migración.