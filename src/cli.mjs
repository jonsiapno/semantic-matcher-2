#!/usr/bin/env node

/**
 * Command Line Interface for Semantic Matcher
 * 
 * Provides an interactive terminal interface for testing semantic search functionality.
 * This is the main entry point when running the application in CLI mode.
 */

import { createInterface } from 'readline';
import { SemanticMatcher } from './core/SemanticMatcher.mjs';
import { logger } from './utils/logger.mjs';
import { config, distanceGuide } from './config.mjs';

class SemanticMatcherCLI {
  constructor() {
    this.matcher = new SemanticMatcher();
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'semantic-matcher> '
    });
    
    // Bind methods to preserve context
    this.handleInput = this.handleInput.bind(this);
    this.shutdown = this.shutdown.bind(this);
    
    // Setup graceful shutdown
    process.on('SIGINT', this.shutdown);
    process.on('SIGTERM', this.shutdown);
  }

  /**
   * Format a single search result for display
   * @param {object} result - Search result object
   * @param {number} index - Result index (0-based)
   * @returns {string} Formatted result string
   */
  formatResult(result, index) {
    const quality = result.quality;
    const indicator = this.getQualityIndicator(quality);
    const metadata = result.metadata?.category ? ` [${result.metadata.category}]` : '';
    
    return `${indicator} #${index + 1} [${result.id}] ${result.text}${metadata}\n` +
           `         Distance: ${result.distance} (${result.qualityLabel})`;
  }

  /**
   * Get visual indicator based on match quality
   * @param {string} quality - Quality level
   * @returns {string} Visual indicator
   */
  getQualityIndicator(quality) {
    const indicators = {
      excellent: '●',
      good: '◐',
      weak: '◯',
      poor: '○'
    };
    return indicators[quality] || '○';
  }

  /**
   * Format search results for console display
   * @param {object} response - Complete search response
   * @returns {string} Formatted results string
   */
  formatSearchResults(response) {
    if (!response.results || response.results.length === 0) {
      return '\nNo matches found for your query.\n';
    }

    const lines = [];
    lines.push('');
    lines.push(`Query: "${response.query}"`);
    lines.push(`Found ${response.resultCount} result(s):`);
    lines.push('─'.repeat(80));
    
    response.results.forEach((result, index) => {
      lines.push(this.formatResult(result, index));
      if (index < response.results.length - 1) {
        lines.push(''); // Empty line between results
      }
    });
    
    lines.push('─'.repeat(80));
    lines.push('');
    
    return lines.join('\n');
  }

  /**
   * Perform semantic search and display results
   * @param {string} query - Search query
   * @param {number} topK - Number of results to return
   */
  async performSearch(query, topK = config.search.defaultTopK) {
    try {
      console.log(`\nSearching for: "${query}"`);
      
      const startTime = Date.now();
      const results = await this.matcher.search(query, topK);
      const duration = Date.now() - startTime;
      
      console.log(this.formatSearchResults(results));
      console.log(`Search completed in ${duration}ms\n`);
      
    } catch (error) {
      console.error(`\nSearch failed: ${error.message}\n`);
      logger.error('CLI search failed', { query, error: error.message });
    }
  }

  /**
   * Display help information
   */
  displayHelp() {
    console.log(`
Semantic Matcher CLI
===================

Commands:
  search <query>              Search for semantic matches
  s <query>                  Shorthand for search
  help, h                    Show this help message
  stats                      Show collection statistics
  reset                      Reset and reload the collection
  quit, exit, q              Exit the application

Examples:
  search JavaScript developer
  s machine learning expert
  search UX designer with mobile experience

Distance Guide:
  ● Excellent (${distanceGuide.excellent.min} - ${distanceGuide.excellent.max})  - Very strong semantic match
  ◐ Good      (${distanceGuide.good.min} - ${distanceGuide.good.max})  - Good semantic similarity
  ◯ Weak      (${distanceGuide.weak.min} - ${distanceGuide.weak.max})  - Some semantic relation
  ○ Poor      (${distanceGuide.poor.min}+)    - Limited semantic similarity

Tips:
  - Use natural language queries
  - Try different phrasings for better results
  - Semantic search finds meaning, not just keywords
`);
  }

  /**
   * Display collection statistics
   */
  async displayStats() {
    try {
      const stats = await this.matcher.getStats();
      console.log('\nCollection Statistics:');
      console.log('─'.repeat(30));
      console.log(`Collection Name: ${stats.collectionName}`);
      console.log(`Documents: ${stats.documentCount}`);
      console.log(`Initialized: ${stats.initialized}`);
      console.log(`ChromaDB URL: ${stats.chromaUrl}`);
      console.log(`Default Top-K: ${stats.config.defaultTopK}`);
      console.log(`Max Top-K: ${stats.config.maxTopK}`);
      console.log('');
    } catch (error) {
      console.error(`\nFailed to get stats: ${error.message}\n`);
    }
  }

  /**
   * Reset the collection
   */
  async resetCollection() {
    try {
      console.log('\nResetting collection...');
      await this.matcher.reset();
      console.log('Collection reset successfully.\n');
    } catch (error) {
      console.error(`\nFailed to reset collection: ${error.message}\n`);
    }
  }

  /**
   * Handle user input and execute commands
   * @param {string} input - User input string
   */
  async handleInput(input) {
    const trimmed = input.trim();
    
    if (!trimmed) {
      this.rl.prompt();
      return;
    }

    const [command, ...args] = trimmed.split(' ');
    const lowerCommand = command.toLowerCase();

    switch (lowerCommand) {
      case 'help':
      case 'h':
        this.displayHelp();
        break;

      case 'search':
      case 's':
        if (args.length === 0) {
          console.log('\nPlease provide a search query. Example: search React developer\n');
        } else {
          await this.performSearch(args.join(' '));
        }
        break;

      case 'stats':
        await this.displayStats();
        break;

      case 'reset':
        await this.resetCollection();
        break;

      case 'quit':
      case 'exit':
      case 'q':
        await this.shutdown();
        return;

      default:
        // Treat unknown commands as search queries
        await this.performSearch(trimmed);
        break;
    }

    this.rl.prompt();
  }

  /**
   * Start the CLI application
   */
  async start() {
    try {
      console.log('Semantic Matcher CLI v2.0');
      console.log('Initializing...\n');
      
      await this.matcher.initialize();
      
      console.log('Ready! Type "help" for available commands or start searching.\n');
      
      // Setup readline event handlers
      this.rl.on('line', this.handleInput);
      this.rl.on('close', this.shutdown);
      
      // Start prompting
      this.rl.prompt();
      
    } catch (error) {
      console.error(`\nInitialization failed: ${error.message}`);
      logger.error('CLI initialization failed', { error: error.message });
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('\n\nShutting down...');
    
    if (this.rl) {
      this.rl.close();
    }
    
    // Allow time for cleanup
    setTimeout(() => {
      console.log('Goodbye!');
      process.exit(0);
    }, 100);
  }
}

// Start CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new SemanticMatcherCLI();
  cli.start().catch((error) => {
    console.error('Fatal error:', error.message);
    process.exit(1);
  });
}