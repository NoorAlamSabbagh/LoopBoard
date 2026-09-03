import type { FilterQuery } from 'mongoose';
import { Types } from 'mongoose';
import { Company } from '../models/Company.js';
import { Job } from '../models/Job.js';
import { Question } from '../models/Question.js';
import { Skill } from '../models/Skill.js';
import { Note } from '../models/Note.js';
import { PreparationTopic } from '../models/PreparationTopic.js';
import { WEAK_TOPIC_THRESHOLDS } from '../constants/scores.js';
import { STACK_PREP } from '../constants/stackPrep.js';
import { hashQuestion } from '../utils/crypto.js';
import { ApiError } from '../utils/ApiError.js';
import path from 'node:path';
import { BUILTIN_STACK_TECH, stackIdFromName, topicSlugFromTech } from '../utils/stackSlug.js';
import { ensureStackFolder, parseQaBlocks, readPrepNoteFiles, titleFromFile } from './prepNotesFiles.js';
import {
  preparationTopicRepository,
  skillRepository,
  studyPlanRepository,
} from '../repositories/index.js';
import { requireOwned } from '../utils/requireOwned.js';
import { searchFilter } from '../utils/search.js';
import { logActivity } from './activityService.js';
import { skillEngine, targetingService } from './targetingService.js';

type ListQuery = { page: number; limit: number; sort?: string; q?: string };

