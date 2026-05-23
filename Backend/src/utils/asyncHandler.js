/**
 * Wraps async route handlers to forward errors to Express error middleware.
 * Eliminates the need for try/catch in every controller.
 *
 * Usage:
 *   router.get("/route", asyncHandler(async (req, res) => { ... }))
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
