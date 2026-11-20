/**
 * flavor-bridge.ts — the H7 banking pass (FLAVOR_BRIDGE_V1).
 *
 * Banks derived flavor correspondences for the 50 substances of
 * the WP1b mineral survey (docs/ansci/wp1b-mineral-survey.md)
 * under hypothesis H7 as registered in
 * docs/ansci/repair-programme.md.
 *
 * WHY A SEPARATE STORE. Amendment A2 to H7 pins the provenance:
 * a B-derived correspondence is a distinct kind from a directly
 * attested B correspondence, and queries for attested
 * correspondences must exclude B-derived records unless they
 * explicitly request them. CLASSIFICATIONS (classify.ts) has no
 * B-derived kind — its provenance union is fork-curated /
 * fork-creative, and lookupClassification is the ordinary lookup
 * every consumer uses. Putting these records there would either
 * blur that union or let the ordinary lookup silently return
 * derived records as classifications. So the derived records
 * live here, behind their own accessor
 * (derivedCorrespondencesOf), labelled derived at the type
 * level: every record carries assertionKind
 * "DERIVED_CORRESPONDENCE" and evidenceGrade "B-derived".
 * Nothing in the parser or the join reads this module; banking
 * is the deliverable, consumption is a later decision.
 *
 * THE BRIDGE, AS APPLIED. Leg A: a substance's recorded flavor
 * in a named bencao entry and recension (the survey's fetched
 * entry texts; the Benjing stratum in Sun Xingyan's
 * reconstruction for the 46 Benjing items, the transmitted
 * Bielu entries for the 4 Bielu additions). Leg B: the
 * flavor→phase correspondence of Suwen ch. 4 (金匱真言論） —
 * the preferred leg per the registry, one attested
 * correspondence leg: 其味酸，其類草木 (sour → Wood), 其味苦，
 * 其類火 (bitter → Fire), 其味甘，其類土 (sweet → Earth),
 * 其味辛，其類金 (pungent → Metal), 其味鹹，其類水 (salty →
 * Water). Output is scoped to the recorded-flavor aspect ONLY —
 * never a classification of the substance as a whole — and
 * licenses no indication, safety, efficacy, organ-action, or
 * function claim (admission condition 5, carried on every
 * record's limitations field).
 *
 * CONFIDENCE. C_bridge = min(C_A, C_B) × K, K = 0.90 fixed per
 * bridge (amendment A1 — assessed once for this source pair,
 * never per substance). C_B = 0.95 for every record: the Suwen
 * ch. 4 clauses are explicit and were verified in the WP1
 * survey. Per-entry variation enters only through C_A:
 *   0.95 — Benjing stratum, explicit single flavor, no recorded
 *          variant touching the flavor value;
 *   0.90 — Bielu stratum (attribution best-supported, per the
 *          survey's stratum notes), or a Benjing flavor stated
 *          in the substance's own clause of a merged entry;
 *   0.70 — 鉛丹： the flavor itself is disputed across
 *          recensions (Sun 味辛微寒 vs Zhenglei SK1441
 *          味平微寒）; banked on Sun's reading, dispute recorded.
 */
import type { Element } from "./sentence";

export type Flavor = "sour" | "bitter" | "sweet" | "pungent" | "salty";

export const FLAVOR_HANZI: Record<Flavor, string> = {
  sour: "酸", bitter: "苦", sweet: "甘", pungent: "辛", salty: "鹹",
};

/** The Neijing leg (Suwen ch. 4, 金匱真言論）: flavor → phase,
 *  with the operative clause for each flavor. */
export const FLAVOR_CORRESPONDENCE: Record<Flavor, { phase: Element; clause: string }> = {
  sour: { phase: "Wood", clause: "東方青色，入通於肝，其味酸，其類草木" },
  bitter: { phase: "Fire", clause: "南方赤色，入通於心，其味苦，其類火" },
  sweet: { phase: "Earth", clause: "中央黃色，入通於脾，其味甘，其類土" },
  pungent: { phase: "Metal", clause: "西方白色，入通於肺，其味辛，其類金" },
  salty: { phase: "Water", clause: "北方黑色，入通於腎，其味鹹，其類水" },
};

