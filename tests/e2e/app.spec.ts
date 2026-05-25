import { expect, test, type Page } from "@playwright/test";
import { extractNalcoPage } from "@/lib/ingestion/adapters";

const ignoredConsoleFragments = ["Download the React DevTools"];

test("NALCO page extraction captures canonical URL, date and full body", () => {
  const doc = extractNalcoPage(
    `
      <html>
        <head>
          <link rel="canonical" href="https://nalcoindia.com/news-room/press-release/example/" />
          <meta property="article:published_time" content="2026-05-21T10:30:00+05:30" />
          <title>NALCO announces production milestone | NALCO</title>
        </head>
        <body>
          <article>
            <h1>NALCO announces production milestone</h1>
            <p>National Aluminium Company Limited announced a production milestone at its aluminium smelter.</p>
            <p>The update includes operational context, production performance, Odisha assets, aluminium output and investor-relevant details for market intelligence users.</p>
          </article>
        </body>
      </html>
    `,
    "https://nalcoindia.com/news-room/press-release/example/?utm=test"
  );

  expect(doc.url).toBe("https://nalcoindia.com/news-room/press-release/example/");
  expect(doc.title).toBe("NALCO announces production milestone");
  expect(doc.sourceType).toBe("press_release");
  expect(doc.publishedAt).toBe("2026-05-21T05:00:00.000Z");
  expect(doc.rawText).toContain("operational context");
});

test("NALCO extraction handles missing dates without inventing one", () => {
  const doc = extractNalcoPage(
    "<html><body><main><h1>Investor Services</h1><p>Shareholder services and investor information for NALCO with enough page body content to be indexed as official evidence.</p></main></body></html>",
    "https://nalcoindia.com/investor-services/"
  );

  expect(doc.publishedAt).toBeNull();
  expect(doc.sourceType).toBe("investor_announcement");
  expect(doc.rawText).toContain("Shareholder services");
});

test("NALCO extraction filters utility pages and cleans PDF metadata", async ({ request }) => {
  const utility = await request.get("/api/search?q=Latest%20NALCO%20News");
  expect(utility.ok()).toBeTruthy();
  const search = await utility.json();
  const titles = search.results.map((item: { doc: { title: string; url: string } }) => `${item.doc.title} ${item.doc.url}`).join("\n");
  expect(titles).not.toMatch(/Help|Privacy Policy|Legal Disclaimer|Vigilance/i);
  expect(titles).not.toMatch(/Size:\s*[\d.]+\s*(KB|MB),\s*Format:\s*PDF/i);
});

async function monitorPage(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error" && !ignoredConsoleFragments.some((fragment) => message.text().includes(fragment))) {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    const status = response.status();
    const url = response.url();
    if (status >= 500 || (status === 404 && !url.includes("/favicon.ico"))) {
      failedRequests.push(`${status} ${url}`);
    }
  });

  return {
    assertClean() {
      expect(consoleErrors, "browser console errors").toEqual([]);
      expect(pageErrors, "uncaught page errors").toEqual([]);
      expect(failedRequests, "failed network responses").toEqual([]);
    }
  };
}

test("main routes render and connect via visible navigation", async ({ page }) => {
  const monitor = await monitorPage(page);

  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Real-Time NALCO Intelligence/i })).toBeVisible();
  await page.getByRole("link", { name: /Open Intelligence Dashboard/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("Aluminium Market Signals")).toBeVisible();

  await page.getByRole("link", { name: "Entity Explorer" }).click();
  await expect(page).toHaveURL(/\/entities$/);
  await expect(page.getByRole("heading", { name: "Network Map" })).toBeVisible();

  await page.getByRole("link", { name: "Demo" }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByRole("heading", { name: /Project Architecture/i })).toBeVisible();

  monitor.assertClean();
});

