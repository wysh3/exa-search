/**
 * Tavily Client - Direct HTTP implementation
 * No dependencies - pure fetch to Tavily REST API
 */

const TAVILY_SEARCH_URL = "https://api.tavily.com/search";

interface TavilySearchParams {
 query: string;
 maxResults?: number;
 searchDepth?: "basic" | "advanced";
 topic?: "general" | "news";
}

interface TavilyResult {
 title: string;
 url: string;
 content: string;
 score: number;
}

interface TavilyResponse {
 query: string;
 results: TavilyResult[];
 answer?: string;
}

/**
 * Get Tavily API key from config or environment
 */
function getApiKey(config?: { tavilyApiKey?: string }): string {
 const key = config?.tavilyApiKey || process.env.TAVILY_API_KEY;
 if (!key) {
  throw new Error("TAVILY_API_KEY is not set. Set it as an environment variable or in plugin config.");
 }
 return key;
}

/**
 * Format Tavily results into a readable string matching exa-client output style
 */
function formatResults(response: TavilyResponse): string {
 if (!response.results || response.results.length === 0) {
  return "No results found.";
 }

 const parts: string[] = [];

 for (const result of response.results) {
  const entry = [
   `Title: ${result.title}`,
   `URL: ${result.url}`,
   `${result.content}`
  ].join('\n');
  parts.push(entry);
 }

 return parts.join('\n\n---\n\n');
}

/**
 * Search the web using Tavily
 */
export async function webSearch(params: TavilySearchParams, config?: { tavilyApiKey?: string }): Promise<string> {
 const apiKey = getApiKey(config);

 const body: Record<string, unknown> = {
  query: params.query,
  max_results: params.maxResults ?? 8,
  search_depth: params.searchDepth ?? "basic",
  topic: params.topic ?? "general",
  include_answer: false,
  include_raw_content: false,
  include_images: false
 };

 const response = await fetch(TAVILY_SEARCH_URL, {
  method: 'POST',
  headers: {
   'Content-Type': 'application/json',
   'Authorization': `Bearer ${apiKey}`
  },
  body: JSON.stringify(body)
 });

 if (!response.ok) {
  const text = await response.text();
  throw new Error(`Tavily API error: ${response.status} ${response.statusText} - ${text}`);
 }

 const data: TavilyResponse = await response.json();
 return formatResults(data);
}
