class ErrorResponse extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log full technical details and stack trace in server console for developer debugging
  console.error('[Centralized Error Handler]:', err);

  // 1. Mongoose Bad ObjectId Format (CastError)
  if (err.name === 'CastError') {
    const message = 'The requested resource was not found.';
    error = new ErrorResponse(message, 404);
  }

  // 2. Mongoose Duplicate Key Entry (e.g. email already registered)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'account';
    const message = `An account with this ${field} already exists. Please log in or use a different ${field}.`;
    error = new ErrorResponse(message, 400);
  }

  // 3. Mongoose Schema Validation Error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new ErrorResponse(message, 400);
  }

  // 4. JWT Authentication Errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Your session token is invalid or corrupt. Please log in again.';
    error = new ErrorResponse(message, 401);
  }
  if (err.name === 'TokenExpiredError') {
    const message = 'Your session has expired. Please log in again to continue.';
    error = new ErrorResponse(message, 401);
  }

  // 5. File upload Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'Uploaded file exceeds the maximum allowed size of 50MB. Please upload a smaller project archive.';
    error = new ErrorResponse(message, 400);
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    const message = 'Unexpected upload format. Please upload your archive under the "file" field.';
    error = new ErrorResponse(message, 400);
  }

  // 6. Database / MongoDB Network Errors (e.g., MongoDB not running)
  if (
    err.name === 'MongooseServerSelectionError' ||
    err.name === 'MongoNetworkError' ||
    err.name === 'MongoServerSelectionError' ||
    (err.message && (err.message.includes('ECONNREFUSED') || err.message.includes('connect ECONNREFUSED')))
  ) {
    const message = 'Database service is currently unavailable. Please ensure MongoDB is running and try again.';
    error = new ErrorResponse(message, 503);
  }

  // 7. Gemini / AI Service Errors
  if (
    err.message &&
    (err.message.includes('API_KEY') ||
      err.message.includes('API key') ||
      err.message.includes('generative-ai') ||
      err.message.includes('GoogleGenerativeAI') ||
      err.message.includes('AI services are temporarily unavailable'))
  ) {
    const message = 'The AI analysis service is temporarily unavailable or experiencing high demand. Please try again shortly.';
    error = new ErrorResponse(message, 503);
  }

  // 8. CORS Policy Errors
  if (err.message && err.message.includes('CORS policy violation')) {
    error = new ErrorResponse(err.message, 403);
  }

  // 9. Malformed JSON Body (SyntaxError from express.json)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    const message = 'Invalid JSON format in request body. Please check your data syntax.';
    error = new ErrorResponse(message, 400);
  }

  // 10. Fallback for internal server errors: Never leak stack traces or internal server error dumps
  const statusCode = error.statusCode || 500;
  let userFacingMessage = error.message;

  if (statusCode >= 500 && !(error instanceof ErrorResponse)) {
    userFacingMessage = 'An unexpected server error occurred while processing your request. Please try again later.';
  }

  res.status(statusCode).json({
    success: false,
    message: userFacingMessage || 'Internal Server Error'
  });
};

module.exports = {
  ErrorResponse,
  errorHandler
};
