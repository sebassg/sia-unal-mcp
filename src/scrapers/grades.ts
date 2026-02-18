import { URLS, ADF_SELECTORS } from "../config/constants.js";
import { fetchAuthenticatedTable } from "../clients/authenticated-client.js";
import { parseGradeRows } from "../parsers/grade-parser.js";
import type { Grade } from "../types/sia.js";

export async function getGrades(period?: string): Promise<Grade[]> {
  const rows = await fetchAuthenticatedTable(
    URLS.grades(),
    ADF_SELECTORS.grades.gradesTable,
    async (page) => {
      if (period) {
        const sel = ADF_SELECTORS.grades.periodSelect;
        await page.waitForSelector(sel, { timeout: 10000 });

        // Find and select the period option
        const options = await page.$$eval(`${sel} option`, (opts) =>
          opts.map((o) => ({
            value: (o as HTMLOptionElement).value,
            text: o.textContent?.trim() ?? "",
          }))
        );

        const match = options.find((o) =>
          o.text.includes(period)
        );

        if (match) {
          await page.selectOption(sel, match.value);
          await page.waitForTimeout(2000);
        }
      }
    }
  );

  return parseGradeRows(rows, period);
}
