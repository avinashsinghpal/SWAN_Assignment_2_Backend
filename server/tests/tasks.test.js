const request = require('supertest');
const app = require('../src/app');
require('./setup');

describe('Task Endpoints', () => {
  let userToken;
  let user;

  beforeEach(async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Task Tester',
      email: 'tester@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });
    userToken = regRes.body.data.accessToken;
    user = regRes.body.data.user;
  });

  describe('POST /api/v1/tasks', () => {
    it('should create a task successfully with valid data', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Implement authentication flow',
          description: 'Set up JWT tokens and refresh rotation',
          priority: 'high',
          status: 'todo',
          dueDate: tomorrow.toISOString()
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.task.title).toBe('Implement authentication flow');
      expect(res.body.data.task.priority).toBe('high');
      expect(res.body.data.task.createdBy._id).toBe(user._id);
    });

    it('should reject task creation when title is too short', async () => {
      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'No'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject task creation when due date is in the past', async () => {
      const past = new Date();
      past.setDate(past.getDate() - 3);

      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Past due task creation attempt',
          dueDate: past.toISOString()
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.details[0].message).toContain('earlier than today');
    });
  });

  describe('GET /api/v1/tasks', () => {
    beforeEach(async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Create 3 tasks
      await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Task Alpha', priority: 'low', status: 'todo' });

      await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Task Beta', priority: 'medium', status: 'in_progress' });

      await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Task Gamma', priority: 'high', status: 'completed' });
    });

    it('should list tasks with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/tasks?page=1&limit=2')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.tasks.length).toBe(2);
      expect(res.body.meta.total).toBe(3);
      expect(res.body.meta.totalPages).toBe(2);
    });

    it('should filter tasks by search keyword', async () => {
      const res = await request(app)
        .get('/api/v1/tasks?search=Alpha')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.tasks.length).toBe(1);
      expect(res.body.data.tasks[0].title).toBe('Task Alpha');
    });

    it('should filter tasks by status and priority', async () => {
      const res = await request(app)
        .get('/api/v1/tasks?status=in_progress&priority=medium')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.tasks.length).toBe(1);
      expect(res.body.data.tasks[0].title).toBe('Task Beta');
    });
  });

  describe('Task Status and Comments', () => {
    it('should update task status and log activity', async () => {
      const createRes = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Test Task for Status' });

      const taskId = createRes.body.data.task._id;

      const patchRes = await request(app)
        .patch(`/api/v1/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'in_progress', order: 2500 });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.task.status).toBe('in_progress');
      expect(patchRes.body.data.task.order).toBe(2500);

      const activityRes = await request(app)
        .get(`/api/v1/tasks/${taskId}/activity`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(activityRes.status).toBe(200);
      expect(activityRes.body.data.activities.some((a) => a.type === 'status_changed')).toBe(true);
    });

    it('should add and retrieve comments on a task', async () => {
      const createRes = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Task with comments' });

      const taskId = createRes.body.data.task._id;

      const commentRes = await request(app)
        .post(`/api/v1/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ body: 'This is a test comment' });

      expect(commentRes.status).toBe(201);
      expect(commentRes.body.data.comment.body).toBe('This is a test comment');

      const getCommentsRes = await request(app)
        .get(`/api/v1/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(getCommentsRes.status).toBe(200);
      expect(getCommentsRes.body.data.comments.length).toBe(1);
    });
  });

  describe('CSV Export', () => {
    it('should stream CSV with sanitized cells against formula injection', async () => {
      await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: '=cmd|/c calc!A0', // Potential CSV formula injection
          description: '+sum(1,2)'
        });

      const res = await request(app)
        .get('/api/v1/tasks/export/csv')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('tasklane-tasks-');
      // Must be prefixed with single quote to prevent formula injection
      expect(res.text).toContain("'=cmd|/c calc!A0");
      expect(res.text).toContain("'+sum(1,2)");
    });
  });
});
