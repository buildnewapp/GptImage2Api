import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const projectRoot = process.cwd();

test("wires the homepage to a standalone ImageTemplate with dedicated translations", () => {
  const componentPath = path.join(
    projectRoot,
    "components/home/image/ImageTemplate.tsx"
  );
  const homePagePath = path.join(
    projectRoot,
    "app/[locale]/(basic-layout)/page.tsx"
  );
  const requestPath = path.join(projectRoot, "i18n/request.ts");
  const localeFiles = [
    "i18n/messages/en/ImageTemplate.json",
    "i18n/messages/zh/ImageTemplate.json",
    "i18n/messages/ja/ImageTemplate.json",
  ];

  assert.equal(existsSync(componentPath), true);
  assert.equal(existsSync(homePagePath), true);
  for (const relativePath of localeFiles) {
    assert.equal(
      existsSync(path.join(projectRoot, relativePath)),
      true,
      `Expected ${relativePath} to exist`
    );
  }

  const componentSource = readFileSync(componentPath, "utf8");
  const homePageSource = readFileSync(homePagePath, "utf8");
  const requestSource = readFileSync(requestPath, "utf8");

  assert.match(componentSource, /getTranslations/);
  assert.match(componentSource, /getTranslations\("ImageTemplate"\)/);
  assert.doesNotMatch(componentSource, /@\/components\/home\/video\/VideoTemplate/);
  assert.match(homePageSource, /@\/components\/home\/image\/ImageTemplate/);
  assert.match(homePageSource, /return <ImageTemplate \/>/);
  assert.doesNotMatch(homePageSource, /import VideoTemplate from/);
  assert.match(requestSource, /ImageTemplate:\s*\(await import\(`\.\/messages\/\$\{locale\}\/ImageTemplate\.json`\)\)\.default/);
});
