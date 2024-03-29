const { createLogger, transports, format } = require('winston');
const { combine, timestamp, printf } = format;

const config = require('./src/config');

class Logger {
  constructor() {
    this.config = new config();
    this.logsDir = this.config.getLogsDir();

    this.logger = createLogger({
      level: 'info',
      format: combine(
        timestamp(),
        printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}] - ${message}`)
      ),
      transports: [
        new transports.File({ filename: `${this.logsDir}/devika_agent.log`, level: 'info' }),
        new transports.Console({ level: 'info' })
      ]
    });
  }

  info(message) {
    this.logger.info(message);
  }

  error(message) {
    this.logger.error(message);
  }

  warning(message) {
    this.logger.warn(message);
  }

  debug(message) {
    this.logger.debug(message);
  }

  exception(message) {
    this.logger.error(message instanceof Error ? message.stack : message);
  }

  readLogFile() {
    // Add code to read log file if needed
    return 'Reading log file';
  }
}

module.exports = Logger;
