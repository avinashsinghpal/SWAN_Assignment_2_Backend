const swaggerUi = require('swagger-ui-express');

const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Tasklane REST API',
    version: '1.0.0',
    description: 'Production-ready Task Management System API with strict RBAC, JWT rotation, and audit history.'
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1 root'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      },
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'tasklane_refresh_token'
      }
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'Validation failed' },
              details: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string', example: 'title' },
                    message: { type: 'string', example: 'Title must be at least 3 characters' }
                  }
                }
              }
            }
          }
        }
      },
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          role: { type: 'string', enum: ['admin', 'user'] },
          isActive: { type: 'boolean' },
          lastLoginAt: { type: 'string', format: 'date-time' }
        }
      },
      Task: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'string', enum: ['todo', 'in_progress', 'completed'] },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          dueDate: { type: 'string', format: 'date-time' },
          isOverdue: { type: 'boolean' },
          assignee: { $ref: '#/components/schemas/User' },
          createdBy: { $ref: '#/components/schemas/User' },
          order: { type: 'number' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      }
    }
  },
  paths: {
    '/health': {
      get: {
        summary: 'Liveness and database health status',
        responses: { 200: { description: 'Healthy' } }
      }
    },
    '/auth/register': {
      post: {
        summary: 'Register a new user account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password', 'confirmPassword'],
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' },
                  password: { type: 'string' },
                  confirmPassword: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'User registered successfully' }
        }
      }
    },
    '/auth/login': {
      post: {
        summary: 'Authenticate with email and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Login successful' }
        }
      }
    },
    '/auth/refresh': {
      post: {
        summary: 'Rotate refresh token and issue new access token',
        responses: {
          200: { description: 'Token refreshed' }
        }
      }
    },
    '/auth/logout': {
      post: {
        summary: 'Revoke session and clear refresh cookie',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Logged out' }
        }
      }
    },
    '/auth/me': {
      get: {
        summary: 'Get current user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Current user data' }
        }
      }
    },
    '/tasks': {
      get: {
        summary: 'List tasks with search, filters, sort, and pagination',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'priority', in: 'query', schema: { type: 'string' } },
          { name: 'assignee', in: 'query', schema: { type: 'string' } },
          { name: 'overdue', in: 'query', schema: { type: 'boolean' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }
        ],
        responses: {
          200: { description: 'Task list with pagination metadata' }
        }
      },
      post: {
        summary: 'Create a new task',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title'],
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  priority: { type: 'string', enum: ['low', 'medium', 'high'] },
                  status: { type: 'string', enum: ['todo', 'in_progress', 'completed'] },
                  dueDate: { type: 'string', format: 'date' },
                  assignee: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Task created' }
        }
      }
    },
    '/tasks/{id}': {
      get: {
        summary: 'Get task detail by ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Task detail' }, 404: { description: 'Task not found' } }
      },
      patch: {
        summary: 'Update task fields',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Task updated' } }
      },
      delete: {
        summary: 'Delete task',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Task deleted' } }
      }
    },
    '/tasks/{id}/status': {
      patch: {
        summary: 'Update task status and Kanban ordering',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['todo', 'in_progress', 'completed'] },
                  order: { type: 'number' }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'Status updated' } }
      }
    },
    '/tasks/export/csv': {
      get: {
        summary: 'Export filtered tasks as CSV file',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'CSV file download' } }
      }
    },
    '/stats/overview': {
      get: {
        summary: 'Dashboard metrics, counts, and timeline series',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Dashboard metrics' } }
      }
    },
    '/users/members': {
      get: {
        summary: 'Minimal team member directory for assignment picker',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'List of members' } }
      }
    },
    '/users': {
      get: {
        summary: 'Team management user list with metrics (Admin only)',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'User list' } }
      }
    }
  }
};

function setupSwagger(app) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
    customSiteTitle: 'Tasklane API Documentation'
  }));
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(openApiSpec);
  });
}

module.exports = {
  setupSwagger,
  openApiSpec
};
