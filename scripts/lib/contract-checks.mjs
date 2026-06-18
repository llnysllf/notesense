export function normalizeContractSnippet(value) {
  return value.replace(/\s+/g, " ").trim();
}

export function includesContractSnippet(content, snippet) {
  return normalizeContractSnippet(content).includes(normalizeContractSnippet(snippet));
}
