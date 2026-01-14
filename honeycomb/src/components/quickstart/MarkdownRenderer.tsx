import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import { CodeBlock } from './CodeBlock'

interface MarkdownRendererProps {
  content: string
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const components: Components = {
    // Handle fenced code blocks (wrapped in pre)
    pre({ children }) {
      return <>{children}</>
    },
    // Handle all code elements
    code({ className, children, node }) {
      const match = /language-(\w+)/.exec(className || '')
      const language = match ? match[1] : undefined
      const codeContent = String(children).replace(/\n$/, '')

      // Check if this is inside a pre tag (block code) by looking at parent
      const isBlock = node?.position && codeContent.includes('\n') || language

      if (isBlock) {
        return <CodeBlock code={codeContent} language={language} />
      }

      // Inline code
      return (
        <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">
          {children}
        </code>
      )
    },
    h1: ({ children }) => (
      <h1 className="text-2xl font-semibold mt-6 mb-3">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-xl font-semibold mt-5 mb-2">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-lg font-medium mt-4 mb-2">{children}</h3>
    ),
    p: ({ children }) => <p className="my-3 leading-relaxed">{children}</p>,
    ul: ({ children }) => <ul className="my-3 ml-6 list-disc">{children}</ul>,
    ol: ({ children }) => (
      <ol className="my-3 ml-6 list-decimal">{children}</ol>
    ),
    li: ({ children }) => <li className="my-1">{children}</li>,
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline"
      >
        {children}
      </a>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-4 pl-4 border-l-4 border-muted-foreground/30 text-muted-foreground">
        {children}
      </blockquote>
    ),
  }

  return (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  )
}
