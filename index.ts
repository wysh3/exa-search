/**
 * Exa Search Plugin for OpenClaw
 *
 * Direct integration with Exa AI search via HTTP/SSE
 * No API key required
 *
 * Plugin ID: exa-search
 */

import { webSearch, codeSearch, companyResearch } from './exa-client';

export default function (api: any) {
  /**
   * Tool 1: Web Search
   */
  api.registerTool({
    name: "web_search",
    description: "Search the web using Exa AI neural search. Find current information, news, facts, or answer questions about any topic. Returns clean, formatted content ready for LLM use.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Web search query"
        },
        numResults: {
          type: "number",
          description: "Number of search results to return (default: 8)"
        },
        type: {
          type: "string",
          enum: ["auto", "fast", "deep"],
          description: "Search type - 'auto': balanced search (default), 'fast': quick results, 'deep': comprehensive research"
        },
        livecrawl: {
          type: "string",
          enum: ["fallback", "preferred"],
          description: "Live crawl mode - 'fallback': use live crawling as backup if cached unavailable, 'preferred': prioritize live crawling"
        }
      },
      required: ["query"]
    },
    async execute(_id: string, params: any) {
      try {
        const result = await webSearch({
          query: params.query,
          numResults: params.numResults || 8,
          type: params.type || 'auto',
          livecrawl: params.livecrawl || 'fallback'
        });

        return { content: [{ type: "text", text: result }] };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: `Error in web search: ${error.message}`
          }],
          isError: true
        };
      }
    }
  });

  /**
   * Tool 2: Code Search
   */
  api.registerTool({
    name: "code_search",
    description: "Find code examples, documentation, and programming solutions from GitHub, Stack Overflow, and official docs. Useful for API usage, library examples, code snippets, and debugging help.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query for code context - e.g., 'React useState hook examples', 'Python pandas dataframe filtering', 'Express.js middleware'"
        },
        tokensNum: {
          type: "number",
          description: "Number of tokens to return (1000-50000). Lower values for focused queries, higher values for comprehensive documentation (default: 5000)"
        }
      },
      required: ["query"]
    },
    async execute(_id: string, params: any) {
      try {
        const result = await codeSearch({
          query: params.query,
          tokensNum: params.tokensNum || 5000
        });

        return { content: [{ type: "text", text: result }] };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: `Error in code search: ${error.message}`
          }],
          isError: true
        };
      }
    }
  });

  /**
   * Tool 3: Company Research
   */
  api.registerTool({
    name: "company_research",
    description: "Research any company to get business information, news, and insights. Returns information from trusted business sources about products, services, recent news, or industry position.",
    parameters: {
      type: "object",
      properties: {
        companyName: {
          type: "string",
          description: "Name of the company to research"
        },
        numResults: {
          type: "number",
          description: "Number of search results to return (default: 5)"
        }
      },
      required: ["companyName"]
    },
    async execute(_id: string, params: any) {
      try {
        const result = await companyResearch({
          companyName: params.companyName,
          numResults: params.numResults || 5
        });

        return { content: [{ type: "text", text: result }] };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: `Error in company research: ${error.message}`
          }],
          isError: true
        };
      }
    }
  });
}
