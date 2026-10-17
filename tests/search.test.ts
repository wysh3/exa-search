import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import register from '../index';

const PARALLEL_URL = 'https://search.parallel.ai/mcp';
const USER_AGENT = 'exa-search/1.5.0 (https://github.com/wysh3/exa-search)';
const text = 'Node.js documentation\nhttps://nodejs.org/api/\nOfficial API reference.';
const initialized = { protocolVersion: '2025-03-26', capabilities: { tools: {} } };
const content = { content: [{ type: 'text', text }] };

function tools(pluginConfig?: any) {
  const registered: any[] = [];
  register({ pluginConfig, registerTool: (tool: any) => registered.push(tool) });
  assert.deepEqual(registered.map(tool => tool.name), ['web_search', 'code_search']);
  return { web: registered[0], code: registered[1] };
}

function rpc(id: number, result: any) {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id, result }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Assert the destination and headers at the fetch boundary on every MCP request.
function parallelFetch(t: any, toolResponse: () => Response = () => rpc(2, content)) {
  const calls: any[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
    assert.equal(url, PARALLEL_URL);
    assert.equal(options.method, 'POST');
    const headers = new Headers(options.headers);
    assert.equal(headers.get('User-Agent'), USER_AGENT);
    assert.equal(headers.get('Accept'), 'application/json, text/event-stream');
    assert.equal(headers.get('Content-Type'), 'application/json');
    assert.equal(headers.get('Authorization'), null);
    assert.ok(options.signal instanceof AbortSignal);
    const body = JSON.parse(options.body as string);
    calls.push({ body, headers, signal: options.signal });
    if (body.method === 'initialize') {
      assert.equal(headers.get('MCP-Protocol-Version'), null);
      assert.equal(body.params.protocolVersion, '2025-03-26');
      assert.equal(body.params.clientInfo.name, 'exa-search');
      const response = rpc(body.id, initialized);
      response.headers.set('Mcp-Session-Id', 'test-session');
      return response;
    }
    assert.equal(headers.get('MCP-Protocol-Version'), '2025-03-26');
    assert.equal(headers.get('Mcp-Session-Id'), 'test-session');
    if (body.method === 'notifications/initialized') {
      assert.equal(body.id, undefined);
      return new Response(null, { status: 202 });
    }
    assert.equal(body.method, 'tools/call');
    return toolResponse();
  });
  return calls;
}

for (const config of [undefined, {}, { searchProvider: 'exa' }]) {
  test(`Exa web search remains the default for ${JSON.stringify(config)}`, async t => {
    t.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
      assert.equal(url, 'https://mcp.exa.ai/mcp');
      const body = JSON.parse(options.body as string);
      assert.equal(body.params.name, 'web_search_exa');
      assert.deepEqual(body.params.arguments, {
        query: 'node api', numResults: 8, type: 'auto', livecrawl: 'fallback'
      });
      return new Response(`data: ${JSON.stringify({ result: content })}\n\n`);
    });
    const { web } = tools(config);
    assert.ok(web.parameters.properties.numResults);
    assert.equal(web.parameters.properties.searchQueries, undefined);
    assert.deepEqual(await web.execute('id', { query: 'node api' }), content);
  });
}

test('explicit Exa filters and code search are preserved', async t => {
  const calls: any[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
    assert.equal(url, 'https://mcp.exa.ai/mcp');
    calls.push(JSON.parse(options.body as string).params);
    return new Response(`data: ${JSON.stringify({ result: content })}\n\n`);
  });
  const params = { query: 'research', numResults: 3, type: 'fast', livecrawl: 'preferred', category: 'research paper' };
  await tools({ searchProvider: 'exa' }).web.execute('id', params);
  await tools({ searchProvider: 'parallel' }).code.execute('id', { query: 'useState', tokensNum: 1000 });
  assert.deepEqual(calls, [
    { name: 'web_search_exa', arguments: params },
    { name: 'get_code_context_exa', arguments: { query: 'useState', tokensNum: 1000 } }
  ]);
});

test('Parallel selection dispatches through the registered tool into useful content', async t => {
  const calls = parallelFetch(t);
  const { web } = tools({ searchProvider: 'parallel' });
  assert.match(web.description, /Parallel/);
  assert.deepEqual(Object.keys(web.parameters.properties), ['query', 'searchQueries']);
  assert.deepEqual(await web.execute('id', { query: 'node api' }), content);
  assert.deepEqual(calls.map(call => call.body.method), ['initialize', 'notifications/initialized', 'tools/call']);
  assert.deepEqual(calls[2].body.params, {
    name: 'web_search', arguments: { objective: 'node api', search_queries: ['node api'] }
  });
  assert.ok(calls.every(call => call.signal === calls[0].signal));
});

