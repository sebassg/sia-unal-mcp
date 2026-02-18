import { chromium, type Browser, type Page } from "playwright";
import { URLS, ADF_SELECTORS, PLAYWRIGHT_HEADLESS, getSede, SEDE_CODES } from "../config/constants.js";
import { globalRateLimiter } from "../utils/rate-limiter.js";
import { withRetry } from "../utils/retry.js";
import { parseAdfTable, type TableRow } from "../parsers/adf-table-parser.js";

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({ headless: PLAYWRIGHT_HEADLESS });
  }
  return browser;
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

export async function browseCatalog(
  level: string,
  faculty?: string,
  program?: string
): Promise<TableRow[]> {
  await globalRateLimiter.wait();

  const b = await getBrowser();
  const page = await b.newPage();

  try {
    await page.goto(URLS.catalog(), { waitUntil: "networkidle", timeout: 30000 });

    // Select level
    const sel = ADF_SELECTORS.catalog;
    await page.waitForSelector(sel.level, { timeout: 10000 });
    await selectDropdownOption(page, sel.level, level === "posgrado" ? "Posgrado" : "Pregrado");

    // Wait for ADF partial page refresh
    await page.waitForTimeout(2000);

    // Select faculty if provided
    if (faculty) {
      await page.waitForSelector(sel.faculty, { timeout: 10000 });
      await selectDropdownByLabel(page, sel.faculty, faculty);
      await page.waitForTimeout(2000);
    }

    // Select program if provided
    if (program) {
      await page.waitForSelector(sel.program, { timeout: 10000 });
      await selectDropdownByLabel(page, sel.program, program);
      await page.waitForTimeout(2000);
    }

    // Click search
    await page.click(sel.searchButton);
    await page.waitForTimeout(3000);

    // Extract results table
    const tableHtml = await page.evaluate((tableSelector) => {
      const table = document.querySelector(tableSelector);
      return table ? table.outerHTML : "";
    }, sel.resultsTable);

    if (!tableHtml) return [];

    return parseAdfTable(tableHtml);
  } finally {
    await page.close();
  }
}

export async function getCourseDetails(courseCode: string): Promise<TableRow[]> {
  await globalRateLimiter.wait();

  const b = await getBrowser();
  const page = await b.newPage();

  try {
    await page.goto(URLS.catalog(), { waitUntil: "networkidle", timeout: 30000 });

    // Search by course code in the catalog
    const sel = ADF_SELECTORS.catalog;
    await page.waitForSelector(sel.level, { timeout: 10000 });

    // Type course code in search field if available
    const searchInput = await page.$('input[id*="it1"]');
    if (searchInput) {
      await searchInput.fill(courseCode);
      await page.click(sel.searchButton);
      await page.waitForTimeout(3000);
    }

    const tableHtml = await page.evaluate((tableSelector) => {
      const table = document.querySelector(tableSelector);
      return table ? table.outerHTML : "";
    }, sel.resultsTable);

    if (!tableHtml) return [];

    return parseAdfTable(tableHtml);
  } finally {
    await page.close();
  }
}

export async function searchByName(
  query: string,
  level: string,
  typology: string = ""
): Promise<TableRow[]> {
  await globalRateLimiter.wait();

  const b = await getBrowser();
  const page = await b.newPage();

  try {
    await page.goto(URLS.catalogSearch(), { waitUntil: "networkidle", timeout: 30000 });

    const sel = ADF_SELECTORS.catalog;
    await page.waitForSelector(sel.level, { timeout: 10000 });

    // Select level
    await selectDropdownOption(page, sel.level, level === "posgrado" ? "Posgrado" : "Pregrado");
    await page.waitForTimeout(1500);

    // Select sede from env
    const sedeCode = SEDE_CODES[getSede()] ?? SEDE_CODES["medellin"];
    await page.selectOption(sel.sede, sedeCode).catch(() => {});
    await page.waitForTimeout(1500);

    // Typology (optional)
    if (typology) {
      await page.selectOption(sel.typology, { label: typology }).catch(() => {});
    }

    // Course name input — try specific selector, fallback to generic
    const nameInput =
      (await page.$(sel.nameInput)) ?? (await page.$('input[id*="it1"]'));
    if (nameInput) {
      await nameInput.fill(query);
    }

    // Execute search
    await page.click(sel.searchButton);
    await page.waitForTimeout(3000);

    const tableHtml = await page.evaluate((tableSelector) => {
      const table = document.querySelector(tableSelector);
      return table ? table.outerHTML : "";
    }, sel.resultsTable);

    if (!tableHtml) return [];
    return parseAdfTable(tableHtml);
  } finally {
    await page.close();
  }
}

async function selectDropdownOption(
  page: Page,
  selector: string,
  value: string
): Promise<void> {
  await page.selectOption(selector, { label: value }).catch(async () => {
    // Fallback: try by visible text matching
    const options = await page.$$eval(`${selector} option`, (opts) =>
      opts.map((o) => ({ value: (o as HTMLOptionElement).value, text: o.textContent?.trim() ?? "" }))
    );
    const match = options.find(
      (o) => o.text.toLowerCase().includes(value.toLowerCase())
    );
    if (match) {
      await page.selectOption(selector, match.value);
    }
  });
}

async function selectDropdownByLabel(
  page: Page,
  selector: string,
  label: string
): Promise<void> {
  const options = await page.$$eval(`${selector} option`, (opts) =>
    opts.map((o) => ({ value: (o as HTMLOptionElement).value, text: o.textContent?.trim() ?? "" }))
  );

  const match = options.find(
    (o) => o.text.toLowerCase().includes(label.toLowerCase())
  );

  if (match) {
    await page.selectOption(selector, match.value);
  } else {
    throw new Error(
      `Option "${label}" not found. Available: ${options.map((o) => o.text).join(", ")}`
    );
  }
}
