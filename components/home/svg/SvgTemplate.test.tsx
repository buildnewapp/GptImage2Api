import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const projectRoot = process.cwd();

test("keeps SvgTemplate server rendering and browser interactions isolated", () => {
  const templateSource = readFileSync(
    path.join(projectRoot, "components/home/svg/SvgTemplate.tsx"),
    "utf8",
  );
  const clientPath = path.join(
    projectRoot,
    "components/home/svg/SvgTemplateClient.tsx",
  );
  const homePageSource = readFileSync(
    path.join(projectRoot, "app/[locale]/(basic-layout)/page.tsx"),
    "utf8",
  );

  assert.doesNotMatch(templateSource, /^\s*["']use client["'];/m);
  assert.doesNotMatch(templateSource, /useTranslations/);
  assert.doesNotMatch(templateSource, /\b(?:useEffect|useRef|useState)\b/);
  assert.doesNotMatch(templateSource, /\bwindow\./);
  assert.match(templateSource, /async function SvgTemplate/);
  assert.match(templateSource, /locale:\s*string/);
  assert.match(
    templateSource,
    /getTranslations\(\{[\s\S]*locale,[\s\S]*namespace:\s*"SvgTemplate"[\s\S]*\}\)/,
  );
  assert.match(templateSource, /SvgTemplateClient/);
  assert.match(templateSource, /<SvgHeroPreview/);
  assert.match(templateSource, /<CompareSlider/);
  assert.equal(existsSync(clientPath), true);

  const clientSource = readFileSync(clientPath, "utf8");
  assert.match(clientSource, /^\s*["']use client["'];/m);
  assert.match(clientSource, /export function CompareSlider/);
  assert.match(clientSource, /export function SvgHeroPreview/);
  assert.match(clientSource, /\buseState\b/);
  assert.match(clientSource, /\bwindow\.matchMedia\b/);
  assert.match(homePageSource, /return <SvgTemplate locale=\{locale\} \/>/);
});
