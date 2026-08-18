import {
  QUESTION_STATUS_MASTERY,
  SKILL_BLEND_WEIGHTS,
  TARGET_SCORE_WEIGHTS,
  WEAK_TOPIC_THRESHOLDS,
} from '../constants/scores.js';
import { Company } from '../models/Company.js';
import { Job } from '../models/Job.js';
import { Question } from '../models/Question.js';
import { QuestionOccurrence } from '../models/QuestionOccurrence.js';
import { PreparationTopic } from '../models/PreparationTopic.js';
import { Skill } from '../models/Skill.js';
import { InterviewPerformance } from '../models/InterviewPerformance.js';
import { User } from '../models/User.js';
import { clampScore } from '../utils/crypto.js';

type RequiredSkill = { name: string; weight?: number };

function interestScore(company: {
  interestScore?: number;
  tier?: number;
  priority?: number;
  targetStatus?: string;
}): number {
  const base = ((company.interestScore ?? 3) / 5) * 100;
  const tierBoost = company.tier === 1 ? 10 : company.tier === 2 ? 5 : 0;
  const priorityBoost = ((company.priority ?? 3) - 3) * 5;
  const statusPenalty =
    company.targetStatus === 'not_interested' || company.targetStatus === 'rejected' ? -40 : 0;
  return clampScore(base + tierBoost + priorityBoost + statusPenalty);
}

function experienceMatch(userYoe: number, required?: number): number {
  if (!required || required <= 0) return 100;
  return clampScore((userYoe / required) * 100);
}

function skillMatch(required: RequiredSkill[], skills: { name: string; blendedScore: number }[]): number {
  if (!required.length) return 50;
  const byName = new Map(skills.map((s) => [s.name.toLowerCase(), s.blendedScore]));
  let weightSum = 0;
  let scored = 0;
  for (const req of required) {
    const weight = req.weight ?? 1;
    weightSum += weight;
    scored += (byName.get(req.name.toLowerCase()) ?? 0) * weight;
  }
  return clampScore(weightSum === 0 ? 0 : scored / weightSum);
}

function questionMastery(questions: { status: string; confidence: number }[]): number | null {
  if (!questions.length) return null;
  const avg =
    questions.reduce((sum, q) => {
      const statusScore = QUESTION_STATUS_MASTERY[q.status] ?? 0;
      return sum + (statusScore + q.confidence * 20) / 2;
    }, 0) / questions.length;
  return clampScore(avg);
}

export function blendSkill(self: number, mastery: number | null, interview: number | null): number {
  if (mastery === null && interview === null) return clampScore(self);
  if (mastery === null) {
    return clampScore(0.55 * self + 0.45 * (interview ?? self));
  }
  if (interview === null) {
    return clampScore(0.5 * self + 0.5 * mastery);
  }
  return clampScore(
    SKILL_BLEND_WEIGHTS.self * self +
      SKILL_BLEND_WEIGHTS.questionMastery * mastery +
      SKILL_BLEND_WEIGHTS.interviewPerformance * interview,
  );
}

