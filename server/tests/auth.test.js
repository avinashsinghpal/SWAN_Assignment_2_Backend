const request = require('supertest');
const app = require('../src/app');
require('./setup');

describe('Auth Endpoints', () => {
  const validUser = {
    name: 'Sarah Connor',
    email: 'sarah@example.com',
    password: 'Password123!',
    confirmPassword: 'Password123!'
  };

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully and return user and token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe(validUser.email);
      expect(res.body.data.user.role).toBe('user');
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(res.body.data.accessToken).toBeDefined();

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((c) => c.includes('tasklane_refresh_token'))).toBe(true);
    });

    it('should fail when email is already registered', async () => {
      await request(app).post('/api/v1/auth/register').send(validUser);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validUser);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('should fail when passwords do not match', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...validUser,
          confirmPassword: 'DifferentPassword123!'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should fail when registering as admin without secret key', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...validUser,
          email: 'admin_attempt@example.com',
          role: 'admin'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should fail when registering as admin with invalid secret key', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...validUser,
          email: 'admin_attempt2@example.com',
          role: 'admin',
          adminSecretKey: 'wrong_secret'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Invalid admin secret key');
    });

    it('should successfully register as admin with valid secret key', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...validUser,
          email: 'admin_success@example.com',
          role: 'admin',
          adminSecretKey: 'admin_secret_key_123'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('admin');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send(validUser);
    });

    it('should login successfully with correct credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: validUser.email,
          password: validUser.password
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(validUser.email);
      expect(res.body.data.accessToken).toBeDefined();

      const cookies = res.headers['set-cookie'];
      expect(cookies.some((c) => c.includes('tasklane_refresh_token'))).toBe(true);
    });

    it('should reject login with wrong password without leaking details', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: validUser.email,
          password: 'WrongPassword999'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Invalid email or password');
    });
  });

  describe('Token Refresh and Reuse Detection', () => {
    it('should rotate refresh token and issue new access token', async () => {
      const registerRes = await request(app)
        .post('/api/v1/auth/register')
        .send(validUser);

      const cookies = registerRes.headers['set-cookie'];
      const rawCookie = cookies.find((c) => c.startsWith('tasklane_refresh_token='));
      const tokenVal = rawCookie.split(';')[0].split('=')[1];

      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`tasklane_refresh_token=${tokenVal}`]);

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.success).toBe(true);
      expect(refreshRes.body.data.accessToken).toBeDefined();

      // Check reuse detection: using the old token again must be rejected
      const replayRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`tasklane_refresh_token=${tokenVal}`]);

      expect(replayRes.status).toBe(401);
      expect(replayRes.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should retrieve current user with valid Bearer token', async () => {
      const registerRes = await request(app)
        .post('/api/v1/auth/register')
        .send(validUser);

      const accessToken = registerRes.body.data.accessToken;

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(validUser.email);
    });

    it('should fail when no authorization header is provided', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
