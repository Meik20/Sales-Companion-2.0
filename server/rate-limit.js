/**
 * Rate Limiting Middleware — Simple in-memory rate limiter
 * Protège contre les abus API
 */

const rateStore = new Map();

function getRateLimitKey(req) {
  return req.ip || req.connection.remoteAddress || 'unknown';
}

function rateLimit(maxRequests = 100, windowSeconds = 60) {
  return (req, res, next) => {
    const key = getRateLimitKey(req);
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    if (!rateStore.has(key)) {
      rateStore.set(key, { requests: [], firstRequest: now });
    }

    const record = rateStore.get(key);
    
    // Supprimer les requêtes en dehors de la fenêtre
    record.requests = record.requests.filter(t => now - t < windowMs);

    if (record.requests.length >= maxRequests) {
      return res.status(429).json({
        error: 'Trop de requêtes — réessayez dans quelques secondes',
        retryAfter: Math.ceil((record.requests[0] + windowMs - now) / 1000),
      });
    }

    record.requests.push(now);
    res.set('X-RateLimit-Limit', maxRequests);
    res.set('X-RateLimit-Remaining', maxRequests - record.requests.length);
    
    next();
  };
}

// Cleanup: supprimer les anciennes entrées toutes les heures
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateStore.entries()) {
    if (now - record.firstRequest > 3600000) { // 1 heure
      rateStore.delete(key);
    }
  }
}, 3600000);

module.exports = { rateLimit };
