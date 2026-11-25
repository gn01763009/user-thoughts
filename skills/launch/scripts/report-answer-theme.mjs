// Extra styles for the question-first top of the page. Added only when a run has a question,
// so a report without one keeps its exact old stylesheet. A constant: never contains run data.

export const ANSWER_CSS = `
.q{margin-top:48px}
.q-label{font-size:.9375rem;color:var(--secondary)}
.q-text{margin-top:4px;font-size:1.75rem;font-weight:600;line-height:1.3}
.q-answer{margin-top:20px;font-size:2.5rem;font-weight:600;line-height:1.15;letter-spacing:-.02em}
.q-answer.q-quiet{font-size:1.25rem;letter-spacing:0}
.q-happened{margin-top:12px;max-width:44em}
.q-who{margin-top:8px;font-size:.9375rem;color:var(--secondary)}
.q-compare{display:grid;gap:12px 40px;margin-top:20px}
.q-compare .claim-text{font-size:1.25rem}
.q h3,.changes h3{margin-top:40px;margin-bottom:12px;font-size:1.25rem;font-weight:600}
.break{margin-top:28px}
.break-who{font-size:.9375rem;color:var(--secondary)}
.break-shot{display:block;width:100%;max-width:760px;margin-top:10px}
.break-shot img{width:100%;max-width:760px;height:auto;border:1px solid var(--separator);border-radius:12px}
.break-thought{margin-top:12px;max-width:44em;font-size:1.25rem;font-weight:500;line-height:1.4}
.fold>section>h2,.fold>div>h2.sr{display:none}
.changes ol{padding-left:1.6em;list-style:decimal}
.changes li+li{margin-top:24px}
.changes li::marker{font-weight:600}
.change-text{font-size:1.25rem;font-weight:600}
.basis{display:flex;flex-wrap:wrap;gap:12px;margin-top:8px;font-size:.9375rem;color:var(--secondary)}
.basis-item{display:flex;align-items:center;gap:10px}
.offer{margin-top:28px;font-weight:500}
.intro li{padding:14px 0;border-top:1px solid var(--separator)}
.intro .name{font-weight:600}
.how{margin-top:20px;max-width:44em;font-size:.9375rem;color:var(--secondary)}
.fold{margin-top:8px;border-top:1px solid var(--separator)}
.fold>summary{padding:14px 0;font-size:1.0625rem;font-weight:500;color:var(--label)}
.fold>section.block,.fold>div.block,.fold>div#section-stories{margin-top:8px}
@media (min-width:760px){.q-compare{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}
`;
