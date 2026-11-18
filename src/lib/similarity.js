// Deterministic lexical similarity used by the supervisor matcher: token frequency
// vectors compared with cosine similarity, weighted by inverse document frequency
// across the candidate set. It is the always-available baseline; the matching server
// function blends it with a semantic score when the AI pass succeeds.

const STOPWORDS = new Set(
  "the and for with from that this into within across their there these those using used use based study towards toward under over between among about more most less least also such via per than then them they has have had are was were will can may could should would its it's our your his her not but all any each other some many much very both further while when where which who whom what how why of to in on at by as is an a or".split(
    " ",
  ),
);

export function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((token) => token.replace(/^-+|-+$/g, ""))
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

function termFrequencies(tokens) {
  const counts = new Map();
  for (const token of tokens) counts.set(token, (counts.get(token) || 0) + 1);
  return counts;
}

/**
 * Ranks candidate documents against one query document.
 * @param {string} queryText
 * @param {{ key: string, text: string }[]} candidates
 * @returns {{ key: string, cosine: number, overlap: number, matched: string[] }[]}
 */
export function rankCandidates(queryText, candidates) {
  const queryTokens = tokenize(queryText);
  const docs = candidates.map((candidate) => tokenize(candidate.text));

  const documentFrequency = new Map();
  docs.forEach((tokens) => {
    new Set(tokens).forEach((token) => documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1));
  });

  const total = docs.length + 1;
  const idf = (token) => Math.log((total + 1) / ((documentFrequency.get(token) || 0) + 1)) + 1;
  const weigh = (tokens) => {
    const vector = new Map();
    termFrequencies(tokens).forEach((count, token) => vector.set(token, (1 + Math.log(count)) * idf(token)));
    return vector;
  };

  const queryVector = weigh(queryTokens);

  return candidates.map((candidate, index) => {
    const docVector = weigh(docs[index]);
    let dot = 0;
    let queryNorm = 0;
    let docNorm = 0;
    queryVector.forEach((weight, token) => {
      queryNorm += weight * weight;
      const other = docVector.get(token);
      if (other) dot += weight * other;
    });
    docVector.forEach((weight) => {
      docNorm += weight * weight;
    });
    const cosine = queryNorm && docNorm ? dot / (Math.sqrt(queryNorm) * Math.sqrt(docNorm)) : 0;
    const matched = [...queryVector.keys()]
      .filter((token) => docVector.has(token))
      .sort((a, b) => (docVector.get(b) || 0) - (docVector.get(a) || 0));
    const overlap = queryVector.size ? matched.length / queryVector.size : 0;
    return { key: candidate.key, cosine, overlap, matched: matched.slice(0, 8) };
  });
}