export const targetingService = {
  async recomputeCompany(userId: string, companyId: string) {
    const [user, company, jobs, skills, topics, questions] = await Promise.all([
      User.findById(userId).lean(),
      Company.findOne({ _id: companyId, userId, deletedAt: null }).lean(),
      Job.find({ userId, companyId, deletedAt: null }).lean(),
      Skill.find({ userId }).lean(),
      PreparationTopic.find({ userId }).lean(),
      Question.find({ userId, deletedAt: null }).lean(),
    ]);
    if (!user || !company) return null;

    const requiredSkills = jobs.flatMap((job) => job.requiredSkills ?? []);
    const requiredYoe = jobs.reduce((max, job) => Math.max(max, job.requiredExperienceYears ?? 0), 0);
    const techs = new Set(requiredSkills.map((s) => s.name.toLowerCase()));

    const match = skillMatch(
      requiredSkills,
      skills.map((s) => ({ name: s.name, blendedScore: s.blendedScore ?? s.selfScore ?? 0 })),
    );
    const exp = experienceMatch(user.yearsOfExperience ?? 0, requiredYoe || undefined);

    const relatedTopics = topics.filter((t) => techs.has(t.slug) || techs.has(t.name.toLowerCase()));
    const relatedQuestions = questions.filter((q) => techs.has(q.technology) || techs.has(q.category));
    const topicProgress =
      relatedTopics.length === 0
        ? 50
        : relatedTopics.reduce((sum, t) => sum + t.progress, 0) / relatedTopics.length;
    const mastery = questionMastery(
      relatedQuestions.map((q) => ({ status: q.status, confidence: q.confidence })),
    );
    const readiness = clampScore((topicProgress + (mastery ?? 50)) / 2);
    const interest = interestScore({
      interestScore: company.interestScore ?? 3,
      tier: company.tier ?? undefined,
      priority: company.priority ?? 3,
      targetStatus: company.targetStatus,
    });

    const targetScore = clampScore(
      TARGET_SCORE_WEIGHTS.skillMatch * match +
        TARGET_SCORE_WEIGHTS.experienceMatch * exp +
        TARGET_SCORE_WEIGHTS.interviewReadiness * readiness +
        TARGET_SCORE_WEIGHTS.companyInterest * interest,
    );

    await Company.updateOne(
      { _id: companyId, userId },
      {
        targetScore,
        skillMatch: match,
        experienceMatch: exp,
        interviewReadiness: readiness,
        targetScoreComputedAt: new Date(),
      },
    );

    return { targetScore, skillMatch: match, experienceMatch: exp, interviewReadiness: readiness, companyInterest: interest };
  },

  async recomputeAll(userId: string) {
    const companies = await Company.find({ userId, deletedAt: null }).select('_id').lean();
    const scores = [];
    for (const company of companies) {
      scores.push(await this.recomputeCompany(userId, String(company._id)));
    }
    return scores;
  },

  async recommendedNextTarget(userId: string) {
    await this.recomputeAll(userId);
    const excluded = ['offer', 'rejected', 'not_interested', 'applied', 'interviewing'];
    return Company.findOne({
      userId,
      deletedAt: null,
      targetStatus: { $nin: excluded },
    })
      .sort({ targetScore: -1, priority: -1 })
      .lean();
  },
};

export const skillEngine = {
  async deriveAll(userId: string) {
    const [skills, questions, performances, occurrences] = await Promise.all([
      Skill.find({ userId }).lean(),
      Question.find({ userId, deletedAt: null }).lean(),
      InterviewPerformance.find({ userId }).lean(),
      QuestionOccurrence.find({ userId }).lean(),
    ]);

    for (const skill of skills) {
      const key = skill.name.toLowerCase().replace(/\s+/g, '');
      const relatedQs = questions.filter(
        (q) => q.technology.replace('_', '') === key || q.category.replace('_', '') === key || q.technology === skill.name.toLowerCase() || q.category === skill.name.toLowerCase(),
      );
      const mastery = questionMastery(
        relatedQs.map((q) => ({ status: q.status, confidence: q.confidence })),
      );

      const relatedPerf = performances.filter(
        (p) =>
          p.weakTopics.some((t) => t.toLowerCase().includes(skill.name.toLowerCase())) ||
          p.strongTopics.some((t) => t.toLowerCase().includes(skill.name.toLowerCase())),
      );
      let interview: number | null = null;
      if (relatedPerf.length) {
        interview = clampScore(
          (relatedPerf.reduce((sum, p) => sum + p.technical * 20, 0) / relatedPerf.length) *
            (relatedPerf.some((p) => p.weakTopics.some((t) => t.toLowerCase().includes(skill.name.toLowerCase())))
              ? 0.85
              : 1),
        );
      }

      const relatedOcc = occurrences.filter((o) => relatedQs.some((q) => String(q._id) === String(o.questionId)));
      const derived = blendSkill(skill.selfScore, mastery, interview);
      await Skill.updateOne(
        { _id: skill._id },
        { derivedScore: mastery ?? skill.selfScore, blendedScore: derived, lastDerivedAt: new Date() },
      );

      void relatedOcc;
    }
  },

  isWeakTopic(input: { blended: number; occurrences: number; confidence: number }) {
    return (
      input.blended < WEAK_TOPIC_THRESHOLDS.blendedScoreBelow &&
      input.occurrences >= WEAK_TOPIC_THRESHOLDS.minOccurrences
    );
  },
};
