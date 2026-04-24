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

test("stops loading template navigation copy from ImageTemplate and VideoTemplate messages", () => {
  const imageTemplatePath = path.join(
    projectRoot,
    "components/home/image/ImageTemplate.tsx"
  );
  const videoTemplatePath = path.join(
    projectRoot,
    "components/home/video/VideoTemplate.tsx"
  );
  const headerPath = path.join(
    projectRoot,
    "components/home/video/Header.tsx"
  );
  const headerShellPath = path.join(
    projectRoot,
    "components/home/video/HeaderShell.tsx"
  );
  const mobileMenuPath = path.join(
    projectRoot,
    "components/home/video/MobileMenu.tsx"
  );
  const localeFiles = [
    "i18n/messages/en/ImageTemplate.json",
    "i18n/messages/zh/ImageTemplate.json",
    "i18n/messages/ja/ImageTemplate.json",
    "i18n/messages/en/VideoTemplate.json",
    "i18n/messages/zh/VideoTemplate.json",
    "i18n/messages/ja/VideoTemplate.json",
  ];
  const commonFiles = [
    "i18n/messages/en/common.json",
    "i18n/messages/zh/common.json",
    "i18n/messages/ja/common.json",
  ];

  const imageTemplateSource = readFileSync(imageTemplatePath, "utf8");
  const videoTemplateSource = readFileSync(videoTemplatePath, "utf8");
  const headerSource = readFileSync(headerPath, "utf8");
  const headerShellSource = readFileSync(headerShellPath, "utf8");
  const mobileMenuSource = readFileSync(mobileMenuPath, "utf8");

  assert.doesNotMatch(imageTemplateSource, /t\.raw\("navigation"\)/);
  assert.doesNotMatch(videoTemplateSource, /t\.raw\("navigation"\)/);
  assert.doesNotMatch(headerSource, /navigation=/);
  assert.match(headerSource, /<HeaderShell/);
  assert.doesNotMatch(headerSource, /getTranslations\(/);
  assert.doesNotMatch(headerSource, /VideoTemplateNavigation/);
  assert.match(headerShellSource, /useTranslations\("Home"\)/);
  assert.match(headerShellSource, /t\("title"\)/);
  assert.match(headerShellSource, /t\("createVideo"\)/);
  assert.doesNotMatch(headerShellSource, /navigation:/);
  assert.doesNotMatch(headerShellSource, /navigation\./);
  assert.match(mobileMenuSource, /useTranslations\("Home"\)/);
  assert.match(mobileMenuSource, /tHome\("mobileMenuLabel"\)/);
  assert.match(mobileMenuSource, /tHome\("createVideo"\)/);
  assert.doesNotMatch(mobileMenuSource, /navigation:/);
  assert.doesNotMatch(mobileMenuSource, /navigation\./);

  for (const relativePath of localeFiles) {
    const messages = JSON.parse(
      readFileSync(path.join(projectRoot, relativePath), "utf8")
    ) as Record<string, unknown>;
    assert.equal("navigation" in messages, false, `${relativePath} should not include navigation`);
  }

  for (const relativePath of commonFiles) {
    const messages = JSON.parse(
      readFileSync(path.join(projectRoot, relativePath), "utf8")
    ) as {
      Home?: {
        title?: string;
        createVideo?: string;
        mobileMenuLabel?: string;
      };
    };

    assert.equal(typeof messages.Home?.title, "string", `${relativePath} should include Home.title`);
    assert.equal(typeof messages.Home?.createVideo, "string", `${relativePath} should include Home.createVideo`);
    assert.equal(typeof messages.Home?.mobileMenuLabel, "string", `${relativePath} should include Home.mobileMenuLabel`);
    assert.equal("brand" in (messages.Home || {}), false, `${relativePath} should not include Home.brand`);
  }
});
