import ReactMarkdown from "react-markdown";

export function MarkdownBody({ children }: { children: string }) {
  return (
    <div className="prose-changelog">
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-3 text-[15px] leading-7 text-stone-800">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-stone-900">{children}</strong>,
          em: ({ children }) => <em className="italic text-stone-700">{children}</em>,
          code: ({ children }) => (
            <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[12px] text-stone-800">{children}</code>
          ),
          ul: ({ children }) => <ul className="mb-3 ml-5 list-disc space-y-1 text-[15px] leading-7 text-stone-800">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 ml-5 list-decimal space-y-1 text-[15px] leading-7 text-stone-800">{children}</ol>,
          li: ({ children }) => <li className="text-stone-800">{children}</li>,
          a: ({ href, children }) => (
            <a className="text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-500" href={href}>
              {children}
            </a>
          ),
          h2: ({ children }) => <h2 className="mt-6 mb-2 font-display text-lg font-bold tracking-tight text-stone-900">{children}</h2>,
          h3: ({ children }) => <h3 className="mt-4 mb-1.5 font-display text-base font-semibold text-stone-900">{children}</h3>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
