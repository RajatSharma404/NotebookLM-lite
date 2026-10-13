// ============================================================================
// Server-Sent Events (SSE) Robust Streaming Parser
// Follows: async-python-patterns, react-component-performance, typescript-pro
// ============================================================================

import {
  StreamEvent,
  asMessageId,
  asSourceId,
  asChunkId,
  Citation,
  CitationItemPayload
} from '../types';

export interface SSEMessage {
  event?: string;
  data: string;
  id?: string;
  retry?: number;
}

/**
 * Pure SSE line/chunk buffer parser that correctly handles
 * partial transmissions across network chunk boundaries.
 */
export class SSEBufferParser {
  private buffer = '';

  /**
   * Push incoming text chunk and yield parsed complete SSE events.
   */
  public feed(chunk: string): StreamEvent[] {
    this.buffer += chunk;
    const events: StreamEvent[] = [];

    // Normalize Windows CRLF to LF
    this.buffer = this.buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Split on double newlines indicating SSE message boundaries
    let boundaryIndex: number;
    while ((boundaryIndex = this.buffer.indexOf('\n\n')) !== -1) {
      const rawMessage = this.buffer.slice(0, boundaryIndex);
      this.buffer = this.buffer.slice(boundaryIndex + 2);

      const parsedEvent = this.parseRawBlock(rawMessage);
      if (parsedEvent) {
        if (Array.isArray(parsedEvent)) {
          events.push(...parsedEvent);
        } else {
          events.push(parsedEvent);
        }
      }
    }

    return events;
  }

  /**
   * Clear any remaining buffered data
   */
  public reset(): void {
    this.buffer = '';
  }

  /**
   * Parse a single SSE block comprising 'data:', 'event:', etc.
   */
  private parseRawBlock(block: string): StreamEvent | StreamEvent[] | null {
    const lines = block.split('\n');
    const dataLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith(':')) {
        // SSE comment / heartbeat ping, ignore
        continue;
      }
      if (line.startsWith('data:')) {
        // Remove 'data:' and optional leading space
        const dataContent = line.slice(5).replace(/^\s/, '');
        dataLines.push(dataContent);
      }
    }

    if (dataLines.length === 0) {
      return null;
    }

    const fullData = dataLines.join('\n');
    if (!fullData.trim()) {
      return null;
    }

    try {
      const payload: unknown = JSON.parse(fullData);
      return this.transformPayloadToStreamEvent(payload);
    } catch {
      return {
        type: 'error',
        code: 'MALFORMED_JSON_EVENT',
        message: 'Received unparseable SSE data chunk: ' + fullData.slice(0, 100),
        retryable: false
      };
    }
  }

  private transformPayloadToStreamEvent(payload: unknown): StreamEvent | StreamEvent[] | null {
    if (typeof payload !== 'object' || payload === null) {
      return null;
    }

    const obj = payload as Record<string, unknown>;
    const type = typeof obj.type === 'string' ? obj.type : '';

    if (type === 'token') {
      const text = typeof obj.content === 'string' ? obj.content : (typeof obj.text === 'string' ? obj.text : '');
      return { type: 'token', text };
    }

    if (type === 'sources') {
      const citationsRaw = Array.isArray(obj.citations) ? (obj.citations as CitationItemPayload[]) : [];
      const events: StreamEvent[] = citationsRaw.map((item) => {
        const citation: Citation = {
          kind: 'chunk',
          marker: item.index,
          sourceId: asSourceId(item.source_id || ''),
          chunkId: item.chunk_id ? asChunkId(item.chunk_id) : undefined,
          sourceTitle: item.source_title,
          page: item.page_number,
          quote: item.snippet
        };
        return {
          type: 'citation',
          marker: item.index,
          citation
        };
      });
      return events;
    }

    if (type === 'done') {
      const msgId = typeof obj.message_id === 'string' ? obj.message_id : (typeof obj.messageId === 'string' ? obj.messageId : 'msg_done');
      return { type: 'done', messageId: asMessageId(msgId) };
    }

    if (type === 'error') {
      const code = typeof obj.code === 'string' ? obj.code : 'STREAM_ERROR';
      const message = typeof obj.message === 'string' ? obj.message : 'Error received during chat stream';
      const retryable = typeof obj.retryable === 'boolean' ? obj.retryable : true;
      return { type: 'error', code, message, retryable };
    }

    return null;
  }
}

/**
 * Reads a ReadableStream via an SSEBufferParser, invoking callback on each event.
 */
export async function consumeSSEStream(
  stream: ReadableStream<Uint8Array>,
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder('utf-8');
  const parser = new SSEBufferParser();

  try {
    while (true) {
      if (signal?.aborted) {
        await reader.cancel();
        return;
      }

      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const events = parser.feed(chunk);
      for (const ev of events) {
        onEvent(ev);
      }
    }
  } catch (err: unknown) {
    if (signal?.aborted) {
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    onEvent({
      type: 'error',
      code: 'NETWORK_STREAM_ABORTED',
      message,
      retryable: true
    });
  } finally {
    reader.releaseLock();
  }
}
