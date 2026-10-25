/**
 * Sanitizes a single cell value to prevent CSV formula injection.
 * If a value starts with =, +, -, @, \t, or \r, prefix with a single quote.
 * Wraps values with double quotes if they contain commas, newlines, or quotes.
 * @param {any} value
 * @returns {string}
 */
function sanitizeCsvCell(value) {
  if (value === null || value === undefined) {
    return '""';
  }

  let str = String(value);

  // Guard against CSV formula injection
  const dangerousChars = ['=', '+', '-', '@', '\t', '\r'];
  if (dangerousChars.some((char) => str.startsWith(char))) {
    str = `'${str}`;
  }

  // Escape double quotes by doubling them
  str = str.replace(/"/g, '""');

  return `"${str}"`;
}

/**
 * Converts an array of task documents into CSV string format.
 * Columns: Title, Description, Status, Priority, Due date, Assignee name, Assignee email, Created by, Created at, Updated at
 * @param {Array<Object>} tasks
 * @returns {string}
 */
function generateTasksCsv(tasks) {
  const headers = [
    'Title',
    'Description',
    'Status',
    'Priority',
    'Due date',
    'Assignee name',
    'Assignee email',
    'Created by',
    'Created at',
    'Updated at'
  ];

  const headerRow = headers.map(sanitizeCsvCell).join(',');
  const rows = tasks.map((task) => {
    const assigneeName = task.assignee?.name || 'Unassigned';
    const assigneeEmail = task.assignee?.email || '';
    const createdByName = task.createdBy?.name || task.createdBy?.email || 'Unknown';
    const dueDate = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '';
    const createdAt = task.createdAt ? new Date(task.createdAt).toISOString() : '';
    const updatedAt = task.updatedAt ? new Date(task.updatedAt).toISOString() : '';

    return [
      sanitizeCsvCell(task.title),
      sanitizeCsvCell(task.description || ''),
      sanitizeCsvCell(task.status),
      sanitizeCsvCell(task.priority),
      sanitizeCsvCell(dueDate),
      sanitizeCsvCell(assigneeName),
      sanitizeCsvCell(assigneeEmail),
      sanitizeCsvCell(createdByName),
      sanitizeCsvCell(createdAt),
      sanitizeCsvCell(updatedAt)
    ].join(',');
  });

  return [headerRow, ...rows].join('\r\n');
}

module.exports = {
  sanitizeCsvCell,
  generateTasksCsv
};
