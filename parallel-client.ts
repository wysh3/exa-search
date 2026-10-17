/** Anonymous Parallel Search MCP client using Streamable HTTP. */

const PARALLEL_URL = 'https://search.parallel.ai/mcp';
const USER_AGENT = 'exa-search/1.5.0 (https://github.com/wysh3/exa-search)';
const PROTOCOL_VERSION = '2025-03-26';
const TIMEOUT_MS = 30_000;

/** Read the matching JSON-RPC response, allowing SSE notifications before it. */
function parseResponse(text: string, contentType: string, id: number): any {
  const messages = contentType.includes('text/event-stream')
    ? text.split(/\r?\n\r?\n/).flatMap(event => {
        const data = event.split(/\r?\n/)
          .filter(line => line.startsWith('data:'))
          .map(line => line.slice(5).replace(/^ /, ''))
          .join('\n');
        return data ? [JSON.parse(data)] : [];
      })
    : [JSON.parse(text)];
  const response = messages.find(message => message?.jsonrpc === '2.0' && message.id === id);
  if (!response) throw new Error('Parallel returned no matching MCP response');
  if (response.error) throw new Error(`Parallel MCP error: ${response.error.message}`);
  if (!response.result) throw new Error('Parallel returned no MCP result');
  return response.result;
}

export async function parallelWebSearch(params: {
  query: string;
  searchQueries?: string[];
}, signal?: AbortSignal): Promise<string> {
  if (typeof params.query !== 'string' || !params.query.trim()) {
    throw new Error('Parallel requires a nonempty query');
  }
  const queries = params.searchQueries ?? [params.query];
  if (!Array.isArray(queries) || !queries.length ||
      queries.some(query => typeof query !== 'string' || !query.trim())) {
    throw new Error('Parallel requires at least one nonempty search query');
  }

  // Bound the entire handshake, request and response body with one deadline.
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
  let sessionId: string | null = null;
  async function request(method: string, args: any, id?: number): Promise<any> {
    requestSignal.throwIfAborted();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'User-Agent': USER_AGENT
    };
    if (method !== 'initialize') headers['MCP-Protocol-Version'] = PROTOCOL_VERSION;
    if (sessionId) headers['Mcp-Session-Id'] = sessionId;
    const response = await fetch(PARALLEL_URL, {
      method: 'POST', headers,
      body: JSON.stringify({ jsonrpc: '2.0', id, method, params: args }),
      signal: requestSignal
    });
    if (!response.ok) throw new Error(`Parallel HTTP error: ${response.status} ${response.statusText}`);
    if (method === 'initialize') sessionId = response.headers.get('mcp-session-id');
    const text = await response.text();
    return id === undefined ? undefined : parseResponse(text, response.headers.get('content-type') || '', id);
  }

  const initialized = await request('initialize', {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: {},
    clientInfo: { name: 'exa-search', version: '1.5.0' }
  }, 1);
  if (initialized.protocolVersion !== PROTOCOL_VERSION) {
    throw new Error('Parallel returned an unsupported MCP protocol version');
  }
  await request('notifications/initialized', {});
  const result = await request('tools/call', {
    name: 'web_search',
    arguments: { objective: params.query, search_queries: queries }
  }, 2);
  const text = (Array.isArray(result.content) ? result.content : [])
    .filter((item: any) => item.type === 'text' && typeof item.text === 'string')
    .map((item: any) => item.text)
    .join('\n\n');
  if (result.isError) throw new Error(text || 'Parallel search failed');
  if (!text.trim()) throw new Error('Parallel returned no text content');
  return text;
}
