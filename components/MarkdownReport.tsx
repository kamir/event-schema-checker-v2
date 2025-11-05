import React from 'react';

interface MarkdownReportProps {
  content: string;
}

const parseMarkdown = (markdown: string) => {
    const lines = markdown.split('\n');
    const elements: (JSX.Element | null)[] = [];
    let inTable = false;
    let tableHeaders: string[] = [];
    let listItems: JSX.Element[] = [];

    const flushList = () => {
        if (listItems.length > 0) {
            elements.push(<ul key={`ul-${elements.length}`} className="space-y-1 my-2">{listItems}</ul>);
            listItems = [];
        }
    };

    lines.forEach((line, index) => {
        const trimmedLine = line.trim();

        // Handle list flushing before processing a non-list item
        if (!trimmedLine.startsWith('- ') && !trimmedLine.startsWith('* ')) {
            flushList();
        }
        
        // Skip empty lines between elements
        if (!trimmedLine) {
            if (elements[elements.length - 1] !== null) {
                elements.push(null); // Use null as a separator for paragraphs
            }
            return;
        }

        // Table logic
        if (trimmedLine.startsWith('|')) {
            const cells = trimmedLine.split('|').map(c => c.trim()).slice(1, -1);
            if (!inTable) { // This is the header row
                inTable = true;
                tableHeaders = cells;
                elements.push(
                    <table key={`table-${index}`} className="w-full text-left border-collapse text-sm my-4">
                        <thead>
                            <tr className="border-b-2 border-brand-border">
                                {tableHeaders.map((header, i) => <th key={i} className="p-2 font-semibold text-brand-text">{header}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                        </tbody>
                    </table>
                );
            } else if (!trimmedLine.includes('---')) { // This is a data row
                const table = elements[elements.length - 1];
                if(table && table.props.children && table.props.children[1]) {
                    const tbody = table.props.children[1];
                    (tbody.props.children as any[]).push(
                         <tr key={`row-${index}`} className="border-b border-brand-border/50">
                            {cells.map((cell, i) => <td key={i} className="p-2 text-brand-subtle font-mono">{cell}</td>)}
                        </tr>
                    );
                }
            }
            return;
        } else {
            inTable = false;
        }

        // Headers
        if (trimmedLine.startsWith('## ')) {
            elements.push(<h2 key={index} className="text-xl font-bold mt-6 mb-2 pb-1 border-b border-brand-border text-brand-text">{trimmedLine.substring(3)}</h2>);
        } else if (trimmedLine.startsWith('# ')) {
            elements.push(<h1 key={index} className="text-2xl font-bold mt-6 mb-2 pb-1 border-b border-brand-border text-brand-text">{trimmedLine.substring(2)}</h1>);
        } 
        // List items
        else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
             listItems.push(<li key={index} className="ml-5 list-disc text-brand-subtle">{trimmedLine.substring(2)}</li>);
        }
        // Paragraphs, handling bold and inline code
        else {
             const parts = trimmedLine.split(/(\*\*.*?\*\*|`.*?`)/g).filter(Boolean);
             const paragraphContent = parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={i} className="font-semibold text-brand-text">{part.substring(2, part.length - 2)}</strong>;
                }
                if (part.startsWith('`') && part.endsWith('`')) {
                    return <code key={i} className="bg-brand-primary px-1.5 py-0.5 rounded-md text-brand-accent-secondary text-xs font-mono">{part.substring(1, part.length - 1)}</code>;
                }
                return part;
             });
             elements.push(<p key={index} className="text-brand-subtle leading-relaxed my-2">{paragraphContent}</p>);
        }
    });

    flushList(); // Flush any remaining list items at the end
    return elements.filter(e => e !== null);
};

export const MarkdownReport: React.FC<MarkdownReportProps> = ({ content }) => {
  return (
    <div className="max-w-none p-4 sm:p-6">
        {parseMarkdown(content)}
    </div>
  );
};
