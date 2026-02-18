import { URLS } from "../config/constants.js";
import {
  fetchAuthenticatedTable,
  fetchAuthenticatedPageContent,
} from "../clients/authenticated-client.js";
import * as cheerio from "cheerio";
import type { EnrollmentStatus, EnrolledCourse } from "../types/sia.js";

export async function getEnrollmentStatus(): Promise<EnrollmentStatus> {
  const html = await fetchAuthenticatedPageContent(
    URLS.enrollment(),
    "#pt1\\:r1\\:0"
  );

  const $ = cheerio.load(html);

  // Extract student info from page labels
  const studentName = $('[id*="ot1"], [id*="nombre"]').first().text().trim();
  const program = $('[id*="ot2"], [id*="programa"]').first().text().trim();
  const currentPeriod = $('[id*="ot3"], [id*="periodo"]').first().text().trim();
  const status = $('[id*="ot4"], [id*="estado"]').first().text().trim();

  // Extract enrolled courses table
  const rows = await fetchAuthenticatedTable(
    URLS.enrollment(),
    '#pt1\\:r1\\:0\\:t1'
  );

  const enrolledCourses: EnrolledCourse[] = rows.map((row) => ({
    code: row["Código"] || row["col_0"] || "",
    name: row["Asignatura"] || row["col_1"] || "",
    group: row["Grupo"] || row["col_2"] || "",
    credits: parseInt(row["Créditos"] || row["col_3"] || "0"),
    professor: row["Docente"] || row["col_4"] || "",
  }));

  const totalCredits = enrolledCourses.reduce((sum, c) => sum + c.credits, 0);

  return {
    studentName,
    program,
    currentPeriod,
    enrolledCourses,
    totalCredits,
    status,
  };
}
