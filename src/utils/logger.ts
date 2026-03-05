import * as winston from 'winston';
import * as path from 'path';
import { SDKOptions } from '@/config';

// Logger interface definition
export interface LoggerMethods {
  error: (message: string, meta?: any) => void;
  warn: (message: string, meta?: any) => void;
  info: (message: string, meta?: any) => void;
  debug: (message: string, meta?: any) => void;
  logApiResponse: (response: any, error?: any) => void;
}

// Custom format to exclude heartbeat messages from debug logs
const excludeHeartbeat = winston.format((info) => {
  if (info.message && typeof info.message === 'string' && info.message.includes('heartbeat')) {
    return false;
  }
  return info;
});

// Custom format for structured logging
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaString = '';
    if (Object.keys(meta).length) {
      try {
        metaString = `\n${JSON.stringify(meta, null, 2)}`;
      } catch {
        metaString = `\n${meta.stack || meta.message || String(meta)}`;
      }
    }
    return `${timestamp} [${level.toUpperCase()}]: ${message}${metaString}`;
  }),
);

export function setupLogger(config: SDKOptions | null): LoggerMethods {
  // If a custom logger is provided, use it
  if (config?.customLogger) {
    return config.customLogger;
  }

  // Otherwise, create the default Winston logger
  const defaultLogDir = './logs';
  const logDirectory = config?.logging?.directory || defaultLogDir;

  const debugTransport = new winston.transports.File({
    filename: path.join(logDirectory, 'debug.log'),
    level: 'debug',
    format: winston.format.combine(excludeHeartbeat(), logFormat),
  });

  const errorTransport = new winston.transports.File({
    filename: path.join(logDirectory, 'errors.log'),
    level: 'error',
    format: logFormat,
  });

  const warningTransport = new winston.transports.File({
    filename: path.join(logDirectory, 'warnings.log'),
    level: 'warn',
    format: logFormat,
  });

  const infoTransport = new winston.transports.File({
    filename: path.join(logDirectory, 'info.log'),
    level: 'info',
    format: logFormat,
  });

  // Create custom levels with their numerical priorities
  const customLevels = {
    levels: {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
    },
    colors: {
      error: 'red',
      warn: 'yellow',
      info: 'green',
      debug: 'blue',
    },
  };

  // Create the logger instance
  const logger = winston.createLogger({
    levels: customLevels.levels,
    transports: [
      debugTransport,
      errorTransport,
      warningTransport,
      infoTransport,
      new winston.transports.Console({
        format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
      }),
    ],
  });

  // Return the logger methods
  return {
    error: (message: string, meta?: any) => {
      logger.error(message, meta);
    },
    warn: (message: string, meta?: any) => {
      logger.warn(message, meta);
    },
    info: (message: string, meta?: any) => {
      logger.info(message, meta);
    },
    debug: (message: string, meta?: any) => {
      if (!message.includes('heartbeat')) {
        logger.debug(message, meta);
      }
    },
    logApiResponse: (response: any, error?: any) => {
      if (error) {
        // Log API errors as warnings or errors
        logger.error('API Error Response:', { error, response });
      } else {
        // Log successful API responses as info or debug
        logger.info('API Response:', { response });
      }
    },
  };
}