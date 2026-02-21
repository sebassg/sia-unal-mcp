# Documentación: Buscador de Cursos — Portal de Servicios Académicos UNAL

**URL:** https://sia.unal.edu.co/Catalogo/facespublico/public/servicioPublico.jsf?taskflowId=task-flow-AC_CatalogoAsignaturas
**Plataforma:** Portal de Servicios Académicos — Universidad Nacional de Colombia
**Versión del portal:** V. 4.3.23
**Administrado por:** Dirección Nacional de Información Académica
**Fecha de consulta:** 2026-02-20

---

## 1. Descripción General

El **Buscador de Cursos** es una herramienta pública del Sistema de Información Académica (SIA) de la Universidad Nacional de Colombia. Permite consultar el catálogo de asignaturas ofertadas por la universidad, incluyendo información sobre grupos, horarios, profesores, aulas, cupos disponibles y contenidos programáticos.

La aplicación está construida sobre **Oracle ADF (Application Development Framework)**, lo cual implica que muchos componentes de la interfaz son dinámicos y reactivos: los campos se habilitan, deshabilitan y cargan opciones en función de las selecciones previas del usuario, mediante peticiones AJAX al servidor.

---

## 2. URL de acceso

La URL base (`/servicioPublico.jsf` sin parámetros) muestra únicamente la pantalla de bienvenida del Portal. El parámetro `taskflowId` es **obligatorio** para llegar directamente al buscador:

```
https://sia.unal.edu.co/Catalogo/facespublico/public/servicioPublico.jsf?taskflowId=task-flow-AC_CatalogoAsignaturas
```

---

## 3. Estructura de la Interfaz

La página contiene dos secciones principales:

1. **Formulario de búsqueda** — panel con filtros de consulta en cascada.
2. **Resultado de la consulta** — tabla que aparece debajo del formulario tras ejecutar la búsqueda.

Al hacer clic en un resultado de la tabla, se navega a una **página de detalle de la asignatura**.

---

## 4. Formulario de Búsqueda

### 4.1 Campos del formulario

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| Nivel de estudio | Select | Sí* | Primer campo; activa el resto de la cascada |
| Sede | Select | No | Filtra las facultades disponibles |
| Facultad | Select | Sí* | Se vuelve obligatorio tras seleccionar Nivel |
| Plan de estudios | Select | Sí* | Se llena según la facultad seleccionada |
| Tipología de asignatura | Select | No | Se carga tras la primera búsqueda |
| Número de créditos | Texto | No | Valor numérico entero |
| Nombre de la asignatura | Texto | No | Búsqueda parcial, sin distinción may/min |
| Días | Checkboxes | No | Selección múltiple: L, Ma, Mi, J, V, Sa, D |

\* Se vuelven obligatorios progresivamente según el flujo de la cascada.

---

### 4.2 Detalle de cada campo

#### Nivel de estudio *(obligatorio)*

Opciones disponibles:
- Pregrado
- Doctorado
- Postgrados y másteres

---

#### Sede *(opcional)*

Opciones disponibles (9 sedes):

| Código | Sede |
|---|---|
| 1125 | SEDE AMAZONIA |
| 1101 | SEDE BOGOTÁ |
| 1126 | SEDE CARIBE |
| 9933 | SEDE DE LA PAZ |
| 1103 | SEDE MANIZALES |
| 1102 | SEDE MEDELLÍN |
| 1124 | SEDE ORINOQUIA |
| 1104 | SEDE PALMIRA |
| 9920 | SEDE TUMACO |

---

#### Facultad *(obligatorio tras elegir Nivel de estudio)*

Se carga dinámicamente. Para Pregrado, Sede Medellín, las opciones son:

