// ============================================================================
// Grounded Chat & Security XSS Corpus Unit Tests (Phase 4)
// Follows: vitest-skill, frontend-security-coder, react-component-performance
// ============================================================================

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { Composer } from '../components/Composer';
import { useStream } from '../hooks/useStream';
import { Citation, asSourceId, asChunkId } from '../types';

describe('MarkdownRenderer Citation Parsing & Mathematical Rendering', () => {
  const citations: Citation[] = [
    {
      kind: 'chunk',
      marker: 1,
      sourceId: asSourceId('src_1'),
      chunkId: asChunkId('chk_1'),
      sourceTitle: 'Attention Paper.pdf',
      page: 3,
      quote: 'Multi-head attention projections'
    },
    {
      kind: 'chunk',
      marker: 2,
      sourceId: asSourceId('src_2'),
      chunkId: asChunkId('chk_2'),
      sourceTitle: 'ResNet Paper.pdf',
      page: 5,
      quote: 'Residual shortcut connections'
    }
  ];

  it('parses single citation marker [1] into interactive CitationPill', () => {
    render(<MarkdownRenderer content="Attention mechanisms are key [1]." citations={citations} />);

    const pill = screen.getByRole('button', { name: /Citation \[1\] from Attention Paper\.pdf/i });
    expect(pill).toBeInTheDocument();
    expect(pill).toHaveTextContent('[1]');
  });

  it('parses composite citation markers [1, 2] into two distinct pills', () => {
    render(<MarkdownRenderer content="Both models show gains [1, 2]." citations={citations} />);

    expect(screen.getByRole('button', { name: /Citation \[1\]/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Citation \[2\]/i })).toBeInTheDocument();
  });

  it('renders unresolved citations with fallback label', () => {
    render(<MarkdownRenderer content="Unknown citation marker [99]." citations={citations} />);

    const unresolvedPill = screen.getByRole('button', { name: /Citation \[99\] \(unresolved\)/i });
    expect(unresolvedPill).toBeInTheDocument();
  });

  it('renders inline KaTeX equations without throwing', () => {
    const { container } = render(
      <MarkdownRenderer content="Einstein stated that $E=mc^2$ is fundamental." citations={[]} />
    );

    expect(container.querySelector('.katex')).toBeInTheDocument();
  });
});

describe('Security XSS Corpus Testing (frontend-security-coder)', () => {
  it('renders <script> tags inert as escaped text and does NOT create executable script DOM nodes', () => {
    const { container } = render(
      <MarkdownRenderer
        content="Normal text <script>window.__xss_executed = true; alert('xss');</script> after text"
        citations={[]}
      />
    );

    // No script element injected into the DOM
    expect(container.querySelectorAll('script')).toHaveLength(0);
    // window.__xss_executed remains undefined
    expect((window as unknown as { __xss_executed?: boolean }).__xss_executed).toBeUndefined();
  });

  it('renders <img onerror> payloads inert without executing onerror handlers', () => {
    const { container } = render(
      <MarkdownRenderer
        content='<img src="invalid_image.jpg" onerror="window.__xss_img_executed = true;" />'
        citations={[]}
      />
    );

    expect(container.querySelectorAll('img')).toHaveLength(0);
    expect((window as unknown as { __xss_img_executed?: boolean }).__xss_img_executed).toBeUndefined();
  });

  it('rejects javascript: pseudo-protocol URLs and renders them as inert text', () => {
    render(
      <MarkdownRenderer
        content="[Click here to exploit](javascript:alert(document.cookie))"
        citations={[]}
      />
    );

    // Assert that no <a> tag has javascript: in its href
    const dangerousLink = screen.queryByRole('link', { name: /Click here to exploit/i });
    expect(dangerousLink).toBeNull();
    // Rendered inert as bracketed plain text
    expect(screen.getByText(/\[Click here to exploit\]\(javascript:alert\(document\.cookie\)\)/i)).toBeInTheDocument();
  });

  it('handles malformed KaTeX inputs without throwing unhandled exceptions', () => {
    expect(() => {
      render(
        <MarkdownRenderer
          content="Malformed equation $\\frac{1}{0\\invalid_macro_unclosed"
          citations={[]}
        />
      );
    }).not.toThrow();
  });
});

describe('Streaming Flush Batching (useStream)', () => {
  it('batches rapid token arrivals and flushes via requestAnimationFrame', async () => {
    let flushedCount = 0;
    const { result } = renderHook(() =>
      useStream({
        onFlush: () => {
          flushedCount++;
        }
      })
    );

    act(() => {
      result.current.appendToken('Token 1 ');
      result.current.appendToken('Token 2 ');
      result.current.appendToken('Token 3');
    });

    // Before rAF fires, content has not flushed yet
    expect(result.current.content).toBe('');

    // Trigger immediate flushNow
    act(() => {
      result.current.flushNow();
    });

    expect(result.current.content).toBe('Token 1 Token 2 Token 3');
    expect(flushedCount).toBe(1);
  });
});

describe('Composer States & Interaction', () => {
  it('disables submit button when draft is empty and enables when content is typed', () => {
    const onSend = vi.fn();
    render(
      <Composer
        onSend={onSend}
        isStreaming={false}
        activeSourcesCount={2}
        totalTokens={1400}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /Send research inquiry/i });
    expect(submitBtn).toBeDisabled();

    const textarea = screen.getByRole('textbox', { name: /Ask a research inquiry/i });
    fireEvent.change(textarea, { target: { value: 'Explain self-attention.' } });

    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);
    expect(onSend).toHaveBeenCalledWith('Explain self-attention.');
  });

  it('transforms submit button into stop button while streaming', () => {
    const onAbort = vi.fn();
    render(
      <Composer
        onSend={vi.fn()}
        onAbort={onAbort}
        isStreaming={true}
        activeSourcesCount={2}
        totalTokens={1400}
      />
    );

    const stopBtn = screen.getByRole('button', { name: /Stop response generation/i });
    expect(stopBtn).toBeInTheDocument();
    fireEvent.click(stopBtn);
    expect(onAbort).toHaveBeenCalledTimes(1);
  });
});