test("chatbot opens, answers suggested prompt, and renders citations", async ({ page }) => {
  const monitor = await monitorPage(page);

  await page.goto("/");
  await page.getByRole("button", { name: "Open NALCO assistant" }).click();
  await expect(page.getByText("NALCO Intelligence Assistant", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Aluminium Market" }).click();
  await expect(page.getByText(/Confidence/i)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("link", { name: /\[1\]/ })).toBeVisible({ timeout: 10_000 });

  await page.getByRole("button", { name: "Collapse chat" }).click();
  await expect(page.getByText("NALCO Intelligence Assistant", { exact: true })).not.toBeVisible();
  monitor.assertClean();
});

test("mobile chatbot remains usable and within viewport", async ({ page }) => {
  const monitor = await monitorPage(page);
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/");
  await page.getByRole("button", { name: "Open NALCO assistant" }).click();
  await expect(page.getByText("NALCO Intelligence Assistant", { exact: true })).toBeVisible();
  await page.getByPlaceholder("Ask about NALCO...").fill("unsupported query about a private contract");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(/could not verify|Based on the retrieved sources/i)).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "mobile chatbot horizontal overflow").toBeLessThanOrEqual(32);
  monitor.assertClean();
});

test("search form and linked dashboard controls return evidence", async ({ page }) => {
  const monitor = await monitorPage(page);

  await page.goto("/dashboard");
  await page.getByRole("link", { name: "1M" }).click();
  await expect(page).toHaveURL(/\/search\?q=/);
  await expect(page.getByText(/retrieval score/i)).toHaveCount(5);

  await page.getByPlaceholder("Enter query to search evidence base...").fill("policy aluminium");
  await page.getByRole("button", { name: /Search/i }).click();
  await expect(page).toHaveURL(/q=policy\+aluminium|q=policy%20aluminium/);
  await expect(page.getByText(/retrieval score/i).first()).toBeVisible();

  monitor.assertClean();
});

test("source library and detail pages handle valid and invalid documents", async ({ page }) => {
  const monitor = await monitorPage(page);

  await page.goto("/sources");
  await expect(page.getByRole("heading", { name: "Source Library" })).toBeVisible();
  await page.getByRole("link", { name: /NALCO board recommends/i }).click();
  await expect(page.getByRole("heading", { name: /NALCO board recommends/i })).toBeVisible();
  await expect(page.getByText("Verified Summary")).toBeVisible();
  await expect(page.getByText("Detected Entities")).toBeVisible();

  await page.goto("/sources/not-a-real-id");
  await expect(page.getByText("Source not found")).toBeVisible();

  monitor.assertClean();
});

test("data sources status page shows integrations and run control", async ({ page }) => {
  const monitor = await monitorPage(page);

  await page.goto("/sources/status");
  await expect(page.getByRole("heading", { name: "Data Sources" })).toBeVisible();
  await expect(page.getByText("Google Sheets", { exact: true })).toBeVisible();
  await expect(page.getByText("Ollama Cloud", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Run ingestion now/i })).toBeVisible();
  await expect(page.getByText(/NALCO Deep Website Crawl/i)).toBeVisible();

  monitor.assertClean();
});

test("demo sidebar can collapse and expand", async ({ page }) => {
  const monitor = await monitorPage(page);
  await page.setViewportSize({ width: 1117, height: 837 });

  await page.goto("/demo");
  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await expect(page.getByRole("button", { name: "Expand sidebar" })).toBeVisible();
  await expect(page.locator("nav")).toHaveClass(/-translate-x-full/);
  await expect(page.locator("main")).toHaveClass(/md:ml-0/);

  await page.getByRole("button", { name: "Expand sidebar" }).click();
  await expect(page.locator("nav")).not.toHaveClass(/-translate-x-full/);
  await expect(page.locator("main")).toHaveClass(/md:ml-\[280px\]/);

  monitor.assertClean();
});