| Código | Facultad |
|---|---|
| 3064 | FACULTAD DE ARQUITECTURA |
| 3065 | FACULTAD DE CIENCIAS |
| 3050 | FACULTAD DE CIENCIAS (Admisión PAET) |
| 3442 | FACULTAD DE CIENCIAS AGRARIAS |
| 3066 | FACULTAD DE CIENCIAS AGROPECUARIAS |
| 3516 | FACULTAD DE CIENCIAS DE LA VIDA |
| 3067 | FACULTAD DE CIENCIAS HUMANAS Y ECONÓMICAS |
| 3054 | FACULTAD DE ENFERMERÍA (Admisión PAET) |
| **3068** | **FACULTAD DE MINAS** |
| 3 | SEDE MEDELLÍN |

---

#### Plan de estudios *(se carga al seleccionar Facultad)*

Para la **Facultad de Minas** en Pregrado, las opciones disponibles son:

| Código | Plan de estudios |
|---|---|
| 3515 / 3528 | INGENIERÍA ADMINISTRATIVA |
| 3527 / 3529 | INGENIERÍA AMBIENTAL |
| 3516 / 3530 | INGENIERÍA CIVIL |
| 3517 / 3531 | INGENIERÍA DE CONTROL |
| 3518 / 3532 | INGENIERÍA DE MINAS Y METALURGIA |
| 3519 / 3533 | INGENIERÍA DE PETRÓLEOS |
| **3520** / 3534 | **INGENIERÍA DE SISTEMAS E INFORMÁTICA** |
| 3521 / 3535 | INGENIERÍA ELÉCTRICA |
| 3522 / 3536 | INGENIERÍA GEOLÓGICA |
| 3523 / 3537 | INGENIERÍA INDUSTRIAL |
| 3524 / 3538 | INGENIERÍA MECÁNICA |
| 3525 / 3539 | INGENIERÍA QUÍMICA |

> Cada programa aparece con dos códigos: corresponden a versiones curriculares distintas del mismo plan.

---

#### Tipología de asignatura *(se carga tras la primera búsqueda)*

| Valor | Descripción |
|---|---|
| TODAS MENOS LIBRE ELECCIÓN | Excluye libre elección |
| DISCIPLINAR OBLIGATORIA | Obligatoria del núcleo disciplinar |
| NIVELACIÓN | Asignaturas de nivelación |
| TRABAJO DE GRADO | Trabajo final de grado |
| FUND. OBLIGATORIA | Fundamentación obligatoria |
| DISCIPLINAR OPTATIVA | Optativa del núcleo disciplinar |
| FUND. OPTATIVA | Fundamentación optativa |
| LIBRE ELECCIÓN | Libre elección |

---

### 4.3 Botón "Mostrar"

- Inicia deshabilitado. Se activa una vez que los campos obligatorios están llenos.
- Al hacer clic, envía la consulta por AJAX y carga los resultados debajo del formulario.
- Tras el primer submit, el formulario se actualiza parcialmente (PPR de ADF): se filtran las facultades según la sede y se recargan Plan de estudios y Tipología.

---

## 5. Comportamiento Dinámico — Cascada de Filtros (Oracle ADF)

### Flujo de habilitación

```
Nivel de estudio
    └── habilita: Sede, Facultad
            └── (Facultad seleccionada) habilita: Plan de estudios
                    └── (Plan seleccionado) habilita: Tipología, botón "Mostrar"
```

### Detalle técnico para automatización

Los selects de ADF **no responden** a eventos `change` genéricos del DOM. Requieren el uso de la API interna de ADF para disparar el Partial Page Rendering (PPR):

```javascript
// Paso 1: Establecer el valor del select nativo
const sel = document.getElementById('pt1:r1:0:soc2::content'); // soc2 = Facultad
sel.value = '8'; // valor de índice para "3068 FACULTAD DE MINAS"

// Paso 2: Disparar el evento ADF (no el change genérico del DOM)
const page = AdfPage.PAGE;
const comp = page.findComponentByAbsoluteId('pt1:r1:0:soc2');
const inputEvent = new AdfUIInputEvent(
  comp,
  AdfUIInputEvent.VALUE_CHANGE_EVENT_TYPE,
  '', // valor anterior
  '8' // valor nuevo
);
comp.queueEvent(inputEvent, true);
```