test('Parallel accepts related keyword queries and multiline SSE with notifications', async t => {
  const envelope = JSON.stringify({ jsonrpc: '2.0', id: 2, result: content }, null, 2);
  const calls = parallelFetch(t, () => new Response(
    ': keepalive\r\n\r\ndata: {"jsonrpc":"2.0","method":"notifications/message"}\r\n\r\n' +
    'event: message\r\n' + envelope.split('\n').map(line => 'data:' + line).join('\r\n') + '\r\n\r\n',
    { headers: { 'Content-Type': 'text/event-stream' } }
  ));
  const queries = ['node fetch abort signal', 'node fetch timeout'];
  assert.deepEqual(await tools({ searchProvider: 'parallel' }).web.execute('id', {
    query: 'Find Node.js fetch cancellation documentation', searchQueries: queries
  }), content);
  assert.deepEqual(calls[2].body.params.arguments.search_queries, queries);
});

const failures: [string, () => Response, RegExp][] = [
  ['HTTP rate limit', () => new Response('Rate limit exceeded', { status: 429 }), /429/],
  ['MCP protocol error', () => new Response(JSON.stringify({ jsonrpc: '2.0', id: 2, error: { code: -32602, message: 'Invalid arguments' } })), /Invalid arguments/],
  ['tool error', () => rpc(2, { isError: true, content: [{ type: 'text', text: 'Search unavailable' }] }), /Search unavailable/],
  ['malformed response', () => new Response('invalid JSON'), /JSON|Unexpected/],
  ['unmatched response', () => rpc(99, content), /matching MCP response/],
  ['empty content', () => rpc(2, { content: [] }), /no text content/]
];
for (const [name, response, message] of failures) {
  test(`Parallel ${name} returns a tool error without provider fallback`, async t => {
    const calls = parallelFetch(t, response);
    const result = await tools({ searchProvider: 'parallel' }).web.execute('id', { query: 'node api' });
    assert.equal(result.isError, true);
    assert.match(result.content[0].text, message);
    assert.equal(calls.length, 3);
  });
}

test('network failure is returned through the tool', async t => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Network unavailable'); });
  const result = await tools({ searchProvider: 'parallel' }).web.execute('id', { query: 'node api' });
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /Network unavailable/);
});

test('a cancelled tool never starts a request', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Should not run'); });
  const controller = new AbortController();
  controller.abort(new Error('User cancelled'));
  const result = await tools({ searchProvider: 'parallel' }).web.execute('id', { query: 'node api' }, controller.signal);
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /User cancelled/);
  assert.equal(fetch.mock.callCount(), 0);
});

for (const reason of ['cancel', 'timeout']) {
  test(`Parallel ${reason} interrupts response body consumption`, async t => {
    const controller = new AbortController();
    const deadline = new AbortController();
    t.mock.method(AbortSignal, 'timeout', (ms: number) => {
      assert.equal(ms, 30_000);
      return deadline.signal;
    });
    let count = 0;
    t.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
      assert.equal(url, PARALLEL_URL);
      assert.equal(new Headers(options.headers).get('User-Agent'), USER_AGENT);
      if (++count === 1) return rpc(1, initialized);
      if (count === 2) return new Response(null, { status: 202 });
      return new Response(new ReadableStream({
        start(stream) {
          options.signal!.addEventListener('abort', () => stream.error(options.signal!.reason), { once: true });
          // Abort after fetch has resolved and text() is waiting for the body.
          setImmediate(() => (reason === 'timeout' ? deadline : controller).abort(
            new DOMException(reason, reason === 'timeout' ? 'TimeoutError' : 'AbortError')
          ));
        }
      }));
    });
    const result = await tools({ searchProvider: 'parallel' }).web.execute('id', { query: 'node api' }, controller.signal);
    assert.equal(result.isError, true);
    assert.match(result.content[0].text, new RegExp(reason));
    assert.equal(count, 3);
  });
}

test('invalid provider or empty Parallel queries fail before network access', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Should not run'); });
  assert.throws(() => tools({ searchProvider: 'unknown' }), /Unsupported searchProvider/);
  for (const params of [{ query: ' ' }, { query: 'node', searchQueries: [] }, { query: 'node', searchQueries: [''] }]) {
    assert.equal((await tools({ searchProvider: 'parallel' }).web.execute('id', params)).isError, true);
  }
  assert.equal(fetch.mock.callCount(), 0);
});

test('manifest and npm package expose the opt-in provider and its client', () => {
  const manifest = JSON.parse(readFileSync(new URL('../openclaw.plugin.json', import.meta.url), 'utf8'));
  assert.deepEqual(manifest.configSchema.properties.searchProvider.enum, ['exa', 'parallel']);
  assert.equal(manifest.configSchema.properties.searchProvider.default, 'exa');
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.ok(pkg.files.includes('parallel-client.ts'));
});
