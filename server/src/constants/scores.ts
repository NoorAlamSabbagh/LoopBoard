/** Company target score weights. Must sum to 1. */
export const TARGET_SCORE_WEIGHTS = {
  skillMatch: 0.35,
  experienceMatch: 0.2,
  interviewReadiness: 0.25,
  companyInterest: 0.2,
} as const;

/** Blended skill score weights. Must sum to 1. */
export const SKILL_BLEND_WEIGHTS = {
  self: 0.4,
  questionMastery: 0.35,
  interviewPerformance: 0.25,
} as const;

export const QUESTION_STATUS_MASTERY: Record<string, number> = {
  not_studied: 0,
  studying: 30,
  weak: 40,
  good: 75,
  mastered: 100,
};

export const WEAK_TOPIC_THRESHOLDS = {
  blendedScoreBelow: 55,
  minOccurrences: 3,
  lowConfidenceMax: 2,
} as const;

export const SCORE_MIN = 0;
export const SCORE_MAX = 100;
export const CONFIDENCE_MIN = 1;
export const CONFIDENCE_MAX = 5;