**IDs internos de los selects ADF:**

| Campo | ID del `<select>` nativo |
|---|---|
| Nivel de estudio | `pt1:r1:0:soc1::content` |
| Sede (visible) | `pt1:r1:0:soc9::content` |
| Facultad | `pt1:r1:0:soc2::content` |
| Plan de estudios | `pt1:r1:0:soc3::content` |
| Tipología | `pt1:r1:0:soc4::content` |

---

## 6. Ejemplo de Consulta Realizada

### Parámetros usados

| Campo | Valor seleccionado |
|---|---|
| Nivel de estudio | **Pregrado** |
| Sede | **1102 SEDE MEDELLÍN** |
| Facultad | **3068 FACULTAD DE MINAS** |
| Plan de estudios | **3520 INGENIERÍA DE SISTEMAS E INFORMÁTICA** |
| Tipología | _(sin filtro)_ |
| Créditos | _(sin filtro)_ |
| Nombre | _(sin filtro)_ |
| Días | _(sin filtro)_ |

### Primeras asignaturas del resultado

| CÓDIGO | ASIGNATURA | CRÉD | TIPOLOGÍA |
|---|---|---|---|
| **1000003-M** | **ÁLGEBRA LINEAL** | 4 | FUND. OBLIGATORIA |
| 3009430 | Análisis y Diseño de Algoritmos | 3 | DISCIPLINAR |
| 3007847 | BASE DE DATOS I | 3 | DISCIPLINAR |
| 3007848 | BASE DE DATOS II | 3 | DISCIPLINAR |
| 1000009-M | BIOLOGÍA GENERAL | 3 | FUND. OPTATIVA |
| 1000004-M | CÁLCULO DIFERENCIAL | 4 | FUND. OBLIGATORIA |
| 1000006-M | CÁLCULO EN VARIAS VARIABLES | 4 | FUND. OPTATIVA |
| 1000005-M | CÁLCULO INTEGRAL | 4 | FUND. OBLIGATORIA |
| 3010440 | Calidad de software | 3 | DISCIPLINAR |
| 3010836 | Cátedra de sistemas: una visión hi... | 3 | DISCIPLINAR |

---

## 7. Detalle del Primer Curso: ÁLGEBRA LINEAL (1000003-M)

### 7.1 Información general

| Campo | Valor |
|---|---|
| **Nombre** | ÁLGEBRA LINEAL |
| **Código** | 1000003-M |
| **Tipología** | FUND. OBLIGATORIA (Fundamentación Obligatoria) |
| **Créditos** | 4 |
| **Plan de estudios** | INGENIERÍA DE SISTEMAS E INFORMÁTICA |
| **Facultad** | FACULTAD DE MINAS |
| **Código clase teórica** | 31000003 |
| **Periodo académico** | 02/02/2026 — 31/05/2026 |
| **Duración** | Semestral |
| **Jornada** | DIURNO |

---

### 7.2 Prerrequisitos

| Condición | Tipo | ¿Todas? | Código | Asignatura |
|---|---|---|---|---|
| Condición 1 | **M** | S | 1000008-M | GEOMETRÍA VECTORIAL Y ANALÍTICA |

**Leyenda de tipos de prerrequisito:**

| Tipo | Significado |
|---|---|
| **M** | No se puede matricular sin haber superado el prerrequisito |
| **O** | Se puede matricular, pero no ser calificado sin superarlo |
| **E** | Se puede matricular simultáneamente con el prerrequisito |
| **A** | Anulación por incompatibilidad al incumplir el prerrequisito |

---

### 7.3 Grupos disponibles (CLASE TEÓRICA 31000003)

