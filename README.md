# Exa Search Plugin for OpenClaw

Exa AI neural search integration — web search and code search. No API key required.

## Tools

| Tool | Purpose |
|------|---------|
| `web_search` | Current information, news, facts |
| `code_search` | Code from GitHub, Stack Overflow, docs |

## Install & Enable

```bash
# Step 1: Install from npm
openclaw plugins install exa-search

# Step 2: Enable the plugin
openclaw plugins enable exa-search

# Step 3: Restart gateway
openclaw gateway restart

# Step 4: Verify it's loaded
openclaw plugins list | grep exa-search
```

### Troubleshooting

If the plugin shows as "disabled" after enabling, you may need to manually add it to the `plugins.allow` array in your config:

```bash
# Edit your config
nano ~/.openclaw/openclaw.json
```

Add `"exa-search"` to the `plugins.allow` array:

```json
{
  "plugins": {
    "allow": [
      "telegram",
      "discord",
      "exa-search"
    ],
    "entries": {
      "exa-search": {
        "enabled": true
      }
    }
  }
}
```

Then restart:
```bash
openclaw gateway restart
```

## Usage

```
Search the web for "latest AI news"
Find React useState hook examples
Search code in Python, JavaScript, or any programming language
```

### Optional Parallel web search

To use [Parallel Search MCP](https://docs.parallel.ai/integrations/mcp/search-mcp)
for `web_search`, merge this setting into the plugin entry in
`~/.openclaw/openclaw.json`:

```json
{
  "plugins": {
    "entries": {
      "exa-search": {
        "enabled": true,
        "config": {
          "searchProvider": "parallel"
        }
      }
    }
  }
}
```

Keep your existing plugin allowlist and other configuration, then run
`openclaw gateway restart`. Parallel uses Fast mode at
`https://search.parallel.ai/mcp`, with no account or API key required. The anonymous
service has usage limits and is intended for exploration and light use.

With Parallel selected, `query` describes the search objective. An optional
`searchQueries` array supplies related keyword queries; when omitted, the plugin
uses `[query]`. Results include source URLs and excerpts. Parallel does not expose
Exa's `numResults`, `type`, `livecrawl`, or `category` parameters. Describe source
and freshness preferences in `query` instead. Requests time out after 30 seconds
and respect tool cancellation; failures are returned as tool errors without
switching providers.

Exa remains the default when `searchProvider` is omitted or set to `"exa"`.
`code_search` always uses Exa, regardless of this setting.

## Development

Run the provider and plugin tests with Node.js 22 or newer:

```bash
npm install
npm test
```

## Links

- **npm:** [npmjs.com/package/exa-search](https://www.npmjs.com/package/exa-search)
- **GitHub:** [github.com/wysh3/exa-search](https://github.com/wysh3/exa-search)
- **License:** GPL-3.0

[OpenClaw](https://openclaw.ai) · [Exa AI](https://exa.ai)
