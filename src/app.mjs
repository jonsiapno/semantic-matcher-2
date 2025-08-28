/**
 * Express API Server for Semantic Matcher
 * 
 * Provides REST API endpoints for semantic search functionality.
 * Used when running in web server mode (optional profile).
 */

import express from 'express';
import { SemanticMatcher } from './core/SemanticMatcher.mjs';
import { logger } from './utils/logger.mjs';
import { config, distanceGuide } from './config.mjs';

const app = express();

// Enable JSON parsing with size limits
app.use(express.json({ limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.debug('HTTP Request', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Initialize the semantic matcher
const matcher = new SemanticMatcher();

/**
 * POST /api/search - Semantic search endpoint
 * 
 * Request body:
 * {
 *   "query": "search text",
 *   "topK": 5 (optional)
 * }
 */
app.post('/api/search', async (req, res) => {
  try {
    const { query, topK = config.search.defaultTopK } = req.body;
    
    // Validate request
    if (!query) {
      return res.status(400).json({ 
        error: 'Missing required field: query',
        message: 'Request body must include a "query" field with search text'
      });
    }

    if (typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid query format',
        message: 'Query must be a non-empty string'
      });
    }

    // Validate topK if provided
    if (topK && (typeof topK !== 'number' || topK < 1 || topK > config.search.maxTopK)) {
      return res.status(400).json({
        error: 'Invalid topK value',
        message: `topK must be a number between 1 and ${config.search.maxTopK}`
      });
    }
    
    logger.info('Search request received', { query, topK });
    
    const results = await matcher.search(query, topK);
    
    logger.info('Search completed successfully', {
      query,
      resultCount: results.resultCount
    });
    
    res.json(results);
    
  } catch (error) {
    logger.error('Search endpoint error', { error: error.message });
    res.status(500).json({ 
      error: 'Search failed',
      message: error.message 
    });
  }
});

/**
 * GET /api/stats - Collection statistics endpoint
 */
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await matcher.getStats();
    res.json(stats);
  } catch (error) {
    logger.error('Stats endpoint error', { error: error.message });
    res.status(500).json({ 
      error: 'Failed to retrieve stats',
      message: error.message 
    });
  }
});

/**
 * GET /api/health - Health check endpoint
 */
app.get('/api/health', async (req, res) => {
  try {
    const isHealthy = await matcher.healthCheck();
    
    if (isHealthy) {
      res.json({ 
        status: 'healthy',
        message: 'Semantic matcher is operational',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'unhealthy',
        message: 'ChromaDB connection failed',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.error('Health check error', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/reset - Reset collection endpoint (development only)
 */
app.post('/api/reset', async (req, res) => {
  if (config.env !== 'development') {
    return res.status(403).json({
      error: 'Reset endpoint disabled',
      message: 'Collection reset is only available in development mode'
    });
  }

  try {
    logger.info('Collection reset requested');
    await matcher.reset();
    logger.info('Collection reset completed');
    
    res.json({
      message: 'Collection reset successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Reset endpoint error', { error: error.message });
    res.status(500).json({
      error: 'Reset failed',
      message: error.message
    });
  }
});

/**
 * GET / - API documentation endpoint
 */
app.get('/', (req, res) => {
  res.json({
    name: 'Semantic Matcher API',
    version: '2.0.0',
    description: 'Professional semantic matching service using ChromaDB',
    
    endpoints: {
      search: {
        method: 'POST',
        path: '/api/search',
        description: 'Perform semantic search',
        body: {
          query: 'string (required) - Search text',
          topK: `number (optional) - Number of results (1-${config.search.maxTopK}, default: ${config.search.defaultTopK})`
        }
      },
      stats: {
        method: 'GET',
        path: '/api/stats',
        description: 'Get collection statistics'
      },
      health: {
        method: 'GET',
        path: '/api/health',
        description: 'Check service health'
      },
      reset: {
        method: 'POST',
        path: '/api/reset',
        description: 'Reset collection (development only)'
      }
    },
    
    distanceGuide: {
      description: 'Semantic similarity interpretation',
      ranges: distanceGuide
    },
    
    examples: {
      search: {
        url: '/api/search',
        body: {
          query: 'JavaScript developer with React experience',
          topK: 3
        }
      }
    },
    
    config: {
      environment: config.env,
      defaultTopK: config.search.defaultTopK,
      maxTopK: config.search.maxTopK
    }
  });
});

/**
 * Error handling middleware
 */
app.use((error, req, res, next) => {
  logger.error('Unhandled application error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred'
  });
});

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `${req.method} ${req.url} is not a valid endpoint`,
    availableEndpoints: [
      'GET /',
      'POST /api/search',
      'GET /api/stats',
      'GET /api/health'
    ]
  });
});

/**
 * Start the server
 */
async function startServer() {
  try {
    logger.info('Starting Semantic Matcher API server');
    
    // Initialize ChromaDB connection
    logger.info('Initializing ChromaDB connection');
    await matcher.initialize();
    
    // Start HTTP server
    const server = app.listen(config.server.port, () => {
      logger.info('API server started successfully', {
        port: config.server.port,
        environment: config.env,
        endpoints: {
          documentation: `http://localhost:${config.server.port}/`,
          search: `http://localhost:${config.server.port}/api/search`,
          health: `http://localhost:${config.server.port}/api/health`
        }
      });
      
      // Log example curl command
      console.log(`\nTest the API with:`);
      console.log(`curl -X POST http://localhost:${config.server.port}/api/search \\`);
      console.log(`  -H "Content-Type: application/json" \\`);
      console.log(`  -d '{"query": "React developer", "topK": 2}'\n`);
    });

    // Graceful shutdown handling
    const shutdown = async (signal) => {
      logger.info(`Received ${signal}, starting graceful shutdown`);
      
      server.close((err) => {
        if (err) {
          logger.error('Error during server shutdown', { error: err.message });
          process.exit(1);
        }
        
        logger.info('HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

// Start server if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}