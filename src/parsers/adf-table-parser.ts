import * as cheerio from "cheerio";

export interface TableRow {
  [column: string]: string;
}

/**
 * Parse an ADF-rendered HTML table into structured rows.
 * ADF tables use specific class patterns for cells.
 */
export function parseAdfTable(html: string, tableSelector?: string): TableRow[] {
  const $ = cheerio.load(html);
  const table = tableSelector ? $(tableSelector) : $("table").first();

  if (!table.length) return [];

  const headers: string[] = [];
  table.find("thead th, thead td, tr:first-child th").each((_, el) => {
    headers.push($(el).text().trim());
  });

  // If no headers found in thead, try first row
  if (headers.length === 0) {
    table.find("tr:first-child td").each((_, el) => {
      headers.push($(el).text().trim());
    });
  }

  const rows: TableRow[] = [];
  const dataRows = headers.length > 0
    ? table.find("tbody tr, tr:not(:first-child)")
    : table.find("tr");

  dataRows.each((_, row) => {
    const cells: string[] = [];
    $(row)
      .find("td")
      .each((_, cell) => {
        cells.push($(cell).text().trim());
      });

    if (cells.length > 0 && cells.some((c) => c !== "")) {
      const rowObj: TableRow = {};
      cells.forEach((cell, i) => {
        const key = headers[i] || `col_${i}`;
        rowObj[key] = cell;
      });
      rows.push(rowObj);
    }
  });

  return rows;
}

/**
 * Extract text content from all matching elements.
 */
export function extractTextList(html: string, selector: string): string[] {
  const $ = cheerio.load(html);
  const results: string[] = [];
  $(selector).each((_, el) => {
    const text = $(el).text().trim();
    if (text) results.push(text);
  });
  return results;
}
