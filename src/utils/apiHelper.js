/**
 * Safely parses an API response, extracting clean, user-friendly error messages
 * without exposing internal server errors or raw HTML/stack-trace dumps.
 */
export const handleApiResponse = async (res, defaultFallback = 'An error occurred while processing your request.') => {
  if (res.ok) {
    try {
      return await res.json();
    } catch (e) {
      return {};
    }
  }

  let userMessage = defaultFallback;

  try {
    const data = await res.json();
    if (data && data.message) {
      userMessage = data.message;
    }
  } catch (parseErr) {
    // Non-JSON responses (e.g. 502 Bad Gateway, 504 Timeout, 413 Payload Too Large)
    if (res.status === 413) {
      userMessage = 'The uploaded file exceeds the maximum allowed size of 50MB. Please upload a smaller project archive.';
    } else if (res.status === 503) {
      userMessage = 'The requested service is temporarily busy or unavailable. Please try again shortly.';
    } else if (res.status === 401) {
      userMessage = 'Your session has expired or is invalid. Please log in again to continue.';
    } else if (res.status === 403) {
      userMessage = 'Access denied. You do not have permission to perform this action.';
    } else if (res.status === 404) {
      userMessage = 'The requested project or resource was not found.';
    } else if (res.status >= 500) {
      userMessage = 'An unexpected server error occurred. Please try again in a moment.';
    }
  }

  const error = new Error(userMessage);
  error.status = res.status;
  throw error;
};

/**
 * Translates low-level browser network errors (e.g. server offline, connection lost)
 * into a polite, user-friendly explanation.
 */
export const getNetworkErrorMessage = (err, defaultFallback = 'An unexpected error occurred.') => {
  if (!err) return defaultFallback;

  // Browser fetch failures (backend down, offline, DNS failure)
  if (
    err.name === 'TypeError' &&
    (err.message.includes('fetch') ||
      err.message.includes('NetworkError') ||
      err.message.includes('Failed to fetch') ||
      err.message.includes('network'))
  ) {
    return 'Unable to connect to the backend server. Please check your internet connection and verify the server is running.';
  }

  return err.message || defaultFallback;
};