test("api routes return expected JSON and validation errors", async ({ request }) => {
  await expect((await request.get("/api/health")).ok()).toBeTruthy();
  await expect((await request.get("/api/documents?limit=2")).ok()).toBeTruthy();
  await expect((await request.get("/api/entities")).ok()).toBeTruthy();
  await expect((await request.get("/api/analytics/overview")).ok()).toBeTruthy();
  await expect((await request.get("/api/sources/status")).ok()).toBeTruthy();
  await expect((await request.get("/api/search?q=aluminium")).ok()).toBeTruthy();

  const chat = await request.post("/api/chat", { data: { question: "What aluminium news could affect NALCO?" } });
  expect(chat.ok()).toBeTruthy();
  const chatJson = await chat.json();
  expect(chatJson).toHaveProperty("citations");
  expect(["completed", "completed_with_warnings", "failed"]).toContain(chatJson.liveRefreshStatus);
  expect(typeof chatJson.liveFetchedAt).toBe("string");
  expect(typeof chatJson.liveFetchedCount).toBe("number");

  const recentChange = await request.post("/api/chat", { data: { question: "What changed in NALCO recently?" } });
  expect(recentChange.ok()).toBeTruthy();
  const recentChangeJson = await recentChange.json();
  expect(recentChangeJson.answer).not.toBe("I could not verify this from available sources.");
  expect(recentChangeJson.citations.length).toBeGreaterThan(0);

  const streamChat = await request.post("/api/chat/stream", { data: { question: "Risk Summary" } });
  expect(streamChat.ok()).toBeTruthy();
  const streamText = await streamChat.text();
  expect(streamText).toContain("event: status");
  expect(streamText).toContain("event: delta");
  expect(streamText).toContain("event: metadata");
  expect(streamText).toContain("event: done");

  const privateClaim = await request.post("/api/chat", { data: { question: "Tell me about a private undisclosed NALCO contract with Apple" } });
  expect(privateClaim.ok()).toBeTruthy();
  const privateJson = await privateClaim.json();
  expect(privateJson.answer).toContain("I cannot verify that claim from the available public evidence.");
  expect(privateJson.answer).toContain("verified public sources");
  expect(privateJson.confidence).toBe(0);
  expect(privateJson.citations).toEqual([]);

  const livePrice = await request.post("/api/chat", { data: { question: "What is the current live aluminium price today?" } });
  expect(livePrice.ok()).toBeTruthy();
  const livePriceJson = await livePrice.json();
  expect(livePriceJson.answer).toContain("I cannot verify a current live aluminium price from the available evidence.");
  expect(livePriceJson.answer).toContain("not connected to a live commodity price feed");
  expect(livePriceJson.confidence).toBe(0);
  expect(livePriceJson.citations).toEqual([]);

  for (const prompt of ["Latest NALCO News", "Recent Filings", "Aluminium Market", "Risk Summary", "Entity Map"]) {
    const promptChat = await request.post("/api/chat", { data: { question: prompt } });
    expect(promptChat.ok()).toBeTruthy();
    const body = await promptChat.json();
    expect(["completed", "completed_with_warnings", "failed"]).toContain(body.liveRefreshStatus);
    expect(typeof body.liveFetchedAt).toBe("string");
    expect(Array.isArray(body.liveRefreshErrors)).toBeTruthy();
    const citationText = (body.citations || []).map((citation: { title: string; url: string }) => `${citation.title} ${citation.url}`).join("\n");
    expect(citationText).not.toMatch(/Help|Privacy Policy|Legal Disclaimer|Vigilance/i);
    if (body.confidence === 0) {
      expect(body.confidence).toBe(0);
      expect(body.citations).toEqual([]);
    } else if (prompt === "Entity Map") {
      expect(body.entities.length).toBeGreaterThan(0);
    }
  }

  const badChat = await request.post("/api/chat", { data: { question: "" } });
  expect(badChat.status()).toBe(400);

  const missingDoc = await request.get("/api/documents/not-a-real-id");
  expect(missingDoc.status()).toBe(404);
});

for (const viewport of [
  { name: "desktop", width: 1440, height: 900 },
  { name: "laptop", width: 1280, height: 800 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 }
]) {
  test(`responsive smoke: ${viewport.name}`, async ({ page }) => {
    const monitor = await monitorPage(page);
    await page.setViewportSize(viewport);

    for (const route of ["/", "/dashboard", "/entities", "/demo", "/sources", "/search?q=NALCO"]) {
      await page.goto(route);
      await expect(page.locator("body")).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${route} horizontal overflow at ${viewport.name}`).toBeLessThanOrEqual(32);
    }

    monitor.assertClean();
  });
}
