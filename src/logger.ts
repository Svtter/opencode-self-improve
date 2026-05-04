type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let minLevel: LogLevel = 'info';

export function setLogLevel(level: LogLevel): void {
  minLevel = level;
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[minLevel];
}

function formatMessage(tag: string, level: LogLevel, message: string, data?: unknown): string {
  const ts = new Date().toISOString();
  const base = `[opencode-self-improve] ${ts} [${level.toUpperCase()}] [${tag}] ${message}`;
  if (data !== undefined) {
    return `${base} ${typeof data === 'string' ? data : JSON.stringify(data)}`;
  }
  return base;
}

export interface Logger {
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
}

export function createLogger(tag: string): Logger {
  return {
    debug(message: string, data?: unknown) {
      if (shouldLog('debug')) process.stderr.write(formatMessage(tag, 'debug', message, data) + '\n');
    },
    info(message: string, data?: unknown) {
      if (shouldLog('info')) process.stderr.write(formatMessage(tag, 'info', message, data) + '\n');
    },
    warn(message: string, data?: unknown) {
      if (shouldLog('warn')) process.stderr.write(formatMessage(tag, 'warn', message, data) + '\n');
    },
    error(message: string, data?: unknown) {
      if (shouldLog('error')) process.stderr.write(formatMessage(tag, 'error', message, data) + '\n');
    },
  };
}