| Grupo | Profesor | Días | Horario | Aula | Cupos |
|---|---|---|---|---|---|
| **1** (Especial) | GUILLERMO ARTURO MANTILLA SOLER | Mar / Jue | 10:00–12:00 | Aula tipo auditorio 46-211, Bloque 46 | **27** |
| **2** | Daniel Ricardo Arteaga Bedoya | Mié / Vie | 08:00–10:00 | Aula tipo auditorio NEL RODRIGUEZ NAUSTER, 12-202, Bloque 12 | 3 |
| **3** | Daniel Ricardo Arteaga Bedoya | Mié / Vie | 16:00–18:00 | Aula tipo auditorio NEL RODRIGUEZ NAUSTER, 12-202, Bloque 12 | **37** |
| **4** | ALEJANDRO ARENAS TIRADO | Mié / Vie | 16:00–18:00 | Aula tipo auditorio GABRIEL GARCÍA MORENO, 12-201, Bloque 12 | 1 |
| **5** | Jose Gregorio Rodriguez | Mar / Jue | 08:00–10:00 | Aula tipo auditorio GABRIEL GARCÍA MORENO, 12-201, Bloque 12 | 2 |
| **6** | Juan Felipe Ruiz Castrillon | Mié / Vie | 16:00–18:00 | Aula tipo auditorio GABRIEL PANESSO ROBLEDO, 12-204, Bloque 12 | 3 |
| **7** | Nelson Andrés Agudelo Parra | Mié / Vie | 16:00–18:00 | Auditorio MANUEL MEJIA VALLEJO, 41-103, Bloque 41 | **44** |
| **8** | Jonnathan Ramírez Granada | Mié / Vie | 18:00–20:00 | Aula tipo auditorio, 12-101, Bloque 12 | **51** |
| **9** | Daniel Ricardo Arteaga Bedoya | Mié / Vie | 14:00–16:00 | Aula tipo auditorio NEL RODRIGUEZ NAUSTER, 12-202, Bloque 12 | **25** |
| **10** | HENOCK VENEGAS GOMEZ | Mié / Vie | 14:00–16:00 | Aula general 11-225, Bloque 11 | 0 |
| **11** | Juan Felipe Ruiz Castrillon | Mar / Jue | 12:00–14:00 | Aula tipo auditorio GABRIEL GARCÍA MORENO, 12-201, Bloque 12 | 0 |
| **12** | Rafael Alexánder Llinás Ramírez | Mar / Jue | 12:00–14:00 | Auditorio FRANCISCO LUIS GALLEGO, 41-102, Bloque 41 | 9 |
| **13** | Rafael Alexánder Llinás Ramírez | Mar / Jue | 14:00–16:00 | Auditorio, 12-301, Bloque 12 | **28** |
| **14** | EDGAR ARTURO RAMOS NAVARRETE | Mar / Jue | 14:00–16:00 | Aula tipo auditorio GABRIEL PANESSO ROBLEDO, 12-204, Bloque 12 | **35** |
| **15** | Juan Felipe Ruiz Castrillon | Mar / Jue | 18:00–20:00 | Aula general 11-225, Bloque 11 | 1 |
| **16** | Wilmar Alberto Gonzalez Medina | Mié / Vie | 06:00–08:00 | Aula general 11-208, Bloque 11 | 1 |
| **17** | JUAN DIEGO DURANGO HIGINIO | Mié / Vie | 18:00–20:00 | Aula videoconferencia, 21-320, Bloque 21 | 17 |
| **18** | Daniel Ricardo Arteaga Bedoya | Mié / Vie | 18:00–20:00 | Aula tipo auditorio, 12-102, Bloque 12 | **45** |
| **19** | Daniele Sepe | Mar / Jue | 10:00–12:00 | Aula tipo auditorio, 46-210, Bloque 46 | 0 |
| **20** | HENOCK VENEGAS GOMEZ | Mié / Vie | 06:00–08:00 | Aula general 21-331-334, Bloque 21 | 4 |
| **21** | Juan Felipe Ruiz Castrillon | Mar / Jue | 06:00–08:00 | Aula general 11-203, Bloque 11 | 1 |
| **AMAZ-01** (PAET Amazonia) | JUAN GUILLERMO CADAVID RAMIREZ | Mar / Jue | 11:00–13:00 | _(sin aula asignada)_ | 14 |
| **ORIN-01** (Peama Orinoquia) | Vicente Carlos Pérez Álvarez | Lun / Mié / Jue | 09:00–11:00 | _(sin aula asignada)_ | 4 |
| **TUMA-01** (Peama Tumaco) | Javier Alexander Tenorio Quiñones | Mar 13:00–15:00 / Jue 07:00–09:00 | Aula Modular 2 (032) / Aula 5-Sala de Vidrios (015) | — | 3 |

