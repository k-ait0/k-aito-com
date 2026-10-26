/** D85 only: eight fictional paired response examples, copied from D85 decision matrix. */
export const B_SCENARIO_VERSION="D85-001-synthetic";
export const B_SCENARIOS=Object.freeze([
  {
    "id": "both-high",
    "name": "両方を強く重視",
    "bipolar": 4,
    "self": 7,
    "others": 7,
    "focus": "相対的な中間回答だけでは双方の高さを判別できない"
  },
  {
    "id": "both-low",
    "name": "どちらもあまり重視しない",
    "bipolar": 4,
    "self": 1,
    "others": 1,
    "focus": "同じ二極中点でも二尺度なら双方の低さを表現できる"
  },
  {
    "id": "both-middle",
    "name": "双方とも中程度",
    "bipolar": 4,
    "self": 4,
    "others": 4,
    "focus": "中点は高低や優先順位を一意に示さない"
  },
  {
    "id": "self-high",
    "name": "自分の希望を強く重視",
    "bipolar": 1,
    "self": 7,
    "others": 1,
    "focus": "相対的な片側重視を表せても独立尺度と同一の数値ではない"
  },
  {
    "id": "others-high",
    "name": "関係者への配慮を強く重視",
    "bipolar": 7,
    "self": 1,
    "others": 7,
    "focus": "相対的な片側重視を表せても独立尺度と同一の数値ではない"
  },
  {
    "id": "both-high-with-tilt",
    "name": "両方高く、本人希望がやや優先",
    "bipolar": 3,
    "self": 7,
    "others": 6,
    "focus": "両方高いことと相対順位を同時に表すには別の質問が必要"
  },
  {
    "id": "unanswerable",
    "name": "比較・評価できない",
    "bipolar": null,
    "self": null,
    "others": null,
    "focus": "判断不能は4に置き換えず明示的な欠測で保持"
  },
  {
    "id": "partial",
    "name": "本人の希望のみ回答可能",
    "bipolar": null,
    "self": 7,
    "others": null,
    "focus": "独立回答には部分欠測があり、結果の分類を強制できない"
  }
].map(x=>Object.freeze(x)));
