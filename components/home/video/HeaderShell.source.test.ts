import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const projectRoot = process.cwd();

test("video header gates client session until after hydration", () => {
  const headerSource = readFileSync(
    path.join(projectRoot, "components/home/video/Header.tsx"),
    "utf8",
  );
  const headerShellSource = readFileSync(
    path.join(projectRoot, "components/home/video/HeaderShell.tsx"),
    "utf8",
  );

  assert.doesNotMatch(headerSource, /getSession/);
  assert.doesNotMatch(headerSource, /getUserBenefits/);
  assert.match(headerShellSource, /setHasHydrated\(true\)/);
  assert.match(
    headerShellSource,
    /hasHydrated\s*\?\s*\(\(session\?\.user \?\? null\) as User \| null\)\s*:\s*null/,
  );
  assert.match(headerShellSource, /fetch\("\/api\/auth\/user"/);
  assert.match(headerShellSource, /setClientCredits/);
});

test("video locale switcher uses an icon-only trigger", () => {
  const localeSwitcherSource = readFileSync(
    path.join(projectRoot, "components/home/video/LocaleSwitcher.tsx"),
    "utf8",
  );

  assert.doesNotMatch(localeSwitcherSource, /ChevronDown/);
  assert.doesNotMatch(localeSwitcherSource, /<span>\{LOCALE_NAMES\[locale\]\}<\/span>/);
  assert.match(localeSwitcherSource, /"h-10 w-10/);
});

test("video header combines credit balance with the free credits entry", () => {
  const headerShellSource = readFileSync(
    path.join(projectRoot, "components/home/video/HeaderShell.tsx"),
    "utf8",
  );
  const mobileMenuSource = readFileSync(
    path.join(projectRoot, "components/home/video/MobileMenu.tsx"),
    "utf8",
  );

  assert.match(headerShellSource, /href="\/dashboard\/tasks"/);
  assert.match(headerShellSource, /t\("earnCredits"\)/);
  assert.match(mobileMenuSource, /\/dashboard\/tasks/);
  assert.match(mobileMenuSource, /tHome\("earnCredits"\)/);
});
