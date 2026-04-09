import { expect, test, devices, type BrowserContext, type Page } from "@playwright/test";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:9002";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const MEMBER_A_EMAIL = process.env.E2E_MEMBER_A_EMAIL;
const MEMBER_A_PASSWORD = process.env.E2E_MEMBER_A_PASSWORD;
const MEMBER_B_EMAIL = process.env.E2E_MEMBER_B_EMAIL;
const MEMBER_B_PASSWORD = process.env.E2E_MEMBER_B_PASSWORD;

function buildTodayGuestProgress() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  const dayKey = `${year}-${month}-${day}`;

  return {
    key: "tct.today.ritual-progress.v1:guest",
    payload: JSON.stringify({
      sessionScope: "guest",
      dayKey,
      reflectionText: "Hari ini aku memilih berjalan dalam damai.",
      isReflectDone: true,
      isPrayerCompleted: true,
    }),
  };
}

async function seedGuestCompletedRenungan(page: Page) {
  const seeded = buildTodayGuestProgress();
  await page.addInitScript(({ key, payload }) => {
    window.localStorage.setItem(key, payload);
    window.sessionStorage.removeItem("tct:versehub:auto-open");
  }, seeded);
}

async function loginWithPassword(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/renungan|\/today/, { timeout: 20000 });
}

async function logoutAndClear(page: Page, context: BrowserContext) {
  await page.goto("/profile");
  const logoutButton = page.getByRole("button", { name: /log out/i }).first();
  if (await logoutButton.count()) {
    await logoutButton.click();
  }
  await context.clearCookies();
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
}

async function readSessionUserId(page: Page): Promise<string | null> {
  const response = await page.request.get("/api/auth/session", { failOnStatusCode: false });
  if (!response.ok()) return null;
  const payload = (await response.json()) as {
    authenticated?: boolean;
    user?: { id?: string } | null;
  };
  if (!payload?.authenticated) return null;
  return String(payload?.user?.id || "").trim() || null;
}

test.describe("Renungan -> VerseHub CTA", () => {
  test("opens /versehub/id directly without explore popup on desktop", async ({ page }) => {
    await seedGuestCompletedRenungan(page);
    await page.goto("/renungan");
    await expect(page.getByTestId("today-screen")).toHaveAttribute("aria-busy", "false");

    await page.getByRole("button", { name: /Lanjut ke Versehub/i }).click();
    await expect(page).toHaveURL(/\/versehub\/id$/);
    await expect(page.getByText(/Masuk ke firman tanpa kehilangan rasa heningnya/i)).toHaveCount(0);
  });

  test("opens /versehub/id directly without explore popup on mobile", async ({ browser }) => {
    const context = await browser.newContext({
      ...devices["iPhone 13"],
      baseURL: BASE_URL,
    });
    const page = await context.newPage();

    await seedGuestCompletedRenungan(page);
    await page.goto("/renungan");
    await expect(page.getByTestId("today-screen")).toHaveAttribute("aria-busy", "false");

    await page.getByRole("button", { name: /Lanjut ke Versehub/i }).click();
    await expect(page).toHaveURL(/\/versehub\/id$/);
    await expect(page.getByText(/Masuk ke firman tanpa kehilangan rasa heningnya/i)).toHaveCount(0);

    await context.close();
  });
});

