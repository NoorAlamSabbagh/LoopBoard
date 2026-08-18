import { z } from 'zod';
import { WORK_MODES } from '../constants/enums.js';

const password = z.string().min(8).max(128);

export const registerBody = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().email().max(254),
  password,
});

export const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotBody = z.object({
  email: z.string().email(),
});

export const resetBody = z.object({
  token: z.string().min(16),
  password,
});

export const changePasswordBody = z.object({
  currentPassword: z.string().min(1),
  newPassword: password,
});

export const profileBody = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    phone: z.string().max(40).optional(),
    location: z.string().max(160).optional(),
    yearsOfExperience: z.number().min(0).max(60).optional(),
    currentRole: z.string().max(160).optional(),
    targetRole: z.string().max(160).optional(),
    expectedSalary: z
      .object({
        min: z.number().min(0).optional(),
        max: z.number().min(0).optional(),
        currency: z.string().max(8).optional(),
      })
      .optional(),
    preferredLocations: z.array(z.string()).optional(),
    preferredWorkMode: z.array(z.enum(WORK_MODES)).optional(),
    github: z.string().max(300).optional(),
    linkedin: z.string().max(300).optional(),
    portfolio: z.string().max(300).optional(),
    defaultResumeId: z.string().optional(),
    timezone: z.string().max(64).optional(),
  })
  .strict();
