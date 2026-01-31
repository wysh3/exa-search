# Exa Search Plugin for OpenClaw

Direct integration with [Exa AI](https://exa.ai) search - powerful neural search with no API key required.

## Features

- 🔍 **Web Search** - Neural search for current information, news, and facts
- 💻 **Code Search** - Code examples, docs from GitHub, Stack Overflow, official docs
- 🏢 **Company Research** - Business information, news, and insights
- ⚡ **Zero Dependencies** - Pure fetch implementation with SSE parsing
- 🔑 **No API Key** - Works out of the box

## Installation

### OpenClaw Plugins

```bash
# Install from local path
openclaw plugins install ./exa-search

# Install from npm (after publishing)
openclaw plugins install exa-search

# Install from npm with scoped package
openclaw plugins install @YOUR_USERNAME/exa-search
```

### Enable Plugin

Add to your `openclaw.json` config:

```json
{
  "plugins": {
    "entries": {
      "exa-search": {
        "enabled": true
      }
    }
  }
}
```

Restart the Gateway to apply changes:
```bash
openclaw gateway restart
```

## Usage Examples

### Web Search

```
Search the web for "latest AI news"
```

Search options:
- `numResults` - Number of results (default: 8)
- `type` - "auto", "fast", or "deep"
- `livecrawl` - "fallback" or "preferred"

### Code Search

```
搜索 react useState hook examples
```

Search options:
- `tokensNum` - Tokens to return (1000-50000, default: 5000)

### Company Research

```
Research "Anthropic" company
```

Search options:
- `numResults` - Number of results (default: 5)

## Development

### Project Structure

```
exa-search/
├── index.ts                 # Main plugin entry (registers tools)
├── exa-client.ts           # HTTP/SSE client implementation
├── openclaw.plugin.json    # Plugin manifest
├── package.json            # npm package config
├── README.md               # This file
└── LICENSE                 # MIT License
```

### Build & Test

```bash
# Install dependencies
npm install

# Link for local testing
openclaw plugins install -l ./
```

## Publishing to npm

1. **Update package.json** with your details:
   - `author` - Your name and email
   - `repository.url` - Your GitHub repo URL
   - `bugs.url` - Your GitHub issues URL
   - `homepage` Your repo homepage

2. **Create GitHub repository**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/exa-search.git
   git push -u origin main
   ```

3. **Publish to npm**:
   ```bash
   npm login
   npm publish
   ```

4. **Users can now install**:
   ```bash
   openclaw plugins install exa-search
   ```

## Tools Registered

| Tool | Description |
|------|-------------|
| `web_search` | Neural web search for current information, news, facts |
| `code_search` | Code examples, docs from GitHub, Stack Overflow, official docs |
| `company_research` | Business information, news, and insights about companies |

## License

MIT

## Credits

Built for [OpenClaw](https://openclaw.ai) - the open-source personal AI assistant.

Powered by [Exa AI](https://exa.ai) - next-generation neural search.