test.describe("Auth + Privacy Acceptance Flow", () => {
  test("admin -> logout -> member switch keeps active identity consistent across viewport surfaces", async ({ page, context }) => {
    test.skip(
      !ADMIN_EMAIL || !ADMIN_PASSWORD || !MEMBER_A_EMAIL || !MEMBER_A_PASSWORD,
      "Set E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD and E2E_MEMBER_A_EMAIL/E2E_MEMBER_A_PASSWORD."
    );

    await loginWithPassword(page, ADMIN_EMAIL!, ADMIN_PASSWORD!);
    const adminUserId = await readSessionUserId(page);
    expect(adminUserId).toBeTruthy();

    await logoutAndClear(page, context);

    await loginWithPassword(page, MEMBER_A_EMAIL!, MEMBER_A_PASSWORD!);
    const memberUserIdDesktop = await readSessionUserId(page);
    expect(memberUserIdDesktop).toBeTruthy();
    expect(memberUserIdDesktop).not.toBe(adminUserId);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/community");
    const memberUserIdMobileSurface = await readSessionUserId(page);
    expect(memberUserIdMobileSurface).toBe(memberUserIdDesktop);
  });

  test("private renungan bookmark remains owner-only (A visible, B hidden)", async ({ page, context }) => {
    test.skip(
      !MEMBER_A_EMAIL || !MEMBER_A_PASSWORD || !MEMBER_B_EMAIL || !MEMBER_B_PASSWORD,
      "Set E2E_MEMBER_A_EMAIL/E2E_MEMBER_A_PASSWORD and E2E_MEMBER_B_EMAIL/E2E_MEMBER_B_PASSWORD."
    );

    await loginWithPassword(page, MEMBER_A_EMAIL!, MEMBER_A_PASSWORD!);

    const unique = `E2E private renungan ${Date.now()}`;
    const createResponse = await page.request.post("/api/community/posts", {
      failOnStatusCode: false,
      data: {
        text: `Renungan Pribadiku\n\n${unique}`,
        type: "reflection",
        metadata: {
          bookmark_origin: "renungan",
          visibility: "private_renungan_archive",
        },
      },
    });
    expect(createResponse.ok()).toBeTruthy();
    const createdPayload = (await createResponse.json()) as { data?: { post?: { id?: string } } };
    const privatePostId = String(createdPayload?.data?.post?.id || "");
    expect(privatePostId).not.toBe("");

    const bookmarkResponse = await page.request.post(`/api/community/posts/${privatePostId}/bookmark`, {
      failOnStatusCode: false,
    });
    expect(bookmarkResponse.ok()).toBeTruthy();

    const bookmarksAResponse = await page.request.get("/api/community/bookmarks", { failOnStatusCode: false });
    expect(bookmarksAResponse.ok()).toBeTruthy();
    const bookmarksAJson = (await bookmarksAResponse.json()) as { data?: { bookmarks?: Array<{ id?: string }> } };
    const bookmarkIdsA = (bookmarksAJson?.data?.bookmarks ?? []).map((item) => String(item.id || ""));
    expect(bookmarkIdsA).toContain(privatePostId);

    const feedAResponse = await page.request.get("/api/community/posts", { failOnStatusCode: false });
    expect(feedAResponse.ok()).toBeTruthy();
    const feedAJson = (await feedAResponse.json()) as {
      data?: { posts?: Array<{ id?: string }>; archivePosts?: Array<{ id?: string }> };
    };
    const feedIdsA = (feedAJson?.data?.posts ?? []).map((item) => String(item.id || ""));
    const archiveIdsA = (feedAJson?.data?.archivePosts ?? []).map((item) => String(item.id || ""));
    expect(feedIdsA).not.toContain(privatePostId);
    expect(archiveIdsA).not.toContain(privatePostId);

    await logoutAndClear(page, context);
    await loginWithPassword(page, MEMBER_B_EMAIL!, MEMBER_B_PASSWORD!);

    const bookmarksBResponse = await page.request.get("/api/community/bookmarks", { failOnStatusCode: false });
    expect(bookmarksBResponse.ok()).toBeTruthy();
    const bookmarksBJson = (await bookmarksBResponse.json()) as { data?: { bookmarks?: Array<{ id?: string }> } };
    const bookmarkIdsB = (bookmarksBJson?.data?.bookmarks ?? []).map((item) => String(item.id || ""));
    expect(bookmarkIdsB).not.toContain(privatePostId);

    const feedBResponse = await page.request.get("/api/community/posts", { failOnStatusCode: false });
    expect(feedBResponse.ok()).toBeTruthy();
    const feedBJson = (await feedBResponse.json()) as {
      data?: { posts?: Array<{ id?: string }>; archivePosts?: Array<{ id?: string }> };
    };
    const feedIdsB = (feedBJson?.data?.posts ?? []).map((item) => String(item.id || ""));
    const archiveIdsB = (feedBJson?.data?.archivePosts ?? []).map((item) => String(item.id || ""));
    expect(feedIdsB).not.toContain(privatePostId);
    expect(archiveIdsB).not.toContain(privatePostId);
  });
});
