import type { ScheduleEntry } from "../types/sia.js";
import type { TableRow } from "./adf-table-parser.js";

export function parseScheduleRows(rows: TableRow[]): ScheduleEntry[] {
  return rows
    .map((row) => ({
      courseCode: row["Código"] || row["codigo"] || row["col_0"] || "",
      courseName: row["Asignatura"] || row["asignatura"] || row["col_1"] || "",
      group: row["Grupo"] || row["grupo"] || row["col_2"] || "",
      day: row["Día"] || row["dia"] || row["col_3"] || "",
      startHour: row["Hora inicio"] || row["hora_inicio"] || row["col_4"] || "",
      endHour: row["Hora fin"] || row["hora_fin"] || row["col_5"] || "",
      classroom: row["Aula"] || row["aula"] || row["col_6"] || "",
      professor: row["Docente"] || row["docente"] || row["col_7"] || "",
    }))
    .filter((s) => s.courseCode !== "");
}
