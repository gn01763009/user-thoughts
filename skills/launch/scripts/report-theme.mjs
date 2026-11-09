// The report's stylesheet: a constant that never contains run data. Colours and type come from the design brief.

const TOKENS = `
:root{color-scheme:light;--page:#FFFFFF;--card:#F5F5F7;--label:#1D1D1F;--secondary:#6E6E73;--separator:#D2D2D7;--accent:#0066CC}
@media (prefers-contrast:more){:root{--label:#000000;--secondary:#000000}}
`;

const BASE = `
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--page);color:var(--label);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","PingFang TC","Noto Sans TC","Microsoft JhengHei",system-ui,sans-serif;font-size:1.0625rem;font-weight:400;line-height:1.55;overflow-wrap:break-word;-webkit-font-smoothing:antialiased}
h1,h2,h3,h4,p,ul,ol,dl,dd,figure,blockquote{margin:0;padding:0}
ul,ol{list-style:none}
a{color:var(--accent)}
img{display:block}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.page{max-width:980px;margin:0 auto;padding:clamp(40px,7vw,72px) 20px 96px}
.block{margin-top:72px}
.block>h2{margin-bottom:20px;font-size:1.75rem;font-weight:600;line-height:1.25}
.note{margin-top:8px;font-size:.9375rem;color:var(--secondary)}
.small{font-size:.8125rem;color:var(--secondary)}
.tag{margin-left:.5em;font-size:.8125rem;font-weight:400;color:var(--secondary)}
.route{overflow-wrap:anywhere}
.tablewrap{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:.9375rem}
th,td{padding:10px 16px 10px 0;border-bottom:1px solid var(--separator);text-align:left;vertical-align:top}
th{font-weight:500;color:var(--secondary)}
`;

const OVERVIEW = `
.top h1{font-size:2.5rem;font-weight:600;line-height:1.1;letter-spacing:-.02em}
.lead{margin-top:12px;font-size:.9375rem;color:var(--secondary)}
.vision{margin-top:16px;font-size:.8125rem;color:var(--secondary)}
.meta{margin-top:6px;font-size:.8125rem;color:var(--secondary)}
#section-overview>.list-title{margin-bottom:12px;font-size:.9375rem;font-weight:400;color:var(--secondary)}
.list{background:var(--card);border-radius:18px}
.list>li+li::before{content:"";display:block;height:1px;margin-left:20px;background:var(--separator)}
.row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;grid-template-areas:"title out chev" "facts facts chev" "sub sub chev";column-gap:12px;align-items:baseline;min-height:44px;padding:14px 16px 14px 20px;color:inherit;text-decoration:none}
.row:focus-visible{outline-offset:-2px;border-radius:18px}
.row-title{grid-area:title;min-width:0}
.row-name{font-weight:600}
.row-facts{grid-area:facts;margin-top:2px;font-size:.8125rem;color:var(--secondary)}
.row-facts,.facts,.cares{word-break:keep-all}
.row-out{grid-area:out;font-size:.9375rem;color:var(--secondary);white-space:nowrap}
.chev{grid-area:chev;align-self:center;color:var(--secondary)}
.row-sub{grid-area:sub;margin-top:2px;overflow:hidden;font-size:.9375rem;color:var(--secondary);white-space:nowrap;text-overflow:ellipsis}
`;