**Total de grupos:** 24 (21 regulares en Medellín + 3 PAET/PEAMA)

### 7.4 Resumen de cupos

| Condición | Grupos |
|---|---|
| Con mayor disponibilidad | Grupo 8 (51), Grupo 18 (45), Grupo 7 (44), Grupo 3 (37), Grupo 14 (35) |
| Sin cupos | Grupos 10, 11, 19 |
| PAET / PEAMA con cupos | AMAZ-01 (14), ORIN-01 (4), TUMA-01 (3) |

---

## 8. Tecnología y Arquitectura

| Aspecto | Detalle |
|---|---|
| **Framework frontend** | Oracle ADF Rich Client (Application Development Framework) |
| **Tipo de interfaz** | JSF (JavaServer Faces) con PPR (Partial Page Rendering) |
| **Carga dinámica** | AJAX — los dropdowns se llenan mediante peticiones al servidor |
| **IDs de componentes** | Siguen el patrón `pt1:r1:0:soc[N]::content` |
| **Objeto JS de ADF** | `AdfPage.PAGE`, `AdfUIInputEvent`, `AdfRichUIPeer` |
| **Servidor** | Java EE / Oracle Fusion Middleware |

---

## 9. Flujo de Uso Recomendado

```
1. Abrir el buscador:
   https://sia.unal.edu.co/Catalogo/facespublico/public/servicioPublico.jsf
   ?taskflowId=task-flow-AC_CatalogoAsignaturas

2. Seleccionar Nivel de estudio (ej: Pregrado).
   → Sede y Facultad se habilitan.

3. (Opcional) Seleccionar Sede para filtrar facultades.

4. Seleccionar Facultad.
   → Plan de estudios carga sus opciones.

5. Seleccionar Plan de estudios.
   → Tipología de asignatura se habilita y el botón "Mostrar" se activa.

6. Completar filtros adicionales opcionales (tipología, créditos, nombre, días).

7. Hacer clic en "Mostrar".
   → Aparece la tabla "Resultado de la consulta".

8. En la tabla, hacer clic en el CÓDIGO de la asignatura deseada.
   → Se navega a la vista "Información de la asignatura".

9. En la vista de detalle:
   - Revisar metadatos: código, tipología, créditos, facultad.
   - Expandir "Contenido de la asignatura" para ver el programa.
   - Revisar grupos: profesor, horario, aula y cupos disponibles.
   - Usar el botón "Volver" para regresar a los resultados.
```

---

## 10. Observaciones

- Los **cupos disponibles** reflejan el estado en tiempo real al momento de la consulta.
- El campo **Facultad** del docente en la vista de detalle suele aparecer vacío para los grupos regulares.
- Los códigos de asignatura incluyen un **sufijo de sede** (ej: `-M` = Medellín/Minas).
- El mismo plan de estudios aparece con **dos códigos** distintos (ej: 3520 y 3534), correspondientes a versiones curriculares diferentes.
- La descripción en la tabla de resultados aparece **truncada**; el texto completo está en la vista de detalle.
- El contenido del programa (capítulos) es accesible expandiendo el panel **"Contenido de la asignatura"** en la vista de detalle.
- Los grupos **PAET** y **PEAMA** corresponden a programas de acceso especial para estudiantes de sedes regionales (Amazonia, Orinoquia, Tumaco).

---

*Documentado el 2026-02-20 mediante navegación directa al portal SIA UNAL.*
