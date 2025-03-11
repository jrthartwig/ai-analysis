import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Define interface for code element props to include the inline property
interface CodeProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  return (
    <div className={`markdown-content text-left ${className || ''}`}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]} 
        rehypePlugins={[rehypeHighlight]}
        components={{
          h1: ({ node, ...props }) => <h1 className="text-xl font-bold mt-4 mb-2 text-left" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-lg font-bold mt-3 mb-2 text-left" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-md font-bold mt-2 mb-1 text-left" {...props} />,
          p: ({ node, ...props }) => <p className="mb-2 text-left" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-2 text-left" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-2 text-left" {...props} />,
          li: ({ node, ...props }) => <li className="mb-1 text-left" {...props} />,
          a: ({ node, ...props }) => <a className="text-primary hover:underline" {...props} />,
          code: ({ node, inline, ...props }: CodeProps) => 
            inline ? 
              <code className="bg-gray-100 px-1 py-0.5 rounded text-sm" {...props} /> : 
              <code {...props} />,
          pre: ({ node, ...props }) => <pre className="bg-gray-100 p-2 rounded-md overflow-x-auto mb-2 text-left" {...props} />,
          table: ({ node, ...props }) => <table className="border-collapse border border-gray-300 mb-2 text-left" {...props} />,
          thead: ({ node, ...props }) => <thead className="bg-gray-100" {...props} />,
          tr: ({ node, ...props }) => <tr className="border-b border-gray-300" {...props} />,
          th: ({ node, ...props }) => <th className="border border-gray-300 px-2 py-1 font-bold text-left" {...props} />,
          td: ({ node, ...props }) => <td className="border border-gray-300 px-2 py-1 text-left" {...props} />,
          blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-gray-300 pl-4 py-1 italic mb-2 text-left" {...props} />,
          hr: ({ node, ...props }) => <hr className="my-4" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
