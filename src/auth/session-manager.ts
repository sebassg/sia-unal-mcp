import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { URLS, ADF_SELECTORS, PLAYWRIGHT_HEADLESS } from "../config/constants.js";
import type { SessionState } from "../types/sia.js";

const SESSION_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes

let browser: Browser | null = null;
let context: BrowserContext | null = null;
let sessionState: SessionState = { isAuthenticated: false };

async function ensureBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({ headless: PLAYWRIGHT_HEADLESS });
  }
  return browser;
}

export function getSessionState(): SessionState {
  if (
    sessionState.isAuthenticated &&
    sessionState.expiresAt &&
    Date.now() > sessionState.expiresAt.getTime()
  ) {
    sessionState = { isAuthenticated: false };
  }
  return { ...sessionState };
}

export async function authenticate(
  username: string,
  password: string
): Promise<SessionState> {
  const b = await ensureBrowser();

  // Create fresh context for new session
  if (context) {
    await context.close().catch(() => {});
  }
  context = await b.newContext();

  const page = await context.newPage();

  try {
    // Navigate to portal - it will redirect to OAM login
    await page.goto(URLS.portal(), {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    // Wait for login form
    const sel = ADF_SELECTORS.login;
    await page.waitForSelector(sel.usernameInput, { timeout: 15000 });

    // Fill credentials
    await page.fill(sel.usernameInput, username);
    await page.fill(sel.passwordInput, password);

    // Submit
    await page.click(sel.submitButton);

    // Wait for redirect back to portal (successful login)
    await page.waitForURL(/ServiciosApp/i, { timeout: 20000 });

    // Clear sensitive data from memory
    const expiresAt = new Date(Date.now() + SESSION_TIMEOUT_MS);

    sessionState = {
      isAuthenticated: true,
      username,
      expiresAt,
    };

    return getSessionState();
  } catch (error) {
    sessionState = { isAuthenticated: false };

    // Check if it's a credential error
    const errorText = await page
      .textContent(".alert-error, .kc-feedback-text, #kc-error-message")
      .catch(() => null);

    if (errorText) {
      throw new Error(`Autenticación fallida: ${errorText.trim()}`);
    }

    throw new Error(
      `Error de autenticación: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    await page.close();
  }
}

export async function getAuthenticatedPage(): Promise<Page> {
  const state = getSessionState();
  if (!state.isAuthenticated || !context) {
    throw new Error(
      "No hay sesión activa. Usa el tool 'authenticate' primero."
    );
  }

  return context.newPage();
}

export async function destroySession(): Promise<void> {
  if (context) {
    await context.close().catch(() => {});
    context = null;
  }
  sessionState = { isAuthenticated: false };
}

export async function closeAll(): Promise<void> {
  await destroySession();
  if (browser) {
    await browser.close().catch(() => {});
    browser = null;
  }
}
