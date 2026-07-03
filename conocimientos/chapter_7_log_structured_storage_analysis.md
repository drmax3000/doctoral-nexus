---
title: "Análisis Doctoral: Log-Structured Storage (LSM Trees)"
source: "Database Internals - Chapter 7"
author: "Agent Antigravity (Doctoral Nexus)"
---

# Análisis Doctoral: Log-Structured Storage (Chapter 7)

### 1. Aporías (Contradicciones Técnicas)
* **La Conjetura RUM (Read, Update, Memory):** La aporía central del almacenamiento basado en logs (LSM Trees). Para maximizar la velocidad de escritura (Updates/Ingestion) convirtiendo todas las mutaciones en I/O secuencial (append-only), destruimos la localidad de los datos para la lectura. Optimizar para lecturas (B-Trees) destruye el rendimiento de escritura por el I/O aleatorio. Nunca puedes optimizar los tres vértices simultáneamente.

### 2. Trade-offs Cuantificados
* **Write Throughput vs. Write Amplification:** Escribir en memoria (MemTable) y volcar a disco (SSTables) garantiza un throughput masivo de I/O secuencial. Sin embargo, el costo diferido es la *Compaction* (fusión de niveles). Esto genera picos masivos de CPU y Disk I/O de fondo. Una escritura lógica puede resultar en múltiples escrituras físicas a medida que el dato desciende por los niveles (Write Amplification > 10x en algunos casos).
* **Read Amplification:** Una sola lectura lógica puede requerir revisar la MemTable y múltiples SSTables en disco si no es detenida tempranamente por un filtro.

### 3. Validación (Runtime / SQL implications)
* **Tombstones Ocultos:** Los `DELETE` y `UPDATE` no modifican datos en sitio, simplemente insertan un registro (tombstone) anulando el anterior. En producción, un escaneo de rango (Range Scan) puede iterar sobre millones de tombstones invisibles antes de retornar resultados, matando el rendimiento de las consultas y causando Timeouts inesperados en la capa de aplicación.

### 4. Mapeo a Motores del Mundo Real (Real-World Architectures)
* **RocksDB / LevelDB:** El estándar de facto para motores embebidos LSM (usado por Kafka Streams, CockroachDB y TiKV).
* **Apache Cassandra / ScyllaDB:** Utilizan un modelo *Size-Tiered Compaction* optimizado para escrituras distribuidas masivas.
* **ClickHouse (MergeTree):** Utiliza conceptos derivados de LSM para analítica de datos por columnas.

### 5. Impacto en Negocio (Product/Business Impact)
* **Ideal para IoT y Finanzas:** Permite absorber picos masivos de ingestión de datos (streaming, logs, ticks financieros) sin degradar la disponibilidad, garantizando que no se pierdan eventos críticos de negocio.
* **Riesgo en SLA de Lectura:** Si no se gestiona bien la compactación, los picos de degradación en background causan "tail latencies" (el percentil 99 de latencia se dispara), afectando la experiencia de usuarios que esperan respuestas en tiempo real (ej. dashboards analíticos orientados a cliente).

### 6. Herramientas de Observabilidad (Observability & Metrics)
* **`iostat` / `dstat`:** Para monitorear la saturación de I/O de bloque durante los procesos de compactación en background.
* **Métricas Internas (Prometheus):** Monitorear el conteo de *SSTables en Nivel 0 (L0)*. Un L0 saturado significa que el motor de compactación no da abasto con la tasa de ingestión.
* **eBPF / `bcc` tools (ext4_slower):** Para identificar picos de latencia ocultos en las llamadas al sistema (fsync) durante el volcado (flush) de la MemTable al disco.

### 7. Parámetros de Tuning (Sysctls & Configurations)
* **Filtros de Bloom (Bloom Filters):** Asignar más bits por clave reduce los falsos positivos, mitigando drásticamente el *Read Amplification* a expensas de consumo de RAM.
* **Estrategias de Compactación:** Elegir entre *Size-Tiered* (mejor para escrituras intensivas, requiere el doble de espacio en disco temporal) o *Leveled Compaction* (mejor para lecturas, genera más I/O de fondo).
* **`vm.swappiness` (OS Level):** Mantener en `1` o `0` para evitar que el kernel envíe las MemTables o la caché de disco al swap durante picos de memoria en la compactación.
