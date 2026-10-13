// ============================================================================
// SSE Parser Unit Tests
// Follows: vitest-skill, typescript-pro
// ============================================================================

import { describe, it, expect, vi } from 'vitest';
import { SSEBufferParser, consumeSSEStream } from '../api/sse';
import { StreamEvent } from '../types';

describe('SSEBufferParser', () => {
  it('parses standard token event', () => {
    const parser = new SSEBufferParser();
    const events = parser.feed('data: {"type": "token", "content": "Hello"}\n\n');

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      type: 'token',
      text: 'Hello'
    });
  });

  it('correctly handles events split across chunk boundaries', () => {
    const parser = new SSEBufferParser();

    // Push first partial chunk
    const events1 = parser.feed('data: {"type": "token", "con');
    expect(events1).toHaveLength(0);

    // Push second partial chunk completing the event
    const events2 = parser.feed('tent": "Split Content"}\n\n');
    expect(events2).toHaveLength(1);
    expect(events2[0]).toEqual({
      type: 'token',
      text: 'Split Content'
    });
  });

  it('parses backend sources citations payload', () => {
    const parser = new SSEBufferParser();
    const payload = JSON.stringify({
      type: 'sources',
      citations: [
        {
          index: 1,
          chunk_id: 'chk_123',
          source_id: 'src_456',
          source_title: 'Attention.pdf',
          page_number: 2,
          snippet: 'Self-attention mechanism'
        }
      ]
    });

    const events = parser.feed(`data: ${payload}\n\n`);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('citation');
    const firstEvent = events[0];
    if (firstEvent.type === 'citation' && firstEvent.citation.kind === 'chunk') {
      expect(firstEvent.marker).toBe(1);
      expect(firstEvent.citation.sourceTitle).toBe('Attention.pdf');
    }
  });

  it('handles multiple events delivered in a single chunk', () => {
    const parser = new SSEBufferParser();
    const chunk = [
      'data: {"type": "token", "content": "Part 1"}\n\n',
      'data: {"type": "token", "content": "Part 2"}\n\n',
      'data: {"type": "done", "message_id": "msg_001"}\n\n'
    ].join('');

    const events = parser.feed(chunk);
    expect(events).toHaveLength(3);
    expect(events[0]).toEqual({ type: 'token', text: 'Part 1' });
    expect(events[1]).toEqual({ type: 'token', text: 'Part 2' });
    expect(events[2]).toEqual({ type: 'done', messageId: 'msg_001' });
  });

  it('gracefully handles malformed JSON without crashing', () => {
    const parser = new SSEBufferParser();
    const events = parser.feed('data: {invalid json content\n\n');

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('error');
    if (events[0].type === 'error') {
      expect(events[0].code).toBe('MALFORMED_JSON_EVENT');
      expect(events[0].retryable).toBe(false);
    }
  });

  it('ignores heartbeat pings and SSE comments', () => {
    const parser = new SSEBufferParser();
    const events = parser.feed(': ping\n\n: keep-alive\n\ndata: {"type": "token", "content": "Ready"}\n\n');

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: 'token', text: 'Ready' });
  });
});

describe('consumeSSEStream', () => {
  it('aborts cleanly when AbortSignal is triggered', async () => {
    const controller = new AbortController();
    const received: string[] = [];

    const stream = new ReadableStream<Uint8Array>({
      async start(streamController) {
        const encoder = new TextEncoder();
        streamController.enqueue(encoder.encode('data: {"type": "token", "content": "A"}\n\n'));
        await new Promise((r) => setTimeout(r, 20));
        streamController.enqueue(encoder.encode('data: {"type": "token", "content": "B"}\n\n'));
        streamController.close();
      }
    });

    await consumeSSEStream(
      stream,
      (event) => {
        if (event.type === 'token') {
          received.push(event.text);
          if (event.text === 'A') {
            controller.abort();
          }
        }
      },
      controller.signal
    );

    expect(received).toEqual(['A']);
  });
});
