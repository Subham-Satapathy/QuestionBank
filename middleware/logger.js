/**
 * Logging middleware for the application
 */

class Logger {
    constructor() {
        this.logLevel = process.env.LOG_LEVEL || 'info';
        this.logLevels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };
    }

    /**
     * Check if log level should be output
     * @param {string} level - The log level to check
     * @returns {boolean} - Whether to output the log
     */
    shouldLog(level) {
        return this.logLevels[level] <= this.logLevels[this.logLevel];
    }

    /**
     * Log an error message
     * @param {string} message - The error message
     * @param {Object} metadata - Additional metadata
     */
    error(message, metadata = {}) {
        if (this.shouldLog('error')) {
            console.error(`❌ ERROR: ${message}`, metadata);
        }
    }

    /**
     * Log a warning message
     * @param {string} message - The warning message
     * @param {Object} metadata - Additional metadata
     */
    warn(message, metadata = {}) {
        if (this.shouldLog('warn')) {
            console.warn(`⚠️  WARN: ${message}`, metadata);
        }
    }

    /**
     * Log an info message
     * @param {string} message - The info message
     * @param {Object} metadata - Additional metadata
     */
    info(message, metadata = {}) {
        if (this.shouldLog('info')) {
            console.log(`ℹ️  INFO: ${message}`, metadata);
        }
    }

    /**
     * Log a debug message
     * @param {string} message - The debug message
     * @param {Object} metadata - Additional metadata
     */
    debug(message, metadata = {}) {
        if (this.shouldLog('debug')) {
            console.log(`🔍 DEBUG: ${message}`, metadata);
        }
    }

    /**
     * Log a success message
     * @param {string} message - The success message
     * @param {Object} metadata - Additional metadata
     */
    success(message, metadata = {}) {
        if (this.shouldLog('info')) {
            console.log(`✅ SUCCESS: ${message}`, metadata);
        }
    }

    /**
     * Log API request
     * @param {string} method - HTTP method
     * @param {string} url - Request URL
     * @param {Object} params - Request parameters
     */
    logAPIRequest(method, url, params = {}) {
        this.info(`API Request: ${method} ${url}`, {
            method,
            url,
            params,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Log API response
     * @param {string} method - HTTP method
     * @param {string} url - Request URL
     * @param {number} statusCode - Response status code
     * @param {number} responseTime - Response time in ms
     */
    logAPIResponse(method, url, statusCode, responseTime) {
        const level = statusCode >= 400 ? 'error' : 'info';
        const message = `API Response: ${method} ${url} - ${statusCode} (${responseTime}ms)`;
        
        if (level === 'error') {
            this.error(message);
        } else {
            this.info(message);
        }
    }

    /**
     * Log database operation
     * @param {string} operation - Database operation
     * @param {string} collection - Collection name
     * @param {Object} query - Query parameters
     * @param {number} duration - Operation duration in ms
     */
    logDatabaseOperation(operation, collection, query = {}, duration = 0) {
        this.debug(`Database ${operation} on ${collection}`, {
            operation,
            collection,
            query,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Log service operation
     * @param {string} service - Service name
     * @param {string} operation - Operation name
     * @param {Object} params - Operation parameters
     * @param {number} duration - Operation duration in ms
     */
    logServiceOperation(service, operation, params = {}, duration = 0) {
        this.info(`${service} ${operation}`, {
            service,
            operation,
            params,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Create a performance timer
     * @param {string} operation - Operation name
     * @returns {Function} - Timer function
     */
    createTimer(operation) {
        const startTime = Date.now();
        
        return () => {
            const duration = Date.now() - startTime;
            this.debug(`${operation} completed in ${duration}ms`);
            return duration;
        };
    }
}

// Singleton instance
const logger = new Logger();

module.exports = logger; 