/** Amendment A1: K is a property of the bridge, fixed at 0.90. */
export const H7_K = 0.9;
/** Confidence in the Suwen ch. 4 correspondence leg (uniform). */
export const H7_C_B = 0.95;

export interface DerivedCorrespondence {
  id: string;
  assertionKind: "DERIVED_CORRESPONDENCE";
  ruleId: "FLAVOR_BRIDGE_V1";
  subject: { slug: string; hanzi: string; pinyin: string; surveyEntry: number };
  /** Always the recorded-flavor aspect — never the whole substance. */
  aspect: "recorded-flavor";
  flavor: Flavor;
  phase: Element;
  confidence: number;
  confidenceInputs: { cA: number; cB: number; k: number };
  evidenceGrade: "B-derived";
  derivationPath: {
    flavorAssertion: {
      text: string;
      stratum: "Benjing" | "Bielu";
      witness: string;
      entry: string;
      /** The flavor wording as the survey records it, in the source's terms. */
      wording: string;
    };
    correspondenceAssertion: {
      text: string;
      chapter: string;
      clause: string;
    };
    sourceAssertionIds: [string, string];
  };
  scope: string;
  limitations: string;
  status: "admitted";
}

const STANDARD_LIMITATIONS =
  "Derived correspondence of the recorded-flavor aspect only. It licenses no statement about the substance as a whole — " +
  "not a material classification, not its thermal nature, and, per H7 admission condition (5), no indication, safety, " +
  "efficacy, organ-action, or function claim.";

interface RawRow {
  survey: number;
  slug: string;
  hanzi: string;
  pinyin: string;
  flavors: Flavor[];
  wording: string;
  stratum: "Benjing" | "Bielu";
  witness: string;
  entryNote?: string;
  cA: number;
  limitationExtra?: string;
}

const BENJING_WITNESS = "Sun Xingyan reconstruction (WP1b Layer S)";
const QIANJIN_WITNESS = "Qianjin Yifang vol. 2 (transmitted Bielu text)";

/**
 * The qualifying rows, transcribed from the survey's tables.
 * Flavor wording is the survey's record of the entry text in the
 * source's own terms (flavor + thermal nature; only the flavor
 * bridges — the nature axis stays phase-null under H7).
 * 芒消 states two flavors (味辛苦） and banks one record per
 * recorded flavor value, as recorded, never forced to one.
 */
