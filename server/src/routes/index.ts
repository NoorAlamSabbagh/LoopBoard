import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParams, paginationQuery } from '../validators/common.js';
import {
  changePasswordBody,
  forgotBody,
  loginBody,
  profileBody,
  registerBody,
  resetBody,
} from '../validators/auth.js';
import {
  applicationBody,
  applicationUpdate,
  applicationQuery,
  calendarQuery,
  communicationBody,
  companyBody,
  companyQuery,
  companyUpdate,
  compareQuery,
  generatePlanBody,
  interviewBody,
  interviewQuery,
  jobBody,
  jobQuery,
  noteBody,
  noteQuery,
  performanceBody,
  questionBody,
  questionQuery,
  recruiterBody,
  resumeBody,
  searchQuery,
  notificationQuery,
  skillBody,
  statusBody,
  timelineEntryBody,
  studyPlanBody,
  topicBody,
  stackBody,
  importFolderNotesBody,
  importStackFilesBody,
} from '../validators/resources.js';
import { authController } from '../controllers/authController.js';
import {
  applicationController,
  companyController,
  interviewController,
  jobController,
  metaController,
  noteController,
  notificationController,
  preparationController,
  questionController,
  recruiterController,
  resumeController,
  skillController,
} from '../controllers/appControllers.js';

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, path.resolve(env.UPLOAD_DIR, 'resumes')),
    filename: (req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${req.user?.id ?? 'anon'}-${Date.now()}-${safe}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /pdf|msword|officedocument.wordprocessingml.document/.test(file.mimetype);
    cb(null, ok);
  },
});

export const authRouter = Router();
authRouter.post('/register', validate({ body: registerBody }), authController.register);
authRouter.post('/login', validate({ body: loginBody }), authController.login);
authRouter.post('/refresh', authController.refresh);
authRouter.post('/logout', authController.logout);
authRouter.post('/forgot-password', validate({ body: forgotBody }), authController.forgot);
authRouter.post('/reset-password', validate({ body: resetBody }), authController.reset);
authRouter.post('/change-password', requireAuth, validate({ body: changePasswordBody }), authController.changePassword);

export const apiRouter = Router();
apiRouter.use(requireAuth);

apiRouter.get('/profile', authController.profile);
apiRouter.put('/profile', validate({ body: profileBody }), authController.updateProfile);

apiRouter.get('/dashboard', metaController.dashboard);
apiRouter.get('/analytics', metaController.analytics);
apiRouter.get('/search', validate({ query: searchQuery }), metaController.search);
apiRouter.get('/calendar', validate({ query: calendarQuery }), metaController.calendar);

apiRouter.get('/companies/compare', validate({ query: compareQuery }), companyController.compare);
apiRouter.post('/companies/seed-targets', companyController.seedTargets);
apiRouter.get('/companies', validate({ query: companyQuery }), companyController.list);
apiRouter.post('/companies', validate({ body: companyBody }), companyController.create);
apiRouter.get('/companies/:id', validate({ params: idParams }), companyController.get);
apiRouter.put('/companies/:id', validate({ params: idParams, body: companyUpdate }), companyController.update);
apiRouter.delete('/companies/:id', validate({ params: idParams }), companyController.remove);

apiRouter.get('/jobs', validate({ query: jobQuery }), jobController.list);
apiRouter.post('/jobs', validate({ body: jobBody }), jobController.create);
apiRouter.get('/jobs/:id', validate({ params: idParams }), jobController.get);
apiRouter.put('/jobs/:id', validate({ params: idParams, body: jobBody.partial() }), jobController.update);
apiRouter.delete('/jobs/:id', validate({ params: idParams }), jobController.remove);

apiRouter.get('/applications/board', applicationController.board);
apiRouter.get('/applications', validate({ query: applicationQuery }), applicationController.list);
apiRouter.post('/applications', validate({ body: applicationBody }), applicationController.create);
apiRouter.get('/applications/:id', validate({ params: idParams }), applicationController.get);
apiRouter.put('/applications/:id', validate({ params: idParams, body: applicationUpdate }), applicationController.update);
apiRouter.patch('/applications/:id/status', validate({ params: idParams, body: statusBody }), applicationController.status);
apiRouter.post('/applications/:id/timeline', validate({ params: idParams, body: timelineEntryBody }), applicationController.addTimeline);
apiRouter.delete('/applications/:id', validate({ params: idParams }), applicationController.remove);

