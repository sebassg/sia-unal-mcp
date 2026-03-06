import * as cheerio from "cheerio";

export interface TableRow {
  [column: string]: string;
}

/**
 * Parse an ADF-rendered HTML table into structured rows.
 *
 * Oracle ADF tables use a split structure:
 *   - Column headers live in a separate <table class="af_column_column-header-table">
 *   - Data rows live in <table class="af_table_data-table"> inside the ::db div
 *
 * Falls back to standard <thead>/<tbody> parsing when the ADF classes are absent.
 */
export function parseAdfTable(html: string, tableSelector?: string): TableRow[] {
  const $ = cheerio.load(html);

  const headerTable = $(".af_column_column-header-table");
  const dataTable = $(".af_table_data-table");

  if (headerTable.length && dataTable.length) {
    // ADF-specific path: headers are in the last <tr> of the header table
    const headers: string[] = [];
    headerTable.find("tr").last().find("th").each((_, th) => {
      const label = $(th).find(".af_column_label-text").text().trim();
      headers.push(label || $(th).text().trim());
    });

    const rows: TableRow[] = [];
    dataTable.find("tr[role='row']").each((_, row) => {
      const cells: string[] = [];
      $(row).find("td").each((_, td) => {
        cells.push($(td).text().trim());
      });
      if (cells.length > 0 && cells.some((c) => c !== "")) {
        const rowObj: TableRow = {};
        cells.forEach((cell, i) => {
          rowObj[headers[i] ?? `col_${i}`] = cell;
        });
        rows.push(rowObj);
      }
    });
    return rows;
  }

  // Fallback: standard HTML table
  const table = tableSelector ? $(tableSelector) : $("table").first();
  if (!table.length) return [];

  const headers: string[] = [];
  table.find("thead th, thead td, tr:first-child th").each((_, el) => {
    headers.push($(el).text().trim());
  });
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
    $(row).find("td").each((_, cell) => {
      cells.push($(cell).text().trim());
    });
    if (cells.length > 0 && cells.some((c) => c !== "")) {
      const rowObj: TableRow = {};
      cells.forEach((cell, i) => {
        rowObj[headers[i] ?? `col_${i}`] = cell;
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
