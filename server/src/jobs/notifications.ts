import cron from 'node-cron';
import { Interview } from '../models/Interview.js';
import { Recruiter } from '../models/Recruiter.js';
import { Job } from '../models/Job.js';
import { PreparationTopic } from '../models/PreparationTopic.js';
import { Notification } from '../models/Notification.js';
import { logger } from '../config/logger.js';

async function exists(userId: unknown, type: string, entityId: unknown, dueAt: Date) {
  return Notification.exists({ userId, type, entityId, dueAt });
}

export function startNotificationJobs() {
  cron.schedule('15 * * * *', async () => {
    try {
      const now = new Date();
      const tomorrowStart = new Date(now);
      tomorrowStart.setHours(0, 0, 0, 0);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);
      const tomorrowEnd = new Date(tomorrowStart);
      tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

      const interviews = await Interview.find({
        deletedAt: null,
        status: { $in: ['scheduled', 'rescheduled'] },
        scheduledAt: { $gte: tomorrowStart, $lt: tomorrowEnd },
      }).lean();

      for (const interview of interviews) {
        if (await exists(interview.userId, 'interview_tomorrow', interview._id, interview.scheduledAt)) continue;
        await Notification.create({
          userId: interview.userId,
          type: 'interview_tomorrow',
          title: 'Interview tomorrow',
          body: `${interview.roundName} is scheduled tomorrow`,
          entityType: 'interview',
          entityId: interview._id,
          dueAt: interview.scheduledAt,
          channel: 'in_app',
        });
      }

      const followUps = await Recruiter.find({ nextFollowUpAt: { $lte: now } }).lean();
      for (const recruiter of followUps) {
        if (!recruiter.nextFollowUpAt) continue;
        if (await exists(recruiter.userId, 'follow_up_due', recruiter._id, recruiter.nextFollowUpAt)) continue;
        await Notification.create({
          userId: recruiter.userId,
          type: 'follow_up_due',
          title: 'Follow-up due',
          body: `Follow up with ${recruiter.name}`,
          entityType: 'recruiter',
          entityId: recruiter._id,
          dueAt: recruiter.nextFollowUpAt,
          channel: 'in_app',
        });
      }

      const reviews = await PreparationTopic.find({ nextReviewAt: { $lte: now } }).lean();
      for (const topic of reviews) {
        if (!topic.nextReviewAt) continue;
        if (await exists(topic.userId, 'preparation_due', topic._id, topic.nextReviewAt)) continue;
        await Notification.create({
          userId: topic.userId,
          type: 'preparation_due',
          title: 'Preparation due',
          body: `Review ${topic.name}`,
          entityType: 'preparation_topic',
          entityId: topic._id,
          dueAt: topic.nextReviewAt,
          channel: 'in_app',
        });
      }

      const deadlines = await Job.find({ deletedAt: null, deadlineAt: { $lte: new Date(now.getTime() + 86400000), $gte: now } }).lean();
      for (const job of deadlines) {
        if (!job.deadlineAt) continue;
        if (await exists(job.userId, 'application_deadline', job._id, job.deadlineAt)) continue;
        await Notification.create({
          userId: job.userId,
          type: 'application_deadline',
          title: 'Application deadline',
          body: `${job.title} deadline is soon`,
          entityType: 'job',
          entityId: job._id,
          dueAt: job.deadlineAt,
          channel: 'in_app',
        });
      }
    } catch (err) {
      logger.error({ err }, 'Notification job failed');
    }
  });
}
