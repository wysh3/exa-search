# Exa Search Plugin for OpenClaw

Exa AI neural search integration — web search, code search, and company research. No API key required.

## Tools

| Tool | Purpose |
|------|---------|
| `web_search` | Current information, news, facts |
| `code_search` | Code from GitHub, Stack Overflow, docs |
| `company_research` | Business info, news, insights |

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
Research "Anthropic" company
```

## Links

- **npm:** [npmjs.com/package/exa-search](https://www.npmjs.com/package/exa-search)
- **GitHub:** [github.com/wysh3/exa-search](https://github.com/wysh3/exa-search)
- **License:** GPL-3.0

[OpenClaw](https://openclaw.ai) · [Exa AI](https://exa.ai)