const ROWS: RawRow[] = [
  { survey: 1, slug: "cinnabar", hanzi: "丹砂", pinyin: "dānshā", flavors: ["sweet"], wording: "味甘、微寒", stratum: "Benjing", witness: BENJING_WITNESS, cA: 0.95,
    limitationExtra: "The Benjing layer states no toxicity for cinnabar; this record neither asserts nor implies any toxicity or safety position, and later layers' colour/toxicity discussions do not veto the flavor assertion." },
  { survey: 2, slug: "mica", hanzi: "雲母", pinyin: "yúnmǔ", flavors: ["sweet"], wording: "味甘平", stratum: "Benjing", witness: BENJING_WITNESS, cA: 0.95 },
  { survey: 3, slug: "jade-spring", hanzi: "玉泉", pinyin: "yùquán", flavors: ["sweet"], wording: "味甘平", stratum: "Benjing", witness: BENJING_WITNESS, cA: 0.95 },
  { survey: 4, slug: "stalactite", hanzi: "石鍾乳", pinyin: "shízhōngrǔ", flavors: ["sweet"], wording: "味甘溫", stratum: "Benjing", witness: BENJING_WITNESS, cA: 0.95 },
  { survey: 5, slug: "alum", hanzi: "礬石", pinyin: "fánshí", flavors: ["sour"], wording: "味酸寒", stratum: "Benjing", witness: BENJING_WITNESS, cA: 0.95, entryNote: "Sun's headword is 涅石 (nièshí); the Zhenglei headword is 礬石." },
  { survey: 6, slug: "saltpeter", hanzi: "消石", pinyin: "xiāoshí", flavors: ["bitter"], wording: "味苦寒", stratum: "Benjing", witness: BENJING_WITNESS, cA: 0.95 },
  { survey: 7, slug: "puxiao", hanzi: "朴消", pinyin: "pòxiāo", flavors: ["bitter"], wording: "味苦寒", stratum: "Benjing", witness: BENJING_WITNESS, cA: 0.95 },
  { survey: 8, slug: "talc", hanzi: "滑石", pinyin: "huáshí", flavors: ["sweet"], wording: "味甘寒", stratum: "Benjing", witness: BENJING_WITNESS, cA: 0.95 },
  { survey: 9, slug: "chalcanthite", hanzi: "石膽", pinyin: "shídǎn", flavors: ["sour"], wording: "味酸寒", stratum: "Benjing", witness: BENJING_WITNESS, cA: 0.95 },
  { survey: 10, slug: "kongqing", hanzi: "空青", pinyin: "kōngqīng", flavors: ["sweet"], wording: "味甘寒", stratum: "Benjing", witness: BENJING_WITNESS, cA: 0.95 },
  { survey: 11, slug: "cengqing", hanzi: "曾青", pinyin: "céngqīng", flavors: ["sour"], wording: "味酸小寒", stratum: "Benjing", witness: BENJING_WITNESS, cA: 0.95 },
  { survey: 12, slug: "yuyuliang", hanzi: "禹餘糧", pinyin: "yǔyúliáng", flavors: ["sweet"], wording: "味甘寒", stratum: "Benjing", witness: BENJING_WITNESS, cA: 0.95 },
  { survey: 13, slug: "taiyi-yuliang", hanzi: "太乙餘糧", pinyin: "tàiyǐyúliáng", flavors: ["sweet"], wording: "味甘平", stratum: "Benjing", witness: BENJING_WITNESS, cA: 0.95 },
  { survey: 14, slug: "white-quartz", hanzi: "白石英", pinyin: "báishíyīng", flavors: ["sweet"], wording: "味甘微溫", stratum: "Benjing", witness: BENJING_WITNESS, cA: 0.95 },
  { survey: 15, slug: "purple-quartz", hanzi: "紫石英", pinyin: "zǐshíyīng", flavors: ["sweet"], wording: "味甘溫", stratum: "Benjing", witness: BENJING_WITNESS, cA: 0.95 },
  { survey: 16, slug: "five-colour-stone-fats", hanzi: "五色石脂", pinyin: "wǔsèshízhī", flavors: ["sweet"], wording: "味甘平", stratum: "Benjing", witness: BENJING_WITNESS, cA: 0.95,
    limitationExtra: "Collective headword, banked as surveyed. The entry's own colour→viscus clause （各隨五色補五臟） is a separate assertion and is not used by this bridge." },
  { survey: 17, slug: "baiqing", hanzi: "白青", pinyin: "báiqīng", flavors: ["sweet"], wording: "味甘平", stratum: "Benjing", witness: BENJING_WITNESS, cA: 0.95 },
  { survey: 18, slug: "bianqing", hanzi: "扁青", pinyin: "biǎnqīng", flavors: ["sweet"], wording: "味甘平", stratum: "Benjing", witness: BENJING_WITNESS, cA: 0.95 },
  { survey: 19, slug: "jade-fragments", hanzi: "玉屑", pinyin: "yùxiè", flavors: ["sweet"], wording: "味甘平", stratum: "Bielu", witness: QIANJIN_WITNESS, cA: 0.9 },
  { survey: 20, slug: "lüqing", hanzi: "綠青", pinyin: "lǜqīng", flavors: ["sour"], wording: "味酸寒", stratum: "Bielu", witness: QIANJIN_WITNESS, cA: 0.9 },
  { survey: 21, slug: "mangxiao", hanzi: "芒消", pinyin: "mángxiāo", flavors: ["pungent", "bitter"], wording: "味辛苦，大寒", stratum: "Bielu", witness: QIANJIN_WITNESS, cA: 0.9,
    limitationExtra: "The entry records two flavors; one correspondence is banked per recorded flavor value, neither forced into the other." },
  { survey: 22, slug: "realgar", hanzi: "雄黃", pinyin: "xiónghuáng", flavors: ["bitter"], wording: "味苦平寒", stratum: "Benjing", witness: BENJING_WITNESS, cA: 0.95 },
  { survey: 23, slug: "sulfur", hanzi: "石流黃", pinyin: "shíliúhuáng", flavors: ["sour"], wording: "味酸溫", stratum: "Benjing", witness: BENJING_WITNESS, cA: 0.95 },
  { survey: 24, slug: "orpiment", hanzi: "雌黃", pinyin: "cíhuáng", flavors: ["pungent"], wording: "味辛平", stratum: "Benjing", witness: BENJING_WITNESS, cA: 0.95 },
  { survey: 25, slug: "mercury", hanzi: "水銀", pinyin: "shuǐyín", flavors: ["pungent"], wording: "味辛寒", stratum: "Benjing", witness: BENJING_WITNESS, cA: 0.95,
    entryNote: "The substance 水銀 (quicksilver). Not the planet: classify.ts's 'mercury' is the attested planet row (Water) and is untouched by this record." },
  { survey: 26, slug: "gypsum", hanzi: "石膏", pinyin: "shígāo", flavors: ["pungent"], wording: "味辛微寒", stratum: "Benjing", witness: BENJING_WITNESS, cA: 0.95 },
  { survey: 27, slug: "lodestone", hanzi: "慈石", pinyin: "císhí", flavors: ["pungent"], wording: "味辛寒", stratum: "Benjing", witness: BENJING_WITNESS, cA: 0.95 },
  { survey: 28, slug: "ningshuishi", hanzi: "凝水石", pinyin: "níngshuǐshí", flavors: ["pungent"], wording: "味辛寒", stratum: "Benjing", witness: BENJING_WITNESS, cA: 0.95 },
  { survey: 29, slug: "yangqishi", hanzi: "陽起石", pinyin: "yángqǐshí", flavors: ["salty"], wording: "味鹹微溫", stratum: "Benjing", witness: BENJING_WITNESS, cA: 0.95 },
  { survey: 30, slug: "konggongnie", hanzi: "孔公孽", pinyin: "kǒnggōngniè", flavors: ["pungent"], wording: "味辛溫", stratum: "Benjing", witness: BENJING_WITNESS, cA: 0.95 },
  { survey: 31, slug: "yinnie", hanzi: "殷孽", pinyin: "yīnniè", flavors: ["pungent"], wording: "味辛溫", stratum: "Benjing", witness: BENJING_WITNESS, cA: 0.95 },
  { survey: 33, slug: "iron-scale", hanzi: "鐵落", pinyin: "tiěluò", flavors: ["pungent"], wording: "味辛平", stratum: "Benjing", witness: BENJING_WITNESS, cA: 0.9,
    entryNote: "Sun merges 鐵落 and 鐵 into the 鐵精 entry; the flavor wording stands in 鐵落's own clause of that merged entry." },
  { survey: 35, slug: "lishi", hanzi: "理石", pinyin: "lǐshí", flavors: ["pungent"], wording: "味辛寒", stratum: "Benjing", witness: BENJING_WITNESS, cA: 0.95 },
  { survey: 36, slug: "changshi", hanzi: "長石", pinyin: "chángshí", flavors: ["pungent"], wording: "味辛寒", stratum: "Benjing", witness: BENJING_WITNESS, cA: 0.95 },
  { survey: 37, slug: "fuqing", hanzi: "膚青", pinyin: "fūqīng", flavors: ["pungent"], wording: "味辛平", stratum: "Benjing", witness: BENJING_WITNESS, cA: 0.95 },
  { survey: 38, slug: "gold-filings", hanzi: "金屑", pinyin: "jīnxiè", flavors: ["pungent"], wording: "味辛平", stratum: "Bielu", witness: "Zhenglei Bencao / Xin Xiu Bencao (transmitted Bielu text)", cA: 0.9 },
  { survey: 39, slug: "lime", hanzi: "石灰", pinyin: "shíhuī", flavors: ["pungent"], wording: "味辛溫", stratum: "Benjing", witness: BENJING_WITNESS, cA: 0.95 },
  { survey: 40, slug: "yushi", hanzi: "礜石", pinyin: "yùshí", flavors: ["pungent"], wording: "味辛大熱", stratum: "Benjing", witness: BENJING_WITNESS, cA: 0.95 },
  { survey: 41, slug: "red-lead", hanzi: "鉛丹", pinyin: "qiāndān", flavors: ["pungent"], wording: "味辛微寒", stratum: "Benjing", witness: BENJING_WITNESS, cA: 0.7,
    limitationExtra: "The flavor itself is disputed across recensions: Sun reads 味辛微寒； the Zhenglei SK1441 head line reads 味平微寒 （平 is not among the five flavors). Banked on Sun's reading at reduced C_A; the dispute is recorded, not harmonised." },
  { survey: 42, slug: "white-lead", hanzi: "粉錫", pinyin: "fěnxī", flavors: ["pungent"], wording: "味辛寒", stratum: "Benjing", witness: BENJING_WITNESS, cA: 0.95 },
  { survey: 44, slug: "hematite", hanzi: "代赭", pinyin: "dàizhě", flavors: ["bitter"], wording: "味苦寒", stratum: "Benjing", witness: BENJING_WITNESS, cA: 0.95 },
  { survey: 47, slug: "bittern-salt", hanzi: "鹵鹽", pinyin: "lǔyán", flavors: ["bitter"], wording: "味苦寒", stratum: "Benjing", witness: BENJING_WITNESS, cA: 0.95 },
  { survey: 48, slug: "chalk", hanzi: "白堊", pinyin: "bái'è", flavors: ["bitter"], wording: "味苦溫", stratum: "Benjing", witness: BENJING_WITNESS, cA: 0.95 },
  { survey: 49, slug: "winter-ash", hanzi: "冬灰", pinyin: "dōnghuī", flavors: ["pungent"], wording: "味辛微溫", stratum: "Benjing", witness: BENJING_WITNESS, cA: 0.95,
    entryNote: "Plant ash, not a mineral — one of the survey's 50 as surveyed; the bridge turns on the recorded flavor only." },
  { survey: 50, slug: "qinglanggan", hanzi: "青琅玕", pinyin: "qīnglánggān", flavors: ["pungent"], wording: "味辛平", stratum: "Benjing", witness: BENJING_WITNESS, cA: 0.95 },
];

