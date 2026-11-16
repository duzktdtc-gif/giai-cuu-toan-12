import { useMemo } from "react";
import katex from "katex";

interface MathTextProps {
  text: string;
  className?: string;
  block?: boolean;
}

const cache = new Map<string, string>();

function renderMath(tex: string, displayMode: boolean): string {
  const key = `${displayMode ? "d" : "i"}:${tex}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const html = katex.renderToString(tex, {
    throwOnError: false,
    displayMode,
    strict: false,
    output: "htmlAndMathml",
    trust: false,
  });
  cache.set(key, html);
  if (cache.size > 800) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  return html;
}

/** Hiển thị text trộn công thức trong cặp $...$ bằng KaTeX (an toàn: phần text là React node). */
export function MathText({ text, className = "", block = false }: MathTextProps) {
  const parts = useMemo(() => text.split("$"), [text]);
  return (
    <span className={`math-text ${block ? "block" : ""} ${className}`}>
      {parts.map((part, index) => {
        if (index % 2 === 1 && part.length > 0) {
          const html = renderMath(part, block && parts.length === 3);
          return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}

/** Công thức rời (dùng cho đáp án). */
export function MathBlock({ tex, className = "" }: { tex: string; className?: string }) {
  const html = useMemo(() => renderMath(tex, true), [tex]);
  return <span className={`math-text ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