apiRouter.get('/interviews/upcoming', interviewController.upcoming);
apiRouter.get('/interviews', validate({ query: interviewQuery }), interviewController.list);
apiRouter.post('/interviews', validate({ body: interviewBody }), interviewController.create);
apiRouter.get('/interviews/:id', validate({ params: idParams }), interviewController.get);
apiRouter.put('/interviews/:id', validate({ params: idParams, body: interviewBody.partial() }), interviewController.update);
apiRouter.post('/interviews/:id/performance', validate({ params: idParams, body: performanceBody }), interviewController.performance);
apiRouter.delete('/interviews/:id', validate({ params: idParams }), interviewController.remove);

apiRouter.get('/questions/most-asked', questionController.mostAsked);
apiRouter.get('/questions', validate({ query: questionQuery }), questionController.list);
apiRouter.post('/questions', validate({ body: questionBody }), questionController.create);
apiRouter.get('/questions/:id', validate({ params: idParams }), questionController.get);
apiRouter.put('/questions/:id', validate({ params: idParams, body: questionBody.partial() }), questionController.update);
apiRouter.delete('/questions/:id', validate({ params: idParams }), questionController.remove);

apiRouter.get('/preparation/topics', validate({ query: paginationQuery }), preparationController.topics);
apiRouter.post('/preparation/topics', validate({ body: topicBody }), preparationController.createTopic);
apiRouter.get('/preparation/topics/:id', validate({ params: idParams }), preparationController.getTopic);
apiRouter.put('/preparation/topics/:id', validate({ params: idParams, body: topicBody.partial() }), preparationController.updateTopic);
apiRouter.delete('/preparation/topics/:id', validate({ params: idParams }), preparationController.removeTopic);
apiRouter.get('/preparation/stacks', preparationController.listStacks);
apiRouter.post('/preparation/stacks', validate({ body: stackBody }), preparationController.createStack);
apiRouter.get('/preparation/weak', preparationController.weak);
apiRouter.get('/preparation/plans', validate({ query: paginationQuery }), preparationController.plans);
apiRouter.post('/preparation/plans', validate({ body: studyPlanBody }), preparationController.createPlan);
apiRouter.put('/preparation/plans/:id', validate({ params: idParams, body: studyPlanBody.partial() }), preparationController.updatePlan);
apiRouter.post('/preparation/plans/generate', validate({ body: generatePlanBody }), preparationController.generate);
apiRouter.post('/preparation/seed-stack-notes', preparationController.seedStackNotes);
apiRouter.post('/preparation/import-folder-notes', validate({ body: importFolderNotesBody }), preparationController.importFolderNotes);
apiRouter.post('/preparation/import-stack-files', validate({ body: importStackFilesBody }), preparationController.importStackFiles);

apiRouter.get('/skills', skillController.list);
apiRouter.post('/skills', validate({ body: skillBody }), skillController.upsert);
apiRouter.put('/skills/:id', validate({ params: idParams, body: skillBody.partial() }), skillController.update);
apiRouter.delete('/skills/:id', validate({ params: idParams }), skillController.remove);

apiRouter.get('/recruiters', validate({ query: paginationQuery }), recruiterController.list);
apiRouter.post('/recruiters', validate({ body: recruiterBody }), recruiterController.create);
apiRouter.get('/recruiters/:id', validate({ params: idParams }), recruiterController.get);
apiRouter.put('/recruiters/:id', validate({ params: idParams, body: recruiterBody.partial() }), recruiterController.update);
apiRouter.post('/recruiters/:id/communications', validate({ params: idParams, body: communicationBody }), recruiterController.communication);
apiRouter.delete('/recruiters/:id', validate({ params: idParams }), recruiterController.remove);

apiRouter.get('/notes', validate({ query: noteQuery }), noteController.list);
apiRouter.post('/notes', validate({ body: noteBody }), noteController.create);
apiRouter.get('/notes/:id', validate({ params: idParams }), noteController.get);
apiRouter.put('/notes/:id', validate({ params: idParams, body: noteBody.partial() }), noteController.update);
apiRouter.delete('/notes/:id', validate({ params: idParams }), noteController.remove);

apiRouter.get('/resumes', validate({ query: paginationQuery }), resumeController.list);
apiRouter.post('/resumes', upload.single('file'), validate({ body: resumeBody }), resumeController.create);
apiRouter.get('/resumes/:id', validate({ params: idParams }), resumeController.get);
apiRouter.put('/resumes/:id', validate({ params: idParams, body: resumeBody.partial() }), resumeController.update);
apiRouter.delete('/resumes/:id', validate({ params: idParams }), resumeController.remove);

apiRouter.get('/notifications', validate({ query: notificationQuery }), notificationController.list);
apiRouter.post('/notifications/:id/read', validate({ params: idParams }), notificationController.read);
