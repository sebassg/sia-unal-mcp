import { URLS, ADF_SELECTORS } from "../config/constants.js";
import {
  fetchAuthenticatedTable,
  fetchAuthenticatedText,
  fetchAuthenticatedPageContent,
} from "../clients/authenticated-client.js";
import { parseGradeRows } from "../parsers/grade-parser.js";
import * as cheerio from "cheerio";
import type { AcademicHistory, PeriodSummary } from "../types/sia.js";

export async function getAcademicHistory(): Promise<AcademicHistory> {
  const html = await fetchAuthenticatedPageContent(
    URLS.academicHistory(),
    "#pt1\\:r1\\:0"
  );

  const $ = cheerio.load(html);

  // Extract PAPA and student info
  const studentName = $('[id*="nombre"], [id*="ot1"]').first().text().trim();
  const studentId = $('[id*="documento"], [id*="ot2"]').first().text().trim();
  const program = $('[id*="programa"], [id*="ot3"]').first().text().trim();

  const papaText =
    (await fetchAuthenticatedText(
      URLS.academicHistory(),
      ADF_SELECTORS.academicHistory.papaLabel
    )) || "0";
  const papa = parseFloat(papaText) || 0;

  // Extract grades table
  const rows = await fetchAuthenticatedTable(
    URLS.academicHistory(),
    ADF_SELECTORS.academicHistory.historyTable
  );

  const grades = parseGradeRows(rows);

  // Group by period
  const periodMap = new Map<string, typeof grades>();
  for (const grade of grades) {
    const period = grade.period || "Sin periodo";
    if (!periodMap.has(period)) periodMap.set(period, []);
    periodMap.get(period)!.push(grade);
  }

  const periods: PeriodSummary[] = Array.from(periodMap.entries()).map(
    ([period, periodGrades]) => {
      const totalCredits = periodGrades.reduce((s, g) => s + g.credits, 0);
      const weightedSum = periodGrades.reduce(
        (s, g) => s + g.grade * g.credits,
        0
      );
      return {
        period,
        grades: periodGrades,
        periodAverage: totalCredits > 0 ? weightedSum / totalCredits : 0,
        cumulativeAverage: papa,
      };
    }
  );

  const totalCredits = grades.reduce((s, g) => s + g.credits, 0);
  const completedCredits = grades.filter((g) => g.grade >= 3.0).reduce((s, g) => s + g.credits, 0);

  return {
    studentName,
    studentId,
    program,
    papa,
    pappiCredits: totalCredits,
    totalCredits,
    completedCredits,
    periods,
  };
}
