const authService = require('../services/authService');
const asyncHandler = require('../utils/asyncHandler');
const env = require('../config/env');

const REFRESH_COOKIE_NAME = 'tasklane_refresh_token';

function getCookieOptions() {
  const isProd = env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {})
  };
}

const register = asyncHandler(async (req, res) => {
  const clientInfo = {
    userAgent: req.headers['user-agent'] || '',
    ip: req.ip || req.socket.remoteAddress || ''
  };

  const { user, accessToken, refreshToken } = await authService.register(req.body, clientInfo);

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getCookieOptions());

  res.status(201).json({
    success: true,
    data: {
      user,
      accessToken
    }
  });
});

const login = asyncHandler(async (req, res) => {
  const clientInfo = {
    userAgent: req.headers['user-agent'] || '',
    ip: req.ip || req.socket.remoteAddress || ''
  };

  const { user, accessToken, refreshToken } = await authService.login(req.body, clientInfo);

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getCookieOptions());

  res.status(200).json({
    success: true,
    data: {
      user,
      accessToken
    }
  });
});

const refresh = asyncHandler(async (req, res) => {
  const rawRefreshToken = req.cookies[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
  const clientInfo = {
    userAgent: req.headers['user-agent'] || '',
    ip: req.ip || req.socket.remoteAddress || ''
  };

  const { user, accessToken, refreshToken } = await authService.refreshToken(rawRefreshToken, clientInfo);

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getCookieOptions());

  res.status(200).json({
    success: true,
    data: {
      user,
      accessToken
    }
  });
});

const logout = asyncHandler(async (req, res) => {
  const rawRefreshToken = req.cookies[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
  await authService.logout(rawRefreshToken);

  res.clearCookie(REFRESH_COOKIE_NAME, getCookieOptions());

  res.status(200).json({
    success: true,
    data: {
      message: 'Logged out successfully'
    }
  });
});

const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: req.user.toJSON()
    }
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const updatedUser = await authService.updateProfile(req.user._id, req.body);
  res.status(200).json({
    success: true,
    data: {
      user: updatedUser
    }
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const result = await authService.changePassword(req.user._id, req.body);
  res.clearCookie(REFRESH_COOKIE_NAME, getCookieOptions());
  res.status(200).json({
    success: true,
    data: result
  });
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  getMe,
  updateProfile,
  changePassword
};
