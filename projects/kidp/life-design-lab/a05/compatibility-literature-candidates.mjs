/**
 * C-03 internal RESEARCH CANDIDATES, not production source approval.
 * Checked against publisher / PubMed abstracts on 2026-10-29.
 * Full texts, exact model estimates, sample details, contradictions and
 * applicability to Japanese audiences still require independent review.
 * No source below directly validates the A05 4 axes, 16 types or 136 pairs.
 */
export const LITERATURE_CANDIDATES_VERSION = "A05-LIT-C03-0.1.0";
export const LITERATURE_CANDIDATES = Object.freeze([
  {
    id: "LIT-R001", authors: "From et al.", year: 2025,
    title: "Does similarity matter? A scoping review of perceived and actual similarity in romantic couples",
    doi: "10.1177/02654075251349720",
    url: "https://doi.org/10.1177/02654075251349720",
    studyDesign: "SCOPING_REVIEW", sample: "339 articles",
    context: "ESTABLISHED_ROMANTIC_COUPLES",
    synopsis: "類似性と関係アウトカムの関連は全般に混在し、知覚された類似性の方が実際の類似性より強い傾向。",
    metric: "339 papers; no common pooled effect estimate",
    caution: "スコーピングレビューであり統合効果量はない。恋愛・夫婦以外への一般化は別途検証が必要。",
    checkedVia: "PUBLISHER_ABSTRACT"
  },
  {
    id: "LIT-R002", authors: "Arránz Becker", year: 2013,
    title: "Effects of similarity of life goals, values, and personality on relationship satisfaction and stability: Findings from a two-wave panel study",
    doi: "10.1111/j.1475-6811.2012.01417.x",
    url: "https://doi.org/10.1111/j.1475-6811.2012.01417.x",
    studyDesign: "TWO_WAVE_PANEL", sample: "3,674 heterosexual couples; Wave 2: 2,820",
    context: "ROMANTIC_COUPLES_GERMANY",
    synopsis: "一部の人生目標・価値観・性格の類似性が関係満足度と小さな正の関連。本人の特性の方が総じて予測上重要。",
    metric: "Small positive associations; quantitative effect estimates need full-text review",
    caution: "異性カップルの観察研究であり因果効果・A05のペア効果ではない。",
    checkedVia: "PUBLISHER_ABSTRACT"
  },
  {
    id: "LIT-R003", authors: "Weidmann et al.", year: 2023,
    title: "Trait and facet personality similarity and relationship and life satisfaction in romantic couples",
    doi: "10.1016/j.jrp.2023.104378",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10312100/",
    studyDesign: "DYADIC_OBSERVATIONAL", sample: "1,294 female-male romantic couples",
    context: "ROMANTIC_COUPLES",
    synopsis: "性格特性・ファセットの類似性と関係満足度・生活満足度の頑健な関連は確認されなかった。",
    metric: "No robust similarity association; estimates require model-specific review",
    caution: "性格と価値観は同じ構成概念ではない。関連なしの証明ではない。",
    checkedVia: "PUBMED_PMC_ABSTRACT"
  },
  {
    id: "LIT-R004", authors: "Joel et al.", year: 2020,
    title: "Machine learning uncovers the most robust self-report predictors of relationship quality across 43 longitudinal couples studies",
    doi: "10.1073/pnas.1917036117",
    url: "https://doi.org/10.1073/pnas.1917036117",
    studyDesign: "MULTIDATASET_LONGITUDINAL_ML", sample: "43 datasets; 11,196 couples",
    context: "ROMANTIC_COUPLES",
    synopsis: "関係について本人が報告する変数の方が個人差変数より関係の質をよく予測し、質の変化は大部分が予測困難。",
    metric: "Up to 45% baseline / 18% follow-up variance from relationship-specific predictors; not an A05 effect",
    caution: "予測変数が多様な機械学習研究。A05の類似性を直接検証していない。",
    checkedVia: "PUBLISHER_ABSTRACT"
  },
  {
    id: "LIT-R005", authors: "Schwartz et al.", year: 2012,
    title: "Refining the theory of basic individual values",
    doi: "10.1037/a0029393",
    url: "https://pubmed.ncbi.nlm.nih.gov/22823292/",
    studyDesign: "PSYCHOMETRIC_MULTISAMPLE", sample: "15 samples, 10 countries, N=6,059",
    context: "VALUE_THEORY_NON_DYADIC",
    synopsis: "19価値の動機的な円環構造を検討し、価値間の両立・葛藤の構造に対する根拠を提示。",
    metric: "No A05 effect estimate",
    caution: "A05のA軸と概念的に部分対応する可能性はあるが、A05の4軸やタイプは検証していない。",
    checkedVia: "PUBMED_ABSTRACT"
  },
  {
    id: "LIT-R006", authors: "MacCallum et al.", year: 2002,
    title: "On the practice of dichotomization of quantitative variables",
    doi: "10.1037/1082-989X.7.1.19",
    url: "https://pubmed.ncbi.nlm.nih.gov/11928888/",
    studyDesign: "METHODOLOGICAL", sample: "Methodological analysis",
    context: "STATISTICAL_METHODS",
    synopsis: "連続的な測定値の二分化は情報損失や推論上の問題を生み得る。",
    metric: "No single empirical effect estimate",
    caution: "16分類の妥当性を直接否定する研究ではなく、二分化を検証すべき方法論上の理由。",
    checkedVia: "PUBMED_ABSTRACT"
  },
  {
    id: "LIT-R007", authors: "Ryan and Deci", year: 2000,
    title: "Self-determination theory and the facilitation of intrinsic motivation, social development, and well-being",
    doi: "10.1037/0003-066X.55.1.68",
    url: "https://doi.org/10.1037/0003-066X.55.1.68",
    studyDesign: "THEORETICAL_REVIEW", sample: "Theoretical literature",
    context: "MOTIVATION_THEORY",
    synopsis: "SDTは自律性、関係性、有能感を別々の心理的欲求として整理する。",
    metric: "No A05 B-axis bipolar effect estimate",
    caution: "A05のB軸二極性が偽と実証されたことを意味せず、再検討を促す理論的根拠。",
    checkedVia: "AUTHOR_TEXT"
  }
].map(row => Object.freeze({
  ...row,
  auditStatus: "ABSTRACT_OR_AUTHOR_TEXT_CHECKED_NOT_APPROVED",
  fullTextReviewed: false,
  directlyValidatesA05: false,
  directlyValidatesAnyA05Pair: false,
  publishedClaimApproved: false,
  claimTier: "B_GENERAL_RESEARCH_CANDIDATE"
})));

export const SOURCE_BY_ID = Object.freeze(Object.fromEntries(
  LITERATURE_CANDIDATES.map(s => [s.id, s])
));
if (LITERATURE_CANDIDATES.length !== 7 ||
    new Set(LITERATURE_CANDIDATES.map(x => x.id)).size !== 7 ||
    LITERATURE_CANDIDATES.some(x => x.directlyValidatesAnyA05Pair ||
        x.directlyValidatesA05 || x.publishedClaimApproved))
  throw new Error("C03 source register must contain 7 unapproved general research candidates");
