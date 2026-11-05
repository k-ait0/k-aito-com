import assert from "node:assert/strict";
import { experimentalEDisplay } from "../projects/kidp/life-design-lab/a05/e-display.mjs";
assert.equal(experimentalEDisplay({mode:"omitted"}).items.length,0);
assert.equal(experimentalEDisplay({mode:"relative",answer:4}).items[0].value,0);
assert.deepEqual(experimentalEDisplay({mode:"independent",money:7,time:7}).items.map(x=>x.value),[7,7]);
assert.throws(()=>experimentalEDisplay({mode:"relative",answer:9}),TypeError);
console.log("D62 display mapping PASS");
