// Comparing the product scope document to the product.
//
// docs/PRODUCT_SCOPE.md listed MIDI file upload, MIDI device input, and timed
// rhythm scoring as *explicitly out of scope* for four slices after all three
// shipped. Nobody re-read it, because nothing made them: the document was prose
// next to code, and prose next to code goes stale.
//
// So each capability now declares the phrase the scope document must use for it
// while it ships, and these functions check that the document says it in the
// right section. The terms are read out of the TypeScript source rather than
// imported, because contract gates are plain Node scripts; the shape being read
// is a literal field in a data table, which is about as stable as source
// scraping gets.

const SUPPORTED_HEADING = "## Current Supported Scope";
const OUT_OF_SCOPE_HEADING = "## Explicitly Out Of Scope";

export function parseScopeTerms(capabilitySource) {
  return [...capabilitySource.matchAll(/scopeTerm:\s*"([^"]+)"/g)].map((match) => match[1]);
}

// The two sections that matter, as raw text. A heading that is missing gives an
// empty section rather than throwing, so the caller reports every problem at
// once instead of one per run.
export function parseScopeSections(markdown) {
  const section = (heading) => {
    const start = markdown.indexOf(heading);
    if (start === -1) return "";

    const rest = markdown.slice(start + heading.length);
    const end = rest.indexOf("\n## ");
    return (end === -1 ? rest : rest.slice(0, end)).toLowerCase();
  };

  return {
    supported: section(SUPPORTED_HEADING),
    outOfScope: section(OUT_OF_SCOPE_HEADING),
  };
}

// Every shipped capability must be described as supported, and must not be
// described as a non-goal. The second rule is the one that would have caught
// the drift; the first is what stops the document quietly emptying out.
export function findScopeDrift(terms, sections) {
  const problems = [];

  for (const term of terms) {
    const needle = term.toLowerCase();

    if (sections.outOfScope.includes(needle)) {
      problems.push(`"${term}" ships, but ${OUT_OF_SCOPE_HEADING} still lists it as a non-goal`);
    }

    if (!sections.supported.includes(needle)) {
      problems.push(`"${term}" ships, but ${SUPPORTED_HEADING} does not mention it`);
    }
  }

  return problems;
}