function buildRecord(row: RawRow, flavor: Flavor): DerivedCorrespondence {
  const corr = FLAVOR_CORRESPONDENCE[flavor];
  const confidence = Math.round(Math.min(row.cA, H7_C_B) * H7_K * 1000) / 1000;
  return {
    id: `h7:${row.slug}:${flavor}`,
    assertionKind: "DERIVED_CORRESPONDENCE",
    ruleId: "FLAVOR_BRIDGE_V1",
    subject: { slug: row.slug, hanzi: row.hanzi, pinyin: row.pinyin, surveyEntry: row.survey },
    aspect: "recorded-flavor",
    flavor,
    phase: corr.phase,
    confidence,
    confidenceInputs: { cA: row.cA, cB: H7_C_B, k: H7_K },
    evidenceGrade: "B-derived",
    derivationPath: {
      flavorAssertion: {
        text: row.stratum === "Benjing" ? "Shennong Bencao Jing （本經）" : "Mingyi Bielu （名醫別錄）",
        stratum: row.stratum,
        witness: row.witness,
        entry: row.entryNote ? `${row.hanzi} — ${row.entryNote}` : row.hanzi,
        wording: row.wording,
      },
      correspondenceAssertion: {
        text: "Suwen （素問）",
        chapter: "ch. 4, 金匱真言論",
        clause: corr.clause,
      },
      sourceAssertionIds: [
        `flavor:${row.slug}@${row.stratum === "Benjing" ? "benjing-sun" : "bielu-transmitted"}`,
        `suwen4:${flavor}-${corr.phase.toLowerCase()}`,
      ],
    },
    scope: "recorded-flavor aspect only; never the whole substance",
    limitations: row.limitationExtra ? `${STANDARD_LIMITATIONS} ${row.limitationExtra}` : STANDARD_LIMITATIONS,
    status: "admitted",
  };
}

