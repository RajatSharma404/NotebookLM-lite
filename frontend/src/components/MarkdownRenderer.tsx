// ============================================================================
// MarkdownRenderer Component
// Follows: markstream-react, frontend-security-coder, react-component-performance
// ============================================================================

import React, { useMemo, useState } from 'react';
import katex from 'katex';
import { Citation, CitationItem, asSourceId } from '../types';
import { CitationPill } from './CitationPill';
import { isValidExternalLink } from '../utils/sanitize';
import { Copy, Check } from 'lucide-react';

export interface MarkdownRendererProps {
  content: string;
  citations?: Array<Citation | CitationItem>;
  onCitationClick?: (citation: Citation) => void;
  className?: string;
}

// Convert CitationItem to Citation union
function normalizeCitation(c: Citation | CitationItem): Citation {
  if ('kind' in c) return c;
  return {
    kind: 'chunk',
    marker: c.index,
    sourceId: asSourceId(c.source_id || ''),
    sourceTitle: c.source_title,
    page: c.page_number,
    quote: c.snippet
  };
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  citations = [],
  onCitationClick,
  className = ''
}) => {
  // Normalize citations map keyed by marker index
  const citationMap = useMemo(() => {
    const map = new Map<number, Citation>();
    citations.forEach((raw) => {
      const normalized = normalizeCitation(raw);
      const marker = normalized.marker || 1;
      map.set(marker, normalized);
    });
    return map;
  }, [citations]);

  // Safe KaTeX renderer with trust: false
  const renderMath = (latex: string, displayMode: boolean): React.ReactNode => {
    try {
      const html = katex.renderToString(latex, {
        displayMode,
        throwOnError: false,
        trust: false // SECURITY INVARIANT: never execute macros with trust
      });
      // KaTeX output is verified safe math markup; rendering as a sanitized SVG/MathML span
      return (
        <span
          className={displayMode ? 'katex-block' : 'katex-inline'}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    } catch {
      return <code>{latex}</code>;
    }
  };

  // Safe Inline Renderer (Bold, Italic, Code, Math, Links, Citations)
  const renderInline = (text: string): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];

    // Unified Tokenizer Regex
    // 1. Math: \$([^\$\n]+)\$
    // 2. Citations: \[(\d+(?:\s*,\s*\d+)*)\]
    // 3. Links: \[([^\]]+)\]\(([^)]+)\)
    // 4. Bold: \*\*([^*]+)\*\*
    // 5. Italic: \*([^*]+)\*
    // 6. Code: `([^`]+)`
    const regex = /(\$([^\$\n]+)\$)|(\[(\d+(?:\s*,\s*\d+)*)\])|(\[([^\]]+)\]\(([^)]+)\))|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)/g;

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      // Plain text before match
      if (match.index > lastIndex) {
        nodes.push(text.slice(lastIndex, match.index));
      }

      if (match[2]) {
        // Inline Math: $...$
        nodes.push(
          <span key={match.index} style={{ margin: '0 2px' }}>
            {renderMath(match[2], false)}
          </span>
        );
      } else if (match[4]) {
        // Citation Bracket: [1] or [1, 2]
        const indices = match[4].split(',').map((s) => parseInt(s.trim(), 10));
        indices.forEach((idx, i) => {
          const foundCitation = citationMap.get(idx) || { kind: 'unresolved' as const, marker: idx };
          nodes.push(
            <CitationPill
              key={`${match!.index}-${idx}-${i}`}
              citation={foundCitation}
              onClick={() => onCitationClick?.(foundCitation)}
            />
          );
        });
      } else if (match[6] && match[7]) {
        // Safe Link: [text](url) with protocol allowlist & rel="noopener noreferrer"
        const linkText = match[6];
        const rawUrl = match[7];
        const isSafe = isValidExternalLink(rawUrl);

        if (isSafe) {
          nodes.push(
            <a
              key={match.index}
              href={rawUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--accent-text)',
                textDecoration: 'underline',
                textUnderlineOffset: '2px'
              }}
            >
              {linkText}
            </a>
          );
        } else {
          // Dangerous link protocol: render inert as plain text
          nodes.push(`[${linkText}](${rawUrl})`);
        }
      } else if (match[9]) {
        // Bold: **text**
        nodes.push(
          <strong key={match.index} style={{ fontWeight: 600, color: 'var(--text-1)' }}>
            {match[9]}
          </strong>
        );
      } else if (match[11]) {
        // Italic: *text*
        nodes.push(
          <em key={match.index} style={{ fontStyle: 'italic' }}>
            {match[11]}
          </em>
        );
      } else if (match[13]) {
        // Inline Code: `code`
        nodes.push(
          <code
            key={match.index}
            className="font-mono"
            style={{
              backgroundColor: 'var(--bg-1)',
              border: '1px solid var(--line)',
              borderRadius: '3px',
              padding: '1px 5px',
              fontSize: '12.5px',
              color: 'var(--text-1)'
            }}
          >
            {match[13]}
          </code>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      nodes.push(text.slice(lastIndex));
    }

    return nodes;
  };

  // Block Level Splitting (Headings, Math Blocks, Code Blocks, Paragraphs)
  const blocks = useMemo(() => {
    const rawBlocks: React.ReactNode[] = [];
    const lines = content.split('\n');

    let inCodeBlock = false;
    let codeLanguage = '';
    let codeBuffer: string[] = [];

    let inMathBlock = false;
    let mathBuffer: string[] = [];

    let paragraphBuffer: string[] = [];

    const flushParagraph = (key: string) => {
      if (paragraphBuffer.length > 0) {
        const text = paragraphBuffer.join(' ');
        if (text.trim()) {
          rawBlocks.push(
            <p
              key={key}
              style={{
                marginBottom: 'var(--space-3)',
                lineHeight: 'var(--lh-body)',
                color: 'var(--text-1)',
                fontSize: 'var(--text-16)'
              }}
            >
              {renderInline(text)}
            </p>
          );
        }
        paragraphBuffer = [];
      }
    };

    lines.forEach((line, idx) => {
      // Code Block Start/End
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          flushParagraph(`p-before-code-${idx}`);
          inCodeBlock = true;
          codeLanguage = line.slice(3).trim();
          codeBuffer = [];
        } else {
          inCodeBlock = false;
          const codeText = codeBuffer.join('\n');
          rawBlocks.push(
            <CodeBlock key={`code-${idx}`} code={codeText} language={codeLanguage} />
          );
          codeBuffer = [];
        }
        return;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        return;
      }

      // Block Math Start/End ($$)
      if (line.trim().startsWith('$$')) {
        if (!inMathBlock) {
          flushParagraph(`p-before-math-${idx}`);
          inMathBlock = true;
          mathBuffer = [line.trim().slice(2)];
        } else {
          inMathBlock = false;
          mathBuffer.push(line.trim().replace(/\$\$$/, ''));
          const latex = mathBuffer.join('\n').trim();
          rawBlocks.push(
            <div
              key={`math-${idx}`}
              style={{
                margin: 'var(--space-4) 0',
                padding: 'var(--space-3)',
                backgroundColor: 'var(--bg-1)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius-1)',
                display: 'flex',
                justifyContent: 'center',
                overflowX: 'auto'
              }}
            >
              {renderMath(latex, true)}
            </div>
          );
          mathBuffer = [];
        }
        return;
      }

      if (inMathBlock) {
        mathBuffer.push(line);
        return;
      }

      // Headings
      if (line.startsWith('# ')) {
        flushParagraph(`p-before-h1-${idx}`);
        rawBlocks.push(
          <h1
            key={`h1-${idx}`}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-32)',
              marginTop: 'var(--space-6)',
              marginBottom: 'var(--space-3)',
              color: 'var(--text-1)',
              lineHeight: 1.2
            }}
          >
            {renderInline(line.slice(2))}
          </h1>
        );
        return;
      }

      if (line.startsWith('## ')) {
        flushParagraph(`p-before-h2-${idx}`);
        rawBlocks.push(
          <h2
            key={`h2-${idx}`}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '22px',
              marginTop: 'var(--space-5)',
              marginBottom: 'var(--space-2)',
              color: 'var(--text-1)',
              lineHeight: 1.25
            }}
          >
            {renderInline(line.slice(3))}
          </h2>
        );
        return;
      }

      if (line.startsWith('### ')) {
        flushParagraph(`p-before-h3-${idx}`);
        rawBlocks.push(
          <h3
            key={`h3-${idx}`}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '18px',
              marginTop: 'var(--space-4)',
              marginBottom: 'var(--space-2)',
              color: 'var(--text-1)',
              lineHeight: 1.3
            }}
          >
            {renderInline(line.slice(4))}
          </h3>
        );
        return;
      }

      // Bullet Lists
      if (line.startsWith('- ') || line.startsWith('* ')) {
        flushParagraph(`p-before-li-${idx}`);
        rawBlocks.push(
          <div
            key={`li-${idx}`}
            style={{
              display: 'flex',
              gap: 'var(--space-2)',
              marginBottom: 'var(--space-1)',
              paddingLeft: 'var(--space-2)'
            }}
          >
            <span style={{ color: 'var(--accent)', lineHeight: 'var(--lh-body)' }}>&bull;</span>
            <div style={{ flex: 1, lineHeight: 'var(--lh-body)' }}>{renderInline(line.slice(2))}</div>
          </div>
        );
        return;
      }

      // Empty Line
      if (!line.trim()) {
        flushParagraph(`p-flush-${idx}`);
        return;
      }

      paragraphBuffer.push(line);
    });

    flushParagraph('p-final');
    return rawBlocks;
  }, [content, citationMap]);

  return <div className={`ui-markdown-renderer ${className}`}>{blocks}</div>;
};

// Syntax-Highlighted Code Block with Copy Button
function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      style={{
        margin: 'var(--space-4) 0',
        backgroundColor: 'var(--bg-1)',
        border: '1px solid var(--line-strong)',
        borderRadius: 'var(--radius-1)',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-1) var(--space-3)',
          borderBottom: '1px solid var(--line)',
          backgroundColor: 'var(--bg-0)'
        }}
      >
        <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'lowercase' }}>
          {language || 'text'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy code to clipboard"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-3)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px'
          }}
        >
          {copied ? <Check size={12} style={{ color: 'var(--accent)' }} /> : <Copy size={12} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      <pre
        className="font-mono"
        style={{
          margin: 0,
          padding: 'var(--space-3)',
          fontSize: '13px',
          color: 'var(--text-1)',
          overflowX: 'auto',
          lineHeight: '1.5',
          fontVariantNumeric: 'tabular-nums'
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default MarkdownRenderer;
