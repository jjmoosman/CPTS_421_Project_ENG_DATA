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

// KWIC (Keyword in Context) concordance tool, modeled after AntConc's Concordance view.
// Receives the shared document text from the Document Manager via props so the user
// doesn't have to paste text twice.
function KeywordContextTool({ sharedText, setSharedText, sharedFileName }) {
  // The full document text the user will search through
  const [sourceText, setSourceText] = useState(sharedText || '');
  // The word or regex pattern the user typed into the search box
  const [query, setQuery] = useState('');
  // When true, the query is treated as a regular expression instead of a plain word
  const [isRegex, setIsRegex] = useState(false);
  // When true, the search respects uppercase/lowercase; otherwise it ignores case
  const [caseSensitive, setCaseSensitive] = useState(false);
  // How many words to show on each side of the matched keyword in the concordance table
  const [contextWords, setContextWords] = useState(5);
  // Array of hit objects produced by the last search run
  const [results, setResults] = useState([]);
  // Holds an error message if the regex is invalid or no matches were found
  const [error, setError] = useState('');
  // Which column the concordance table is currently sorted by
  const [sortBy, setSortBy] = useState('position');
  // 'asc' or 'desc' — direction of the current sort
  const [sortDir, setSortDir] = useState('asc');

  // Keep the local text in sync whenever the Document Manager loads a new file
  useEffect(() => {
    if (sharedText) setSourceText(sharedText);
  }, [sharedText]);

  const runSearch = () => {
    setError('');
    if (!query.trim()) { setResults([]); return; }
    try {
      // Build flags: always global so exec() loops; add 'i' when case-insensitive
      const flags = caseSensitive ? 'g' : 'gi';
      // If not in regex mode, escape special characters so the query is treated literally
      const pattern = isRegex ? query : escapeRegExp(query);
      const regexp = new RegExp(pattern, flags);
      const found = [];
      let match;

      // Loop through every occurrence of the pattern in the document
      while ((match = regexp.exec(sourceText)) !== null) {
        const start = match.index;
        const end = start + match[0].length;

        // Split everything before the match into words to enable word-level sorting later
        const leftWords = sourceText.slice(0, start).split(/\s+/).filter(Boolean);
        // Split everything after the match into words for the same reason
        const rightWords = sourceText.slice(end).split(/\s+/).filter(Boolean);

        found.push({
          id: found.length,           // unique row index used as the React key
          position: start,            // character offset in the document (used for # sort)
          keyword: match[0],          // the exact text that was matched
          // Take only the last N words from the left side for display
          left: leftWords.slice(-contextWords).join(' '),
          // Take only the first N words from the right side for display
          right: rightWords.slice(0, contextWords).join(' '),
          // Keep the full word arrays so sorting by 1L/2L/1R/2R can look further back or ahead
          leftWords,
          rightWords,
        });

        // Guard against infinite loops on zero-length matches (e.g. the pattern "a*")
        if (match[0].length === 0) regexp.lastIndex += 1;
      }

      setResults(found);
      if (found.length === 0) setError('No matches found.');
    } catch (e) {
      setResults([]);
      setError('Invalid regex: ' + e.message);
    }
  };

  // Helper: get the nth word from a word array for sorting.
  // Positive n counts from the start (right-context words): n=1 is the first word after the keyword.
  // Negative n counts from the end (left-context words): n=-1 is the word immediately before the keyword.
  const wordAt = (words, n) =>
    n > 0 ? words[n - 1]?.toLowerCase() || '' : words[words.length + n]?.toLowerCase() || '';

  // Produce a sorted copy of results without mutating the original array
  const sortedResults = [...results].sort((a, b) => {
    let va, vb;
    if (sortBy === 'position') { va = a.position; vb = b.position; }
    else if (sortBy === 'keyword') { va = a.keyword.toLowerCase(); vb = b.keyword.toLowerCase(); }
    // 1L / 2L: sort by the 1st or 2nd word to the LEFT of the keyword
    else if (sortBy === '1L') { va = wordAt(a.leftWords, -1); vb = wordAt(b.leftWords, -1); }
    else if (sortBy === '2L') { va = wordAt(a.leftWords, -2); vb = wordAt(b.leftWords, -2); }
    // 1R / 2R: sort by the 1st or 2nd word to the RIGHT of the keyword
    else if (sortBy === '1R') { va = wordAt(a.rightWords, 1); vb = wordAt(b.rightWords, 1); }
    else if (sortBy === '2R') { va = wordAt(a.rightWords, 2); vb = wordAt(b.rightWords, 2); }
    const cmp = va < vb ? -1 : va > vb ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  // If the user clicks the active sort column, flip direction; otherwise switch to that column ascending
  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  return (
    <ToolPage title="Keyword in Context (KWIC)" subtitle="Concordance view — each match is centered with surrounding context. Click sort buttons to reorder.">
      <div className="search-panel">
        <label>
          Document text
          <textarea
            value={sourceText}
            onChange={(e) => {
              setSourceText(e.target.value);
              if (setSharedText) setSharedText(e.target.value);
            }}
            rows={6}
          />
        </label>
        <p style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: '#406b99' }}>
          {sharedFileName ? `Loaded: ${sharedFileName}` : 'No file loaded.'}
        </p>

        <div className="search-controls">
          <label>
            Search query
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
              placeholder="word or regex"
            />
          </label>
          <label>
            Context words
            <input
              type="number"
              min={1}
              max={20}
              value={contextWords}
              onChange={(e) => setContextWords(Math.max(1, Math.min(20, Number(e.target.value))))}
              style={{ width: '4.5rem' }}
            />
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

        <div className="kwic-results">
          <div className="kwic-header">
            <h3>Concordance — {results.length} hit{results.length !== 1 ? 's' : ''}</h3>
            {results.length > 0 && (
              <div className="kwic-sort-row">
                <span>Sort:</span>
                {['position', '2L', '1L', 'keyword', '1R', '2R'].map(col => (
                  <button
                    key={col}
                    onClick={() => toggleSort(col)}
                    className={`kwic-sort-btn${sortBy === col ? ' active' : ''}`}
                    type="button"
                  >
                    {col === 'position' ? '#' : col}
                    {sortBy === col ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                  </button>
                ))}
              </div>
            )}
          </div>
          {error && <div className="error">{error}</div>}
          {results.length > 0 && (
            <div className="kwic-table-wrap">
              <table className="kwic-table">
                <tbody>
                  {sortedResults.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="kwic-num">{idx + 1}</td>
                      <td className="kwic-left">{item.left}</td>
                      <td className="kwic-keyword">{item.keyword}</td>
                      <td className="kwic-right">{item.right}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ToolPage>
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
