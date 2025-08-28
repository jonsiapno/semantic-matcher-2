/**
 * Configuration management for Semantic Matcher
 * Centralizes all configurable values with environment variable support
 */

export const config = {
  // ChromaDB Connection Settings
  chromadb: {
    url: process.env.CHROMADB_URL || "http://chromadb:8000",
    heartbeatRetries: parseInt(process.env.CHROMADB_RETRIES) || 30,
    heartbeatDelay: parseInt(process.env.CHROMADB_RETRY_DELAY) || 2000
  },

  // Collection Settings
  collection: {
    name: process.env.COLLECTION_NAME || 'semantic_matches',
    description: process.env.COLLECTION_DESCRIPTION || "Semantic matching collection"
  },

  // API Server Settings
  server: {
    port: parseInt(process.env.PORT) || 3000,
    host: process.env.HOST || 'localhost'
  },

  // Search Settings
  search: {
    defaultTopK: parseInt(process.env.DEFAULT_TOP_K) || 3,
    maxTopK: parseInt(process.env.MAX_TOP_K) || 20
  },

  // Environment
  env: process.env.NODE_ENV || 'development',
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};

/**
 * Distance interpretation guide for semantic matching results
 */
export const distanceGuide = {
  excellent: { min: 0.0, max: 0.8, label: 'Excellent Match' },
  good: { min: 0.8, max: 1.2, label: 'Good Match' },
  weak: { min: 1.2, max: 1.6, label: 'Weak Match' },
  poor: { min: 1.6, max: Infinity, label: 'Poor Match' }
};

/**
 * Get match quality based on distance score
 * @param {number} distance - Distance score from ChromaDB
 * @returns {object} Match quality information
 */
export function getMatchQuality(distance) {
  for (const [key, range] of Object.entries(distanceGuide)) {
    if (distance >= range.min && distance < range.max) {
      return { quality: key, label: range.label, distance };
    }
  }
  return { quality: 'poor', label: 'Poor Match', distance };
}