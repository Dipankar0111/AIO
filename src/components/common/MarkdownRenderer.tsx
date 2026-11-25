import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Helper to parse markdown into blocks
  const renderBlocks = () => {
    if (!content) return null;

    // Filter out internal hidden action blocks from the visible markdown rendering
    const cleanContent = content
      .replace(/```action:save_note[\s\S]*?```/g, '')
      .replace(/```action:add_event[\s\S]*?```/g, '')
      .replace(/```action:add_todo[\s\S]*?```/g, '')
      .trim();

    const lines = cleanContent.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeLanguage = '';
    let codeBuffer: string[] = [];
    let codeBlockCount = 0;
    let inTable = false;
    let tableBuffer: string[] = [];

    const flushTable = () => {
      if (tableBuffer.length === 0) return;
      const rows = tableBuffer.map(row =>
        row
          .split('|')
          .slice(1, -1)
          .map(cell => cell.trim())
      );
      if (rows.length >= 2) {
        const header = rows[0];
        const bodyRows = rows.slice(2);
        elements.push(
          <div key={`table-${elements.length}`} className="my-4 overflow-x-auto rounded-card border border-theme-border bg-theme-surface/70 shadow-warm-sm">
            <table className="w-full text-left text-xs text-theme-secondary">
              <thead className="border-b border-theme-border bg-theme-sidebar/90 text-theme-primary">
                <tr>
                  {header.map((col, idx) => (
                    <th key={idx} className="px-4 py-2.5 font-semibold tracking-wider font-mono text-[11px] uppercase">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border/60">
                {bodyRows.map((r, rIdx) => (
                  <tr key={rIdx} className="hover:bg-theme-elevated/50 transition-colors">
                    {r.map((c, cIdx) => (
                      <td key={cIdx} className="px-4 py-2.5 font-mono text-xs text-theme-primary">
                        {renderInline(c)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      tableBuffer = [];
      inTable = false;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Code blocks start/end
      if (line.trim().startsWith('```')) {
        if (inTable) flushTable();

        if (inCodeBlock) {
          const codeString = codeBuffer.join('\n');
          const currentIdx = codeBlockCount++;
          elements.push(
            <div key={`code-${i}`} className="my-3 overflow-hidden rounded-card border border-theme-border bg-theme-code/85 shadow-warm-sm">
              <div className="flex items-center justify-between border-b border-theme-border/80 bg-theme-sidebar/70 px-4 py-2 text-xs text-theme-secondary">
                <span className="font-mono text-[11px] font-semibold text-theme-accent uppercase tracking-wider">
                  {codeLanguage || 'snippet'}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyCode(codeString, currentIdx)}
                  className="inline-flex items-center gap-1.5 rounded-btn px-2.5 py-1 text-[11px] text-theme-secondary hover:bg-theme-surface hover:text-theme-primary transition-colors border border-theme-border"
                >
                  {copiedIndex === currentIdx ? (
                    <>
                      <Check className="h-3 w-3 text-theme-accent" />
                      <span className="text-theme-accent font-medium">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-theme-primary">
                <code>{codeString}</code>
              </pre>
            </div>
          );
          codeBuffer = [];
          codeLanguage = '';
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
          codeLanguage = line.trim().replace(/^```/, '').trim();
        }
        continue;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        continue;
      }

      // Tables
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        inTable = true;
        tableBuffer.push(line.trim());
        continue;
      } else if (inTable) {
        flushTable();
      }

      // Empty line
      if (!line.trim()) {
        elements.push(<div key={`empty-${i}`} className="h-2" />);
        continue;
      }

      // Headings
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={`h1-${i}`} className="font-editorial mt-5 mb-2.5 text-xl sm:text-2xl font-bold tracking-tight text-theme-primary flex items-center gap-2">
            {renderInline(line.replace('# ', ''))}
          </h1>
        );
      } else if (line.startsWith('## ')) {
        elements.push(
          <h2 key={`h2-${i}`} className="font-editorial mt-4 mb-2 text-lg sm:text-xl font-semibold tracking-tight text-theme-primary">
            {renderInline(line.replace('## ', ''))}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        elements.push(
          <h3 key={`h3-${i}`} className="mt-3.5 mb-1.5 text-xs font-semibold uppercase tracking-wider text-theme-accent">
            {renderInline(line.replace('### ', ''))}
          </h3>
        );
      } else if (line.startsWith('#### ')) {
        elements.push(
          <h4 key={`h4-${i}`} className="mt-2.5 mb-1 text-xs font-medium text-theme-secondary">
            {renderInline(line.replace('#### ', ''))}
          </h4>
        );
      }
      // Blockquote
      else if (line.startsWith('> ')) {
        elements.push(
          <blockquote key={`quote-${i}`} className="my-2.5 border-l-2 border-theme-accent bg-theme-accentLight/40 px-4 py-2 text-xs italic text-theme-secondary rounded-r-card">
            {renderInline(line.replace('> ', ''))}
          </blockquote>
        );
      }
      // Checkbox list
      else if (line.trim().startsWith('- [ ] ') || line.trim().startsWith('- [x] ')) {
        const isChecked = line.trim().startsWith('- [x] ');
        const text = line.trim().replace(/- \[[ x]\] /, '');
        elements.push(
          <div key={`check-${i}`} className="flex items-start gap-2.5 my-1.5 text-xs">
            <span className={`inline-flex items-center justify-center mt-0.5 h-4 w-4 rounded border transition-colors ${isChecked ? 'bg-theme-accent/20 border-theme-accent text-theme-accent' : 'border-theme-borderStrong bg-theme-surface'}`}>
              {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
            </span>
            <span className={isChecked ? 'line-through text-theme-muted' : 'text-theme-primary'}>
              {renderInline(text)}
            </span>
          </div>
        );
      }
      // Bullet list
      else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        elements.push(
          <li key={`li-${i}`} className="ml-5 list-disc text-xs leading-relaxed text-theme-primary my-1 marker:text-theme-accent">
            {renderInline(line.trim().replace(/^[-*]\s+/, ''))}
          </li>
        );
      }
      // Numbered list
      else if (/^\d+\.\s/.test(line.trim())) {
        elements.push(
          <li key={`nli-${i}`} className="ml-5 list-decimal text-xs leading-relaxed text-theme-primary my-1 marker:text-theme-accent">
            {renderInline(line.trim().replace(/^\d+\.\s+/, ''))}
          </li>
        );
      }
      // Horizontal Rule
      else if (line.trim() === '---' || line.trim() === '***') {
        elements.push(<hr key={`hr-${i}`} className="my-4 border-theme-border" />);
      }
      // Regular paragraph
      else {
        elements.push(
          <p key={`p-${i}`} className="text-xs sm:text-[13px] leading-relaxed text-theme-primary my-1.5">
            {renderInline(line)}
          </p>
        );
      }
    }

    if (inTable) flushTable();

    // Flush unclosed code block (e.g. during live streaming)
    if (inCodeBlock && codeBuffer.length > 0) {
      const codeString = codeBuffer.join('\n');
      const currentIdx = codeBlockCount++;
      elements.push(
        <div key={`code-unclosed-${currentIdx}`} className="my-3 overflow-hidden rounded-card border border-theme-border bg-theme-code/85 shadow-warm-sm">
          <div className="flex items-center justify-between border-b border-theme-border/80 bg-theme-sidebar/70 px-4 py-2 text-xs text-theme-secondary">
            <span className="font-mono text-[11px] font-semibold text-theme-accent uppercase tracking-wider">
              {codeLanguage || 'snippet'}
            </span>
          </div>
          <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-theme-primary">
            <code>{codeString}</code>
          </pre>
        </div>
      );
    }

    return elements;
  };

  // Helper for inline tokens: **bold**, *italic*, `code`, [link](url)
  const renderInline = (text: string): React.ReactNode => {
    if (!text) return null;

    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g);

    return parts.map((part, idx) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={idx}
            className="rounded bg-theme-code/90 px-1.5 py-0.5 font-mono text-[11px] font-medium text-theme-accent border border-theme-border"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="font-semibold text-theme-primary">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <em key={idx} className="italic text-theme-secondary font-serif">
            {part.slice(1, -1)}
          </em>
        );
      }
      const linkMatch = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
      if (linkMatch) {
        return (
          <a
            key={idx}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-theme-accent underline underline-offset-2 hover:opacity-80"
          >
            {linkMatch[1]}
          </a>
        );
      }
      return part;
    });
  };

  return <div className={`space-y-1 ${className}`}>{renderBlocks()}</div>;
};