const PERSON = `
#section-stories{margin-top:72px}
.person{scroll-margin-top:24px}
.person+.person{margin-top:clamp(72px,10vw,96px)}
.who{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:2px 16px}
.person h3{font-size:1.75rem;font-weight:600;line-height:1.25}
.status{font-size:.9375rem;color:var(--secondary)}
.facts{margin-top:4px;font-size:.9375rem;color:var(--secondary)}
.about{margin-top:14px;max-width:40em}
.cares{margin-top:10px;font-size:.9375rem}
.cares-label{margin-right:.75em;color:var(--secondary)}
.situation{margin-top:14px;max-width:44em;font-size:.9375rem;color:var(--secondary)}
.chosen{margin-top:4px;font-size:.8125rem;color:var(--secondary)}
.moment{display:grid;grid-template-columns:minmax(0,1fr);grid-template-areas:"quote" "shot" "cap";row-gap:14px;margin-top:28px}
.key{grid-area:quote;font-size:1.75rem;font-weight:600;line-height:1.35;text-wrap:balance}
.shot{grid-area:shot;justify-self:center;display:block;max-width:100%}
.shot img{max-width:100%;max-height:min(64vh,540px);width:auto;height:auto;border:1px solid var(--separator);border-radius:12px}
.moment figcaption{grid-area:cap;font-size:.9375rem;color:var(--secondary)}
.no-moment{margin-top:28px;color:var(--secondary)}
.moment .no-moment{grid-area:shot;margin-top:0}
.after{display:grid;gap:4px 16px;margin-top:28px;font-size:.9375rem}
.after dt{color:var(--secondary)}
.after dd+dt{margin-top:8px}
.bad-idea{margin-top:10px;font-size:.8125rem;color:var(--secondary)}
details{margin-top:12px}
summary{padding:11px 0;font-size:.9375rem;color:var(--accent);cursor:pointer}
.walk{padding-left:2em;list-style:decimal}
.walk>li{padding:12px 0;border-top:1px solid var(--separator)}
.walk>li::marker{color:var(--secondary)}
.walk-step{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:start}
.cap{margin-top:4px;font-size:.8125rem;color:var(--secondary)}
.thumb{display:block;min-height:44px}
.thumb img{max-width:112px;max-height:112px;width:auto;height:auto;border:1px solid var(--separator);border-radius:8px}
`;

const LATER = `
.vision-line{margin-bottom:16px;font-size:.9375rem;color:var(--secondary)}
.chain,.comment{padding:14px 20px}
.chain+.chain,.comment+.comment{padding-top:0}
.chain+.chain::before,.comment+.comment::before{margin:0 -20px 14px 0}
.hop-who{font-size:.9375rem;font-weight:600}
.hop{margin-top:2px;font-size:.9375rem;color:var(--secondary)}
.final{margin-top:6px}
.claim{display:grid;gap:12px 40px}
.claim+.claim{margin-top:20px;padding-top:20px;border-top:1px solid var(--separator)}
.eyebrow{font-size:.8125rem;color:var(--secondary)}
.claim-text{font-weight:500}
.refs{display:grid;gap:14px;margin-top:12px;font-size:.9375rem}
.ref{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:start}
.ref-who{font-size:.8125rem;color:var(--secondary)}
.conflict+.conflict{margin-top:72px}
.conflict h3{font-size:1.75rem;font-weight:600;line-height:1.35}
.sides{display:grid;gap:24px;margin-top:20px}
.conflict .note{margin-top:20px}
.side h4{font-size:1.0625rem;font-weight:600}
.plain{padding-left:1.2em;list-style:disc}
.plain li+li{margin-top:6px}
`;

const REGULAR = `
@media (min-width:760px){
.moment{grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-template-rows:auto 1fr;grid-template-areas:"quote shot" "cap shot";column-gap:48px}
.shot{justify-self:end;align-self:start}
.after{grid-template-columns:8.5em minmax(0,1fr)}
.after dd+dt{margin-top:0}
.claim{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
.sides{grid-auto-flow:column;grid-auto-columns:minmax(0,1fr)}
}
`;

export const MOTION = `
@media screen and (prefers-reduced-motion:no-preference){
html{scroll-behavior:smooth}
@supports (animation-timeline:view()){
.moment{animation:settle linear both;animation-timeline:view();animation-range:entry 0% entry 35%}
@keyframes settle{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
}
}
`;

export const CSS = [TOKENS, BASE, OVERVIEW, PERSON, LATER, REGULAR, MOTION].join('');
