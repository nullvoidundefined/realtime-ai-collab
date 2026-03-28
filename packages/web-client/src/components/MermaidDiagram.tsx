'use client';

import mermaid from 'mermaid';
import { useEffect, useId, useRef, useState } from 'react';

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
});

export default function MermaidDiagram({ chart }: { chart: string }) {
  const id = useId().replace(/:/g, '');
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    mermaid
      .render(`mermaid-${id}`, chart)
      .then(({ svg: rendered }) => setSvg(rendered))
      .catch((err) => setError(String(err)));
  }, [chart, id]);

  if (error) {
    return (
      <pre style={{ color: '#ef4444', fontSize: '0.8rem', padding: '1rem' }}>
        {error}
      </pre>
    );
  }

  return (
    <div
      ref={ref}
      style={{ overflowX: 'auto', margin: '1.5rem 0' }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
