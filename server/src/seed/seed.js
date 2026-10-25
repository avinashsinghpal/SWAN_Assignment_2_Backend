const mongoose = require('mongoose');
const env = require('../config/env');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Task = require('../models/Task');
const Comment = require('../models/Comment');
const Activity = require('../models/Activity');
const logger = require('../config/logger');

async function seed() {
  if (env.NODE_ENV === 'production' && !env.ALLOW_SEED) {
    logger.error('Refusing to run seed in production environment without ALLOW_SEED=true');
    process.exit(1);
  }

  logger.info('Starting Tasklane database seeding process...');
  await connectDB();

  // Clear existing collections for idempotent re-seed
  await Promise.all([
    User.deleteMany({}),
    Task.deleteMany({}),
    Comment.deleteMany({}),
    Activity.deleteMany({})
  ]);

  logger.info('Cleared existing data');

  // Create Users
  const adminPasswordHash = await User.hashPassword(env.SEED_ADMIN_PASSWORD);
  const userPasswordHash = await User.hashPassword(env.SEED_USER_PASSWORD);

  const admin = await User.create({
    name: 'Eleanor Vance',
    email: 'admin@tasklane.demo',
    passwordHash: adminPasswordHash,
    role: 'admin',
    isActive: true
  });

  const maya = await User.create({
    name: 'Maya Lin',
    email: 'maya@tasklane.demo',
    passwordHash: userPasswordHash,
    role: 'user',
    isActive: true
  });

  const liam = await User.create({
    name: 'Liam Chen',
    email: 'liam@tasklane.demo',
    passwordHash: userPasswordHash,
    role: 'user',
    isActive: true
  });

  const ana = await User.create({
    name: 'Ana Silva',
    email: 'ana@tasklane.demo',
    passwordHash: userPasswordHash,
    role: 'user',
    isActive: true
  });

  logger.info('Created 4 demo accounts: 1 admin and 3 users');

  const users = [admin, maya, liam, ana];

  // Helper date generators
  const now = new Date();
  const daysFromNow = (days) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d;
  };

  // 36 realistic business tasks with diverse statuses, priorities, due dates
  const taskTemplates = [
    {
      title: 'Prepare Q4 vendor contract reviews',
      description: 'Audit service level agreements and compile renegotiation targets for cloud and tooling vendors before annual budget finalization.',
      status: 'in_progress',
      priority: 'high',
      dueDate: daysFromNow(2),
      assignee: maya._id,
      createdBy: admin._id
    },
    {
      title: 'Fix checkout payment validation bug',
      description: 'Stripe webhook verification intermittent timeout on 3D-secure step. Add idempotency key checks and exponential backoff retry.',
      status: 'in_progress',
      priority: 'high',
      dueDate: daysFromNow(-3), // Overdue
      assignee: liam._id,
      createdBy: maya._id
    },
    {
      title: 'Draft customer onboarding checklist',
      description: 'Create standard operating procedures and self-serve onboarding guides for enterprise workspace administrators.',
      status: 'completed',
      priority: 'medium',
      dueDate: daysFromNow(-5),
      assignee: ana._id,
      createdBy: admin._id,
      completedAt: daysFromNow(-4)
    },
    {
      title: 'Configure automated database backup replication',
      description: 'Enable cross-region point-in-time recovery on MongoDB cluster and verify disaster recovery runbook procedures.',
      status: 'todo',
      priority: 'high',
      dueDate: daysFromNow(5),
      assignee: liam._id,
      createdBy: admin._id
    },
    {
      title: 'Conduct weekly security dependency audit',
      description: 'Scan npm vulnerabilities across client and server packages. Update lockfile and patch transitive CVEs.',
      status: 'completed',
      priority: 'medium',
      dueDate: daysFromNow(-1),
      assignee: liam._id,
      createdBy: liam._id,
      completedAt: daysFromNow(-1)
    },
    {
      title: 'Optimize dashboard analytics database queries',
      description: 'Add compound indexes on task completion dates and assignee status fields to reduce slow aggregation metrics.',
      status: 'in_progress',
      priority: 'medium',
      dueDate: daysFromNow(1),
      assignee: maya._id,
      createdBy: admin._id
    },
    {
      title: 'Redesign transactional email notification templates',
      description: 'Streamline HTML email layouts for task assignment notifications and weekly summary digests using clean typography.',
      status: 'todo',
      priority: 'low',
      dueDate: daysFromNow(12),
      assignee: ana._id,
      createdBy: maya._id
    },
    {
      title: 'Audit role-based permissions matrix',
      description: 'Ensure strict least-privilege boundary between standard workspace users and organization owners across all API routes.',
      status: 'completed',
      priority: 'high',
      dueDate: daysFromNow(-7),
      assignee: admin._id,
      createdBy: admin._id,
      completedAt: daysFromNow(-6)
    },
    {
      title: 'Refactor search input with debounced server filter',
      description: 'Implement 300ms debounce and keyboard shortcut focus listener for global task lookup in the navigation header.',
      status: 'completed',
      priority: 'medium',
      dueDate: daysFromNow(-2),
      assignee: liam._id,
      createdBy: maya._id,
      completedAt: daysFromNow(-2)
    },
    {
      title: 'Update privacy policy and terms of service',
      description: 'Coordinate with legal counsel to clarify cross-border data residency and cookie consent provisions for EU workspaces.',
      status: 'todo',
      priority: 'low',
      dueDate: daysFromNow(20),
      assignee: admin._id,
      createdBy: admin._id
    },
    {
      title: 'Build CSV export with formula injection guards',
      description: 'Ensure cell values beginning with mathematical prefixes are sanitized before client download stream.',
      status: 'completed',
      priority: 'high',
      dueDate: daysFromNow(-8),
      assignee: liam._id,
      createdBy: admin._id,
      completedAt: daysFromNow(-7)
    },
    {
      title: 'Resolve Safari responsive flexbox overflow in board view',
      description: 'Columns fail to scroll horizontally on iOS 16 mobile WebKit. Replace nested calc styles with proper min-w-0 containment.',
      status: 'in_progress',
      priority: 'high',
      dueDate: daysFromNow(-1), // Overdue
      assignee: maya._id,
      createdBy: ana._id
    },
    {
      title: 'Implement token refresh rotation and reuse detection',
      description: 'Rotate refresh token family on every exchange and invalidate entire family if revoked token replay is observed.',
      status: 'completed',
      priority: 'high',
      dueDate: daysFromNow(-10),
      assignee: liam._id,
      createdBy: admin._id,
      completedAt: daysFromNow(-9)
    },
    {
      title: 'Schedule quarterly team retrospective meeting',
      description: 'Collect asynchronous feedback notes, align sprint velocity metrics, and schedule action items presentation.',
      status: 'todo',
      priority: 'low',
      dueDate: daysFromNow(8),
      assignee: ana._id,
      createdBy: admin._id
    },
    {
      title: 'Verify accessible color contrast ratios on form inputs',
      description: 'Ensure all placeholder and border colors adhere to WCAG 2.1 AA 4.5:1 ratio against white surface panels.',
      status: 'completed',
      priority: 'medium',
      dueDate: daysFromNow(-3),
      assignee: ana._id,
      createdBy: maya._id,
      completedAt: daysFromNow(-3)
    },
    {
      title: 'Benchmark Redis caching layer for activity feeds',
      description: 'Evaluate cache hit ratios and memory footprint under 500 concurrent WebSocket notification connections.',
      status: 'todo',
      priority: 'low',
      dueDate: daysFromNow(18),
      assignee: liam._id,
      createdBy: admin._id
    },
    {
      title: 'Consolidate error handling and HTTP status codes',
      description: 'Review controller wrappers and guarantee uniform envelope structure across all resource endpoints.',
      status: 'completed',
      priority: 'medium',
      dueDate: daysFromNow(-4),
      assignee: maya._id,
      createdBy: admin._id,
      completedAt: daysFromNow(-4)
    },
    {
      title: 'Implement drag and drop Kanban column ordering',
      description: 'Integrate dnd-kit sensors and handle touch interactions for mobile devices alongside keyboard navigation.',
      status: 'in_progress',
      priority: 'high',
      dueDate: daysFromNow(3),
      assignee: maya._id,
      createdBy: liam._id
    },
    {
      title: 'Prepare product release notes for version 2.4',
      description: 'Highlight improved filter persistence in URL query params, performance gains, and new activity timeline views.',
      status: 'todo',
      priority: 'medium',
      dueDate: daysFromNow(7),
      assignee: ana._id,
      createdBy: admin._id
    },
    {
      title: 'Investigate memory footprint during batch report generation',
      description: 'Profile V8 heap allocations during large multi-tenant data exports and transition to stream pipelines.',
      status: 'todo',
      priority: 'medium',
      dueDate: daysFromNow(14),
      assignee: liam._id,
      createdBy: admin._id
    },
    {
      title: 'Configure automated health check alerts in monitoring',
      description: 'Wire synthetic ping checks to alerting channels with 3-minute threshold for rapid incident triage.',
      status: 'completed',
      priority: 'high',
      dueDate: daysFromNow(-12),
      assignee: liam._id,
      createdBy: admin._id,
      completedAt: daysFromNow(-11)
    },
    {
      title: 'Document REST API schema with OpenAPI specification',
      description: 'Provide comprehensive endpoint documentation including request bodies, authentication headers, and response models.',
      status: 'in_progress',
      priority: 'medium',
      dueDate: daysFromNow(4),
      assignee: admin._id,
      createdBy: admin._id
    },
    {
      title: 'Set up end-to-end smoke testing pipeline in CI',
      description: 'Add Playwright headless browser suite running critical path tests on merge to main branch.',
      status: 'todo',
      priority: 'medium',
      dueDate: daysFromNow(9),
      assignee: liam._id,
      createdBy: admin._id
    },
    {
      title: 'Implement account deactivation safeguards',
      description: 'Ensure last remaining organization administrator cannot demote or deactivate their own credentials.',
      status: 'completed',
      priority: 'high',
      dueDate: daysFromNow(-6),
      assignee: admin._id,
      createdBy: admin._id,
      completedAt: daysFromNow(-5)
    },
    {
      title: 'Refactor modal drawers to trap keyboard focus',
      description: 'Verify Escape key dismiss, Tab navigation cycling, and focus restoration to trigger elements on close.',
      status: 'in_progress',
      priority: 'medium',
      dueDate: daysFromNow(2),
      assignee: ana._id,
      createdBy: maya._id
    },
    {
      title: 'Draft incident response communication playbook',
      description: 'Standardize status page update templates and internal escalation protocols for service degradations.',
      status: 'todo',
      priority: 'low',
      dueDate: daysFromNow(25),
      assignee: admin._id,
      createdBy: admin._id
    },
    {
      title: 'Sanitize user profile inputs against XSS payloads',
      description: 'Enforce strict schema validation on display names and normalize email addresses before database write.',
      status: 'completed',
      priority: 'high',
      dueDate: daysFromNow(-14),
      assignee: maya._id,
      createdBy: admin._id,
      completedAt: daysFromNow(-13)
    },
    {
      title: 'Integrate daily deadline reminder cron job',
      description: 'Schedule automated background evaluation for tasks due within 24 hours with graceful fallback when SMTP is unconfigured.',
      status: 'in_progress',
      priority: 'medium',
      dueDate: daysFromNow(1),
      assignee: liam._id,
      createdBy: admin._id
    },
    {
      title: 'Optimize client bundle size and code splitting',
      description: 'Lazy load chart visualizers and heavy modal dependencies to achieve sub-second initial route paint times.',
      status: 'completed',
      priority: 'medium',
      dueDate: daysFromNow(-5),
      assignee: maya._id,
      createdBy: ana._id,
      completedAt: daysFromNow(-4)
    },
    {
      title: 'Review third-party API rate limits and quotas',
      description: 'Analyze telemetry logs to evaluate headroom against upstream external provider thresholds.',
      status: 'todo',
      priority: 'low',
      dueDate: daysFromNow(15),
      assignee: liam._id,
      createdBy: admin._id
    },
    {
      title: 'Implement smooth scroll navigation anchors',
      description: 'Ensure marketing landing sections navigate fluidly on mobile viewports without URL hash clutter.',
      status: 'completed',
      priority: 'low',
      dueDate: daysFromNow(-2),
      assignee: ana._id,
      createdBy: maya._id,
      completedAt: daysFromNow(-2)
    },
    {
      title: 'Validate multi-select filter combinations in URL parameters',
      description: 'Ensure query params serialize and parse arrays cleanly across page refreshes and browser history navigation.',
      status: 'in_progress',
      priority: 'medium',
      dueDate: daysFromNow(3),
      assignee: maya._id,
      createdBy: admin._id
    }
  ];

  let orderIndex = 1000;
  const createdTasks = [];

  for (const t of taskTemplates) {
    const task = await Task.create({
      ...t,
      order: orderIndex
    });
    orderIndex += 1000;
    createdTasks.push(task);

    // Initial activity
    await Activity.create({
      task: task._id,
      taskTitle: task.title,
      actor: task.createdBy,
      type: 'task_created',
      meta: {
        status: task.status,
        priority: task.priority
      },
      createdAt: task.createdAt
    });

    // If completed, add status change activity
    if (task.status === 'completed') {
      await Activity.create({
        task: task._id,
        taskTitle: task.title,
        actor: task.assignee || task.createdBy,
        type: 'status_changed',
        meta: { from: 'in_progress', to: 'completed' },
        createdAt: task.completedAt || new Date()
      });
    }
  }

  logger.info(`Seeded ${createdTasks.length} tasks with activity history`);

  // Add realistic comments
  const sampleComments = [
    {
      task: createdTasks[0]._id,
      author: maya._id,
      body: 'I have compiled the initial list of 8 software vendors with upcoming renewal dates. Uploading analysis draft shortly.'
    },
    {
      task: createdTasks[0]._id,
      author: admin._id,
      body: 'Excellent. Please flag any contract that exceeds a 5 percent annual price increase.'
    },
    {
      task: createdTasks[1]._id,
      author: liam._id,
      body: 'Identified root cause: transient network latency during 3DS callback. Implementing retry handler with exponential backoff.'
    },
    {
      task: createdTasks[1]._id,
      author: maya._id,
      body: 'Staging test passed successfully across 20 synthetic charge events. Ready for code review.'
    },
    {
      task: createdTasks[2]._id,
      author: ana._id,
      body: 'Documented all 12 key steps and verified with beta team customers.'
    },
    {
      task: createdTasks[11]._id,
      author: maya._id,
      body: 'Fix verified across iOS Safari and Chrome Android.'
    }
  ];

  for (const c of sampleComments) {
    const comment = await Comment.create(c);
    const task = createdTasks.find((t) => t._id.toString() === c.task.toString());
    await Activity.create({
      task: task._id,
      taskTitle: task.title,
      actor: c.author,
      type: 'comment_added',
      meta: {
        commentId: comment._id,
        preview: c.body.substring(0, 60)
      }
    });
  }

  logger.info(`Seeded ${sampleComments.length} comments`);
  logger.info('Database seeding completed successfully without errors');
  await disconnectDB();
  process.exit(0);
}

if (require.main === module) {
  seed().catch((err) => {
    logger.error('Seeding failed', { error: err.message });
    process.exit(1);
  });
}

module.exports = seed;
