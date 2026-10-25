const request = require('supertest');
const app = require('../src/app');
const Task = require('../src/models/Task');
const User = require('../src/models/User');
require('./setup');

describe('Stats Overview Endpoints', () => {
  let userToken;
  let userId;
  let adminToken;

  beforeEach(async () => {
    // Regular User
    const uRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Stats User',
      email: 'stats@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });
    userToken = uRes.body.data.accessToken;
    userId = uRes.body.data.user._id;

    // Admin User
    await User.create({
      name: 'Admin User',
      email: 'statsadmin@example.com',
      passwordHash: await User.hashPassword('AdminPass123!'),
      role: 'admin',
      isActive: true
    });
    const aRes = await request(app).post('/api/v1/auth/login').send({
      email: 'statsadmin@example.com',
      password: 'AdminPass123!'
    });
    adminToken = aRes.body.data.accessToken;

    // Create tasks directly: 1 todo, 1 in_progress, 1 completed, 1 overdue
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 2);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);

    await Task.create([
      {
        title: 'Task 1 - Todo',
        status: 'todo',
        priority: 'low',
        dueDate: tomorrow,
        createdBy: userId,
        assignee: userId
      },
      {
        title: 'Task 2 - In Progress',
        status: 'in_progress',
        priority: 'medium',
        dueDate: tomorrow,
        createdBy: userId,
        assignee: userId
      },
      {
        title: 'Task 3 - Completed',
        status: 'completed',
        priority: 'high',
        dueDate: yesterday,
        completedAt: new Date(),
        createdBy: userId,
        assignee: userId
      },
      {
        title: 'Task 4 - Overdue',
        status: 'todo',
        priority: 'high',
        dueDate: yesterday, // Past due date, status != completed
        createdBy: userId,
        assignee: userId
      }
    ]);
  });

  it('should accurately calculate total, pending, completed, and overdue metrics', async () => {
    const res = await request(app)
      .get('/api/v1/stats/overview')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const totals = res.body.data.totals;

    expect(totals.total).toBe(4);
    expect(totals.pending).toBe(3); // 2 todo + 1 in_progress
    expect(totals.completed).toBe(1);
    expect(totals.overdue).toBe(1); // Task 4 is overdue

    expect(res.body.data.byStatus.todo).toBe(2);
    expect(res.body.data.byStatus.in_progress).toBe(1);
    expect(res.body.data.byStatus.completed).toBe(1);

    expect(res.body.data.byPriority.low).toBe(1);
    expect(res.body.data.byPriority.medium).toBe(1);
    expect(res.body.data.byPriority.high).toBe(2);
  });
});
