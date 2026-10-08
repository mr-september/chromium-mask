import assert from "node:assert/strict";
import { test } from "node:test";
import { fakeStorage, loadScript } from "./helpers.js";

const OPERA_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36 OPR/120.0.0.0";

function load(storage = fakeStorage(), fetchImpl = async () => ({ ok: false, status: 500 })) {
  const context = loadScript(
    "ua-profile.js",
    {
      self: { navigator: { userAgent: OPERA_UA } },
      chrome: { storage: { local: storage } },
      fetch: fetchImpl,
      AbortSignal,
    },
    ["createProfile", "createHeaderOperations", "resolvePlatformKey", "buildBrands", "ChromeVersion"],
  );
  return context.__exports;
}

const headerMap = (operations) => Object.fromEntries(operations.map((o) => [o.header, o.value]));

test("GREASE brand matches the lists real Chrome versions send", () => {
  const { buildBrands } = load();
  const format = (major) =>
    buildBrands(major, false)
      .map((b) => `${b.brand};${b.version}`)
      .join("|");
  assert.equal(format(120), "Not_A Brand;8|Chromium;120|Google Chrome;120");
  assert.equal(format(131), "Google Chrome;131|Chromium;131|Not_A Brand;24");
  assert.equal(format(138), "Not)A;Brand;8|Chromium;138|Google Chrome;138");
  // Observed in the wild: Opera 136 (Chromium 152) and Edge 154.
  assert.equal(format(152), "Chromium;152|Not?A_Brand;24|Google Chrome;152");
  assert.equal(format(154), "Chromium;154|Google Chrome;154|Not A(Brand;99");
});

test("profile UA, headers and navigator values describe the same browser", () => {
  const { createProfile, createHeaderOperations } = load();
  const profile = createProfile("mac", 155);
  const headers = headerMap(createHeaderOperations(profile));

  assert.match(profile.userAgent, /Macintosh.*Chrome\/155\.0\.0\.0 Safari/);
  assert.equal(headers["User-Agent"], profile.userAgent);
  assert.equal(profile.appVersion, profile.userAgent.replace("Mozilla/", ""));
  assert.equal(profile.navigatorPlatform, "MacIntel");
  assert.equal(headers["sec-ch-ua-platform"], '"macOS"');
  assert.equal(headers["sec-ch-ua-mobile"], "?0");
  assert.ok(headers["sec-ch-ua"].includes('"Google Chrome";v="155"'));
  assert.ok(headers["sec-ch-ua-full-version-list"].includes('"Google Chrome";v="155.0.0.0"'));
  assert.equal(headers["sec-fetch-user"], undefined);
});

test("android profile is mobile everywhere", () => {
  const { createProfile, createHeaderOperations } = load();
  const profile = createProfile("android", 155);
  const headers = headerMap(createHeaderOperations(profile));
  assert.match(profile.userAgent, /Mobile Safari/);
  assert.equal(headers["sec-ch-ua-mobile"], "?1");
  assert.equal(headers["sec-ch-ua-platform"], '"Android"');
});

test("Linux is presented as Windows only when the site asks for it", () => {
  const { resolvePlatformKey } = load();
  assert.equal(resolvePlatformKey("linux", true), "win");
  assert.equal(resolvePlatformKey("linux", false), "linux");
  assert.equal(resolvePlatformKey("mac", true), "mac");
  assert.equal(resolvePlatformKey("cros", false), "win");
});

test("Chrome version never falls below the host engine and ignores garbage", async () => {
  const storage = fakeStorage();
  const { ChromeVersion } = load(storage);
  assert.equal(await ChromeVersion.getMajor(), 157);

  storage.data.remoteStorageVersionNumber = { version: "200", updatedAt: 1 };
  assert.equal(await ChromeVersion.getMajor(), 200);

  storage.data.remoteStorageVersionNumber = { version: "<html>" };
  assert.equal(await ChromeVersion.getMajor(), 157);
});

test("remote version is validated, throttled after an attempt, and reports changes", async () => {
  const storage = fakeStorage();
  let body = "158\n";
  let calls = 0;
  const { ChromeVersion } = load(storage, async () => {
    calls++;
    return { ok: true, text: async () => body };
  });

  assert.equal(await ChromeVersion.refresh(), true);
  assert.equal(storage.data.remoteStorageVersionNumber.version, "158");

  // Fresh data: no network.
  assert.equal(await ChromeVersion.refresh(), false);
  assert.equal(calls, 1);

  // Stale data but malformed answer: keep the old version.
  storage.data.remoteStorageVersionNumber.updatedAt = Date.now() - 2 * 24 * 60 * 60 * 1000;
  storage.data.remoteStorageVersionNumber.attemptedAt = 0;
  body = "null";
  assert.equal(await ChromeVersion.refresh(), false);
  assert.equal(storage.data.remoteStorageVersionNumber.version, "158");

  // The failed attempt is remembered, so the endpoint is not retried immediately.
  assert.equal(await ChromeVersion.refresh(), false);
  assert.equal(calls, 2);
});
