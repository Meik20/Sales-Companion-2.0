/* api-client.js - lightweight API client that attaches auth token from authManager */
(function () {
  function APIClient(baseURL) {
    this.baseURL = baseURL || window.location.origin;
  }

  APIClient.prototype.request = async function (endpoint, options = {}) {
    const token = await window.authManager?.getValidToken();

    const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const config = Object.assign({}, options, { headers });

    try {
      let res = await fetch(this.baseURL + endpoint, config);

      if (res.status === 401) {
        console.log('[API] 401 detected, attempting token refresh...');
        const user = firebase.auth().currentUser;
        if (user) {
          try {
            const newToken = await user.getIdToken(true);
            localStorage.setItem('authToken', newToken);
            headers['Authorization'] = `Bearer ${newToken}`;
            res = await fetch(this.baseURL + endpoint, Object.assign({}, config, { headers }));
            if (res.ok) return await res.json();
          } catch (refreshError) {
            console.error('[API] Refresh failed:', refreshError);
            window.authManager?.handleAuthError();
            throw new Error('Session expired');
          }
        } else {
          window.authManager?.handleAuthError();
          throw new Error('Not authenticated');
        }
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${res.statusText} ${text}`);
      }

      return await res.json();
    } catch (err) {
      console.error('[API] Request failed:', err);
      throw err;
    }
  };

  APIClient.prototype.get = function (endpoint, options) { return this.request(endpoint, Object.assign({}, options, { method: 'GET' })); };
  APIClient.prototype.post = function (endpoint, data, options) { return this.request(endpoint, Object.assign({}, options, { method: 'POST', body: JSON.stringify(data) })); };
  APIClient.prototype.put = function (endpoint, data, options) { return this.request(endpoint, Object.assign({}, options, { method: 'PUT', body: JSON.stringify(data) })); };
  APIClient.prototype.delete = function (endpoint, options) { return this.request(endpoint, Object.assign({}, options, { method: 'DELETE' })); };

  window.apiClient = new APIClient(window.location.origin);
})();
