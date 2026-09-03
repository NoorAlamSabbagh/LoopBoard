import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { cache } from '../config/redis.js';
import { DEFAULT_PREPARATION_TOPICS } from '../constants/topics.js';
import { companyService } from './companyService.js';
import { preparationService } from './prepSkillService.js';
import { User } from '../models/User.js';
import { PreparationTopic } from '../models/PreparationTopic.js';
import { ApiError } from '../utils/ApiError.js';
import { randomToken, sha256 } from '../utils/crypto.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';

const BCRYPT_ROUNDS = 10; // 10 is industry-standard secure and 4× faster than 12 on low-CPU servers
const RESET_TTL_SECONDS = 60 * 60;

function refreshKey(userId: string, jti: string) {
  return `refresh:${userId}:${jti}`;
}

function resetKey(tokenHash: string) {
  return `reset:${tokenHash}`;
}

async function issueTokens(userId: string, email: string) {
  const jti = randomUUID();
  const accessToken = signAccessToken({ sub: userId, email });
  const refreshToken = signRefreshToken({ sub: userId, email, jti });
  await cache.set(
    refreshKey(userId, jti),
    '1',
    env.JWT_REFRESH_EXPIRES_DAYS * 24 * 60 * 60,
  );
  return { accessToken, refreshToken, jti };
}

async function seedPrepTopics(userId: string) {
  await PreparationTopic.insertMany(
    DEFAULT_PREPARATION_TOPICS.map((topic) => ({
      userId,
      slug: topic.slug,
      name: topic.name,
      progress: 0,
      confidence: 1,
    })),
  );
}

export const authService = {
  async register(input: { name: string; email: string; password: string }) {
    const email = input.email.toLowerCase();
    const existing = await User.findOne({ email });
    if (existing) throw ApiError.conflict('Email already registered');

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const user = await User.create({ name: input.name, email, passwordHash });

    // Fire-and-forget: seed default data in the background so the JWT is returned
    // immediately (~1s). The dashboard will populate within a few seconds after login.
    void Promise.all([
      seedPrepTopics(user.id),
      companyService.seedTargets(user.id),
      preparationService.seedStackNotes(user.id),
    ]).catch((err) => logger.error({ err, userId: user.id }, 'Background seeding failed'));

    const tokens = await issueTokens(user.id, email);
    return { user: user.toJSON(), ...tokens };
  },

  async login(input: { email: string; password: string }) {
    const email = input.email.toLowerCase();
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user?.passwordHash) throw ApiError.unauthorized('Invalid email or password');
    const match = await bcrypt.compare(input.password, user.passwordHash);
    if (!match) throw ApiError.unauthorized('Invalid email or password');
    const tokens = await issueTokens(user.id, email);
    return { user: user.toJSON(), ...tokens };
  },

  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) throw ApiError.unauthorized('Refresh token required');
    try {
      const payload = verifyRefreshToken(refreshToken);
      const exists = await cache.get(refreshKey(payload.sub, payload.jti));
      if (!exists) throw ApiError.unauthorized('Refresh token revoked');
      await cache.del(refreshKey(payload.sub, payload.jti));
      return issueTokens(payload.sub, payload.email);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw ApiError.unauthorized('Invalid refresh token');
    }
  },

  async logout(refreshToken: string | undefined) {
    if (!refreshToken) return;
    try {
      const payload = verifyRefreshToken(refreshToken);
      await cache.del(refreshKey(payload.sub, payload.jti));
    } catch {
      // already invalid
    }
  },

  async forgotPassword(email: string) {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return;
    const token = randomToken();
    await cache.set(resetKey(sha256(token)), user.id, RESET_TTL_SECONDS);
    logger.info({ email: user.email, token: env.NODE_ENV === 'development' ? token : undefined }, 'Password reset issued');
  },

  async resetPassword(token: string, password: string) {
    const userId = await cache.get(resetKey(sha256(token)));
    if (!userId) throw ApiError.badRequest('Invalid or expired reset token');
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await User.findByIdAndUpdate(userId, { passwordHash, passwordChangedAt: new Date() });
    await cache.del(resetKey(sha256(token)));
    await revokeAllRefresh(userId);
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await User.findById(userId).select('+passwordHash');
    if (!user?.passwordHash) throw ApiError.notFound('User not found');
    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) throw ApiError.unauthorized('Current password is incorrect');
    user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    user.passwordChangedAt = new Date();
    await user.save();
    await revokeAllRefresh(userId);
  },

  async getProfile(userId: string) {
    const user = await User.findById(userId);
    if (!user) throw ApiError.notFound('User not found');
    return user.toJSON();
  },

  async updateProfile(userId: string, data: Record<string, unknown>) {
    const user = await User.findByIdAndUpdate(userId, data, { new: true, runValidators: true });
    if (!user) throw ApiError.notFound('User not found');
    return user.toJSON();
  },
};

async function revokeAllRefresh(userId: string) {
  const keys = await cache.keys(`refresh:${userId}:*`);
  if (keys.length) await cache.del(...keys);
}
