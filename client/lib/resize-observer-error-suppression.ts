// Suppress the benign ResizeObserver loop error that's common with recharts
// This error doesn't break functionality but can be annoying in development

const resizeObserverLoopErrRe = /^[^(ResizeObserver loop limit exceeded)]/;

const resizeObserverLoopErr = (e: ErrorEvent) => {
  if (e.message && resizeObserverLoopErrRe.test(e.message)) {
    const resizeObserverErrDiv = document.getElementById('webpack-dev-server-client-overlay-div');
    const resizeObserverErr = document.getElementById('webpack-dev-server-client-overlay');
    if (resizeObserverErrDiv) {
      resizeObserverErrDiv.setAttribute('style', 'display: none');
    }
    if (resizeObserverErr) {
      resizeObserverErr.setAttribute('style', 'display: none');
    }
  }
};

// Only suppress in development
if (import.meta.env.DEV) {
  window.addEventListener('error', resizeObserverLoopErr);
}

// Alternative approach: Override console.error to filter out ResizeObserver warnings
const originalConsoleError = console.error;
console.error = (...args) => {
  const errorMessage = args.join(' ');
  if (errorMessage.includes('ResizeObserver loop completed with undelivered notifications') ||
      errorMessage.includes('ResizeObserver loop limit exceeded')) {
    // Silently ignore these specific errors as they're benign
    return;
  }
  originalConsoleError.apply(console, args);
};
