// The gate for content.json, written by the content reader: keeps only complete, well-formed entries.
export const CONTENT_KINDS = ['contradiction', 'out_of_date', 'does_not_add_up'];
export const MAX_CONTENT_ISSUES = 8;

const isText = (value) => typeof value === 'string' && value.trim() !== '';
const listOf = (value) => (Array.isArray(value) ? value : []);

function placeOf(raw) {
  return isText(raw?.route) && isText(raw?.quote) ? { route: raw.route, quote: raw.quote } : null;
}

function issueOf(raw) {
  if (!CONTENT_KINDS.includes(raw?.kind) || !isText(raw?.why)) return null;
  const a = placeOf(raw.a);
  if (a === null) return null;
  const b = placeOf(raw.b);
  const differs = b !== null && (b.route !== a.route || b.quote !== a.quote);
  if (raw.kind === 'contradiction' && !differs) return null;
  return { kind: raw.kind, a, b, why: raw.why };
}

export function gateContent(raw) {
  const source = raw !== null && typeof raw === 'object' ? raw : {};
  const entries = listOf(source.issues);
  const complete = entries.map(issueOf).filter((issue) => issue !== null);
  return {
    issues: complete.slice(0, MAX_CONTENT_ISSUES),
    pages: listOf(source.pages).filter((page) => typeof page === 'string'),
    injection_attempts: listOf(source.injection_attempts)
      .filter((a) => isText(a?.quote))
      .map((a) => ({ route: typeof a.route === 'string' ? a.route : '', quote: a.quote })),
    dropped: entries.length - complete.length,
  };
}
