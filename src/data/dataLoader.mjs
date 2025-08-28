/**
 * Data loading utilities for semantic matching
 * Provides pluggable data source management
 */

import { logger } from '../utils/logger.mjs';

/**
 * Default sample data for demonstration
 * Replace this with your own data source
 */
const defaultSampleData = [
  {
    id: "js-react-001",
    text: "Senior JavaScript developer with React experience and 5+ years in web development",
    metadata: {
      category: "development",
      experience: "senior",
      technologies: ["JavaScript", "React", "Web Development"]
    }
  },
  {
    id: "python-ml-002", 
    text: "Python data scientist specializing in machine learning and statistical analysis",
    metadata: {
      category: "data-science",
      experience: "specialist",
      technologies: ["Python", "Machine Learning", "Statistics"]
    }
  },
  {
    id: "ux-mobile-003",
    text: "UX/UI designer with expertise in mobile app design and user research",
    metadata: {
      category: "design",
      experience: "expert",
      technologies: ["UX/UI", "Mobile Design", "User Research"]
    }
  },
  {
    id: "devops-aws-004",
    text: "DevOps engineer experienced in AWS cloud infrastructure and CI/CD pipelines",
    metadata: {
      category: "infrastructure",
      experience: "experienced",
      technologies: ["DevOps", "AWS", "CI/CD"]
    }
  },
  {
    id: "fullstack-node-005",
    text: "Full-stack developer proficient in Node.js backend and modern frontend frameworks",
    metadata: {
      category: "development",
      experience: "proficient",
      technologies: ["Node.js", "Full-stack", "Frontend Frameworks"]
    }
  }
];

/**
 * Abstract base class for data loaders
 * Extend this class to create custom data sources
 */
export class DataLoader {
  /**
   * Load data from source
   * @returns {Promise<Array>} Array of data items with id, text, and metadata
   */
  async load() {
    throw new Error('DataLoader.load() must be implemented by subclass');
  }

  /**
   * Validate data format
   * @param {Array} data - Data to validate
   * @returns {boolean} True if valid
   */
  validateData(data) {
    if (!Array.isArray(data)) {
      logger.error('Data must be an array');
      return false;
    }

    for (const [index, item] of data.entries()) {
      if (!item.id || typeof item.id !== 'string') {
        logger.error(`Item at index ${index} missing valid 'id' field`);
        return false;
      }
      if (!item.text || typeof item.text !== 'string') {
        logger.error(`Item at index ${index} missing valid 'text' field`);
        return false;
      }
      if (item.metadata && typeof item.metadata !== 'object') {
        logger.error(`Item at index ${index} has invalid 'metadata' field`);
        return false;
      }
    }

    return true;
  }
}

/**
 * Default sample data loader
 * Uses built-in sample data for demonstration
 */
export class SampleDataLoader extends DataLoader {
  async load() {
    logger.info('Loading sample data');
    const data = defaultSampleData;
    
    if (!this.validateData(data)) {
      throw new Error('Sample data validation failed');
    }

    logger.info(`Loaded ${data.length} sample items`);
    return data;
  }
}

/**
 * JSON file data loader
 * Loads data from a JSON file
 */
export class JSONDataLoader extends DataLoader {
  constructor(filePath) {
    super();
    this.filePath = filePath;
  }

  async load() {
    try {
      logger.info(`Loading data from JSON file: ${this.filePath}`);
      const { readFile } = await import('fs/promises');
      const fileContent = await readFile(this.filePath, 'utf8');
      const data = JSON.parse(fileContent);
      
      if (!this.validateData(data)) {
        throw new Error('JSON data validation failed');
      }

      logger.info(`Loaded ${data.length} items from JSON file`);
      return data;
    } catch (error) {
      logger.error(`Failed to load JSON data: ${error.message}`);
      throw error;
    }
  }
}

/**
 * Create data loader based on configuration or environment
 * @param {string} type - Type of data loader ('sample', 'json')
 * @param {object} options - Options for the data loader
 * @returns {DataLoader} Configured data loader instance
 */
export function createDataLoader(type = 'sample', options = {}) {
  switch (type.toLowerCase()) {
    case 'sample':
      return new SampleDataLoader();
    case 'json':
      if (!options.filePath) {
        throw new Error('JSON data loader requires filePath option');
      }
      return new JSONDataLoader(options.filePath);
    default:
      logger.warn(`Unknown data loader type: ${type}, falling back to sample`);
      return new SampleDataLoader();
  }
}