function displayStackName(stack: string) {
  if (stack === 'other') return 'Other';
  return STACK_PREP.find((s) => s.id === stack)?.name ?? stack.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function techFromTopicSlug(slug: string) {
  if (slug === 'system-design') return 'system_design';
  return slug.replaceAll('-', '_');
}

export const preparationService = {
  async listTopics(userId: string, query: ListQuery) {
    const filter: FilterQuery<unknown> = searchFilter(query.q, ['name', 'slug', 'notes']);
    return preparationTopicRepository.list(userId, { ...query, filter });
  },
  async getTopic(userId: string, id: string) {
    return requireOwned(preparationTopicRepository, userId, id, 'Topic');
  },
  async createTopic(userId: string, data: Record<string, unknown>) {
    const topic = await preparationTopicRepository.create({ ...data, userId });
    const id = String((topic as { id?: string }).id);
    await logActivity(userId, 'created', 'preparation_topic', id, `Added topic ${String(data.name)}`);
    return topic;
  },
  async updateTopic(userId: string, id: string, data: Record<string, unknown>) {
    await requireOwned(preparationTopicRepository, userId, id, 'Topic');
    const updated = await preparationTopicRepository.update(userId, id, data);
    await targetingService.recomputeAll(userId);
    return updated;
  },
  async removeTopic(userId: string, id: string) {
    await requireOwned(preparationTopicRepository, userId, id, 'Topic');
    await preparationTopicRepository.delete(userId, id);
  },
  async weakAreas(userId: string) {
    const [questions, skills] = await Promise.all([
      Question.find({ userId, deletedAt: null }).lean(),
      Skill.find({ userId }).lean(),
    ]);
    const byTech = new Map<string, { asked: number; weak: number; confidence: number }>();
    for (const q of questions) {
      const key = q.technology;
      const current = byTech.get(key) ?? { asked: 0, weak: 0, confidence: 0 };
      current.asked += 1;
      current.confidence += q.confidence;
      if (q.status === 'weak' || q.status === 'not_studied') current.weak += 1;
      byTech.set(key, current);
    }
    return [...byTech.entries()]
      .map(([technology, stats]) => {
        const avgConfidence = stats.asked ? stats.confidence / stats.asked : 0;
        const skill = skills.find((s) => s.name.toLowerCase() === technology.replaceAll('_', ' '));
        const blended = skill?.blendedScore ?? 40;
        const needsPrep =
          stats.asked >= WEAK_TOPIC_THRESHOLDS.minOccurrences &&
          (blended < WEAK_TOPIC_THRESHOLDS.blendedScoreBelow ||
            avgConfidence <= WEAK_TOPIC_THRESHOLDS.lowConfidenceMax);
        return {
          technology,
          questionsAsked: stats.asked,
          weakOrUnstudied: stats.weak,
          avgConfidence: Number(avgConfidence.toFixed(2)),
          blendedScore: blended,
          needsPreparation: needsPrep,
        };
      })
      .filter((row) => row.needsPreparation)
      .sort((a, b) => (a.blendedScore ?? 0) - (b.blendedScore ?? 0));
  },
  async listPlans(userId: string, query: ListQuery) {
    return studyPlanRepository.list(userId, query);
  },
  async createPlan(userId: string, data: Record<string, unknown>) {
    const plan = await studyPlanRepository.create({ ...data, userId });
    const id = String((plan as { id?: string }).id);
    await logActivity(userId, 'created', 'study_plan', id, `Created study plan ${String(data.title)}`);
    return plan;
  },
  async updatePlan(userId: string, id: string, data: Record<string, unknown>) {
    await requireOwned(studyPlanRepository, userId, id, 'Study plan');
    return studyPlanRepository.update(userId, id, data);
  },
  async generate(userId: string, targetCompanyId?: string) {
    const company = targetCompanyId
      ? await Company.findOne({ _id: targetCompanyId, userId, deletedAt: null }).lean()
      : await targetingService.recommendedNextTarget(userId);
    const jobs = company
      ? await Job.find({ userId, companyId: company._id, deletedAt: null }).lean()
      : [];
    const weak = await this.weakAreas(userId);
    const required = [...new Set(jobs.flatMap((j) => (j.requiredSkills ?? []).map((s) => s.name)))];
    const items = [
      ...required.slice(0, 3).map((name) => ({
        title: name,
        priority: 1 as const,
        reason: company ? `Required by ${company.name}` : 'Required by current targets',
        done: false,
      })),
      ...weak.slice(0, 4).map((w, i) => ({
        title: w.technology,
        priority: (i < 2 ? 2 : 3) as 2 | 3,
        reason: `Weak topic — ${w.questionsAsked} questions, confidence ${w.avgConfidence}`,
        done: false,
      })),
    ].slice(0, 8);

    return studyPlanRepository.create({
      userId,
      title: company ? `Plan for ${company.name}` : 'Recommended preparation plan',
      status: 'active',
      source: 'generated',
      targetCompanyId: company?._id ? String(company._id) : undefined,
      items,
    });
  },

  async seedStackNotes(userId: string) {
    const topics = await PreparationTopic.find({ userId }).lean();
    let questionsAdded = 0;
    let notesAdded = 0;

    for (const stack of STACK_PREP) {
      const slug = stack.id === 'system_design' ? 'system-design' : stack.id;
      let topic = topics.find((t) => t.slug === slug);
      if (!topic) {
        topic = (
          await PreparationTopic.create({
            userId,
            slug,
            name: stack.name,
            progress: 0,
            confidence: 1,
          })
        ).toObject();
        topics.push(topic);
      }

      // Bulk-upsert all questions for this stack in a single DB round-trip.
      // The unique index on {userId, normalizedHash} prevents duplicates automatically.
      if (stack.questions.length > 0) {
        const uidObj = new Types.ObjectId(userId);
        const ops = stack.questions.map((q) => {
          const normalizedHash = hashQuestion(q.prompt);
          return {
            updateOne: {
              filter: { userId, normalizedHash, deletedAt: null },
              update: {
                $setOnInsert: {
                  userId: uidObj,
                  prompt: q.prompt,
                  normalizedHash,
                  technology: stack.id,
                  category: stack.id,
                  difficulty: q.difficulty,
                  answer: q.answer,
                  notes: q.notes,
                  status: 'not_studied' as const,
                  confidence: 1,
                  deletedAt: null,
                },
              },
              upsert: true,
            },
          };
        });
        const result = await Question.bulkWrite(ops, { ordered: false });
        questionsAdded += result.upsertedCount;
      }

      // Bulk-upsert notes for this stack in a single DB round-trip.
      if (stack.notes.length > 0) {
        const uidObj = new Types.ObjectId(userId);
        const noteOps = stack.notes.map((n) => ({
          updateOne: {
            filter: { userId, title: n.title, tags: stack.id },
            update: {
              $setOnInsert: {
                userId: uidObj,
                title: n.title,
                content: n.content,
                tags: [stack.id, 'stack'],
                entityType: 'preparation_topic' as const,
                entityId: topic!._id,
              },
            },
            upsert: true,
          },
        }));
        const noteResult = await Note.bulkWrite(noteOps, { ordered: false });
        notesAdded += noteResult.upsertedCount;
      }
    }

    await logActivity(userId, 'created', 'question', userId, `Seeded stack notes (${questionsAdded} questions, ${notesAdded} notes)`);
    return { questionsAdded, notesAdded, stacks: STACK_PREP.length };
  },

  async listStacks(userId: string) {
    const uid = new Types.ObjectId(userId);
    const [topics, qRows, nRows, fRows] = await Promise.all([
      PreparationTopic.find({ userId }).lean(),
      Question.aggregate([
        { $match: { userId: uid, deletedAt: null } },
        { $group: { _id: '$technology', n: { $sum: 1 } } },
      ]),
      Note.aggregate([
        { $match: { userId: uid, tags: 'stack' } },
        { $unwind: '$tags' },
        { $match: { $expr: { $not: { $regexMatch: { input: '$tags', regex: '^(stack|src:|upload:)' } } } } },
        { $group: { _id: '$tags', n: { $sum: 1 } } },
      ]),
      Note.aggregate([
        { $match: { userId: uid, tags: 'stack', folderPath: { $nin: ['', null] } } },
        { $unwind: '$tags' },
        { $match: { $expr: { $not: { $regexMatch: { input: '$tags', regex: '^(stack|src:|upload:)' } } } } },
        { $group: { _id: { tag: '$tags', folder: '$folderPath' } } },
        { $group: { _id: '$_id.tag', folders: { $sum: 1 } } },
      ]),
    ]);
    const qMap = Object.fromEntries(qRows.map((r) => [String(r._id), r.n as number]));
    const nMap = Object.fromEntries(nRows.map((r) => [String(r._id), r.n as number]));
    const fMap = Object.fromEntries(fRows.map((r) => [String(r._id), r.folders as number]));

    const builtins = [
      ...STACK_PREP.map((s) => ({
        id: s.id,
        name: s.name,
        blurb: s.blurb,
        custom: false,
        questions: qMap[s.id] ?? 0,
        notes: nMap[s.id] ?? 0,
        folders: fMap[s.id] ?? 0,
      })),
      {
        id: 'other',
        name: 'Other',
        blurb: 'Notes from folders that do not match a stack',
        custom: false,
        questions: qMap.other ?? 0,
        notes: nMap.other ?? 0,
        folders: fMap.other ?? 0,
      },
    ];

    const custom = topics
      .filter((t) => t.kind === 'stack')
      .map((t) => {
        const id = techFromTopicSlug(t.slug);
        return {
          id,
          name: t.name,
          blurb: t.notes || `Your ${t.name} notes and questions`,
          custom: true,
          topicId: String(t._id),
          questions: qMap[id] ?? 0,
          notes: nMap[id] ?? 0,
          folders: fMap[id] ?? 0,
        };
      })
      .filter((s) => !BUILTIN_STACK_TECH.has(s.id))
      .sort((a, b) => a.name.localeCompare(b.name));

    return [...builtins, ...custom];
  },

  async createStack(userId: string, data: { name: string; blurb?: string }) {
    const id = stackIdFromName(data.name);
    if (!id) throw ApiError.badRequest('Give the stack a name with letters or numbers');
    if (BUILTIN_STACK_TECH.has(id)) {
      throw ApiError.conflict(`${displayStackName(id)} is already on the hub`);
    }

    const slug = topicSlugFromTech(id);
    let topic = await PreparationTopic.findOne({ userId, slug });
    if (topic?.kind === 'stack') {
      throw ApiError.conflict(`${topic.name} is already a stack`);
    }
    if (topic) {
      topic.kind = 'stack';
      topic.name = data.name.trim();
      if (data.blurb) topic.notes = data.blurb;
      await topic.save();
    } else {
      topic = await PreparationTopic.create({
        userId,
        slug,
        name: data.name.trim(),
        notes: data.blurb ?? '',
        progress: 0,
        confidence: 1,
        kind: 'stack',
      });
    }

    await ensureStackFolder(id);
    await logActivity(userId, 'created', 'preparation_topic', String(topic._id), `Added stack ${topic.name}`);
    return {
      id,
      name: topic.name,
      blurb: topic.notes || `Your ${topic.name} notes and questions`,
      custom: true,
      topicId: String(topic._id),
      questions: 0,
      notes: 0,
      folders: 0,
    };
  },

  async importFolderNotes(userId: string, targetStack?: string) {
    const { dir, files } = await readPrepNoteFiles(targetStack);
    if (files.length === 0) {
      return { dir, scanned: 0, notesAdded: 0, notesUpdated: 0, questionsAdded: 0, stack: targetStack };
    }

    const topics = await PreparationTopic.find({ userId }).lean();
    let notesAdded = 0;
    let notesUpdated = 0;
    let questionsAdded = 0;

    for (const file of files) {
      const stack = file.stack;
      const slug = topicSlugFromTech(stack);
      let topic = topics.find((t) => t.slug === slug);
      if (!topic) {
        topic = (
          await PreparationTopic.create({
            userId,
            slug,
            name: displayStackName(stack),
            progress: 0,
            confidence: 1,
            kind: BUILTIN_STACK_TECH.has(stack) ? 'topic' : 'stack',
          })
        ).toObject();
        topics.push(topic);
      } else if (!BUILTIN_STACK_TECH.has(stack) && topic.kind !== 'stack') {
        await PreparationTopic.updateOne({ _id: topic._id }, { $set: { kind: 'stack' } });
        topic.kind = 'stack';
      }

      const sourceTag = `src:${file.rel}`;
      const tech = stack === 'other' ? 'other' : stack;
      const existingNote = await Note.findOne({ userId, tags: sourceTag });
      if (existingNote) {
        existingNote.title = file.title;
        existingNote.content = file.content;
        existingNote.folderPath = file.folderPath || '';
        await existingNote.save();
        notesUpdated += 1;
      } else {
        await Note.create({
          userId,
          title: file.title,
          content: file.content,
          folderPath: file.folderPath || '',
          tags: [tech, 'stack', sourceTag],
          entityType: 'preparation_topic',
          entityId: topic._id,
        });
        notesAdded += 1;
      }

      for (const q of file.questions) {
        const normalizedHash = hashQuestion(q.prompt);
        const exists = await Question.findOne({ userId, normalizedHash, deletedAt: null });
        if (exists) continue;
        await Question.create({
          userId,
          prompt: q.prompt,
          normalizedHash,
          technology: tech,
          category: tech,
          difficulty: 'medium',
          answer: q.answer,
          notes: `Imported from prep-notes/${file.rel}`,
          status: 'not_studied',
          confidence: 1,
        });
        questionsAdded += 1;
      }
    }

    await logActivity(
      userId,
      'created',
      'note',
      userId,
      `Imported ${notesAdded} notes${targetStack ? ` into ${displayStackName(targetStack)}` : ''} from prep-notes`,
    );
    return { dir, scanned: files.length, notesAdded, notesUpdated, questionsAdded, stack: targetStack };
  },

  async importStackFiles(
    userId: string,
    data: { stack: string; files: Array<{ path: string; name?: string; content: string }> },
  ) {
    const rawStack = data.stack.trim().toLowerCase();
    const stack = rawStack === 'system-design' ? 'system_design' : rawStack.replaceAll('-', '_');
    const slug = topicSlugFromTech(stack);

    let topic = await PreparationTopic.findOne({ userId, slug });
    if (!topic) {
      topic = await PreparationTopic.create({
        userId,
        slug,
        name: displayStackName(stack),
        progress: 0,
        confidence: 1,
        kind: BUILTIN_STACK_TECH.has(stack) ? 'topic' : 'stack',
      });
    }

    let notesAdded = 0;
    let notesUpdated = 0;
    let questionsAdded = 0;
    const foldersSet = new Set<string>();

    for (const f of data.files) {
      const content = f.content?.trim();
      if (!content) continue;

      const normPath = f.path.replace(/\\/g, '/').replace(/^\/+/, '');
      const parts = normPath.split('/');

      let folderPath = '';
      if (parts.length > 1) {
        if (parts[0]?.toLowerCase() === stack || parts[0]?.toLowerCase() === slug) {
          folderPath = parts.slice(1, -1).join('/');
        } else {
          folderPath = parts.slice(0, -1).join('/');
        }
      }

      if (folderPath) foldersSet.add(folderPath);

      const title = (
        titleFromFile(normPath, content) || f.name || path.basename(normPath).replace(/\.(md|markdown|txt|js|ts|jsx|tsx|py|json|sql|html|css|yaml|yml|sh)$/i, '')
      ).slice(0, 300);
      const safeContent = content.slice(0, 500000);
      const questions = parseQaBlocks(safeContent);
      const sourceTag = `upload:${stack}/${normPath}`.slice(0, 300);

      let note = await Note.findOne({
        userId,
        entityId: topic._id,
        $or: [{ tags: sourceTag }, { title, folderPath }],
      });

      if (note) {
        note.title = title;
        note.content = safeContent;
        note.folderPath = folderPath;
        if (!note.tags.includes(stack)) note.tags.push(stack);
        if (!note.tags.includes('stack')) note.tags.push('stack');
        if (!note.tags.includes(sourceTag)) note.tags.push(sourceTag);
        await note.save();
        notesUpdated += 1;
      } else {
        await Note.create({
          userId,
          title,
          content: safeContent,
          folderPath,
          tags: [stack, 'stack', sourceTag],
          entityType: 'preparation_topic',
          entityId: topic._id,
        });
        notesAdded += 1;
      }

      for (const q of questions) {
        const prompt = q.prompt.slice(0, 4000);
        const normalizedHash = hashQuestion(prompt);
        const exists = await Question.findOne({ userId, normalizedHash, deletedAt: null });
        if (exists) continue;
        await Question.create({
          userId,
          prompt,
          normalizedHash,
          technology: stack,
          category: stack,
          difficulty: 'medium',
          answer: q.answer ? q.answer.slice(0, 100000) : '',
          notes: `Imported from ${normPath}`.slice(0, 50000),
          status: 'not_studied',
          confidence: 1,
        });
        questionsAdded += 1;
      }
    }

    await logActivity(
      userId,
      'created',
      'note',
      userId,
      `Imported ${notesAdded} notes and ${questionsAdded} questions into ${displayStackName(stack)}`,
    );

    return {
      stack,
      scanned: data.files.length,
      notesAdded,
      notesUpdated,
      questionsAdded,
      folders: Array.from(foldersSet),
    };
  },
};

export const skillService = {
  async list(userId: string) {
    await skillEngine.deriveAll(userId);
    return skillRepository.list(userId, { page: 1, limit: 100, sort: '-blendedScore' });
  },
  async upsert(userId: string, data: { name: string; selfScore: number }) {
    const existing = await Skill.findOne({ userId, name: data.name });
    if (existing) {
      existing.selfScore = data.selfScore;
      await existing.save();
      await skillEngine.deriveAll(userId);
      return existing.toJSON();
    }
    const skill = await skillRepository.create({
      ...data,
      userId,
      blendedScore: data.selfScore,
      derivedScore: data.selfScore,
    });
    await logActivity(userId, 'created', 'skill', String((skill as { id?: string }).id), `Added skill ${data.name}`);
    return skill;
  },
  async update(userId: string, id: string, data: Record<string, unknown>) {
    await requireOwned(skillRepository, userId, id, 'Skill');
    const updated = await skillRepository.update(userId, id, data);
    await skillEngine.deriveAll(userId);
    await targetingService.recomputeAll(userId);
    return updated;
  },
  async remove(userId: string, id: string) {
    await requireOwned(skillRepository, userId, id, 'Skill');
    await skillRepository.delete(userId, id);
  },
};
