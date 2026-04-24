/**
 * Performance Monitoring & Optimization Utils
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = [];
    this.maxMetrics = 1000;
  }

  /**
   * Enregistrer une métrique de performance
   */
  record(operation, durationMs, success = true) {
    this.metrics.push({
      operation,
      durationMs,
      success,
      timestamp: new Date().toISOString(),
    });

    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  /**
   * Obtenir les stats de performance
   */
  stats() {
    const operations = {};
    this.metrics.forEach(m => {
      if (!operations[m.operation]) {
        operations[m.operation] = { count: 0, totalMs: 0, avgMs: 0, errors: 0 };
      }
      operations[m.operation].count++;
      operations[m.operation].totalMs += m.durationMs;
      operations[m.operation].avgMs = operations[m.operation].totalMs / operations[m.operation].count;
      if (!m.success) operations[m.operation].errors++;
    });
    return operations;
  }

  /**
   * Identifier les opérations lentes (> 500ms)
   */
  slowQueries() {
    return this.metrics.filter(m => m.durationMs > 500);
  }
}

/**
 * Decorator pour mesurer la performance d'une fonction
 */
function measurePerf(operationName) {
  return async function decorator(req, res, handler) {
    const start = Date.now();
    try {
      await handler(req, res);
      const duration = Date.now() - start;
      perfMonitor.record(operationName, duration, !res.statusCode || res.statusCode < 400);
      if (duration > 500) {
        console.warn(`⚠️ Slow query: ${operationName} took ${duration}ms`);
      }
    } catch (err) {
      const duration = Date.now() - start;
      perfMonitor.record(operationName, duration, false);
      throw err;
    }
  };
}

const perfMonitor = new PerformanceMonitor();

module.exports = { PerformanceMonitor, measurePerf, perfMonitor };
