/**
 * SemanticMatcher - Core semantic matching functionality using ChromaDB
 * 
 * This class provides the main interface for semantic search operations.
 * It handles ChromaDB connections, collection management, and search queries.
 */

import { ChromaClient } from 'chromadb';
import { config, getMatchQuality } from '../config.mjs';
import { logger } from '../utils/logger.mjs';
import { createDataLoader } from '../data/dataLoader.mjs';

export class SemanticMatcher {
  /**
   * Create a new SemanticMatcher instance
   * @param {object} options - Configuration options
   * @param {string} options.chromaUrl - ChromaDB server URL
   * @param {string} options.collectionName - Name for the collection
   * @param {object} options.dataLoader - Custom data loader configuration
   */
  constructor(options = {}) {
    this.chromaUrl = options.chromaUrl || config.chromadb.url;
    this.collectionName = options.collectionName || config.collection.name;
    this.client = new ChromaClient({ path: this.chromaUrl });
    this.collection = null;
    this.initialized = false;
    
    // Configure data loader
    const dataLoaderConfig = options.dataLoader || { type: 'sample' };
    this.dataLoader = createDataLoader(dataLoaderConfig.type, dataLoaderConfig.options);
    
    logger.debug('SemanticMatcher instance created', {
      chromaUrl: this.chromaUrl,
      collectionName: this.collectionName,
      dataLoaderType: dataLoaderConfig.type
    });
  }

  /**
   * Establish connection to ChromaDB with retry logic
   * @returns {Promise<boolean>} True if connection successful
   * @throws {Error} If connection fails after all retries
   */
  async connect() {
    logger.info('Connecting to ChromaDB', { url: this.chromaUrl });
    
    let retries = config.chromadb.heartbeatRetries;
    let lastError;

    while (retries > 0) {
      try {
        await this.client.heartbeat();
        logger.info('Successfully connected to ChromaDB');
        return true;
      } catch (error) {
        lastError = error;
        retries--;
        
        if (retries > 0) {
          logger.debug(`Connection failed, ${retries} retries remaining`, { error: error.message });
          await new Promise(resolve => setTimeout(resolve, config.chromadb.heartbeatDelay));
        }
      }
    }

    const errorMessage = `Failed to connect to ChromaDB after ${config.chromadb.heartbeatRetries} attempts`;
    logger.error(errorMessage, { lastError: lastError.message });
    throw new Error(errorMessage);
  }

  /**
   * Create or recreate the collection
   * @returns {Promise<object>} ChromaDB collection instance
   */
  async createCollection() {
    logger.info('Setting up collection', { name: this.collectionName });

    // Remove existing collection if it exists
    try {
      await this.client.deleteCollection({ name: this.collectionName });
      logger.debug('Removed existing collection');
    } catch (error) {
      // Collection might not exist, which is fine
      logger.debug('No existing collection to remove');
    }
    
    // Create new collection
    const collection = await this.client.createCollection({
      name: this.collectionName,
      metadata: {
        description: config.collection.description,
        created: new Date().toISOString()
      }
    });

    logger.info('Collection created successfully');
    return collection;
  }

  /**
   * Load data into the collection using configured data loader
   * @returns {Promise<number>} Number of documents loaded
   */
  async loadData() {
    logger.info('Loading data into collection');

    try {
      const data = await this.dataLoader.load();
      
      if (data.length === 0) {
        logger.warn('No data to load');
        return 0;
      }

      // Prepare data for ChromaDB - ensure all fields are properly formatted
      const documents = data.map(item => String(item.text));
      const ids = data.map(item => String(item.id));
      const metadatas = data.map(item => {
        // Ensure metadata is a plain object with string values
        const cleanMetadata = {
          id: String(item.id),
          originalText: String(item.text)
        };
        
        // Add custom metadata, ensuring all values are strings or numbers
        if (item.metadata) {
          Object.entries(item.metadata).forEach(([key, value]) => {
            if (typeof value === 'string' || typeof value === 'number') {
              cleanMetadata[key] = value;
            } else if (Array.isArray(value)) {
              cleanMetadata[key] = value.join(', ');
            } else {
              cleanMetadata[key] = String(value);
            }
          });
        }
        
        return cleanMetadata;
      });
      
      // Add to collection
      await this.collection.add({
        documents: documents,
        metadatas: metadatas,
        ids: ids
      });

      logger.info(`Successfully loaded ${data.length} documents into collection`);
      return data.length;
    } catch (error) {
      logger.error('Failed to load data into collection', { error: error.message });
      throw error;
    }
  }

