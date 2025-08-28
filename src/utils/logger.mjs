/**
 * Simple, structured logging utility
 * Provides consistent log formatting across the application
 */

import { config } from '../config.mjs';

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const CURRENT_LEVEL = LOG_LEVELS[config.logging.level] ?? LOG_LEVELS.info;

/**
 * Format timestamp for logs
 * @returns {string} Formatted timestamp
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Core logging function
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {object} meta - Optional metadata
 */
function log(level, message, meta = {}) {
  if (LOG_LEVELS[level] > CURRENT_LEVEL) return;
  
  const timestamp = getTimestamp();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  if (Object.keys(meta).length > 0) {
    console.log(`${prefix} ${message}`, meta);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

export const logger = {
  error: (message, meta) => log('error', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  info: (message, meta) => log('info', message, meta),
  debug: (message, meta) => log('debug', message, meta)
};