import winston from 'winston';
import { createSafeLogObject } from './redactor';

const logLevel = process.env.LOG_LEVEL || 'info';

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const safeMeta = createSafeLogObject(meta);
          const metaStr = Object.keys(safeMeta).length
            ? `\n${JSON.stringify(safeMeta, null, 2)}`
            : '';
          return `${timestamp} ${level}: ${message}${metaStr}`;
        })
      ),
    }),
  ],
});

// File transport for production
if (process.env.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    })
  );
  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
    })
  );
}

export default logger;
