import React, { useMemo } from 'react';
import katex from 'katex';
import { CitationItem } from '../types';
import { CitationPill } from './CitationPill';
import { Copy, Check } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  citations?: CitationItem[];
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  citations = []
}) => {
  const citationMap = useMemo(() => {
    const map = new Map<number, CitationItem>();
    citations.forEach(c => map.set(c.index, c));
    return map;
  }, [citations]);

  // Helper to render inline elements (bold, italic, code, math, citations)
  const renderInline = (text: string): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];

    // Unified regex for Citations, Inline Math, Bold, Italic, Inline Code
    // Citations: \[(\d+(?:\s*,\s*\d+)*)\]
    // Inline Math: \$([^\$\n]+)\$
    // Inline Code: `([^`]+)`
    // Bold: \*\*([^*]+)\*\*
    // Italic: \*([^*]+)\*
    const tokenRegex = /(\[(\d+(?:\s*,\s*\d+)*)\]|\$([^\$\n]+)\$|`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*)/g;

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(text)) !== null) {
      const matchStart = match.index;
      const fullMatch = match[0];

      if (matchStart > lastIndex) {
        nodes.push(text.substring(lastIndex, matchStart));
      }

      if (match[2]) {
        // Citation match: could be [1] or [1, 2]
        const indices = match[2].split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
        nodes.push(
          <span key={`cit-grp-${matchStart}`} style={{ display: 'inline-flex', gap: '2px', verticalAlign: 'baseline' }}>
            {indices.map(idx => (
              <CitationPill key={`cit-${matchStart}-${idx}`} index={idx} citation={citationMap.get(idx)} />
            ))}
          </span>
        );
      } else if (match[3]) {
        // Inline Math: $...$
        const mathExpr = match[3];
        try {
          const html = katex.renderToString(mathExpr, { throwOnError: false, displayMode: false });
          nodes.push(
            <span
              key={`math-${matchStart}`}
              dangerouslySetInnerHTML={{ __html: html }}
              style={{ margin: '0 2px' }}
            />
          );
        } catch {
          nodes.push(<code key={`math-err-${matchStart}`} className="mono">${mathExpr}$</code>);
        }
      } else if (match[4]) {
        // Inline Code: `...`
        nodes.push(
          <code
            key={`code-${matchStart}`}
            className="mono"
            style={{
              backgroundColor: 'var(--bg-1)',
              border: '1px solid var(--line)',
              borderRadius: '3px',
              padding: '2px 5px',
              fontSize: '12.5px',
              color: 'var(--accent)'
            }}
          >
            {match[4]}
          </code>
        );
      } else if (match[5]) {
        // Bold: **...**
        nodes.push(<strong key={`bold-${matchStart}`} style={{ fontWeight: 600, color: 'var(--text-1)' }}>{renderInline(match[5])}</strong>);
      } else if (match[6]) {
        // Italic: *...*
        nodes.push(<em key={`italic-${matchStart}`} style={{ fontStyle: 'italic' }}>{renderInline(match[6])}</em>);
      }

      lastIndex = tokenRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      nodes.push(text.substring(lastIndex));
    }

    return nodes;
  };

  // Split lines into blocks (headers, code blocks, math blocks, lists, quotes, paragraphs)
  const blocks = useMemo(() => {
    const rawLines = content.split('\n');
    const result: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeLang = '';
    let codeLines: string[] = [];
    let inMathBlock = false;
    let mathLines: string[] = [];

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];

      // Code Block Boundary
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          // Close Code Block
          const codeText = codeLines.join('\n');
          result.push(
            <CodeBlockView key={`codeblock-${i}`} code={codeText} lang={codeLang} />
          );
          codeLines = [];
          codeLang = '';
          inCodeBlock = false;
          continue;
        } else {
          // Open Code Block
          inCodeBlock = true;
          codeLang = line.trim().slice(3).trim();
          continue;
        }
      }

      if (inCodeBlock) {
        codeLines.push(line);
        continue;
      }

      // Math Block Boundary: $$
      if (line.trim().startsWith('$$')) {
        if (inMathBlock) {
          const mathText = mathLines.join('\n');
          try {
            const html = katex.renderToString(mathText, { throwOnError: false, displayMode: true });
            result.push(
              <div
                key={`mathblock-${i}`}
                dangerouslySetInnerHTML={{ __html: html }}
                style={{ margin: '14px 0', overflowX: 'auto', textAlign: 'center' }}
              />
            );
          } catch {
            result.push(<pre key={`mathblock-err-${i}`} className="mono">{mathText}</pre>);
          }
          mathLines = [];
          inMathBlock = false;
          continue;
        } else {
          inMathBlock = true;
          continue;
        }
      }

      if (inMathBlock) {
        mathLines.push(line);
        continue;
      }

      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }

      // Headings
      if (trimmed.startsWith('# ')) {
        result.push(
          <h1 key={`h1-${i}`} className="serif" style={{ fontSize: '24px', fontWeight: 500, margin: '20px 0 10px', color: 'var(--text-1)', lineHeight: 1.25 }}>
            {renderInline(trimmed.substring(2))}
          </h1>
        );
      } else if (trimmed.startsWith('## ')) {
        result.push(
          <h2 key={`h2-${i}`} className="serif" style={{ fontSize: '19px', fontWeight: 500, margin: '18px 0 8px', color: 'var(--text-1)', lineHeight: 1.3 }}>
            {renderInline(trimmed.substring(3))}
          </h2>
        );
      } else if (trimmed.startsWith('### ')) {
        result.push(
          <h3 key={`h3-${i}`} className="serif" style={{ fontSize: '16px', fontWeight: 600, margin: '14px 0 6px', color: 'var(--text-1)', lineHeight: 1.35 }}>
            {renderInline(trimmed.substring(4))}
          </h3>
        );
      } else if (trimmed.startsWith('> ')) {
        // Blockquote
        result.push(
          <blockquote
            key={`quote-${i}`}
            style={{
              borderLeft: '3px solid var(--accent)',
              paddingLeft: '14px',
              margin: '12px 0',
              color: 'var(--text-2)',
              fontStyle: 'italic',
              lineHeight: 1.6
            }}
          >
            {renderInline(trimmed.substring(2))}
          </blockquote>
        );
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        // Unordered list item
        result.push(
          <div key={`li-${i}`} style={{ display: 'flex', gap: '8px', margin: '4px 0 4px 12px', lineHeight: 1.65 }}>
            <span style={{ color: 'var(--accent)', flexShrink: 0 }}>•</span>
            <div>{renderInline(trimmed.substring(2))}</div>
          </div>
        );
      } else if (/^\d+\.\s/.test(trimmed)) {
        // Ordered list item
        const numMatch = trimmed.match(/^(\d+)\.\s(.*)$/);
        if (numMatch) {
          result.push(
            <div key={`oli-${i}`} style={{ display: 'flex', gap: '8px', margin: '4px 0 4px 12px', lineHeight: 1.65 }}>
              <span className="mono" style={{ color: 'var(--text-3)', fontSize: '12px', flexShrink: 0, minWidth: '18px' }}>
                {numMatch[1]}.
              </span>
              <div>{renderInline(numMatch[2])}</div>
            </div>
          );
        }
      } else {
        // Standard Paragraph
        result.push(
          <p key={`p-${i}`} style={{ margin: '8px 0', lineHeight: 1.7, fontSize: '15px' }}>
            {renderInline(trimmed)}
          </p>
        );
      }
    }

    return result;
  }, [content, citationMap]);

  return <div style={{ color: 'var(--text-1)' }}>{blocks}</div>;
};

interface CodeBlockViewProps {
  code: string;
  lang?: string;
}

const CodeBlockView: React.FC<CodeBlockViewProps> = ({ code, lang }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        margin: '14px 0',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--line-strong)',
        backgroundColor: 'var(--bg-1)',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '6px 12px',
          borderBottom: '1px solid var(--line)',
          backgroundColor: 'var(--bg-2)'
        }}
      >
        <span className="mono" style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase' }}>
          {lang || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="mono"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            color: copied ? 'var(--accent)' : 'var(--text-3)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 4px'
          }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre
        className="mono"
        style={{
          padding: '12px 14px',
          fontSize: '13px',
          lineHeight: 1.5,
          overflowX: 'auto',
          margin: 0,
          color: 'var(--text-1)'
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
};
