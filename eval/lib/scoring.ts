import type { NextLinesOutput, ShotListOutput } from "../../src/lib/schemas/scene";
import type { EvalFeature } from "./provider";
import type { EvalSample } from "./samples";

export const RUBRIC_DIMENSIONS = [
  "technique",
  "emotion",
  "consistency",
] as const;

export type RubricDimension = (typeof RUBRIC_DIMENSIONS)[number];

export interface DimensionScore {
  dimension: RubricDimension;
  /** Integer from 1 (missed) to 5 (strong). */
  score: number;
  rationale: string;
  evidence: string[];
}

export interface FeatureScore {
  feature: EvalFeature;
  dimensions: DimensionScore[];
  /** Average of the three dimensions, rounded to one decimal. */
  overall: number;
}

export interface SampleScore {
  id: string;
  title: string;
  stubFlavor: string;
  features: FeatureScore[];
  /** Average across both features, rounded to one decimal. */
  overall: number;
  failed: boolean;
  reasons: string[];
}

export interface EvalRun {
  provider: string;
  model?: string;
  samples: SampleScore[];
}

const GENERIC_TECHNIQUE =
  /^(good|great|nice|solid|strong|effective|creative|interesting)?\s*(writing|technique|choice|idea)?$/i;

const REASON_MARKER =
  /\b(because|so that|so the|which|lets|allows|makes|when|while|by|to show)\b/i;

const CRAFT_TERMS = [
  "subtext",
  "plant and payoff",
  "dramatic irony",
  "show don't tell",
  "show, don't tell",
  "button",
  "rule of three",
  "cut on action",
  "silence beat",
  "status reversal",
  "isolation",
  "intimacy",
  "reveal",
  "power shift",
  "coverage",
  "continuity",
  "foreshadow",
  "motif",
  "juxtaposition",
  "framing",
  "composition",
  "tension",
  "contrast",
  "reaction",
  "rhythm",
  "pace",
  "focus",
  "insert",
  "close-up",
  "wide shot",
  "over-the-shoulder",
  "low angle",
  "high angle",
  "handheld",
];

