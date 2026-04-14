/**
 * Sales Companion Client - URL Configuration
 * For Electron and desktop app routing
 */

const CLIENT_URLS = {
  api: 'https://sales-companion-production.up.railway.app/api',
  
  pages: {
    search: '/search',
    pipeline: '/pipeline',
    saved: '/saved',
    chat: '/chat',
    settings: '/settings',
    profile: '/profile',
  },
  
  // Get page URL
  getPage: (pageName) => CLIENT_URLS.pages[pageName] || '/',
  
  // Get API endpoint
  getApi: (endpoint) => {
    const base = 'https://sales-companion-production.up.railway.app/api';
    return `${base}/${endpoint}`;
  }
};

module.exports = CLIENT_URLS;