/** All banked H7-derived correspondences: 46 records over 45
 *  substances （芒消 banks two, one per recorded flavor). */
export const DERIVED_CORRESPONDENCES: DerivedCorrespondence[] =
  ROWS.flatMap((row) => row.flavors.map((f) => buildRecord(row, f)));

/**
 * The survey substances that did NOT qualify, with the reason.
 * No record exists for any of these; the accessor returns [].
 */
export const H7_SKIPPED: { slug: string; hanzi: string; surveyEntry: number; reason: string }[] = [
  { slug: "tie-jing", hanzi: "鐵精", surveyEntry: 32, reason: "No flavor word in the entry — thermal nature only （平）. Admission condition (1) fails: there is no five-flavor value to bridge, and the nature axis does not bridge under H7." },
  { slug: "iron", hanzi: "鐵", surveyEntry: 34, reason: "No flavor and no nature stated in the entry. Admission condition (1) fails." },
  { slug: "mirror-nose-tin", hanzi: "錫鏡鼻", surveyEntry: 43, reason: "No flavor stated in the substance's own clause: in Sun it shares the 粉錫 entry, whose flavor clause belongs to 粉錫； its own Zhenglei flavor was not fetched in the survey. Banking 粉錫's flavor for it would be a transfer, not a recorded value." },
  { slug: "rong-salt", hanzi: "戎鹽", surveyEntry: 45, reason: "No flavor stated in the substance's own Benjing main clause. A flavor （鹹） appears only in the merged transmitted head line shared by the three salt entries, where it cannot be attributed to this substance's entry." },
  { slug: "great-salt", hanzi: "大鹽", surveyEntry: 46, reason: "No flavor stated in the substance's own Benjing main clause. A flavor （甘鹹） appears only in the merged transmitted head line shared by the three salt entries, where it cannot be attributed to this substance's entry." },
];

/**
 * The derived accessor — the ONLY door to the banked records
 * (amendment A2). Matches by English slug or by hanzi. The
 * ordinary classification lookup (lookupClassification in
 * classify.ts) never returns these records.
 */
export function derivedCorrespondencesOf(substance: string): DerivedCorrespondence[] {
  const key = substance.toLowerCase();
  return DERIVED_CORRESPONDENCES.filter(
    (r) => r.subject.slug === key || r.subject.hanzi === substance,
  );
}

/** Every banked record, for consumers that explicitly request
 *  the derived layer. */
export function allDerivedCorrespondences(): DerivedCorrespondence[] {
  return [...DERIVED_CORRESPONDENCES];
}
