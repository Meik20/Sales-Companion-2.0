/**
 * Frontend UX Enhancements — Sales Companion v2.1
 * - Keyboard shortcuts
 * - Auto-retry on network errors
 * - Skeleton loaders
 * - Better error handling
 */

// Keyboard Shortcuts Handler
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K = Focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const searchBox = document.querySelector('input[placeholder*="Rechercher"]');
      if (searchBox) searchBox.focus();
    }

    // Ctrl/Cmd + Enter = Submit form (if in input)
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      const form = document.querySelector('form');
      if (form) form.submit();
    }

    // Escape = Close modals
    if (e.key === 'Escape') {
      const modal = document.querySelector('[role="dialog"].open');
      if (modal) modal.classList.remove('open');
    }
  });
}

// Network Error Auto-Retry
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      
      // Don't retry on 4xx client errors
      if (response.status >= 400 && response.status < 500) throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt - 1) * 1000;
      console.warn(`⚠️ Retry ${attempt}/${maxRetries} after ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// Skeleton Loader
function createSkeletonLoader(rows = 5) {
  return `<div class="skeleton-group">
    ${Array(rows).fill(0).map(() => `
      <div class="skeleton-row">
        <div class="skeleton-cell"></div>
        <div class="skeleton-cell"></div>
        <div class="skeleton-cell"></div>
      </div>
    `).join('')}
  </div>`;
}

// Add CSS for skeleton animation
const skeletonStyles = `
  .skeleton-group {
    animation: fadeIn 0.3s ease-in;
  }
  .skeleton-row {
    display: flex;
    gap: 12px;
    margin-bottom: 12px;
    padding: 12px;
    background: var(--bg3);
    border-radius: 6px;
  }
  .skeleton-cell {
    flex: 1;
    height: 16px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: shimmer 2s infinite;
    border-radius: 4px;
  }
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  @keyframes fadeIn {
    from { opacity: 0.5; }
    to { opacity: 1; }
  }
`;

// Form Validation Helper
function validateForm(formElement) {
  const errors = [];
  const inputs = formElement.querySelectorAll('[required], [data-validate]');
  
  inputs.forEach(input => {
    const value = input.value.trim();
    
    // Required validation
    if (input.required && !value) {
      errors.push({ field: input.name, message: `${input.placeholder || input.name} est obligatoire` });
    }
    
    // Email validation
    if (input.type === 'email' && value && !value.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      errors.push({ field: input.name, message: 'Email invalide' });
    }
    
    // Min length
    const minLen = input.dataset.minLength;
    if (minLen && value.length < minLen) {
      errors.push({ field: input.name, message: `Minimum ${minLen} caractères` });
    }
  });
  
  return errors;
}

// Status Indicator
function initServerStatusIndicator() {
  let isOnline = navigator.onLine;
  
  window.addEventListener('online', () => {
    isOnline = true;
    showStatus('🟢 Connexion rétablie', 'success');
  });
  
  window.addEventListener('offline', () => {
    isOnline = false;
    showStatus('🔴 Mode hors ligne', 'error');
  });
  
  // Check server health every 30s
  setInterval(() => {
    if (isOnline) checkServerHealth();
  }, 30000);
}

async function checkServerHealth() {
  try {
    const response = await fetch('/api/health', { method: 'GET' });
    if (!response.ok) showStatus('⚠️ Serveur indisponible', 'warning');
  } catch (e) {
    showStatus('⚠️ Problème réseau', 'warning');
  }
}

function showStatus(message, type = 'info') {
  const existing = document.querySelector('.status-indicator');
  if (existing) existing.remove();
  
  const el = document.createElement('div');
  el.className = `status-indicator status-${type}`;
  el.textContent = message;
  el.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 20px;
    background: ${type === 'error' ? '#ffe0e0' : type === 'success' ? '#e0ffe0' : '#fff9e0'};
    color: ${type === 'error' ? '#cc0000' : type === 'success' ? '#00cc00' : '#cc6600'};
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    z-index: 10000;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  `;
  document.body.appendChild(el);
  
  setTimeout(() => el.remove(), 5000);
}

// Input Debounce Helper
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Initialize all enhancements on page load
document.addEventListener('DOMContentLoaded', () => {
  initKeyboardShortcuts();
  initServerStatusIndicator();
  
  // Add skeleton styles to page
  const style = document.createElement('style');
  style.textContent = skeletonStyles;
  document.head.appendChild(style);
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initKeyboardShortcuts,
    fetchWithRetry,
    createSkeletonLoader,
    validateForm,
    initServerStatusIndicator,
    showStatus,
    debounce,
  };
}
