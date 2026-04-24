/**
 * Cache Service — Simple in-memory caching pour optimiser les stats
 * TTL: 5 minutes par défaut
 */

class CacheService {
  constructor() {
    this.cache = new Map();
    this.ttls = new Map();
  }

  /**
   * Obtenir une valeur du cache
   */
  get(key) {
    const expiry = this.ttls.get(key);
    if (expiry && Date.now() > expiry) {
      this.delete(key);
      return null;
    }
    return this.cache.get(key) || null;
  }

  /**
   * Stocker une valeur avec TTL
   * @param {string} key - Clé du cache
   * @param {*} value - Valeur à stocker
   * @param {number} ttlSeconds - Durée de vie en secondes (défaut: 300 = 5 min)
   */
  set(key, value, ttlSeconds = 300) {
    this.cache.set(key, value);
    this.ttls.set(key, Date.now() + (ttlSeconds * 1000));
  }

  /**
   * Supprimer une clé
   */
  delete(key) {
    this.cache.delete(key);
    this.ttls.delete(key);
  }

  /**
   * Vider tout le cache
   */
  clear() {
    this.cache.clear();
    this.ttls.clear();
  }

  /**
   * Obtenir les stats du cache
   */
  stats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Helper: Pattern-based invalidation
   * ex: invalidatePattern('admin:*') vide toutes les clés commençant par 'admin:'
   */
  invalidatePattern(pattern) {
    const regex = new RegExp(`^${pattern.replace('*', '.*')}`);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) this.delete(key);
    }
  }
}

module.exports = new CacheService();
