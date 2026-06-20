export function normalizeContractSnippet(value) {
  return value.replace(/\s+/g, " ").trim();
}

export function includesContractSnippet(content, snippet) {
  return normalizeContractSnippet(content).includes(normalizeContractSnippet(snippet));
}

export function normalizeMarkdownHeading(value) {
  return normalizeContractSnippet(value.replace(/\s+#+\s*$/, ""));
}

export function getMarkdownHeadings(content) {
  return content.split(/\r?\n/).flatMap((line, index) => {
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line.trim());

    if (!match) {
      return [];
    }

    return [
      {
        depth: match[1].length,
        line: index + 1,
        text: normalizeMarkdownHeading(match[2]),
      },
    ];
  });
}

export function hasMarkdownHeading(content, expectedHeading) {
  const expected =
    typeof expectedHeading === "string"
      ? { text: expectedHeading }
      : { depth: expectedHeading.depth, text: expectedHeading.text };
  const expectedText = normalizeMarkdownHeading(expected.text);

  return getMarkdownHeadings(content).some((heading) => {
    return heading.text === expectedText && (expected.depth === undefined || heading.depth === expected.depth);
  });
}

export function missingMarkdownHeadings(content, expectedHeadings) {
  return expectedHeadings.filter((expectedHeading) => !hasMarkdownHeading(content, expectedHeading));
}

export function formatMarkdownHeadingExpectation(expectedHeading) {
  if (typeof expectedHeading === "string") {
    return expectedHeading;
  }

  return `${"#".repeat(expectedHeading.depth)} ${expectedHeading.text}`;
}

export function getPackageScripts(packageJsonContent) {
  const packageJson = JSON.parse(packageJsonContent);
  const scripts = packageJson.scripts;

  if (!scripts || typeof scripts !== "object" || Array.isArray(scripts)) {
    return {};
  }

  return scripts;
}

export function hasPackageScript(packageJsonContent, scriptName, expectedCommand) {
  return getPackageScripts(packageJsonContent)[scriptName] === expectedCommand;
}

export function packageScriptRuns(packageJsonContent, parentScriptName, childScriptName) {
  const parentCommand = getPackageScripts(packageJsonContent)[parentScriptName];

  if (typeof parentCommand !== "string") {
    return false;
  }

  return parentCommand
    .split(/\s*(?:&&|\|\||;)\s*/)
    .some((command) => normalizeContractSnippet(command) === `npm run ${childScriptName}`);
}
