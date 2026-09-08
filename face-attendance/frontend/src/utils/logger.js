const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

class Logger {
  constructor(currentLogLevel = LOG_LEVELS.INFO) {
    this.currentLogLevel = currentLogLevel;
    this.logs = [];
  }

  debug(message, data = null) {
    this._log('DEBUG', message, data, LOG_LEVELS.DEBUG);
  }

  info(message, data = null) {
    this._log('INFO', message, data, LOG_LEVELS.INFO);
  }

  warn(message, data = null) {
    this._log('WARN', message, data, LOG_LEVELS.WARN);
  }

  error(message, data = null) {
    this._log('ERROR', message, data, LOG_LEVELS.ERROR);
  }

  _log(level, message, data, logLevel) {
    if (logLevel >= this.currentLogLevel) {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        level,
        message,
        data,
      };

      this.logs.push(logEntry);

      // Keep only last 1000 logs
      if (this.logs.length > 1000) {
        this.logs.shift();
      }

      // Console output
      const logFn = level === 'ERROR' ? console.error : console[level.toLowerCase()];
      if (data) {
        logFn(`[${timestamp}] [${level}] ${message}`, data);
      } else {
        logFn(`[${timestamp}] [${level}] ${message}`);
      }
    }
  }

  getLogs() {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
  }

  exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }

  setLogLevel(level) {
    this.currentLogLevel = level;
  }
}

export const logger = new Logger(LOG_LEVELS.INFO);

export { LOG_LEVELS };
