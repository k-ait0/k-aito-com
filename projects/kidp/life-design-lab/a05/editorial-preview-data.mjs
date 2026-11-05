/** D83 editorial-only candidate snapshot. No scoring or storage. */
export const EDITORIAL_SCHEMA="A05-D83-001";
export const EDITORIAL_ITEMS=Object.freeze([
  {
    "id": "A01",
    "axis": "A",
    "facet": "日々の生活",
    "verdict": "REVISE",
    "original": {
      "negative": "一つの地域で暮らしを育てる",
      "positive": "複数の地域で暮らしを経験する"
    },
    "L": {
      "negative": "住み慣れた地域で暮らしを深めたい",
      "positive": "異なる地域で暮らす可能性を探りたい",
      "domain": "地域・居住選好"
    },
    "M": {
      "negative": "既存の方法を改善して使う",
      "positive": "未経験の方法を試す",
      "source": "D59"
    },
    "R": {
      "negative": "日常の暮らし方を維持して整えることを重視",
      "positive": "日常の暮らし方に変化を取り入れることを重視"
    },
    "overlaps": [
      "A04",
      "A06"
    ],
    "risk": "転居可能性・地域への愛着・経済的条件に回答が左右されないか"
  },
  {
    "id": "A02",
    "axis": "A",
    "facet": "活動環境",
    "verdict": "TRIAL",
    "original": {
      "negative": "慣れた環境を長く活かす",
      "positive": "新しい環境へ定期的に移る"
    },
    "L": {
      "negative": "日常で過ごす場所をなるべく一定にしたい",
      "positive": "日常で過ごす場所を変える機会を持ちたい",
      "domain": "日常的な活動空間"
    },
    "M": {
      "negative": "現在の活動環境を整える",
      "positive": "新しい活動環境を試す",
      "source": "D57"
    },
    "R": {
      "negative": "活動する場所を一定に保つことを重視",
      "positive": "活動する場所を変えることを重視"
    },
    "overlaps": [
      "A03",
      "A04"
    ],
    "risk": "通勤・働き方・外出機会の制約が選好と混じらないか"
  },
  {
    "id": "A03",
    "axis": "A",
    "facet": "生活習慣",
    "verdict": "TRIAL",
    "original": {
      "negative": "心地よい日常の形を維持する",
      "positive": "日常の形を更新し続ける"
    },
    "L": {
      "negative": "慣れた生活習慣を維持したい",
      "positive": "生活習慣に新しい変化を取り入れたい",
      "domain": "生活習慣"
    },
    "M": {
      "negative": "既存の習慣を磨く",
      "positive": "新しい習慣を取り入れる",
      "source": "D57"
    },
    "R": {
      "negative": "今の習慣を継続して磨くことを重視",
      "positive": "新しい習慣を試すことを重視"
    },
    "overlaps": [
      "A02",
      "A05"
    ],
    "risk": "望んで変えることと外部事情で変わることを区別できるか"
  },
  {
    "id": "A04",
    "axis": "A",
    "facet": "生活計画",
    "verdict": "BLOCK",
    "original": {
      "negative": "今ある生活基盤を活かす",
      "positive": "生活基盤を作り直す"
    },
    "L": {
      "negative": "今の住まい方を基準に整えたい",
      "positive": "異なる住まい方を試してみたい",
      "domain": "住まいの使い方"
    },
    "M": {
      "negative": "一度決めた活動計画を続ける",
      "positive": "途中でも活動計画を見直す",
      "source": "D59"
    },
    "R": {
      "negative": "暮らしの計画を継続して調整することを重視",
      "positive": "暮らしの計画を変えて組み直すことを重視"
    },
    "overlaps": [
      "A01"
    ],
    "risk": "持ち家・賃貸・同居条件の差とA01の重複を確認"
  },
  {
    "id": "A05",
    "axis": "A",
    "facet": "生活上の役割",
    "verdict": "BLOCK",
    "original": {
      "negative": "一つの環境をより良く育てる",
      "positive": "異なる環境を経験していく"
    },
    "L": {
      "negative": "日々使う生活空間を調整して使い続けたい",
      "positive": "日々使う生活空間に新しい選択肢を取り入れたい",
      "domain": "生活空間の更新"
    },
    "M": {
      "negative": "予想できる変化には従来の進め方を調整する",
      "positive": "予想できる変化を機に進め方を組み替える",
      "source": "D59"
    },
    "R": {
      "negative": "生活上の役割を維持して工夫することを重視",
      "positive": "生活上の役割に新しい変化を加えることを重視"
    },
    "overlaps": [
      "A06",
      "A04"
    ],
    "risk": "住まい方A04との重複と改修費用による回答偏りを確認"
  },
  {
    "id": "A06",
    "axis": "A",
    "facet": "変化への対応",
    "verdict": "REVISE",
    "original": {
      "negative": "現在の拠点を保って挑戦する",
      "positive": "拠点そのものを変えて挑戦する"
    },
    "L": {
      "negative": "暮らしの拠点を長く保ちたい",
      "positive": "暮らしの拠点を時期に応じて変えてみたい",
      "domain": "生活拠点の継続期間"
    },
    "M": {
      "negative": "予想外の変化には既存の手順を応用する",
      "positive": "予想外の変化には別の手順を探す",
      "source": "D59"
    },
    "R": {
      "negative": "予想外の生活変化でも今の基盤を活かすことを重視",
      "positive": "予想外の生活変化には新たな形を探すことを重視"
    },
    "overlaps": [
      "A05",
      "A01"
    ],
    "risk": "A01との差が明確でない場合は候補を棄却する。住居・家族の制約を確認"
  },
  {
    "id": "B01",
    "axis": "B",
    "facet": "生活方針",
    "verdict": "TRIAL",
    "original": {
      "negative": "自分の希望を中心に決める",
      "positive": "大切な人との希望の一致を重視する"
    },
    "L": {
      "negative": "生活の優先順位は自分の希望を中心に決めたい",
      "positive": "生活の優先順位は関わる人の希望との調整を重視したい",
      "domain": "生活の優先順位"
    },
    "M": {
      "negative": "最終的な判断を自分で担う",
      "positive": "最終的な判断を関係者と共同で担う",
      "source": "D57"
    },
    "R": {
      "negative": "自分の希望を優先して生活方針を考えることを重視",
      "positive": "関係する人の希望を優先して生活方針を考えることを重視"
    },
    "overlaps": [
      "B06"
    ],
    "risk": "現実に調整相手がいることを前提にしていないか。合意形成能力の測定ではない"
  },
  {
    "id": "B02",
    "axis": "B",
    "facet": "余暇",
    "verdict": "BLOCK",
    "original": {
      "negative": "自分で生活を組み立てる余地",
      "positive": "身近な人と生活を共有する機会"
    },
    "L": {
      "negative": "自分の自由時間の予定は自分の希望を中心に組みたい",
      "positive": "自分の自由時間の予定は誰かとの相談を重視して組みたい",
      "domain": "自由時間の過ごし方"
    },
    "M": {
      "negative": "活動の進め方を自分で決める余地を重視",
      "positive": "関係者と決める機会を重視",
      "source": "D59"
    },
    "R": {
      "negative": "余暇の過ごし方は自分の希望を起点に考えることを重視",
      "positive": "余暇の過ごし方は関係する人の希望を起点に考えることを重視"
    },
    "overlaps": [
      "B05",
      "B04"
    ],
    "risk": "相談相手がいない場合の回答不能、B04の調整場面との違いを確認"
  },
  {
    "id": "B03",
    "axis": "B",
    "facet": "目標の意義",
    "verdict": "REVISE",
    "original": {
      "negative": "自分が望む達成を大切にする",
      "positive": "誰かと共有できる達成を大切にする"
    },
    "L": {
      "negative": "自分にとって意義のある達成を優先したい",
      "positive": "関わる人と意義を共有できる達成を優先したい",
      "domain": "達成の共有"
    },
    "M": {
      "negative": "達成後まず自分で振り返る",
      "positive": "達成後まず関係者と振り返る",
      "source": "D57"
    },
    "R": {
      "negative": "目標の意義は自分の納得を基準に考えることを重視",
      "positive": "目標の意義は他者と共有できることを基準に考えることを重視"
    },
    "overlaps": [
      "B01",
      "B05"
    ],
    "risk": "誰かとの共有機会の有無と他者への配慮を混同しないか"
  },
  {
    "id": "B04",
    "axis": "B",
    "facet": "居住選択",
    "verdict": "TRIAL",
    "original": {
      "negative": "自分の希望する場所を選ぶ",
      "positive": "大切な人との距離を重視して選ぶ"
    },
    "L": {
      "negative": "暮らす場所は自分が望む条件を優先して選びたい",
      "positive": "暮らす場所は大切な人と関わりやすい条件を優先して選びたい",
      "domain": "居住地の選好"
    },
    "M": {
      "negative": "調整可能なら自分の予定を優先して組む",
      "positive": "調整可能なら関係者と予定を合わせて組む",
      "source": "D57"
    },
    "R": {
      "negative": "暮らす場所は自分に合う条件を優先して考えることを重視",
      "positive": "暮らす場所は関係する人との関わりを優先して考えることを重視"
    },
    "overlaps": [
      "B02"
    ],
    "risk": "同居・扶養・介護などの状況とA軸の居住安定志向を切り分ける"
  },
  {
    "id": "B05",
    "axis": "B",
    "facet": "達成の受け止め",
    "verdict": "REVISE",
    "original": {
      "negative": "自分だけでも実現したい目標",
      "positive": "大切な人と実現したい目標"
    },
    "L": {
      "negative": "自分にとっての意義を基準に目標を選びたい",
      "positive": "関わる人と共有する意義を基準に目標を選びたい",
      "domain": "目標の共有"
    },
    "M": {
      "negative": "同じ目標の実行を自分で組み立てる",
      "positive": "同じ目標の実行を関係者と分担する",
      "source": "D59"
    },
    "R": {
      "negative": "達成の喜びは自分自身の実感を重視",
      "positive": "達成の喜びは関係する人と共有する実感を重視"
    },
    "overlaps": [
      "B02",
      "B03"
    ],
    "risk": "B03と単なる言い換えなら採用不可。実行能力やチームワークを推測しない"
  },
  {
    "id": "B06",
    "axis": "B",
    "facet": "意見相違",
    "verdict": "REVISE",
    "original": {
      "negative": "自分の希望に合わせて方向を決める",
      "positive": "関係者と方向をすり合わせる"
    },
    "L": {
      "negative": "希望が食い違うとき自分の希望を尊重することを重視したい",
      "positive": "希望が食い違うとき双方が納得できる点を探すことを重視したい",
      "domain": "希望が対立する場面"
    },
    "M": {
      "negative": "意見が分かれた際に自分の判断を重視する",
      "positive": "意見が分かれた際に合意形成を重視する",
      "source": "D57"
    },
    "R": {
      "negative": "意見が異なる場面で自分の希望を伝えることを重視",
      "positive": "意見が異なる場面で互いの希望をすり合わせることを重視"
    },
    "overlaps": [
      "B01"
    ],
    "risk": "社会的望ましさの偏りや交渉権限の差を確認する"
  }
].map(x=>Object.freeze(x)));

