import type { Request, Response } from 'express';
import { authService } from '../services/authService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { success } from '../utils/http.js';
import { REFRESH_COOKIE, refreshCookieOptions } from '../utils/cookies.js';

function setRefresh(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, refreshCookieOptions());
}

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.register(req.body);
    setRefresh(res, result.refreshToken);
    res.status(201).json(success('Registered successfully', { user: result.user, accessToken: result.accessToken }));
  }),
  login: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.login(req.body);
    setRefresh(res, result.refreshToken);
    res.json(success('Logged in successfully', { user: result.user, accessToken: result.accessToken }));
  }),
  refresh: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.refresh(req.cookies[REFRESH_COOKIE]);
    setRefresh(res, result.refreshToken);
    res.json(success('Token refreshed', { accessToken: result.accessToken }));
  }),
  logout: asyncHandler(async (req: Request, res: Response) => {
    await authService.logout(req.cookies[REFRESH_COOKIE]);
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
    res.json(success('Logged out', null));
  }),
  forgot: asyncHandler(async (req: Request, res: Response) => {
    await authService.forgotPassword(req.body.email);
    res.json(success('If that email exists, a reset link has been issued', null));
  }),
  reset: asyncHandler(async (req: Request, res: Response) => {
    await authService.resetPassword(req.body.token, req.body.password);
    res.json(success('Password reset successfully', null));
  }),
  changePassword: asyncHandler(async (req: Request, res: Response) => {
    await authService.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
    res.json(success('Password changed successfully', null));
  }),
  profile: asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.getProfile(req.user!.id);
    res.json(success('Profile fetched', user));
  }),
  updateProfile: asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.updateProfile(req.user!.id, req.body);
    res.json(success('Profile updated', user));
  }),
};
