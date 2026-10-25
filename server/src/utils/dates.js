/**
 * Check whether a task is overdue.
 * Definition: dueDate is before the start of today and status is not 'completed'.
 * @param {Date|string|null} dueDate
 * @param {string} status
 * @param {Date} [referenceDate] Optional reference date (defaults to now)
 * @returns {boolean}
 */
function isTaskOverdue(dueDate, status, referenceDate = new Date()) {
  if (!dueDate || status === 'completed') {
    return false;
  }
  const due = new Date(dueDate);
  if (isNaN(due.getTime())) {
    return false;
  }

  const startOfToday = new Date(referenceDate);
  startOfToday.setHours(0, 0, 0, 0);

  return due < startOfToday;
}

/**
 * Returns the start of today's date boundary.
 * @param {Date} [ref]
 * @returns {Date}
 */
function getStartOfToday(ref = new Date()) {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Format a Date object to YYYY-MM-DD
 * @param {Date} date
 * @returns {string}
 */
function formatDateToISO(date = new Date()) {
  return date.toISOString().split('T')[0];
}

module.exports = {
  isTaskOverdue,
  getStartOfToday,
  formatDateToISO
};
