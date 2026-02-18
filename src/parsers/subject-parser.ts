import type {
  Course,
  SearchResult,
  RawSubjectResult,
  RawSubject,
} from "../types/sia.js";
import { parseRawGroup } from "./group-parser.js";

export function parseSearchResult(raw: RawSubjectResult): SearchResult {
  return {
    totalCourses: raw.totalAsignaturas,
    totalPages: raw.numPaginas,
    courses: (raw.asignaturas?.list ?? []).map(parseRawSubject),
  };
}

function parseRawSubject(raw: RawSubject): Course {
  return {
    code: raw.codigo,
    name: raw.nombre,
    typology: mapTypology(raw.tipologia),
    credits: raw.creditos,
    groups: raw.grupos?.list?.map(parseRawGroup),
  };
}

function mapTypology(code: string): string {
  const map: Record<string, string> = {
    p: "Disciplinar Optativa",
    b: "Fundamentación Obligatoria",
    c: "Disciplinar Obligatoria",
    l: "Libre Elección",
    m: "Nivelación",
    o: "Trabajo de Grado",
    t: "Fundamentación Optativa",
    B: "Fundamentación Obligatoria",
    C: "Disciplinar Obligatoria",
    L: "Libre Elección",
    O: "Trabajo de Grado",
    P: "Disciplinar Optativa",
    T: "Fundamentación Optativa",
  };
  return map[code] ?? code;
}
