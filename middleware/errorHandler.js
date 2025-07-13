/**
 * Error handling middleware for the application
 */

class ErrorHandler {
    /**
     * Handle API errors
     * @param {Error} error - The error object
     * @param {string} context - The context where the error occurred
     * @returns {Object} - Error response object
     */
    static handleAPIError(error, context = 'API') {
        console.error(`❌ ${context} Error:`, error.message);
        
        return {
            success: false,
            error: {
                message: error.message,
                context,
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
     * Handle database errors
     * @param {Error} error - The error object
     * @param {string} operation - The database operation
     * @returns {Object} - Error response object
     */
    static handleDatabaseError(error, operation = 'Database') {
        console.error(`❌ ${operation} Error:`, error.message);
        
        return {
            success: false,
            error: {
                message: error.message,
                operation,
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
     * Handle validation errors
     * @param {Array} errors - Array of validation errors
     * @param {string} entity - The entity being validated
     * @returns {Object} - Error response object
     */
    static handleValidationError(errors, entity = 'Data') {
        console.error(`❌ ${entity} Validation Error:`, errors);
        
        return {
            success: false,
            error: {
                message: 'Validation failed',
                details: errors,
                entity,
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
     * Handle connection errors
     * @param {Error} error - The error object
     * @param {string} service - The service name
     * @returns {Object} - Error response object
     */
    static handleConnectionError(error, service = 'Service') {
        console.error(`❌ ${service} Connection Error:`, error.message);
        
        return {
            success: false,
            error: {
                message: `Failed to connect to ${service}`,
                details: error.message,
                service,
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
     * Log error with context
     * @param {Error} error - The error object
     * @param {string} context - The context where the error occurred
     * @param {Object} metadata - Additional metadata
     */
    static logError(error, context = 'Application', metadata = {}) {
        const errorLog = {
            message: error.message,
            stack: error.stack,
            context,
            metadata,
            timestamp: new Date().toISOString()
        };
        
        console.error('❌ Error Log:', JSON.stringify(errorLog, null, 2));
    }

    /**
     * Create a custom error class
     * @param {string} message - Error message
     * @param {string} type - Error type
     * @param {number} statusCode - HTTP status code
     */
    static createCustomError(message, type = 'CustomError', statusCode = 500) {
        const error = new Error(message);
        error.type = type;
        error.statusCode = statusCode;
        return error;
    }
}

module.exports = ErrorHandler; 