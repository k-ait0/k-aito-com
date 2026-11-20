/**
 * D272: overlay on unmodified Ver.2.2 in a LOCAL research candidate only.
 * CSS and JS are kept as independent reviewable assets; source untouched.
 */
import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {createHash} from "node:crypto";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const original=readFileSync(resolve(root,"research/a05/generated/d262-result-v22-preview.html"),"utf8");
const css=readFileSync(resolve(root,"research/a05/d272-accessibility-overlay.css"),"utf8");
const javascript=readFileSync(resolve(root,"research/a05/d272-keyboard-and-announcements.js"),"utf8");
if(!original.includes("A05-D262-RESULT-EVIDENCE-V2_2-1")||
 !original.includes("A05-D255-YN-PROVISIONAL-CLASSIFIER-1")||
 !original.includes("connect-src 'none'"))
 throw Error("D272 original D262 contract changed");
if(original.split("</head>").length!==2||original.split("</body>").length!==2)
 throw Error("D272 expected unique HTML document boundaries");
if(css.includes("</style")||javascript.includes("</script"))
 throw Error("D272 inline overlay unsafe close tag");
const html=original.replace("</head>",'<style id="a05-d272-accessibility">\n'+css+"\n</style>\n</head>")
 .replace("</body>",'<script id="a05-d272-keyboard-and-announcements">\n'+javascript+"\n</script>\n</body>");
const dest=resolve(root,"research/a05/generated/d272-accessibility-candidate.html");
mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,html,"utf8");
const hash=x=>createHash("sha256").update(x).digest("hex");
console.log("A05_D272_LOCAL_ACCESSIBILITY_CANDIDATE_BUILT "+JSON.stringify({
 oldBytes:Buffer.byteLength(original),bytes:Buffer.byteLength(html),
 originalSHA256:hash(original),candidateSHA256:hash(html),
 noPublishedChange:true,noScoringChange:true,noRealResponses:true
}));
