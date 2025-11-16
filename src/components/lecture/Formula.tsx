import React, { useEffect, useRef } from 'react';

// Make sure KaTeX is loaded from the CDN in index.html
declare const katex: any;

interface FormulaProps {
  latex: string;
}

const Formula: React.FC<FormulaProps> = ({ latex }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && typeof katex !== 'undefined') {
      try {
        katex.render(latex, containerRef.current, {
          throwOnError: false,
          displayMode: true,
        });
      } catch (e) {
        console.error('KaTeX rendering error:', e);
        if (containerRef.current) {
          containerRef.current.textContent = `Error rendering formula: ${latex}`;
        }
      }
    } else {
      // Fallback simple rendering when KaTeX is not available
      if (containerRef.current) {
        const renderSimpleLaTeX = (text: string): string => {
          return text
            // Superscripts
            .replace(/\^{([^}]+)}/g, '<sup>$1</sup>')
            .replace(/\^(\d+)/g, '<sup>$1</sup>')
            // Subscripts  
            .replace(/_{([^}]+)}/g, '<sub>$1</sub>')
            .replace(/_(\d+)/g, '<sub>$1</sub>')
            // Greek letters
            .replace(/\\alpha/g, 'α')
            .replace(/\\beta/g, 'β')
            .replace(/\\gamma/g, 'γ')
            .replace(/\\delta/g, 'δ')
            .replace(/\\epsilon/g, 'ε')
            .replace(/\\theta/g, 'θ')
            .replace(/\\lambda/g, 'λ')
            .replace(/\\mu/g, 'μ')
            .replace(/\\pi/g, 'π')
            .replace(/\\rho/g, 'ρ')
            .replace(/\\sigma/g, 'σ')
            .replace(/\\phi/g, 'φ')
            .replace(/\\omega/g, 'ω')
            // Mathematical operators
            .replace(/\\times/g, '×')
            .replace(/\\div/g, '÷')
            .replace(/\\pm/g, '±')
            .replace(/\\leq/g, '≤')
            .replace(/\\geq/g, '≥')
            .replace(/\\neq/g, '≠')
            .replace(/\\approx/g, '≈')
            .replace(/\\infty/g, '∞')
            // Fractions (simple case)
            .replace(/\\frac{([^}]+)}{([^}]+)}/g, '($1)/($2)')
            // Square root
            .replace(/\\sqrt{([^}]+)}/g, '√($1)');
        };
        containerRef.current.innerHTML = `<span class="formula font-mono text-lg">${renderSimpleLaTeX(latex)}</span>`;
      }
    }
  }, [latex]);

  return <div ref={containerRef} className="formula-container" />;
};

export default Formula;