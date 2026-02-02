// Utility helper functions
export function formatDate(date) {
  return date.toISOString().split('T')[0];
}

export function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item, 0);
}

export function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
