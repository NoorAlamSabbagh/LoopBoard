import type { FilterQuery } from 'mongoose';
import { Types } from 'mongoose';
import { Question } from '../models/Question.js';
import { QuestionOccurrence } from '../models/QuestionOccurrence.js';
import { questionOccurrenceRepository, questionRepository } from '../repositories/index.js';
import { hashQuestion } from '../utils/crypto.js';
import { requireOwned } from '../utils/requireOwned.js';
import { searchFilter } from '../utils/search.js';
import { logActivity } from './activityService.js';
import { skillEngine } from './targetingService.js';

type ListQuery = {
  page: number;
  limit: number;
  sort?: string;
  q?: string;
  companyId?: string;
  technology?: string;
  category?: string;
  difficulty?: string;
  status?: string;
  confidence?: number;
};

export const questionService = {
  async list(userId: string, query: ListQuery) {
    const filter: FilterQuery<unknown> = {
      ...searchFilter(query.q, ['prompt', 'notes', 'answer']),
      ...(query.technology ? { technology: query.technology } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.difficulty ? { difficulty: query.difficulty } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.confidence ? { confidence: query.confidence } : {}),
    };
    return questionRepository.list(userId, { page: query.page, limit: query.limit, sort: query.sort, filter });
  },

  async get(userId: string, id: string) {
    const question = await requireOwned(questionRepository, userId, id, 'Question');
    const occurrences = await questionOccurrenceRepository.list(userId, {
      page: 1,
      limit: 50,
      filter: { questionId: id },
    });
    return { question, occurrences: occurrences.items };
  },

  async create(
    userId: string,
    data: Record<string, unknown> & { companyId?: string; interviewId?: string; jobId?: string; myAnswer?: string; askedAt?: string },
  ) {
    const normalizedHash = hashQuestion(String(data.prompt));
    let question = await Question.findOne({ userId, normalizedHash, deletedAt: null });
    if (!question) {
      question = await Question.create({
        userId,
        prompt: data.prompt,
        normalizedHash,
        technology: data.technology,
        category: data.category ?? data.technology,
        difficulty: data.difficulty,
        answer: data.answer,
        correctAnswer: data.correctAnswer,
        confidence: data.confidence ?? 1,
        status: data.status ?? 'not_studied',
        notes: data.notes,
      });
    } else {
      Object.assign(question, {
        answer: data.answer ?? question.answer,
        correctAnswer: data.correctAnswer ?? question.correctAnswer,
        confidence: data.confidence ?? question.confidence,
        status: data.status ?? question.status,
      });
      await question.save();
    }

    if (data.companyId) {
      await QuestionOccurrence.create({
        userId,
        questionId: question.id,
        companyId: data.companyId,
        jobId: data.jobId,
        interviewId: data.interviewId,
        roundName: data.roundName,
        askedAt: data.askedAt ? new Date(data.askedAt) : new Date(),
        myAnswer: data.myAnswer,
        outcome: data.outcome ?? 'unknown',
      });
    }

    await logActivity(userId, 'created', 'question', question.id, `Saved question: ${String(data.prompt).slice(0, 80)}`);
    await skillEngine.deriveAll(userId);
    return question.toJSON();
  },

  async update(userId: string, id: string, data: Record<string, unknown>) {
    await requireOwned(questionRepository, userId, id, 'Question');
    if (data.prompt) data.normalizedHash = hashQuestion(String(data.prompt));
    const updated = await questionRepository.update(userId, id, data);
    await skillEngine.deriveAll(userId);
    return updated;
  },

  async remove(userId: string, id: string) {
    await requireOwned(questionRepository, userId, id, 'Question');
    await questionRepository.delete(userId, id);
  },

  async mostAsked(userId: string) {
    return QuestionOccurrence.aggregate([
      { $match: { userId: new Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$questionId',
          companies: { $addToSet: '$companyId' },
          timesAsked: { $sum: 1 },
        },
      },
      { $addFields: { companyCount: { $size: '$companies' } } },
      { $sort: { companyCount: -1, timesAsked: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'questions',
          localField: '_id',
          foreignField: '_id',
          as: 'question',
        },
      },
      { $unwind: '$question' },
      {
        $project: {
          prompt: '$question.prompt',
          technology: '$question.technology',
          companyCount: 1,
          timesAsked: 1,
        },
      },
    ]);
  },
};
