import { browseCatalog, getCourseDetails } from "../clients/catalog-browser.js";
import { globalCache } from "../cache/cache-manager.js";
import type { CatalogEntry, CourseDetails } from "../types/sia.js";
import type { TableRow } from "../parsers/adf-table-parser.js";

export async function browseCatalogByFaculty(
  level: string,
  faculty?: string,
  program?: string
): Promise<CatalogEntry> {
  const cacheKey = `catalog:${level}:${faculty ?? ""}:${program ?? ""}`;
  const cached = globalCache.get<CatalogEntry>(cacheKey);
  if (cached) return cached;

  const rows = await browseCatalog(level, faculty, program);

  const entry: CatalogEntry = {
    level,
    faculty: faculty ?? "Todas",
    program: program ?? "Todos",
    courses: rows.map(rowToCatalogCourse),
  };

  globalCache.set(cacheKey, entry);
  return entry;
}

export async function getFullCourseDetails(
  courseCode: string
): Promise<CourseDetails> {
  const cacheKey = `details:${courseCode}`;
  const cached = globalCache.get<CourseDetails>(cacheKey);
  if (cached) return cached;

  const rows = await getCourseDetails(courseCode);

  const details: CourseDetails = {
    code: courseCode,
    name: rows[0]?.["Asignatura"] || rows[0]?.["col_1"] || "",
    credits: parseInt(rows[0]?.["Créditos"] || rows[0]?.["col_2"] || "0"),
    typology: rows[0]?.["Tipología"] || rows[0]?.["col_3"] || "",
    faculty: rows[0]?.["Facultad"] || rows[0]?.["col_4"] || "",
    department: rows[0]?.["Departamento"] || rows[0]?.["col_5"] || "",
    prerequisites: [],
    description: "",
    groups: [],
  };

  globalCache.set(cacheKey, details);
  return details;
}

function rowToCatalogCourse(row: TableRow) {
  return {
    code: row["Código"] || row["codigo"] || row["col_0"] || "",
    name: row["Asignatura"] || row["asignatura"] || row["col_1"] || "",
    credits: parseInt(row["Créditos"] || row["creditos"] || row["col_2"] || "0"),
    typology: row["Tipología"] || row["tipologia"] || row["col_3"] || "",
  };
}
