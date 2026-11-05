import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const html=readFileSync(new URL("../projects/kidp/life-design-lab/a05/e-preview.html",import.meta.url),"utf8");
for(const term of ['name="robots" content="noindex,nofollow"','value="relative"','value="independent"','value="omitted"','type="module"','./e-display.mjs','aria-live="polite"','id="relative-group"','id="independent-group"'])assert.ok(html.includes(term),term);
for(const forbidden of ["localStorage","indexedDB","fetch(","XMLHttpRequest","sendBeacon","navigator.serviceWorker"])assert.equal(html.includes(forbidden),false,forbidden);
assert.match(html,/experimentalEDisplay\(config\)/);
console.log("D63 preview static checks PASS");
