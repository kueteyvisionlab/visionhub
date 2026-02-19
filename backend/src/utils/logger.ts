type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ??
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function timestamp(): string {
  return new Date().toISOString();
}

function formatMessage(level: LogLevel, message: string, meta?: unknown): string {
  const base = `[${timestamp()}] [${level.toUpperCase()}] ${message}`;
  if (meta === undefined) return base;

  try {
    const serialised =
      meta instanceof Error
        ? JSON.stringify({ message: meta.message, stack: meta.stack })
        : JSON.stringify(meta);
    return `${base} ${serialised}`;
  } catch {
    return `${base} [unserializable meta]`;
  }
}

function debug(message: string, meta?: unknown): void {
  if (!shouldLog('debug')) return;
  console.debug(formatMessage('debug', message, meta));
}

function info(message: string, meta?: unknown): void {
  if (!shouldLog('info')) return;
  console.info(formatMessage('info', message, meta));
}

function warn(message: string, meta?: unknown): void {
  if (!shouldLog('warn')) return;
  console.warn(formatMessage('warn', message, meta));
}

function error(message: string, meta?: unknown): void {
  if (!shouldLog('error')) return;
  console.error(formatMessage('error', message, meta));
}

export const logger = { debug, info, warn, error };
