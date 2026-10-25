const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
require('./setup');

describe('Role-Based Access Control (RBAC)', () => {
  let user1Token;
  let user1Id;
  let user2Token;
  let adminToken;
  let adminId;

  beforeEach(async () => {
    // User 1
    const u1Res = await request(app).post('/api/v1/auth/register').send({
      name: 'User One',
      email: 'user1@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });
    user1Token = u1Res.body.data.accessToken;
    user1Id = u1Res.body.data.user._id;

    // User 2
    const u2Res = await request(app).post('/api/v1/auth/register').send({
      name: 'User Two',
      email: 'user2@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });
    user2Token = u2Res.body.data.accessToken;

    // Admin
    const adminUser = await User.create({
      name: 'System Admin',
      email: 'admin@example.com',
      passwordHash: await User.hashPassword('AdminPass123!'),
      role: 'admin',
      isActive: true
    });
    adminId = adminUser._id.toString();

    const adminLoginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@example.com',
      password: 'AdminPass123!'
    });
    adminToken = adminLoginRes.body.data.accessToken;
  });

  it('should return 404 when user2 tries to read user1 private task', async () => {
    const taskRes = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ title: 'User 1 Confidential Task', assignee: user1Id });

    const taskId = taskRes.body.data.task._id;

    // User 2 attempts to read it
    const res = await request(app)
      .get(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${user2Token}`);

    expect(res.status).toBe(404);
  });

  it('should deny non-admin users from accessing /api/v1/users', async () => {
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should allow admin users to access /api/v1/users', async () => {
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.users.length).toBeGreaterThanOrEqual(3);
  });

  it('should prevent admin from demoting themselves', async () => {
    const res = await request(app)
      .patch(`/api/v1/users/${adminId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'user' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('cannot demote yourself');
  });

  it('should allow admin to change role of another user', async () => {
    const res = await request(app)
      .patch(`/api/v1/users/${user1Id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'admin' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('admin');
  });
});
