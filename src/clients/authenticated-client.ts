import type { Page } from "playwright";
import { getAuthenticatedPage } from "../auth/session-manager.js";
import { globalRateLimiter } from "../utils/rate-limiter.js";
import { parseAdfTable, type TableRow } from "../parsers/adf-table-parser.js";

/**
 * Navigate to an authenticated SIA page and extract table data.
 */
export async function fetchAuthenticatedTable(
  url: string,
  tableSelector: string,
  setupFn?: (page: Page) => Promise<void>
): Promise<TableRow[]> {
  await globalRateLimiter.wait();

  const page = await getAuthenticatedPage();

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

    // Run optional setup (like selecting a period)
    if (setupFn) {
      await setupFn(page);
      await page.waitForTimeout(2000);
    }

    // Wait for table to appear
    await page.waitForSelector(tableSelector, { timeout: 15000 }).catch(() => {
      // Table might not exist if no data
    });

    const tableHtml = await page.evaluate((sel) => {
      const table = document.querySelector(sel);
      return table ? table.outerHTML : "";
    }, tableSelector);

    if (!tableHtml) return [];

    return parseAdfTable(tableHtml);
  } finally {
    await page.close();
  }
}

/**
 * Navigate to an authenticated page and extract text from a selector.
 */
export async function fetchAuthenticatedText(
  url: string,
  selector: string
): Promise<string> {
  await globalRateLimiter.wait();

  const page = await getAuthenticatedPage();

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

    await page.waitForSelector(selector, { timeout: 15000 }).catch(() => {});

    const text = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return el ? el.textContent?.trim() ?? "" : "";
    }, selector);

    return text;
  } finally {
    await page.close();
  }
}

/**
 * Navigate to an authenticated page and extract all page content as HTML.
 */
export async function fetchAuthenticatedPageContent(
  url: string,
  contentSelector: string
): Promise<string> {
  await globalRateLimiter.wait();

  const page = await getAuthenticatedPage();

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

    await page
      .waitForSelector(contentSelector, { timeout: 15000 })
      .catch(() => {});

    const html = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return el ? el.innerHTML : "";
    }, contentSelector);

    return html;
  } finally {
    await page.close();
  }
}