function clampScore(value: number): number {
  return Math.max(1, Math.min(5, Math.round(value)));
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

function countDistinctMatches(text: string, terms: readonly string[]): string[] {
  const haystack = text.toLowerCase();
  return terms.filter((term) => haystack.includes(term.toLowerCase()));
}

function countReasoned(items: readonly string[]): number {
  return items.filter((item) => REASON_MARKER.test(item)).length;
}

function isSpecificTechnique(value: string): boolean {
  const technique = value.trim();
  if (technique.length < 4) return false;
  return !GENERIC_TECHNIQUE.test(technique);
}

function mentionsCraftTerm(value: string): boolean {
  const text = value.toLowerCase();
  return CRAFT_TERMS.some((term) => text.includes(term));
}

function scoreTechnique(
  named: number,
  justified: number,
  total: number,
  evidence: string[],
): DimensionScore {
  let score = 5;
  let rationale: string;

  if (named === 0) {
    score = 1;
    rationale = "No specific craft technique is named in the response.";
  } else if (justified === 0) {
    score = 2;
    rationale =
      "A technique is named, but nothing explains why it serves this scene.";
  } else if (named < total || justified < total) {
    score = 3;
    rationale =
      "Some suggestions name a technique and justify it, but not all of them do.";
  } else if (!evidence.some((line) => mentionsCraftTerm(line))) {
    score = 4;
    rationale =
      "Every item names and justifies a technique, though the vocabulary is broad.";
  } else {
    score = 5;
    rationale =
      "Every item names a specific technique and explains why it fits the scene.";
  }

  return {
    dimension: "technique",
    score: clampScore(score),
    rationale,
    evidence,
  };
}

export function scoreNextLines(
  sample: EvalSample,
  output: NextLinesOutput,
): FeatureScore {
  const suggestions = output.suggestions;
  const joined = suggestions
    .map(
      (suggestion) =>
        `${suggestion.type} ${suggestion.text} ${suggestion.technique} ${suggestion.why}`,
    )
    .join("\n");

  const named = suggestions.filter((suggestion) =>
    isSpecificTechnique(suggestion.technique),
  ).length;
  const justified = suggestions.filter((suggestion) => {
    if (!isSpecificTechnique(suggestion.technique)) return false;
    // The technique field carries the label; `why` has to explain the choice.
    // Requiring the label to be repeated inside `why` punished otherwise sound
    // explanations from real models, so a causal marker is enough here.
    return REASON_MARKER.test(suggestion.why);
  }).length;

  const technique = scoreTechnique(
    named,
    justified,
    suggestions.length,
    suggestions.map(
      (suggestion) =>
        `"${suggestion.technique}" — ${suggestion.why}`,
    ),
  );

  const matchedEmotion = countDistinctMatches(
    joined,
    sample.rubric.emotionKeywords,
  );
  const matchedAnti = countDistinctMatches(
    joined,
    sample.rubric.antiEmotionKeywords,
  );

  let emotionScore = 2;
  let emotionRationale =
    "The response does not use any of the scene's expected emotional language.";
  if (matchedAnti.length > 0 && matchedEmotion.length === 0) {
    emotionScore = 1;
    emotionRationale = `The response uses tonal language the scene should avoid (${matchedAnti.join(", ")}).`;
  } else if (matchedAnti.length > 0) {
    emotionScore = 2;
    emotionRationale = `The response mixes the right mood with tonal words the scene should avoid (${matchedAnti.join(", ")}).`;
  } else if (matchedEmotion.length === 1) {
    emotionScore = 3;
    emotionRationale = "The response gestures at the scene's mood but stays generic.";
  } else if (matchedEmotion.length === 2) {
    emotionScore = 4;
    emotionRationale = "The response clearly matches the scene's emotional register.";
  } else if (matchedEmotion.length >= 3) {
    emotionScore = 5;
    emotionRationale = "The response consistently matches the scene's emotional register.";
  }

  const matchedExpected = countDistinctMatches(
    joined,
    sample.rubric.expectedMentions,
  );
  const matchedForbidden = countDistinctMatches(
    joined,
    sample.rubric.forbiddenMentions,
  );

  let consistencyScore = 2;
  let consistencyRationale =
    "The response does not anchor itself in any established story detail.";
  if (matchedForbidden.length > 0) {
    consistencyScore = 1;
    consistencyRationale = `The response contradicts the story bible (${matchedForbidden.join(", ")}).`;
  } else if (matchedExpected.length === 1) {
    consistencyScore = 3;
    consistencyRationale =
      "The response references one established story detail.";
  } else if (matchedExpected.length === 2) {
    consistencyScore = 4;
    consistencyRationale =
      "The response stays consistent and references two established story details.";
  } else if (matchedExpected.length >= 3) {
    consistencyScore = 5;
    consistencyRationale =
      "The response stays consistent and anchors itself in established story details.";
  }

  const emotion: DimensionScore = {
    dimension: "emotion",
    score: emotionScore,
    rationale: emotionRationale,
    evidence: [
      `Matched mood: ${matchedEmotion.join(", ") || "none"}`,
      `Avoided tone: ${matchedAnti.join(", ") || "none"}`,
    ],
  };

  const consistency: DimensionScore = {
    dimension: "consistency",
    score: consistencyScore,
    rationale: consistencyRationale,
    evidence: [
      `Story anchors: ${matchedExpected.join(", ") || "none"}`,
      `Contradictions: ${matchedForbidden.join(", ") || "none"}`,
    ],
  };

  const dimensions = [technique, emotion, consistency];
  return {
    feature: "nextLines",
    dimensions,
    overall: roundOne(
      dimensions.reduce((total, dimension) => total + dimension.score, 0) /
        dimensions.length,
    ),
  };
}

export function scoreShotList(
  sample: EvalSample,
  output: ShotListOutput,
): FeatureScore {
  const joined = [
    ...output.shots.map(
      (shot) =>
        `${shot.shotType} ${shot.cameraAngle} ${shot.movement} ${shot.description} ${shot.reasoning}`,
    ),
    output.coverageNotes,
  ].join("\n");

  const named = output.shots.filter((shot) =>
    mentionsCraftTerm(shot.reasoning),
  ).length;
  const justified = output.shots.filter(
    (shot) =>
      mentionsCraftTerm(shot.reasoning) && REASON_MARKER.test(shot.reasoning),
  ).length;

  const technique = scoreTechnique(
    named,
    justified,
    output.shots.length,
    output.shots.map(
      (shot) => `${shot.shotType}: ${shot.reasoning}`,
    ),
  );

  const matchedEmotion = countDistinctMatches(
    joined,
    sample.rubric.emotionKeywords,
  );
  const matchedAnti = countDistinctMatches(
    joined,
    sample.rubric.antiEmotionKeywords,
  );

  let emotionScore = 2;
  let emotionRationale =
    "The shot list does not use any of the scene's expected emotional language.";
  if (matchedAnti.length > 0 && matchedEmotion.length === 0) {
    emotionScore = 1;
    emotionRationale = `The shot list is pitched against the scene's tone (${matchedAnti.join(", ")}).`;
  } else if (matchedAnti.length > 0) {
    emotionScore = 2;
    emotionRationale = `The shot list mixes the right mood with tonal words the scene should avoid (${matchedAnti.join(", ")}).`;
  } else if (matchedEmotion.length === 1) {
    emotionScore = 3;
    emotionRationale =
      "The shot list gestures at the scene's mood but most choices stay generic.";
  } else if (matchedEmotion.length === 2) {
    emotionScore = 4;
    emotionRationale =
      "The shot list mostly matches the scene's emotional register.";
  } else if (matchedEmotion.length >= 3) {
    emotionScore = 5;
    emotionRationale =
      "The shot sizes, angles, and movement consistently serve the scene's mood.";
  }

  const matchedExpected = countDistinctMatches(
    joined,
    sample.rubric.expectedMentions,
  );
  const matchedForbidden = countDistinctMatches(
    joined,
    sample.rubric.forbiddenMentions,
  );

  let consistencyScore = 2;
  let consistencyRationale =
    "The shot list does not anchor itself in any established story detail.";
  if (matchedForbidden.length > 0) {
    consistencyScore = 1;
    consistencyRationale = `The shot list contradicts the story bible (${matchedForbidden.join(", ")}).`;
  } else if (matchedExpected.length === 1) {
    consistencyScore = 3;
    consistencyRationale =
      "The shot list references one established story detail.";
  } else if (matchedExpected.length === 2) {
    consistencyScore = 4;
    consistencyRationale =
      "The shot list stays consistent and references two established story details.";
  } else if (matchedExpected.length >= 3) {
    consistencyScore = 5;
    consistencyRationale =
      "The shot list stays consistent and anchors itself in established story details.";
  }

  const emotion: DimensionScore = {
    dimension: "emotion",
    score: emotionScore,
    rationale: emotionRationale,
    evidence: [
      `Matched mood: ${matchedEmotion.join(", ") || "none"}`,
      `Avoided tone: ${matchedAnti.join(", ") || "none"}`,
    ],
  };

  const consistency: DimensionScore = {
    dimension: "consistency",
    score: consistencyScore,
    rationale: consistencyRationale,
    evidence: [
      `Story anchors: ${matchedExpected.join(", ") || "none"}`,
      `Contradictions: ${matchedForbidden.join(", ") || "none"}`,
    ],
  };

  const dimensions = [technique, emotion, consistency];
  return {
    feature: "shotList",
    dimensions,
    overall: roundOne(
      dimensions.reduce((total, dimension) => total + dimension.score, 0) /
        dimensions.length,
    ),
  };
}

const FAILURE_LABELS: Record<RubricDimension, string> = {
  technique: "technique not named and justified",
  emotion: "tone misses the scene",
  consistency: "contradicts the story bible",
};

export function summarizeSample(
  sample: EvalSample,
  features: FeatureScore[],
): SampleScore {
  const overall = roundOne(
    features.reduce((total, feature) => total + feature.overall, 0) /
      features.length,
  );
  const lowDimensions = features.flatMap((feature) =>
    feature.dimensions
      .filter((dimension) => dimension.score <= 2)
      .map((dimension) => ({ feature, dimension })),
  );

  const reasons = lowDimensions.map(
    ({ feature, dimension }) =>
      `${feature.feature}: ${FAILURE_LABELS[dimension.dimension]} (${dimension.score}/5)`,
  );

  return {
    id: sample.id,
    title: sample.title,
    stubFlavor: sample.stubFlavor,
    features,
    overall,
    failed: lowDimensions.length > 0 || overall < 3,
    reasons:
      reasons.length > 0
        ? reasons
        : overall < 3
          ? ["overall score is below 3"]
          : [],
  };
}
