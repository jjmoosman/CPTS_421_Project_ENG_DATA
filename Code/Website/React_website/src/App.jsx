import React, { useState } from 'react';
import { NavLink, Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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

function SearchTool({ title, subtitle, extraRender, uploadedFiles }) {
  const [sourceText, setSourceText] = useState('');
  const [query, setQuery] = useState('');
  const [isRegex, setIsRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [selectedFileIds, setSelectedFileIds] = useState([]);

  React.useEffect(() => {
    if (uploadedFiles && uploadedFiles.length > 0) {
      const allSelected = uploadedFiles.filter(f => f.selected).map(f => f.id);
      setSelectedFileIds(allSelected);
      updateSourceText(allSelected);
    } else {
      setSourceText('No files loaded. Go to Document Manager to upload documents.');
      setSelectedFileIds([]);
    }
  }, [uploadedFiles]);

  const updateSourceText = (fileIds) => {
    if (!uploadedFiles || uploadedFiles.length === 0) {
      setSourceText('No files loaded.');
      return;
    }

    const selectedFiles = uploadedFiles.filter(f => fileIds.includes(f.id));
    const combined = selectedFiles.map(f => f.content).join('\n\n--- File: ' + selectedFiles.map((_, i) => uploadedFiles[uploadedFiles.findIndex(f => f.id === selectedFiles[i].id)].name).join(' ---\n\n--- File: ') + ' ---\n\n');
    setSourceText(combined || 'Select files to view content.');
  };

  const toggleFileSelection = (fileId) => {
    const newSelection = selectedFileIds.includes(fileId)
      ? selectedFileIds.filter(id => id !== fileId)
      : [...selectedFileIds, fileId];
    setSelectedFileIds(newSelection);
    updateSourceText(newSelection);
  };

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
      <div className="search-panel-with-files">
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
                      onChange={() => toggleFileSelection(file.id)}
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

          <div className="search-grid">
            <div className="document-panel">
              <label>
                Document text
                <textarea
                  value={sourceText}
                  readOnly
                  rows={14}
                />
              </label>
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
      </div>
    </ToolPage>
  );
}

function KeywordContextTool({ uploadedFiles }) {
  return (
    <SearchTool
      title="Keyword & Context"
      subtitle="Lookup terms with literal or regex search and see nearby context."
      uploadedFiles={uploadedFiles}
    />
  );
}
{/* this is the annotation manager section */}
function AnnotateTool({ uploadedFiles }) {
  const [annotations, setAnnotations] = useState([]);
  const [newAnnotation, setNewAnnotation] = useState('');

  const addAnnotation = () => {
    if (!newAnnotation.trim()) return;
    setAnnotations(prev => [...prev, newAnnotation.trim()]);
    setNewAnnotation('');
  };

  return (
    <SearchTool
      title="Annotate"
      subtitle="Search text first, then add annotations linked to your findings."
      uploadedFiles={uploadedFiles}
      extraRender={({ results }) => (
        <div>
          <h3>Annotation Manager</h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              value={newAnnotation}
              onChange={(e) => setNewAnnotation(e.target.value)}
              placeholder="Enter new annotation"
              style={{ flexGrow: 1 }}
            />
            <button className="run-search" type="button" onClick={addAnnotation}>Add</button>
          </div>
          <p>Found matches: {results.length}</p>
          <ul style={{ marginTop: '0.5rem', paddingLeft: '1.2rem' }}>
            {annotations.map((ann, idx) => <li key={idx}>{ann}</li>)}
          </ul>
        </div>
      )}
    />
  );
}

function DataVisualizationTool({ uploadedFiles }) {
  const [chartType, setChartType] = useState('bar');

  const generateChartData = (results, query) => {
    if (!results || results.length === 0) return [];

    const fileMap = {};
    results.forEach(result => {
      if (!fileMap[query]) {
        fileMap[query] = 0;
      }
      fileMap[query] += 1;
    });

    return [
      {
        name: query || 'Search Term',
        value: results.length,
        matches: results.length,
      }
    ];
  };

  const VisualizationRenderer = ({ chartType, results, query, sourceText }) => {
    if (!results || results.length === 0) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
          <p>No results to visualize. Perform a search first.</p>
        </div>
      );
    }

    const data = generateChartData(results, query);
    const chartData = [
      {
        name: query || 'Search Term',
        count: results.length,
      }
    ];

    if (chartType === 'bar') {
      return (
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
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
      
      // Add the search query to the word cloud if it exists
      if (query && query.trim()) {
        const searchTermLower = query.toLowerCase();
        const existingIndex = wordData.findIndex(w => w.text === searchTermLower);
        if (existingIndex >= 0) {
          // Move search term to front if it exists
          const [searchTerm] = wordData.splice(existingIndex, 1);
          wordData.unshift(searchTerm);
        } else {
          // Add search term if it doesn't exist
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
            const size = 14 + sizeMultiplier * 36;
            const color = colors[idx % colors.length];
            const rotation = rotations[Math.floor(Math.random() * rotations.length)];
            const weight = 400 + Math.floor(sizeMultiplier * 400);
            const delay = idx * 0.02;

            return (
              <span
                key={idx}
                className="wordcloud-word"
                title={`${word.text}: ${word.value} occurrences`}
                style={{
                  fontSize: `${size}px`,
                  color: color,
                  fontWeight: weight,
                  transform: `rotate(${rotation}deg)`,
                  animation: `fadeInScale 0.5s ease-in-out ${delay}s both`,
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
              <tr>
                <th>#</th>
                <th>Position</th>
                <th>Match</th>
                <th>Context</th>
              </tr>
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

  {/* this is the data visualization section */}
  return ( 
    <SearchTool
      title="Data Visualization"
      subtitle="Search data text and render a chart or table based on your results."
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
            <VisualizationRenderer chartType={chartType} results={results} query={query} sourceText={sourceText} />
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

    const validFiles = Array.from(files).filter(file => {
      return file.type.includes('text') || file.name.endsWith('.txt');
    });

    if (validFiles.length === 0) {
      setError('Please select only plain text (.txt) files.');
      return;
    }

    let loadedCount = 0;
    const fileArray = [];

    const onFileLoaded = () => {
      loadedCount += 1;
      if (loadedCount === validFiles.length) {
        setUploadedFiles(fileArray.map((item, idx) => ({
          id: idx,
          name: item.name,
          content: item.content,
          selected: true
        })));
        setStatus(`Loaded ${validFiles.length} file(s)`);
        setError('');
      }
    };

    validFiles.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        fileArray[index] = {
          name: file.name,
          content: event.target.result || ''
        };
        onFileLoaded();
      };
      reader.onerror = () => {
        setError(`Error reading file: ${file.name}`);
      };
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
      setUploadedFiles([{
        id: 0,
        name: name,
        content: text,
        selected: true
      }]);
      setStatus(`Loaded OneDrive file: ${name}`);
    } catch (err) {
      setError(`Unable to load file from OneDrive: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const onSelectFile = (event) => {
    setError('');
    setStatus('');
    loadFiles(event.target.files);
  };

  const onDrop = (event) => {
    event.preventDefault();
    setError('');
    setStatus('');
    loadFiles(event.dataTransfer.files);
  };

  const onDragOver = (event) => {
    event.preventDefault();
  };

  const openOneDrivePicker = () => {
    setError('');

    const initPicker = () => {
      if (!window.OneDrive?.open) {
        setError('OneDrive picker is not available.');
        return;
      }

      const odOptions = {
        clientId: '<YOUR_ONEDRIVE_APP_CLIENT_ID>',
        action: 'download',
        multiSelect: false,
        advanced: {
          filter: '.txt',
          redirectUri: window.location.origin,
        },
        success: (files) => {
          const selected = Array.isArray(files) ? files : files?.value || [];
          if (!selected.length) {
            setError('No file selected from OneDrive.');
            return;
          }

          const file = selected[0];
          const downloadUrl = file['@microsoft.graph.downloadUrl'] || file.downloadUrl || file.url || file.webUrl;
          if (!downloadUrl) {
            setError('Unable to get a download URL for the selected file.');
            return;
          }

          loadFromUrl(downloadUrl, file.name || 'OneDrive document');
        },
        cancel: () => {
          setStatus('OneDrive picker closed.');
        },
        error: (err) => {
          setError(`OneDrive picker error: ${err?.message || JSON.stringify(err)}`);
        },
      };

      window.OneDrive.open(odOptions);
    };

    if (window.OneDrive) {
      initPicker();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.live.net/v7.2/OneDrive.js';
    script.onload = initPicker;
    script.onerror = () => setError('Failed to load the OneDrive picker script.');
    document.body.appendChild(script);
  };

  return (
    <ToolPage title="Document Manager" subtitle="Select a document from local storage or OneDrive to use in the keyword and annotation tools.">
      <div className="doc-manager-grid">
        <div className="doc-manager-card">
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
      <aside className="sidebar"> {/* this is a comment section */}
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
