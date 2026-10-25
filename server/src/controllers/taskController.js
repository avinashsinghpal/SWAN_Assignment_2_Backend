const taskService = require('../services/taskService');
const asyncHandler = require('../utils/asyncHandler');
const { generateTasksCsv } = require('../utils/csv');
const { formatDateToISO } = require('../utils/dates');

const createTask = asyncHandler(async (req, res) => {
  const task = await taskService.createTask(req.body, req.user);
  res.status(201).json({
    success: true,
    data: { task }
  });
});

const getTasks = asyncHandler(async (req, res) => {
  const result = await taskService.getTasks(req.query, req.user);
  res.status(200).json({
    success: true,
    data: { tasks: result.tasks },
    meta: result.meta
  });
});

const getTaskById = asyncHandler(async (req, res) => {
  const task = await taskService.getTaskById(req.params.id, req.user);
  res.status(200).json({
    success: true,
    data: { task }
  });
});

const updateTask = asyncHandler(async (req, res) => {
  const task = await taskService.updateTask(req.params.id, req.body, req.user);
  res.status(200).json({
    success: true,
    data: { task }
  });
});

const updateTaskStatus = asyncHandler(async (req, res) => {
  const task = await taskService.updateTaskStatus(req.params.id, req.body, req.user);
  res.status(200).json({
    success: true,
    data: { task }
  });
});

const deleteTask = asyncHandler(async (req, res) => {
  const result = await taskService.deleteTask(req.params.id, req.user);
  res.status(200).json({
    success: true,
    data: result
  });
});

const exportCsv = asyncHandler(async (req, res) => {
  const tasks = await taskService.getTasksForExport(req.query, req.user);
  const csvContent = generateTasksCsv(tasks);

  const filename = `tasklane-tasks-${formatDateToISO()}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(csvContent);
});

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask,
  exportCsv
};
