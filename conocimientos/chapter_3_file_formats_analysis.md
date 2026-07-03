---
title: "Análisis Doctoral: File Formats"
source: "Database Internals - Chapter 3"
author: "Agent Antigravity (Doctoral Nexus)"
---

# Análisis Doctoral: File Formats (Chapter 3)

### 1. Aporías (Contradicciones Técnicas)
* **Eficiencia de Codificación vs. Velocidad de Decodificación:** Comprimir o empaquetar fuertemente los datos a nivel de bit ahorra I/O de disco (reduciendo el ancho de banda requerido), pero traslada el cuello de botella a la CPU (Deserialización). Nunca puedes minimizar el costo de I/O sin incrementar simultáneamente los ciclos de CPU.

### 2. Trade-offs Cuantificados
* **Filas (Row-oriented) vs. Columnas (Column-oriented):** Los formatos orientados a filas optimizan las escrituras y lecturas puntuales (`SELECT * FROM table WHERE id = X`) incurriendo en alta localidad de caché. Los formatos orientados a columnas destruyen la velocidad de escritura de un solo registro, pero aceleran las agregaciones masivas (`SUM()`, `AVG()`) hasta 100x porque solo cargan a memoria la columna solicitada y permiten vectorización SIMD.

### 3. Validación (Runtime / SQL implications)
* **Páginas Ranuradas (Slotted Pages) y Fragmentación:** Cuando un `UPDATE` agranda un string (ej. `VARCHAR`), la base de datos puede no tener espacio en la página actual. Esto causa "Migración de Filas" (Row Migration o Forwarding Pointers). En tiempo de ejecución, un simple `SELECT` repentinamente debe hacer 2 saltos de I/O en disco en lugar de 1, duplicando la latencia de la consulta.

### 4. Mapeo a Motores del Mundo Real (Real-World Architectures)
* **Heap Files / Slotted Pages:** PostgreSQL y SQLite.
* **Formatos Columnares:** Apache Parquet, ORC, ClickHouse.
* **Índices Agrupados (Clustered Index):** MySQL / InnoDB (donde el archivo de datos *es* el B-Tree primario).

### 5. Impacto en Negocio (Product/Business Impact)
* Elegir incorrectamente el formato de archivo impacta directamente en los costos de nube (Cloud Billing). Un workload de Analytics (OLAP) ejecutado sobre PostgreSQL (Row) en lugar de Redshift/ClickHouse (Columnar) requerirá clústeres inmensamente más grandes y costosos, y entregará reportes gerenciales inaceptablemente lentos.

### 6. Herramientas de Observabilidad (Observability & Metrics)
* **`pg_stattuple` (Postgres):** Para observar el "bloat" (fragmentación de páginas) en tiempo real.
* **`perf` / Flamegraphs:** Para observar si la CPU de la base de datos está quemando ciclos masivos en rutinas de deserialización de memoria.
* **`strace`:** Para contar la cantidad de `read()` system calls reales emitidas al OS.

### 7. Parámetros de Tuning (Sysctls & Configurations)
* **Tamaño de Página de Bloque (Block/Page Size):** 8KB en Postgres, 16KB en InnoDB. Ajustarlo a 4KB para alinearlo con los bloques de SSD/NVMe modernos puede reducir write amplification a nivel de hardware.
* **Fillfactor:** Configurar `fillfactor=80` en Postgres (dejando 20% de espacio vacío en cada página) permite que los `UPDATEs` ocurran en el mismo bloque (HOT updates), previniendo migraciones de filas y salvando el rendimiento.