  /**
   * Initialize the SemanticMatcher
   * Sets up ChromaDB connection, creates collection, and loads data
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) {
      logger.debug('SemanticMatcher already initialized');
      return;
    }

    logger.info('Initializing SemanticMatcher');

    try {
      // Connect to ChromaDB
      await this.connect();
      
      // Create collection
      this.collection = await this.createCollection();
      
      // Load data
      const documentCount = await this.loadData();
      
      this.initialized = true;
      
      logger.info('SemanticMatcher initialization complete', {
        collectionName: this.collectionName,
        documentCount
      });
    } catch (error) {
      logger.error('SemanticMatcher initialization failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Perform semantic search query
   * @param {string} query - Search query text
   * @param {number} topK - Number of results to return (default from config)
   * @returns {Promise<object>} Search results with metadata
   * @throws {Error} If not initialized or query fails
   */
  async search(query, topK = config.search.defaultTopK) {
    if (!this.initialized) {
      throw new Error('SemanticMatcher not initialized. Call initialize() first.');
    }

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new Error('Query must be a non-empty string');
    }

    // Validate topK parameter
    const validTopK = Math.max(1, Math.min(topK, config.search.maxTopK));
    if (validTopK !== topK) {
      logger.warn(`topK adjusted from ${topK} to ${validTopK}`);
    }

    logger.debug('Performing semantic search', { query, topK: validTopK });

    try {
      const results = await this.collection.query({
        queryTexts: [query.trim()],
        nResults: validTopK
      });
      
      // Format results with quality assessment
      const formattedResults = results.ids[0].map((id, index) => {
        const distance = results.distances[0][index];
        const quality = getMatchQuality(distance);
        
        return {
          id,
          text: results.documents[0][index],
          metadata: results.metadatas[0][index],
          distance: parseFloat(distance.toFixed(4)),
          quality: quality.quality,
          qualityLabel: quality.label
        };
      });
      
      const searchResult = {
        query: query.trim(),
        results: formattedResults,
        resultCount: formattedResults.length,
        searchMetadata: {
          requestedTopK: topK,
          actualTopK: validTopK,
          timestamp: new Date().toISOString()
        }
      };

      logger.debug('Search completed', { 
        query, 
        resultCount: formattedResults.length,
        bestDistance: formattedResults[0]?.distance
      });

      return searchResult;
    } catch (error) {
      logger.error('Search query failed', { query, error: error.message });
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  /**
   * Get collection statistics and health information
   * @returns {Promise<object>} Collection stats and system info
   */
  async getStats() {
    if (!this.initialized) {
      throw new Error('SemanticMatcher not initialized');
    }
    
    try {
      const count = await this.collection.count();
      
      return {
        collectionName: this.collectionName,
        documentCount: count,
        initialized: this.initialized,
        chromaUrl: this.chromaUrl,
        config: {
          defaultTopK: config.search.defaultTopK,
          maxTopK: config.search.maxTopK
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to get stats', { error: error.message });
      throw error;
    }
  }

  /**
   * Reset the collection (useful for development)
   * @returns {Promise<void>}
   */
  async reset() {
    logger.info('Resetting SemanticMatcher');
    this.initialized = false;
    await this.initialize();
    logger.info('SemanticMatcher reset complete');
  }

  /**
   * Health check - verify ChromaDB connectivity
   * @returns {Promise<boolean>} True if healthy
   */
  async healthCheck() {
    try {
      await this.client.heartbeat();
      return true;
    } catch (error) {
      logger.error('Health check failed', { error: error.message });
      return false;
    }
  }
}