/** D84 editorial hypotheses only; not approved dispositions or respondent data. */
export const EDITORIAL_ACTIONS=Object.freeze({
  "A01": {
    "proposedAction": "RETAIN_FOR_REVIEW",
    "rationale": "日々の生活方針を問い、A04の計画実行場面と分離できる可能性がある。",
    "disconfirmingQuestion": "A04とは違う生活上の選択理由が挙がるか。",
    "revisionBrief": "基盤の継続と変化の選好を日常場面で比較し、実行能力を問わない"
  },
  "A02": {
    "proposedAction": "DROP_CANDIDATE",
    "rationale": "活動場所の選択が勤務形態・移動制約・住環境に左右され、Aの抽象的変化志向と混ざりやすい。",
    "disconfirmingQuestion": "場所を変えられない状況でも選好が回答できるか。",
    "revisionBrief": "生活上の時間配分など場所に依存しない場面に差し替えを検討"
  },
  "A03": {
    "proposedAction": "RETAIN_FOR_REVIEW",
    "rationale": "習慣の維持と試行という場面が生活環境・計画と一応区別できる。",
    "disconfirmingQuestion": "維持と新規導入を両方望む場合に7段階で答えられるか。",
    "revisionBrief": "習慣という文脈を残し、変化の強制・実現可能性とは切り離す"
  },
  "A04": {
    "proposedAction": "REWRITE_FOR_REVIEW",
    "rationale": "元のBLOCK。Rの『生活計画』はA01の生活方針、Mの計画変更と混ざり、構成概念の変更も含む。",
    "disconfirmingQuestion": "暮らしの計画の見直しは変化を選好することと一致するか。",
    "revisionBrief": "生活の大切な選択を維持する／選択肢を広げるなど、目的に近い場面へ再設計。BLOCKを維持"
  },
  "A05": {
    "proposedAction": "DROP_CANDIDATE",
    "rationale": "元のBLOCK。『生活上の役割』は家族・仕事の役割変更可能性やA06の環境対応と混入する。",
    "disconfirmingQuestion": "本人の裁量で役割を変えられない場合に何を答えているか。",
    "revisionBrief": "役割を前提としない選択場面へ差し替え。BLOCKを維持"
  },
  "A06": {
    "proposedAction": "REWRITE_FOR_REVIEW",
    "rationale": "予想外の変化への対処は自発的な安定／変化の選好でなく状況対応力を測りかねない。",
    "disconfirmingQuestion": "同じ人が好む生き方と緊急時の対応を別々に答えるか。",
    "revisionBrief": "本人の裁量がある将来の選択場面に置き換え、状況対応力を推定しない"
  },
  "B01": {
    "proposedAction": "RETAIN_FOR_REVIEW",
    "rationale": "生活方針というBの中心に近いが、両者は併存しうるため尺度形式の検証を要する。",
    "disconfirmingQuestion": "自分も周囲も重視する人が無理に片方を選ばないか。",
    "revisionBrief": "本人の価値基準と他者への配慮を別々に答えられる方式も併走検討"
  },
  "B02": {
    "proposedAction": "REWRITE_FOR_REVIEW",
    "rationale": "元のBLOCK。余暇に他者がいることを前提にし、自分の希望と相談は対立とは限らない。",
    "disconfirmingQuestion": "予定を自分で決めつつ誰かと相談する人はどう回答するか。",
    "revisionBrief": "想定する他者の範囲を定義するか、両希望の独立評価へ再設計。BLOCKを維持"
  },
  "B03": {
    "proposedAction": "RETAIN_FOR_REVIEW",
    "rationale": "自分の納得と共有意義という目標の場面はBの候補だが、B05の達成喜びに近い。",
    "disconfirmingQuestion": "目標設定時と達成時で答える理由が異なるか。",
    "revisionBrief": "目標の選択時点に限定して目的と結果の混同を避ける"
  },
  "B04": {
    "proposedAction": "DROP_CANDIDATE",
    "rationale": "居住地選択はA軸の生活環境と横断的に重なり、家族・経済事情で回答が制限される。",
    "disconfirmingQuestion": "本人が居住地を選べない場合にBの選好が残るか。",
    "revisionBrief": "住居に依存しない価値選択場面を代替候補として起案"
  },
  "B05": {
    "proposedAction": "DROP_CANDIDATE",
    "rationale": "目標の共有というB03と近く、達成の喜びは相手との関係の有無や表現習慣に依存しうる。",
    "disconfirmingQuestion": "B03と違う理由で回答できるか。",
    "revisionBrief": "目標・達成と異なる生活場面での本人と他者の希望を検討"
  },
  "B06": {
    "proposedAction": "REWRITE_FOR_REVIEW",
    "rationale": "『互いの希望をすり合わせる』は社会的望ましさで片側が望ましく見え、B01とも近い。",
    "disconfirmingQuestion": "意見の相違で自分の希望を伝えつつ歩み寄る場合の回答可能性。",
    "revisionBrief": "対立場面の行動能力を測らず、重視する基準を独立尺度で問うことも検討"
  }
});
