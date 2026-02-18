import type { Grade } from "../types/sia.js";
import type { TableRow } from "./adf-table-parser.js";

export function parseGradeRows(rows: TableRow[], period?: string): Grade[] {
  return rows
    .map((row) => ({
      courseCode: row["Código"] || row["codigo"] || row["col_0"] || "",
      courseName: row["Asignatura"] || row["asignatura"] || row["col_1"] || "",
      credits: parseFloat(row["Créditos"] || row["creditos"] || row["col_2"] || "0"),
      grade: parseFloat(row["Nota"] || row["nota"] || row["Calificación"] || row["col_3"] || "0"),
      period: row["Periodo"] || row["periodo"] || row["col_4"] || period || "",
      typology: row["Tipología"] || row["tipologia"] || row["col_5"] || "",
    }))
    .filter((g) => g.courseCode !== "");
}
