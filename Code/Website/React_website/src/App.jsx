import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import './App.css';

const tools = [
  {
    name: 'Keyword & Context',
    route: '/keyword-context',
    description: 'Search terms in documents, highlight matches, and show surrounding context.'
  },
  {
    name: 'Annotate',
    route: '/annotate',
    description: 'Add, edit, and save annotations on text data for review and tagging.'
  },
  {
    name: 'Data Visualization',
    route: '/data-visualization',
    description: 'Render charts or graphs from structured data sources.'
  }
];

function Dashboard() {
  const navigate = useNavigate();

  return (
    <section className="content-grid" aria-label="tools">
      {tools.map((tool) => (
        <article key={tool.name} className="card">
          <h2>{tool.name}</h2>
          <p>{tool.description}</p>
          <button onClick={() => navigate(tool.route)}>Open</button>
        </article>
      ))}
    </section>
  );
}

function ToolPage({ title, subtitle, children }) {
  return (
    <section className="page-content">
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <div style={{ marginTop: '1rem' }}>{children}</div>
    </section>
  );
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function SearchTool({ title, subtitle, extraRender, sharedText, setSharedText, sharedFileName }) {
  const [sourceText, setSourceText] = useState(sharedText || 'Paste or type text here to search...');
  const [query, setQuery] = useState('');
  const [isRegex, setIsRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (sharedText) {
      setSourceText(sharedText);
    }
  }, [sharedText]);

  const runSearch = () => {
    setError('');

    if (!query.trim()) {
      setResults([]);
      return;
    }

    try {
      const flags = caseSensitive ? 'g' : 'gi';
      const pattern = isRegex ? query : escapeRegExp(query);
      const regexp = new RegExp(pattern, flags);

      const found = [];
      let match;

      while ((match = regexp.exec(sourceText)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        const contextStart = Math.max(0, start - 40);
        const contextEnd = Math.min(sourceText.length, end + 40);
        const context = sourceText.slice(contextStart, contextEnd);

        found.push({
          start,
          end,
          matchText: match[0],
          context,
          contextStart,
          contextEnd,
        });

        if (match[0].length === 0) {
          regexp.lastIndex += 1;
        }
      }

      setResults(found);
      if (found.length === 0) {
        setError('No matches found.');
      }
    } catch (e) {
      setResults([]);
      setError('Invalid regex: ' + e.message);
    }
  };

  return (
    <ToolPage title={title} subtitle={subtitle}>
      <div className="search-panel">
        <label>
          Document text
          <textarea
            value={sourceText}
            onChange={(e) => {
              setSourceText(e.target.value);
              if (setSharedText) setSharedText(e.target.value);
            }}
            rows={10}
          />
        </label>

        <p style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: '#406b99' }}>
          {sharedFileName ? `Loaded: ${sharedFileName}` : 'No file loaded.'}
        </p>

        <div className="search-controls">
          <label>
            Search query
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="word or regex" />
          </label>
          <label>
            <input type="checkbox" checked={isRegex} onChange={(e) => setIsRegex(e.target.checked)} />
            Use regex
          </label>
          <label>
            <input type="checkbox" checked={caseSensitive} onChange={(e) => setCaseSensitive(e.target.checked)} />
            Case sensitive
          </label>
          <button className="run-search" onClick={runSearch} type="button">Search</button>
        </div>

        <div className="search-results">
          <h3>Results ({results.length})</h3>
          {error && <div className="error">{error}</div>}
          <ul>
            {results.map((item, idx) => {
              const label = item.matchText || '';
              const re = new RegExp(escapeRegExp(label), caseSensitive ? 'g' : 'gi');
              const parts = item.context.split(re);
              const matches = item.context.match(re) || [];

              return (
                <li key={`${item.start}-${idx}`}>
                  <span className="result-meta">pos {item.start}-{item.end}: "{item.matchText}"</span>
                  <p>
                    {parts.flatMap((part, partIndex) => (
                      partIndex < matches.length
                        ? [<span key={`n-${partIndex}`}>{part}</span>, <strong key={`m-${partIndex}`}>{matches[partIndex]}</strong>]
                        : [<span key={`n-${partIndex}`}>{part}</span>]
                    ))}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>

        {extraRender && extraRender({
          sourceText,
          query,
          isRegex,
          caseSensitive,
          results,
          setSourceText,
          setQuery,
          setIsRegex,
          setCaseSensitive,
          runSearch,
          setResults,
          setError,
        })}
      </div>
    </ToolPage>
  );
}

function KeywordContextTool() {
  return (
    <SearchTool
      title="Keyword & Context"
      subtitle="Lookup terms with literal or regex search and see nearby context."
    />
  );
}

function AnnotateTool({ sharedText, setSharedText, sharedFileName }) {
  const [sourceText, setSourceText] = useState(sharedText || 'Paste or type text here...');
  const [annotations, setAnnotations] = useState([]);
  const [newAnnotation, setNewAnnotation] = useState('');
  const [pendingSelection, setPendingSelection] = useState(null);
  const [activeAnnotation, setActiveAnnotation] = useState(null);
  const textRef = useRef(null);

  useEffect(() => {
    if (sharedText) setSourceText(sharedText);
  }, [sharedText]);

  const handleTextMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setPendingSelection(null);
      return;
    }
    const range = selection.getRangeAt(0);
    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(textRef.current);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    const start = preSelectionRange.toString().length;
    const selectedText = selection.toString();
    if (selectedText.length > 0) {
      setPendingSelection({ start, end: start + selectedText.length, selectedText });
    } else {
      setPendingSelection(null);
    }
  };

  const addAnnotation = () => {
    if (!newAnnotation.trim()) return;
    const annotation = {
      id: Date.now(),
      start: pendingSelection?.start ?? null,
      end: pendingSelection?.end ?? null,
      selectedText: pendingSelection?.selectedText ?? null,
      note: newAnnotation.trim(),
    };
    setAnnotations(prev => [...prev, annotation]);
    setNewAnnotation('');
    setPendingSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  const deleteAnnotation = (id) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
    if (activeAnnotation?.id === id) setActiveAnnotation(null);
  };

  const renderAnnotatedText = () => {
    if (!annotations.length) return <span>{sourceText}</span>;
    const ranges = annotations
      .filter(a => a.start !== null)
      .sort((a, b) => a.start - b.start);
    const parts = [];
    let cursor = 0;
    ranges.forEach((ann) => {
      if (ann.start > cursor) {
        parts.push(<span key={`text-${cursor}`}>{sourceText.slice(cursor, ann.start)}</span>);
      }
      const isActive = activeAnnotation?.id === ann.id;
      parts.push(
        <mark
          key={`mark-${ann.id}`}
          onClick={() => setActiveAnnotation(isActive ? null : ann)}
          className={`annotate-highlight${isActive ? ' active' : ''}`}
          title={ann.note}
        >
          {sourceText.slice(ann.start, ann.end)}
        </mark>
      );
      cursor = Math.max(cursor, ann.end);
    });
    if (cursor < sourceText.length) {
      parts.push(<span key="text-end">{sourceText.slice(cursor)}</span>);
    }
    return parts;
  };

  return (
    <ToolPage title="Annotate" subtitle="Highlight text then add an annotation, or annotate the document generally.">
      <div className="search-panel">
        <label>Document text</label>
        <div
          ref={textRef}
          onMouseUp={handleTextMouseUp}
          className="annotate-text-display"
        >
          {renderAnnotatedText()}
        </div>

        <p className="annotate-file-label">
          {sharedFileName ? `Loaded: ${sharedFileName}` : 'No file loaded.'}
        </p>

        <div className={`annotate-selection-status${pendingSelection ? '' : ' empty'}`}>
          {pendingSelection
            ? <>Selected: <strong>"{pendingSelection.selectedText.slice(0, 60)}{pendingSelection.selectedText.length > 60 ? '…' : ''}"</strong></>
            : <span>No text selected — annotation will apply to the whole document.</span>
          }
        </div>

        <div className="annotate-input-row">
          <input
            value={newAnnotation}
            onChange={(e) => setNewAnnotation(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addAnnotation()}
            placeholder="Enter annotation..."
          />
          <button className="run-search" type="button" onClick={addAnnotation}>Add</button>
        </div>

        <div className="annotate-list-header">
          <h3>Annotations ({annotations.length})</h3>
          {annotations.length === 0 && <p className="annotate-selection-status empty">No annotations yet.</p>}
          <ul className="annotate-list">
            {annotations.map((ann) => (
              <li
                key={ann.id}
                onClick={() => setActiveAnnotation(activeAnnotation?.id === ann.id ? null : ann)}
                className={`annotate-list-item${activeAnnotation?.id === ann.id ? ' active' : ''}`}
              >
                <div className="annotate-item-note">{ann.note}</div>
                {ann.selectedText
                  ? <div className="annotate-item-excerpt">↳ "{ann.selectedText.slice(0, 80)}{ann.selectedText.length > 80 ? '…' : ''}"</div>
                  : <div className="annotate-item-excerpt general">General annotation</div>
                }
                <button
                  className="annotate-item-delete"
                  onClick={(e) => { e.stopPropagation(); deleteAnnotation(ann.id); }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ToolPage>
  );
}

function DataVisualizationTool() {
  const [chartType, setChartType] = useState('bar');

  return (
    <SearchTool
      title="Data Visualization"
      subtitle="Search data text and render a sample chart based on generated values."
      extraRender={({ results }) => (
        <div>
          <h3>Visualization Options</h3>
          <label>
            Chart type
            <select value={chartType} onChange={(e) => setChartType(e.target.value)}>
              <option value="bar">Bar</option>
              <option value="line">Line</option>
              <option value="table">Table</option>
            </select>
          </label>
          <p>Matches from search: {results.length}</p>
          <div style={{ marginTop: '0.8rem', padding: '0.8rem', border: '1px solid #dbe3f8', borderRadius: '8px', background: '#f5f8ff' }}>
            <strong>Sample output:</strong> {chartType} (data items: {Math.max(results.length, 0)}).
          </div>
        </div>
      )}
    />
  );
}

function DocumentManager({ setSharedText, setSharedFileName }) {
  const [error, setError] = useState('');

  const loadFile = (file) => {
    if (!file) return;
    if (!file.type.includes('text') && !file.name.endsWith('.txt')) {
      setError('Please upload a plain text (.txt) file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setSharedText(event.target.result || '');
      setSharedFileName(file.name);
      setError('');
    };
    reader.onerror = () => {
      setError('Error reading file.');
    };
    reader.readAsText(file);
  };

  const onSelectFile = (event) => {
    setError('');
    const file = event.target.files[0];
    loadFile(file);
  };

  const onDrop = (event) => {
    event.preventDefault();
    setError('');
    const file = event.dataTransfer.files[0];
    loadFile(file);
  };

  const onDragOver = (event) => {
    event.preventDefault();
  };

  return (
    <ToolPage title="Document Manager" subtitle="Upload text documents for professor review in the other tools.">
      <div style={{ display: 'grid', gap: '1rem' }}>
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          style={{
            border: '2px dashed #5d92dd',
            borderRadius: '0.75rem',
            padding: '1.1rem',
            textAlign: 'center',
            background: '#f7faff',
            cursor: 'pointer',
          }}
        >
          Drag and drop a .txt file here, or click to select
          <input
            type="file"
            accept=".txt,text/plain"
            onChange={onSelectFile}
            style={{ marginTop: '0.75rem', display: 'block', marginLeft: 'auto', marginRight: 'auto' }}
          />
        </div>
        {error && <div className="error" style={{ marginTop: '-0.5rem' }}>{error}</div>}
      </div>
    </ToolPage>
  );
}

function Courses() {
  return (
    <section className="page-content">
      <h1>Courses</h1>
      <p>This view is reserved for course management details.</p>
    </section>
  );
}

export default function App() {
  const [uploadedText, setUploadedText] = useState('Paste or type text here to search...');
  const [uploadedFileName, setUploadedFileName] = useState('');

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">Dashboard</div>
        <nav>
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active' : '')}>Dashboard</NavLink>
          <NavLink to="/document-manager" className={({ isActive }) => (isActive ? 'active' : '')}>Document Manager</NavLink>
          <NavLink to="/keyword-context" className={({ isActive }) => (isActive ? 'active' : '')}>Keyword & Context</NavLink>
          <NavLink to="/annotate" className={({ isActive }) => (isActive ? 'active' : '')}>Annotate</NavLink>
          <NavLink to="/data-visualization" className={({ isActive }) => (isActive ? 'active' : '')}>Data Visualization</NavLink>
          <NavLink to="/courses" className={({ isActive }) => (isActive ? 'active' : '')}>Courses</NavLink>
        </nav>
      </aside>
      <main className="main-content">
        <header className="page-header">
          <h1>Project Dashboard</h1>
          <p>Pick a section to continue.</p>
        </header>

        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/document-manager" element={<DocumentManager setSharedText={setUploadedText} setSharedFileName={setUploadedFileName} />} />
          <Route path="/keyword-context" element={<KeywordContextTool sharedText={uploadedText} setSharedText={setUploadedText} sharedFileName={uploadedFileName} />} />
          <Route path="/annotate" element={<AnnotateTool sharedText={uploadedText} setSharedText={setUploadedText} sharedFileName={uploadedFileName} />} />
          <Route path="/data-visualization" element={<DataVisualizationTool sharedText={uploadedText} setSharedText={setUploadedText} sharedFileName={uploadedFileName} />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="*" element={<h2>Page not found</h2>} />
        </Routes>
      </main>
    </div>
  );
}
