# Semantic Matcher v2.0

A semantic matching template using ChromaDB vector database. This application provides intelligent text matching capabilities that go beyond keyword search to understand meaning and context.

## Features

- **Semantic Search**: Vector-based similarity matching using sentence transformers
- **Architecture**: Extensible codebase with error handling
- **Multiple Interfaces**: Interactive CLI and optional REST API
- **Docker Ready**: Complete containerized deployment
- **Configurable**: Environment-based configuration with sensible defaults
- **Extensible**: Pluggable data loaders and clear extension points

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Git

### Run the Application

```bash
# Clone the repository
git clone https://github.com/jonsiapno/semantic-matcher-2
cd semantic-matcher-2

# Start with interactive CLI (default)
docker-compose run --rm app

# The CLI will be ready when you see:
# "Ready! Type 'help' for available commands or start searching."
```

### Try Some Searches

```
semantic-matcher> search React developer
semantic-matcher> search machine learning expert
semantic-matcher> search UX designer mobile apps
semantic-matcher> help
```

## Architecture

### Core Components

- **SemanticMatcher**: Main class handling ChromaDB operations
- **DataLoader**: Pluggable data source management
- **Logger**: Structured logging throughout the application
- **Config**: Centralized configuration management

### File Structure

```
semantic-matcher-2/
├── src/
│   ├── core/
│   │   └── SemanticMatcher.mjs    # Main semantic matching logic
│   ├── data/
│   │   └── dataLoader.mjs         # Data loading utilities
│   ├── utils/
│   │   └── logger.mjs             # Logging utilities
│   ├── config.mjs                 # Configuration management
│   ├── cli.mjs                    # Interactive CLI interface
│   └── app.mjs                    # REST API server
├── docker-compose.yml             # Container orchestration
├── Dockerfile                     # Application container
├── package.json                   # Node.js dependencies
└── README.md                      # This file
```

## Usage Modes

### 1. Interactive CLI (Default)

```bash
docker-compose run --rm app
```

The CLI provides immediate interactive testing:
- Natural language search queries
- Real-time results with quality indicators
- Built-in help and statistics
- Collection management commands

**Note:** Use `docker-compose run` (not `up`) for proper interactive terminal support.

### 2. REST API Server

```bash
docker-compose --profile api up --build
```

Provides HTTP endpoints at `http://localhost:3000`:

**Search Endpoint:**
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "JavaScript developer", "topK": 3}'
```

**Available Endpoints:**
- `POST /api/search` - Perform semantic search
- `GET /api/stats` - Collection statistics
- `GET /api/health` - Health check
- `GET /` - API documentation

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CHROMADB_URL` | `http://chromadb:8000` | ChromaDB server URL |
| `COLLECTION_NAME` | `semantic_matches` | Collection name |
| `PORT` | `3000` | API server port |
| `LOG_LEVEL` | `info` | Logging level (error, warn, info, debug) |
| `DEFAULT_TOP_K` | `3` | Default number of results |
| `MAX_TOP_K` | `20` | Maximum results per query |

### Custom Configuration

Create a `.env` file or set environment variables:

```bash
CHROMADB_URL=http://localhost:8000
LOG_LEVEL=debug
DEFAULT_TOP_K=5
```

## Understanding Results

Results include distance scores indicating semantic similarity:

- **● Excellent (0.0 - 0.8)**: Very strong semantic match
- **◐ Good (0.8 - 1.2)**: Good semantic similarity  
- **◯ Weak (1.2 - 1.6)**: Some semantic relation
- **○ Poor (1.6+)**: Limited semantic similarity

Lower distances indicate better matches.

## Customization

### Adding Your Own Data

#### Option 1: Replace Sample Data

Edit `src/data/dataLoader.mjs` and modify the `defaultSampleData` array:

```javascript
const defaultSampleData = [
  {
    id: "unique-id-1",
    text: "Your searchable text content",
    metadata: {
      category: "your-category",
      // Add any custom metadata
    }
  },
  // Add more items...
];
```

#### Option 2: JSON File Data Source

Create a data file `data.json`:

```json
[
  {
    "id": "item-1",
    "text": "Your searchable content",
    "metadata": {"type": "example"}
  }
]
```

Then configure the data loader:

```javascript
const matcher = new SemanticMatcher({
  dataLoader: {
    type: 'json',
    options: { filePath: './data.json' }
  }
});
```

#### Option 3: Custom Data Loader

Extend the `DataLoader` class:

```javascript
export class DatabaseLoader extends DataLoader {
  async load() {
    // Fetch from your database
    const data = await yourDatabase.fetchItems();
    
    // Transform to required format
    return data.map(item => ({
      id: item.id,
      text: item.searchableText,
      metadata: item.additionalData
    }));
  }
}
```

### Extending the SemanticMatcher

```javascript
export class CustomSemanticMatcher extends SemanticMatcher {
  async customSearch(query, filters = {}) {
    // Add your custom search logic
    const baseResults = await this.search(query);
    
    // Apply additional filtering or processing
    return this.applyCustomFilters(baseResults, filters);
  }
}
```

## Development

### Local Development

```bash
# Install dependencies
npm install

# Start ChromaDB (in another terminal)
docker run -p 8000:8000 chromadb/chroma:latest

# Run CLI locally
CHROMADB_URL=http://localhost:8000 npm run cli

# Or run API server
CHROMADB_URL=http://localhost:8000 npm start
```

### Adding Features

1. **New Data Sources**: Extend the `DataLoader` class
2. **Custom Search Logic**: Extend the `SemanticMatcher` class  
3. **New API Endpoints**: Add routes to `src/app.mjs`
4. **Enhanced CLI Commands**: Extend `src/cli.mjs`

### Testing

The application includes built-in health checks and statistics endpoints for monitoring:

```bash
# Check health
curl http://localhost:3000/api/health

# Get statistics  
curl http://localhost:3000/api/stats
```

## Production Deployment

### Environment Considerations

1. **Set Production Environment**:
   ```bash
   NODE_ENV=production
   ```

2. **Configure Logging**:
   ```bash
   LOG_LEVEL=warn  # Reduce log verbosity
   ```

3. **Secure ChromaDB**: Configure authentication and network security

4. **Scale Considerations**: 
   - Monitor ChromaDB memory usage
   - Consider horizontal scaling for high-volume scenarios
   - Implement proper load balancing for API mode

### Monitoring

Monitor key metrics:
- ChromaDB connection health
- Search response times  
- Collection document count
- API endpoint response codes

## Troubleshooting

### Common Issues

**ChromaDB Connection Failed**:
```
Failed to connect to ChromaDB after 30 attempts
```
- Ensure ChromaDB container is running
- Check network connectivity
- Verify `CHROMADB_URL` configuration

**Search Returns No Results**:
- Verify data was loaded successfully
- Try broader search terms
- Check collection statistics with `stats` command

**Docker Build Issues**:
- Ensure Docker has sufficient memory (4GB+ recommended)
- Clear Docker cache: `docker system prune`
- Check Python dependencies installation

### Debug Mode

Enable detailed logging:
```bash
LOG_LEVEL=debug docker-compose up --build
```

## License

MIT License - feel free to use this template for your projects.

## Contributing

This is a template project designed to be customized for your specific use case. Key areas for enhancement:

- Additional data source connectors
- Advanced search filtering
- Performance optimizations  
- Additional vector database backends
- Enhanced CLI features

---

**Need Help?** Check the application logs, try the built-in `help` command, or review the API documentation at `http://localhost:3000/` when running in API mode.
