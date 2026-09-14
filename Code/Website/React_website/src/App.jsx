import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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

const COMMON_STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can',
  'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they',
  'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both',
  'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
  'so', 'than', 'too', 'very', 'just', 'if', 'before', 'after', 'above', 'below', 'up', 'down'
]);

function generateWordFrequency(text) {
  if (!text) return [];
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  const frequency = {};
  words.forEach(word => {
    if (word.length > 2 && !COMMON_STOPWORDS.has(word)) {
      frequency[word] = (frequency[word] || 0) + 1;
    }
  });
  return Object.entries(frequency)
    .map(([text, value]) => ({ text, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 100);
}

function combineSelectedFiles(uploadedFiles, selectedFileIds) {
  if (!uploadedFiles || uploadedFiles.length === 0) return '';
  const selected = uploadedFiles.filter(f => selectedFileIds.includes(f.id));
  if (selected.length === 0) return '';
  if (selected.length === 1) return selected[0].content;
  return selected.map(f => `--- File: ${f.name} ---\n\n${f.content}`).join('\n\n');
}

function FileSidebar({ uploadedFiles, selectedFileIds, onToggle }) {
  return (
    <aside className="file-list-sidebar">
      <h3>Files</h3>
      {uploadedFiles && uploadedFiles.length > 0 ? (
        <ul className="file-list">
          {uploadedFiles.map(file => (
            <li key={file.id}>
              <label className="file-item">
                <input
                  type="checkbox"
                  checked={selectedFileIds.includes(file.id)}
                  onChange={() => onToggle(file.id)}
                />
                <span className="file-name">{file.name}</span>
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <p className="no-files">No files loaded.</p>
      )}
    </aside>
  );
}

// KWIC (Keyword in Context) concordance tool, modeled after AntConc's Concordance view.
function KeywordContextTool({ uploadedFiles }) {
  const [selectedFileIds, setSelectedFileIds] = useState([]);
  const [query, setQuery] = useState('');
  const [isRegex, setIsRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [contextWords, setContextWords] = useState(5);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('position');
  const [sortDir, setSortDir] = useState('asc');

  useEffect(() => {
    if (uploadedFiles && uploadedFiles.length > 0) {
      setSelectedFileIds(uploadedFiles.map(f => f.id));
    } else {
      setSelectedFileIds([]);
    }
    setResults([]);
  }, [uploadedFiles]);

  const sourceText = combineSelectedFiles(uploadedFiles, selectedFileIds);

  const toggleFileSelection = (fileId) => {
    setSelectedFileIds(prev =>
      prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
    );
    setResults([]);
  };

  const runSearch = () => {
    setError('');
    if (!query.trim()) { setResults([]); return; }
    if (!sourceText) { setError('No files selected.'); return; }
    try {
      const flags = caseSensitive ? 'g' : 'gi';
      const pattern = isRegex ? query : escapeRegExp(query);
      const regexp = new RegExp(pattern, flags);
      const found = [];
      let match;
      while ((match = regexp.exec(sourceText)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        const leftWords = sourceText.slice(0, start).split(/\s+/).filter(Boolean);
        const rightWords = sourceText.slice(end).split(/\s+/).filter(Boolean);
        found.push({
          id: found.length,
          position: start,
          keyword: match[0],
          left: leftWords.slice(-contextWords).join(' '),
          right: rightWords.slice(0, contextWords).join(' '),
          leftWords,
          rightWords,
        });
        if (match[0].length === 0) regexp.lastIndex += 1;
      }
      setResults(found);
      if (found.length === 0) setError('No matches found.');
    } catch (e) {
      setResults([]);
      setError('Invalid regex: ' + e.message);
    }
  };

  const wordAt = (words, n) =>
    n > 0 ? words[n - 1]?.toLowerCase() || '' : words[words.length + n]?.toLowerCase() || '';

  const sortedResults = [...results].sort((a, b) => {
    let va, vb;
    if (sortBy === 'position') { va = a.position; vb = b.position; }
    else if (sortBy === 'keyword') { va = a.keyword.toLowerCase(); vb = b.keyword.toLowerCase(); }
    else if (sortBy === '1L') { va = wordAt(a.leftWords, -1); vb = wordAt(b.leftWords, -1); }
    else if (sortBy === '2L') { va = wordAt(a.leftWords, -2); vb = wordAt(b.leftWords, -2); }
    else if (sortBy === '1R') { va = wordAt(a.rightWords, 1); vb = wordAt(b.rightWords, 1); }
    else if (sortBy === '2R') { va = wordAt(a.rightWords, 2); vb = wordAt(b.rightWords, 2); }
    const cmp = va < vb ? -1 : va > vb ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  return (
    <ToolPage title="Keyword in Context (KWIC)" subtitle="Concordance view — each match is centered with surrounding context. Click sort buttons to reorder.">
      <div className="search-panel-with-files">
        <FileSidebar uploadedFiles={uploadedFiles} selectedFileIds={selectedFileIds} onToggle={toggleFileSelection} />
        <div className="search-panel">
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
      </div>
    </ToolPage>
  );
}

const PALETTE = [
  { name: 'Yellow', light: '#fef9c3', medium: '#fde047', dark: '#ca8a04', darkText: '#fff' },
  { name: 'Green',  light: '#dcfce7', medium: '#86efac', dark: '#16a34a', darkText: '#fff' },
  { name: 'Blue',   light: '#dbeafe', medium: '#93c5fd', dark: '#2563eb', darkText: '#fff' },
  { name: 'Pink',   light: '#fce7f3', medium: '#f9a8d4', dark: '#db2777', darkText: '#fff' },
  { name: 'Purple', light: '#ede9fe', medium: '#c4b5fd', dark: '#7c3aed', darkText: '#fff' },
  { name: 'Orange', light: '#ffedd5', medium: '#fdba74', dark: '#ea580c', darkText: '#fff' },
  { name: 'Teal',   light: '#ccfbf1', medium: '#5eead4', dark: '#0d9488', darkText: '#fff' },
  { name: 'Red',    light: '#fee2e2', medium: '#fca5a5', dark: '#dc2626', darkText: '#fff' },
];

const PENDING_STYLE = {
  backgroundColor: '#fde68a',
  border: '2px dashed #b45309',
  color: '#1f2937',
};

// Three states: unselected (light, no border), tagActive (medium + dashed
// border — this highlight belongs to the selected tag, but isn't the
// specific location currently focused), locationActive (dark + dashed
// border — this exact highlight is the one currently selected).
function getMarkStyle(color, state) {
  if (state === 'locationActive') {
    return { backgroundColor: color.dark, color: color.darkText, border: `2px dashed ${color.light}` };
  }
  if (state === 'tagActive') {
    return { backgroundColor: color.medium, color: '#1f2937', border: `2px dashed ${color.dark}` };
  }
  return { backgroundColor: color.light, color: '#1f2937', border: '2px solid transparent' };
}

function AnnotateTool({ uploadedFiles }) {
  const [selectedFileIds, setSelectedFileIds] = useState([]);
  const [sourceText, setSourceText] = useState('');
  const [tags, setTags] = useState([]); // [{ id, note, color, ranges: [{id, start, end, selectedText}] }]
  const [newAnnotation, setNewAnnotation] = useState('');
  const [pendingSelection, setPendingSelection] = useState(null);
  const [activeTagId, setActiveTagId] = useState(null);
  const [activeLocationId, setActiveLocationId] = useState(null);
  const [hoverInfo, setHoverInfo] = useState(null); // { note, x, y }
  const textRef = useRef(null);
  const docPanelRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (uploadedFiles && uploadedFiles.length > 0) {
      const allIds = uploadedFiles.map(f => f.id);
      setSelectedFileIds(allIds);
      setSourceText(combineSelectedFiles(uploadedFiles, allIds));
    } else {
      setSelectedFileIds([]);
      setSourceText('');
    }
    setTags([]);
    setPendingSelection(null);
    setActiveTagId(null);
    setActiveLocationId(null);
  }, [uploadedFiles]);

  useEffect(() => {
    if (pendingSelection) {
      inputRef.current?.focus();
    }
  }, [pendingSelection]);

  const toggleFileSelection = (fileId) => {
    const newSelection = selectedFileIds.includes(fileId)
      ? selectedFileIds.filter(id => id !== fileId)
      : [...selectedFileIds, fileId];
    setSelectedFileIds(newSelection);
    setSourceText(combineSelectedFiles(uploadedFiles, newSelection));
    setTags([]);
    setPendingSelection(null);
    setActiveTagId(null);
    setActiveLocationId(null);
  };

  const clearActiveSelection = () => {
    setActiveTagId(null);
    setActiveLocationId(null);
  };

  const handleTextMouseUp = (e) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setPendingSelection(null);
      if (e.target === textRef.current || !e.target.closest('mark')) {
        clearActiveSelection();
      }
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
      clearActiveSelection();
    } else {
      setPendingSelection(null);
    }
  };

  const commitRange = (tagId, noteText) => {
    const range = pendingSelection
      ? { id: Date.now() + Math.random(), start: pendingSelection.start, end: pendingSelection.end, selectedText: pendingSelection.selectedText }
      : { id: Date.now() + Math.random(), start: null, end: null, selectedText: null };

    setTags(prev => {
      if (tagId) {
        return prev.map(t => t.id === tagId ? { ...t, ranges: [...t.ranges, range] } : t);
      }
      const trimmed = noteText.trim();
      const existing = prev.find(t => t.note.toLowerCase() === trimmed.toLowerCase());
      if (existing) {
        return prev.map(t => t.id === existing.id ? { ...t, ranges: [...t.ranges, range] } : t);
      }
      const color = PALETTE[prev.length % PALETTE.length];
      const newTag = { id: Date.now() + Math.random(), note: trimmed, color, ranges: [range] };
      return [...prev, newTag];
    });

    setNewAnnotation('');
    setPendingSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  const addNewOrMatchingTag = () => {
    if (!newAnnotation.trim()) return;
    commitRange(null, newAnnotation);
  };

  const addToExistingTag = (tag) => {
    commitRange(tag.id, tag.note);
    setActiveTagId(tag.id);
  };

  const updateTagColor = (tagId, color) => {
    setTags(prev => prev.map(t => t.id === tagId ? { ...t, color } : t));
  };

  const deleteRange = (tagId, rangeId) => {
    setTags(prev => prev
      .map(t => t.id === tagId ? { ...t, ranges: t.ranges.filter(r => r.id !== rangeId) } : t)
      .filter(t => t.ranges.length > 0)
    );
    if (activeLocationId === rangeId) setActiveLocationId(null);
  };

  const deleteTag = (tagId) => {
    setTags(prev => prev.filter(t => t.id !== tagId));
    if (activeTagId === tagId) clearActiveSelection();
  };

  const jumpToLocation = (tagId, rangeId) => {
    setPendingSelection(null);
    setActiveTagId(tagId);
    setActiveLocationId(rangeId);
    // Use a data-attribute query rather than getElementById: a single range
    // can be split across multiple <mark> segments (when something else
    // overlaps it in the middle), so its id isn't guaranteed unique in the DOM.
    const el = textRef.current?.querySelector(`mark[data-range-id="${rangeId}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const cycleLocation = (direction) => {
    const tag = tags.find(t => t.id === activeTagId);
    if (!tag) return;
    const located = tag.ranges.filter(r => r.start !== null);
    if (located.length === 0) return;
    const currentIndex = located.findIndex(r => r.id === activeLocationId);
    const nextIndex = currentIndex === -1
      ? 0
      : (currentIndex + direction + located.length) % located.length;
    jumpToLocation(tag.id, located[nextIndex].id);
  };

  const toggleTagOpen = (tagId) => {
    setPendingSelection(null);
    setActiveTagId(prev => (prev === tagId ? null : tagId));
    setActiveLocationId(null);
  };

  const handleMarkClick = (e, tagId, rangeId) => {
    e.stopPropagation();
    setPendingSelection(null);
    if (activeTagId === tagId && activeLocationId === rangeId) {
      clearActiveSelection();
    } else {
      setActiveTagId(tagId);
      setActiveLocationId(rangeId);
    }
  };

  const handleMarkMouseMove = (e, note) => {
    const container = docPanelRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    setHoverInfo({
      note,
      x: e.clientX - containerRect.left + container.scrollLeft,
      y: e.clientY - containerRect.top + container.scrollTop,
    });
  };

  const handleMarkMouseLeave = () => setHoverInfo(null);

  // Splits the text into non-overlapping segments and, for any segment
  // covered by more than one range, picks exactly one "winner" to display —
  // so overlapping annotations never duplicate the underlying text.
  // Winner priority: in-progress pending selection > the specifically
  // selected location > any location of the selected tag > most recently
  // created range.
  const buildRenderSegments = () => {
    const flatRanges = tags.flatMap(t =>
      t.ranges
        .filter(r => r.start !== null)
        .map(r => ({ ...r, tagId: t.id, note: t.note, color: t.color, isPending: false }))
    );

    if (pendingSelection) {
      flatRanges.push({
        id: 'pending',
        tagId: null,
        start: pendingSelection.start,
        end: pendingSelection.end,
        note: newAnnotation.trim() || 'New annotation…',
        color: null,
        isPending: true,
      });
    }

    if (!flatRanges.length) return [{ text: sourceText, winner: null }];

    const boundarySet = new Set([0, sourceText.length]);
    flatRanges.forEach(r => { boundarySet.add(r.start); boundarySet.add(r.end); });
    const boundaries = Array.from(boundarySet).sort((a, b) => a - b);

    const rawSegments = [];
    for (let i = 0; i < boundaries.length - 1; i++) {
      const segStart = boundaries[i];
      const segEnd = boundaries[i + 1];
      if (segStart >= segEnd) continue;

      const covering = flatRanges.filter(r => r.start <= segStart && r.end >= segEnd);
      let winner = null;
      if (covering.length) {
        const scored = covering.map(r => {
          let tier;
          if (r.isPending) tier = 3;
          else if (activeLocationId !== null && r.id === activeLocationId) tier = 2;
          else if (activeTagId !== null && r.tagId === activeTagId) tier = 1;
          else tier = 0;
          return { r, tier };
        });
        scored.sort((a, b) => b.tier - a.tier || (b.r.id > a.r.id ? 1 : -1));
        winner = scored[0].r;
      }
      rawSegments.push({ text: sourceText.slice(segStart, segEnd), winner, start: segStart, end: segEnd });
    }

    // Merge adjacent segments that share the same winning range, so a
    // range that isn't interrupted by anything renders as a single <mark>.
    const merged = [];
    rawSegments.forEach(seg => {
      const last = merged[merged.length - 1];
      const segKey = seg.winner ? (seg.winner.isPending ? 'pending' : `${seg.winner.tagId}-${seg.winner.id}`) : null;
      const lastKey = last?.winner ? (last.winner.isPending ? 'pending' : `${last.winner.tagId}-${last.winner.id}`) : null;
      if (last && segKey === lastKey) {
        last.text += seg.text;
        last.end = seg.end;
      } else {
        merged.push({ ...seg });
      }
    });
    return merged;
  };

  const renderAnnotatedText = () => {
    const segments = buildRenderSegments();
    return segments.map((seg, i) => {
      if (!seg.winner) {
        return <span key={`text-${i}`}>{seg.text}</span>;
      }
      if (seg.winner.isPending) {
        return (
          <mark key={`mark-pending-${i}`} className="annotate-highlight pending" style={PENDING_STYLE}>
            {seg.text}
          </mark>
        );
      }
      const r = seg.winner;
      const isActiveTag = activeTagId === r.tagId;
      const isActiveLocation = activeLocationId === r.id;
      const state = isActiveLocation ? 'locationActive' : isActiveTag ? 'tagActive' : 'unselected';
      return (
        <mark
          key={`mark-${r.id}-${i}`}
          data-tag-id={r.tagId}
          data-range-id={r.id}
          onClick={(e) => handleMarkClick(e, r.tagId, r.id)}
          onMouseMove={(e) => handleMarkMouseMove(e, r.note)}
          onMouseLeave={handleMarkMouseLeave}
          className="annotate-highlight"
          style={getMarkStyle(r.color, state)}
        >
          {seg.text}
        </mark>
      );
    });
  };

  return (
    <ToolPage title="Annotate" subtitle="Highlight text then tag it — reuse a tag across multiple sections.">
      <div className="search-panel-with-files">
        <FileSidebar uploadedFiles={uploadedFiles} selectedFileIds={selectedFileIds} onToggle={toggleFileSelection} />
        <div className="annotate-main">
          <div className="annotate-doc-panel" ref={docPanelRef} style={{ position: 'relative' }}>
            <label>Document text</label>
            <div
              ref={textRef}
              onMouseUp={handleTextMouseUp}
              className="annotate-text-display"
            >
              {sourceText
                ? renderAnnotatedText()
                : <span className="no-files">No files selected. Upload files in Document Manager.</span>
              }
            </div>
            {hoverInfo && (
              <div
                className="annotate-hover-tooltip"
                style={{
                  position: 'absolute',
                  left: hoverInfo.x,
                  top: hoverInfo.y - 12,
                  transform: 'translate(-50%, -100%)',
                  pointerEvents: 'none',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  backgroundColor: '#15253e',
                  color: 'white',
                }}
              >
                {hoverInfo.note}
              </div>
            )}
          </div>

          <div className="annotate-controls">
            <div className={`annotate-selection-status${pendingSelection ? '' : ' empty'}`}>
              {pendingSelection
                ? <>Selected: <strong>"{pendingSelection.selectedText.slice(0, 60)}{pendingSelection.selectedText.length > 60 ? '…' : ''}"</strong></>
                : <span>No text selected — annotation will apply to the whole document.</span>
              }
            </div>

            <div className="annotate-input-row">
              <input
                ref={inputRef}
                value={newAnnotation}
                onChange={(e) => setNewAnnotation(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addNewOrMatchingTag()}
                placeholder="Tag name"
              />
              <button className="run-search" type="button" onClick={addNewOrMatchingTag}>Add</button>
            </div>

            {pendingSelection && tags.length > 0 && (
              <div className="annotate-existing-tags">
                <div className="annotate-existing-tags-label">
                  Or add selection to an existing tag:
                </div>
                <div className="annotate-tag-chips">
                  {tags.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      className="annotate-tag-chip"
                      onClick={() => addToExistingTag(t)}
                      style={{ borderLeft: `4px solid ${t.color.dark}` }}
                    >
                      {t.note} ({t.ranges.length})
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="annotate-list-header">
              <h3>Tags ({tags.length})</h3>
              {tags.length === 0 && <p className="annotate-selection-status empty">No annotations yet.</p>}
              <ul className="annotate-list">
                {tags.map((tag) => {
                  const isOpen = activeTagId === tag.id;
                  const locatedRanges = tag.ranges.filter(r => r.start !== null);
                  const generalRanges = tag.ranges.filter(r => r.start === null);
                  return (
                    <li
                      key={tag.id}
                      className={`annotate-list-item${isOpen ? ' active' : ''}`}
                      onClick={() => toggleTagOpen(tag.id)}
                      style={{ borderLeft: `4px solid ${tag.color.dark}` }}
                    >
                      <div className="annotate-item-note">
                        <span
                          className="annotate-color-dot"
                          style={{
                            display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
                            backgroundColor: tag.color.dark, marginRight: 6,
                          }}
                        />
                        {tag.note}
                        <span className="annotate-tag-count"> — {tag.ranges.length} location{tag.ranges.length !== 1 ? 's' : ''}</span>
                      </div>
                      <button
                        className="annotate-item-delete"
                        onClick={(e) => { e.stopPropagation(); deleteTag(tag.id); }}
                      >
                        Delete tag
                      </button>

                      {isOpen && (
                        <div className="annotate-tag-locations" onClick={(e) => e.stopPropagation()}>
                          <div className="annotate-color-picker">
                            <span className="annotate-color-picker-label">Color:</span>
                            {PALETTE.map(c => (
                              <button
                                key={c.name}
                                type="button"
                                title={c.name}
                                onClick={() => updateTagColor(tag.id, c)}
                                className={`annotate-color-swatch${tag.color.name === c.name ? ' selected' : ''}`}
                                style={{
                                  backgroundColor: c.dark,
                                  width: 18, height: 18, borderRadius: '50%',
                                  border: tag.color.name === c.name ? '2px solid #1f2937' : '1px solid #d1d5db',
                                  marginRight: 4, cursor: 'pointer',
                                }}
                              />
                            ))}
                          </div>

                          {locatedRanges.length > 0 && (
                            <div className="annotate-find-controls">
                              <button type="button" onClick={() => cycleLocation(-1)}>↑ Prev</button>
                              <span>
                                {locatedRanges.findIndex(r => r.id === activeLocationId) + 1 || '-'} / {locatedRanges.length}
                              </span>
                              <button type="button" onClick={() => cycleLocation(1)}>Next ↓</button>
                            </div>
                          )}
                          <ul>
                            {locatedRanges.map(r => (
                              <li
                                key={r.id}
                                className={`annotate-item-excerpt${activeLocationId === r.id ? ' current' : ''}`}
                                onClick={() => jumpToLocation(tag.id, r.id)}
                              >
                                "{r.selectedText.slice(0, 80)}{r.selectedText.length > 80 ? '…' : ''}"
                                <button
                                  className="annotate-item-delete"
                                  onClick={(e) => { e.stopPropagation(); deleteRange(tag.id, r.id); }}
                                >
                                  Remove
                                </button>
                              </li>
                            ))}
                            {generalRanges.map(r => (
                              <li key={r.id} className="annotate-item-excerpt general">
                                General annotation
                                <button
                                  className="annotate-item-delete"
                                  onClick={(e) => { e.stopPropagation(); deleteRange(tag.id, r.id); }}
                                >
                                  Remove
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </ToolPage>
  );
}

// SearchTool — base component used by DataVisualizationTool via extraRender
function SearchTool({ title, subtitle, extraRender, uploadedFiles }) {
  const [selectedFileIds, setSelectedFileIds] = useState([]);
  const [query, setQuery] = useState('');
  const [isRegex, setIsRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (uploadedFiles && uploadedFiles.length > 0) {
      setSelectedFileIds(uploadedFiles.map(f => f.id));
    } else {
      setSelectedFileIds([]);
    }
  }, [uploadedFiles]);

  const sourceText = combineSelectedFiles(uploadedFiles, selectedFileIds);

  const toggleFileSelection = (fileId) => {
    setSelectedFileIds(prev =>
      prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
    );
  };

  const runSearch = () => {
    setError('');
    if (!query.trim()) { setResults([]); return; }
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
        found.push({ start, end, matchText: match[0], context, contextStart, contextEnd });
        if (match[0].length === 0) regexp.lastIndex += 1;
      }
      setResults(found);
      if (found.length === 0) setError('No matches found.');
    } catch (e) {
      setResults([]);
      setError('Invalid regex: ' + e.message);
    }
  };

  return (
    <ToolPage title={title} subtitle={subtitle}>
      <div className="search-panel-with-files">
        <FileSidebar uploadedFiles={uploadedFiles} selectedFileIds={selectedFileIds} onToggle={toggleFileSelection} />
        <div className="search-panel">
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

          {extraRender && extraRender({ sourceText, query, isRegex, caseSensitive, results, setResults, setError })}
        </div>
      </div>
    </ToolPage>
  );
}

function DataVisualizationTool({ uploadedFiles }) {
  const [chartType, setChartType] = useState('bar');

  const renderVisualization = (chartType, results, query, sourceText) => {
    if (!results || results.length === 0) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
          <p>No results to visualize. Perform a search first.</p>
        </div>
      );
    }

    if (chartType === 'bar') {
      return (
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[{ name: query || 'Search Term', count: results.length }]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#0f66d0" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (chartType === 'line') {
      const lineData = Array.from({ length: Math.min(results.length, 20) }, (_, i) => ({
        position: i + 1,
        count: i + 1,
      }));
      return (
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="position" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#e14f56" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (chartType === 'wordcloud') {
      const wordData = generateWordFrequency(sourceText);
      if (query && query.trim()) {
        const searchTermLower = query.toLowerCase();
        const existingIndex = wordData.findIndex(w => w.text === searchTermLower);
        if (existingIndex >= 0) {
          const [searchTerm] = wordData.splice(existingIndex, 1);
          wordData.unshift(searchTerm);
        } else {
          wordData.unshift({ text: searchTermLower, value: Math.max(...wordData.map(w => w.value)) });
        }
      }
      if (wordData.length === 0) {
        return (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: '#666' }}>
            <p>Not enough unique words to generate a word cloud.</p>
          </div>
        );
      }
      const maxFreq = Math.max(...wordData.map(w => w.value));
      const colors = ['#0f66d0', '#e14f56', '#406b99', '#5d92dd', '#0a4ca3', '#c75a5a', '#2a5fb8', '#d44949', '#8b9fc9', '#6b8cc9'];
      const rotations = [-10, -5, 0, 5, 10];
      return (
        <div className="wordcloud-container">
          {wordData.map((word, idx) => {
            const sizeMultiplier = word.value / maxFreq;
            return (
              <span
                key={idx}
                className="wordcloud-word"
                title={`${word.text}: ${word.value} occurrences`}
                style={{
                  fontSize: `${14 + sizeMultiplier * 36}px`,
                  color: colors[idx % colors.length],
                  fontWeight: 400 + Math.floor(sizeMultiplier * 400),
                  transform: `rotate(${rotations[idx % rotations.length]}deg)`,
                }}
              >
                {word.text}
              </span>
            );
          })}
        </div>
      );
    }

    if (chartType === 'table') {
      return (
        <div style={{ overflowX: 'auto', marginTop: '0.8rem' }}>
          <table className="results-table">
            <thead>
              <tr><th>#</th><th>Position</th><th>Match</th><th>Context</th></tr>
            </thead>
            <tbody>
              {results.slice(0, 25).map((result, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td>{result.start}</td>
                  <td><strong>{result.matchText}</strong></td>
                  <td>{result.context.substring(0, 50)}...</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
            Showing {Math.min(results.length, 25)} of {results.length} results
          </p>
        </div>
      );
    }
  };

  return (
    <SearchTool
      title="Data Visualization"
      subtitle="Search text and render a chart or table based on your results."
      uploadedFiles={uploadedFiles}
      extraRender={({ results, query, sourceText }) => (
        <div>
          <h3>Visualization Options</h3>
          <label>
            Chart type
            <select value={chartType} onChange={(e) => setChartType(e.target.value)}>
              <option value="bar">Bar Chart</option>
              <option value="line">Line Chart</option>
              <option value="wordcloud">Word Cloud</option>
              <option value="table">Results Table</option>
            </select>
          </label>
          <p style={{ marginTop: '0.6rem' }}>Total matches: <strong>{results.length}</strong></p>
          <div style={{ marginTop: '1.2rem', padding: '1rem', border: '1px solid #dbe3f8', borderRadius: '8px', background: '#f5f8ff' }}>
            {renderVisualization(chartType, results, query, sourceText)}
          </div>
        </div>
      )}
    />
  );
}

function DocumentManager({ setUploadedFiles }) {
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadFiles = (files) => {
    if (!files || files.length === 0) return;
    const validFiles = Array.from(files).filter(file =>
      file.type.includes('text') || file.name.endsWith('.txt')
    );
    if (validFiles.length === 0) {
      setError('Please select only plain text (.txt) files.');
      return;
    }
    let loadedCount = 0;
    const fileArray = [];
    validFiles.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        fileArray[index] = { name: file.name, content: event.target.result || '' };
        loadedCount += 1;
        if (loadedCount === validFiles.length) {
          setUploadedFiles(fileArray.map((item, idx) => ({
            id: idx,
            name: item.name,
            content: item.content,
            selected: true,
          })));
          setStatus(`Loaded ${validFiles.length} file(s)`);
          setError('');
        }
      };
      reader.onerror = () => setError(`Error reading file: ${file.name}`);
      reader.readAsText(file);
    });
  };

  const loadFromUrl = async (url, name) => {
    setLoading(true);
    setError('');
    setStatus('Loading document from OneDrive...');
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Fetch failed with ${response.status}`);
      const text = await response.text();
      setUploadedFiles([{ id: 0, name, content: text, selected: true }]);
      setStatus(`Loaded OneDrive file: ${name}`);
    } catch (err) {
      setError(`Unable to load file from OneDrive: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const onSelectFile = (event) => {
    setError(''); setStatus('');
    loadFiles(event.target.files);
  };

  const onDrop = (event) => {
    event.preventDefault();
    setError(''); setStatus('');
    loadFiles(event.dataTransfer.files);
  };

  const openOneDrivePicker = () => {
    setError('');
    const initPicker = () => {
      if (!window.OneDrive?.open) { setError('OneDrive picker is not available.'); return; }
      window.OneDrive.open({
        clientId: '<YOUR_ONEDRIVE_APP_CLIENT_ID>',
        action: 'download',
        multiSelect: false,
        advanced: { filter: '.txt', redirectUri: window.location.origin },
        success: (files) => {
          const selected = Array.isArray(files) ? files : files?.value || [];
          if (!selected.length) { setError('No file selected from OneDrive.'); return; }
          const file = selected[0];
          const downloadUrl = file['@microsoft.graph.downloadUrl'] || file.downloadUrl || file.url || file.webUrl;
          if (!downloadUrl) { setError('Unable to get a download URL for the selected file.'); return; }
          loadFromUrl(downloadUrl, file.name || 'OneDrive document');
        },
        cancel: () => setStatus('OneDrive picker closed.'),
        error: (err) => setError(`OneDrive picker error: ${err?.message || JSON.stringify(err)}`),
      });
    };
    if (window.OneDrive) { initPicker(); return; }
    const script = document.createElement('script');
    script.src = 'https://js.live.net/v7.2/OneDrive.js';
    script.onload = initPicker;
    script.onerror = () => setError('Failed to load the OneDrive picker script.');
    document.body.appendChild(script);
  };

  return (
    <ToolPage title="Document Manager" subtitle="Select documents from local storage or OneDrive to use in the keyword and annotation tools.">
      <div className="doc-manager-grid">
        <div className="doc-manager-card" onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
          <h3>Local files</h3>
          <p>Upload one or more plain text documents from your computer.</p>
          <input type="file" accept=".txt,text/plain" onChange={onSelectFile} multiple />
        </div>
        <div className="doc-manager-card">
          <h3>OneDrive</h3>
          <p>Choose a text file from OneDrive for searching and review.</p>
          <button type="button" className="run-search" onClick={openOneDrivePicker} disabled={loading}>
            {loading ? 'Loading...' : 'Select from OneDrive'}
          </button>
        </div>
      </div>
      <div className="doc-manager-status">
        {status && <div className="status-message">{status}</div>}
        {error && <div className="error">{error}</div>}
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
  const [uploadedFiles, setUploadedFiles] = useState([]);

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">Antconc website</div>
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
          <Route path="/document-manager" element={<DocumentManager setUploadedFiles={setUploadedFiles} />} />
          <Route path="/keyword-context" element={<KeywordContextTool uploadedFiles={uploadedFiles} />} />
          <Route path="/annotate" element={<AnnotateTool uploadedFiles={uploadedFiles} />} />
          <Route path="/data-visualization" element={<DataVisualizationTool uploadedFiles={uploadedFiles} />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="*" element={<h2>Page not found</h2>} />
        </Routes>
      </main>
    </div>
  );
}
