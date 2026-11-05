/** Research-only display mapping. Does not assert validated psychological traits. */
import { E_EXPERIMENT_VERSION, experimentalE } from "./e-experiment.mjs";
export function experimentalEDisplay(config) {
  const value = experimentalE(config);
  if (value.schema !== E_EXPERIMENT_VERSION) throw new TypeError("Unsupported experimental E schema");
  if (value.mode === "omitted") return Object.freeze({ title: "追加の希望", description: "この方式では金銭・時間の優先度を分類しません。", items: Object.freeze([]) });
  if (value.mode === "relative") return Object.freeze({ title: "追加の希望（比較回答）", description: "金銭面と時間面を比べた今回の回答です。性格分類ではありません。", items: Object.freeze([{ label: "回答位置（-3〜+3）", value: value.preference }]) });
  return Object.freeze({ title: "追加の希望（個別回答）", description: "金銭面と時間面それぞれの今回の回答です。両方を同時に重視できます。", items: Object.freeze([{ label: "金銭面", value: value.ratings.money }, { label: "時間面", value: value.ratings.time }]) });
}
