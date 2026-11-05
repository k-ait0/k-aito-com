import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TYPES, GROUPS, TYPE_VERSION, CONTENT_VERSION } from "../projects/kidp/life-design-lab/a05/types.mjs";
import { QUESTION_SET_VERSION } from "../projects/kidp/life-design-lab/a05/questions.mjs";
import { SCORING_VERSION } from "../projects/kidp/life-design-lab/a05/engine.mjs";

const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const d75 = JSON.parse(read("docs/A05_D75_CONDITIONAL_16TYPE_COPY_20261026.json"));
const d73 = JSON.parse(read("docs/A05_D73_ITEM_CONSTRUCT_CROSSWALK_20261026.json"));
const packet = read("docs/A05_D75_RESULT_COPY_VARIANTS_20261026.md");

const terms = {
  L: { A: ["慣れた生活環境の継続","生活環境に変化を取り入れること"],
       B: ["生活上の自分の希望","関係する人の希望との調整"] },
  M: { A: ["活動の進め方の継続","活動の進め方の更新"],
       B: ["自分で決める裁量","関係者とともに意思決定すること"] },
  C: ["将来に向けた充実","現在の充実"],
  D: ["経験の幅","特定の経験の深さ"]
};
const makeCopy = (mode, s) =>
  "今回の回答では、" +
  [terms[mode].A[s.A === 1 ? 1 : 0], terms[mode].B[s.B === 1 ? 1 : 0],
   terms.C[s.C === 1 ? 1 : 0], terms.D[s.D === 1 ? 1 : 0]].join("、") +
  "を相対的に重視する傾向が見られました。";

test("D75 has two unapproved descriptions for each exact 16-type ID", () => {
  assert.equal(d75.schema, "A05-D75-CONDITIONAL-TYPE-COPY-1");
  assert.equal(d75.status, "COMPARISON_ONLY_NOT_ADOPTED");
  assert.equal(d75.items.length, 16);
  assert.equal(TYPES.length, 16);
  assert.deepEqual(d75.items.map(x => x.id), TYPES.map(x => x.id));
  assert.equal(d75.safeguards.conceptChoice, "PENDING");
  for(const key of ["legacyCopyOverrideAllowed","autoPublish","studyAuthorized",
                    "mergeAuthorized","productionReleaseAuthorized"])
    assert.equal(d75.safeguards[key], false, key);
});

test("D75 every type uses the exact A/B/C/D sign combinations and names of live type IDs", () => {
  for(let i=0;i<16;i++){
    const item=d75.items[i], current=TYPES[i];
    assert.equal(item.existingWorkingName,current.name);
    assert.equal(item.existingGroup,GROUPS[current.group].id);
    const signs={A:i>=8?1:-1,B:i%8>=4?1:-1,C:i%4>=2?1:-1,D:i%2===1?1:-1};
    assert.deepEqual(item.axisSigns,signs,item.id);
    assert.equal(item.conditionL,makeCopy("L",signs),item.id);
    assert.equal(item.conditionM,makeCopy("M",signs),item.id);
    assert.notEqual(item.conditionL,item.conditionM,item.id);
    assert.equal(item.copyApproval,"NOT_APPROVED");
    assert.equal(item.psychometricValidation,false);
    assert.equal(item.nameIsWorldbuildingLabel,true);
    assert.ok(packet.includes("| "+item.id+" | "+item.existingWorkingName+" | "+item.conditionL+" | "+item.conditionM+" |"),item.id);
  }
});

test("D75 preserves version boundaries and explicit warning against validity claims", () => {
  assert.equal(d75.safeguards.typeStructureVersion,TYPE_VERSION);
  assert.equal(d75.safeguards.contentVersion,CONTENT_VERSION);
  assert.deepEqual(d73.frozenVersions,{
    question: QUESTION_SET_VERSION,scoring:SCORING_VERSION,
    type:TYPE_VERSION,content:CONTENT_VERSION
  });
  for(const word of ["標準化された心理尺度ではありません","性格","能力","適職","将来の行動"])
    assert.ok(d75.sharedDisclaimer.includes(word),word);
  assert.match(packet,/正式な結果文言ではない/);
  assert.match(packet,/未承認/);
});
