/**
 * Exa Client - Direct HTTP/SSE implementation
 * No dependencies - pure fetch with SSE parsing
 */

const EXA_SEARCH_URL = "https://mcp.exa.ai/mcp";

interface ExaRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: any;
}

interface ExaResponse {
  jsonrpc: "2.0";
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

/**
 * Parse SSE response from Exa
 * SSE format: "event: message\ndata: {...}\n\n"
 */
function parseSSEResponse(text: string): string {
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      return line.substring(6); // Remove "data: " prefix
    }
  }
  throw new Error('No data: field found in SSE response');
}

/**
 * Make a request to Exa
 */
async function callExa(method: string, params?: any): Promise<ExaResponse> {
  const requestId = Date.now();

  const request: ExaRequest = {
    jsonrpc: "2.0",
    id: requestId,
    method,
    params
  };

  const response = await fetch(EXA_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream'
    },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  const jsonData = parseSSEResponse(text);
  const result: ExaResponse = JSON.parse(jsonData);

  return result;
}

/**
 * Extract text content from response
 */
function extractTextContent(response: ExaResponse): string {
  if (response.error) {
    throw new Error(`Exa API error: ${response.error.code} - ${response.error.message}`);
  }

  if (!response.result || !response.result.content) {
    throw new Error('No content in response');
  }

  return response.result.content
    .filter((item: any) => item.type === 'text')
    .map((item: any) => item.text)
    .join('\n\n');
}

/**
 * Search the web using Exa
 */
export async function webSearch(params: {
  query: string;
  numResults?: number;
  type?: 'auto' | 'fast' | 'deep';
  livecrawl?: 'fallback' | 'preferred';
  contextMaxCharacters?: number;
}): Promise<string> {
  const response = await callExa('tools/call', {
    name: 'web_search_exa',
    arguments: params
  });

  return extractTextContent(response);
}

/**
 * Search for code context
 */
export async function codeSearch(params: {
  query: string;
  tokensNum?: number;
}): Promise<string> {
  const response = await callExa('tools/call', {
    name: 'get_code_context_exa',
    arguments: params
  });

  return extractTextContent(response);
}

/**
 * Research a company
 */
export async function companyResearch(params: {
  companyName: string;
  numResults?: number;
}): Promise<string> {
  const response = await callExa('tools/call', {
    name: 'company_research_exa',
    arguments: params
  });

  return extractTextContent(response);
}

/**
 * List available tools
 */
export async function listTools(): Promise<any[]> {
  const response = await callExa('tools/list');

  if (response.error) {
    throw new Error(`Exa API error: ${response.error.code} - ${response.error.message}`);
  }

  return response.result?.tools || [];
}

// Export for testing
export { parseSSEResponse, callExa };
