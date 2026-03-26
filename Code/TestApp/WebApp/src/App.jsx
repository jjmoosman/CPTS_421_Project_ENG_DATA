import { useMemo, useState } from 'react';

const sampleCorpus = [
  {
    id: 1,
    author: 'Student A',
    prompt: 'Reflective essay on first-year writing',
    text: 'The assignment asked us to discuss a struggle with academic writing. I found thesis development hard but improved significantly.',
    tags: ['reflective', 'thesis']
  },
  {
    id: 2,
    author: 'Student B',
    prompt: 'Argumentative essay on climate change',
    text: 'You should consider evidence from history and scientific consensus, then compare it to a peer-reviewed context in the BNC.',
    tags: ['argument', 'data']
  },
  {
    id: 3,
    author: 'Student C',
    prompt: 'Descriptive narrative about campus life',
    text: 'Campus in the fall has color and ambiguity; I see students merging digital and physical spaces in unique ways.',
    tags: ['narrative', 'campus']
  }
];

function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

export default function App() {
  const [corpus] = useState(sampleCorpus);
  const [regexQuery, setRegexQuery] = useState('');
  const [keywordQuery, setKeywordQuery] = useState('');
  const [comparisonSource, setComparisonSource] = useState('BNC');
  const [annotateItemId, setAnnotateItemId] = useState(null);
  const [annotationText, setAnnotationText] = useState('');
  const [annotations, setAnnotations] = useState([]);
  const [status, setStatus] = useState('Ready. Use search/annotations to explore the corpus.');

  const filtered = useMemo(() => {
    let result = corpus;

    if (keywordQuery.trim()) {
      const keyword = keywordQuery.trim().toLowerCase();
      result = result.filter(item => item.text.toLowerCase().includes(keyword) || item.prompt.toLowerCase().includes(keyword));
    }

    if (regexQuery.trim()) {
      try {
        const re = new RegExp(regexQuery, 'i');
        result = result.filter(item => re.test(item.text) || re.test(item.prompt));
      } catch (err) {
        setStatus('Invalid regex pattern: ' + err.message);
        return [];
      }
    }

    setStatus(`Showing ${result.length} item(s).`);
    return result;
  }, [corpus, keywordQuery, regexQuery]);

  const freq = useMemo(() => {
    const counts = {};
    filtered.forEach(item => item.tags.forEach(tag => (counts[tag] = (counts[tag] || 0) + 1)));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  function addAnnotation(item) {
    if (!annotationText.trim()) return;
    setAnnotations(prev => [
      ...prev,
      { id: crypto.randomUUID(), itemId: item.id, text: annotationText.trim(), excerpt: item.text.slice(0, 110) }
    ]);
    setAnnotationText('');
    setAnnotateItemId(null);
    setStatus('Annotation saved.');
  }

  function removeAnnotation(id) {
    setAnnotations(prev => prev.filter(a => a.id !== id));
    setStatus('Annotation removed.');
  }

  function crossCorpusTerm(term) {
    // Placeholder for cross-corpi comparison
    setStatus(`Compared term "${term}" against ${comparisonSource} (demo mode).`);
  }

  return (
    <div className="app-shell">
      <header className="header">
        <h1>Local Learner Corpus Dashboard</h1>
        <p className="status">{status}</p>
      </header>

      <div className="grid-two">

        <section className="panel">
          <h2>1. Query & Search</h2>
          <label className="label">Regex Search</label>
          <input
            className="input"
            type="text"
            placeholder="e.g., \bacademic\b"
            value={regexQuery}
            onChange={e => setRegexQuery(e.target.value)}
          />
          <label className="label">Keyword Search</label>
          <input
            className="input"
            type="text"
            placeholder="e.g., thesis, argument"
            value={keywordQuery}
            onChange={e => setKeywordQuery(e.target.value)}
          />
          <label className="label">Standard comparison source</label>
          <select className="input" value={comparisonSource} onChange={e => setComparisonSource(e.target.value)}>
            <option value="BNC">BNC</option>
            <option value="Michigan Corpus">Michigan Corpus</option>
            <option value="COCA">COCA</option>
            <option value="Local Baseline">Local Baseline</option>
          </select>
          <button className="btn" onClick={() => crossCorpusTerm(keywordQuery || 'the')}>Run Comparison (demo)</button>
        </section>

        <section className="panel">
          <h2>2. Keyword + Regex Results</h2>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Prompt</th>
                  <th>Preview</th>
                  <th>Tags</th>
                  <th>Annotate</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => (
                  <tr key={item.id}>
                    <td>{idx + 1}</td>
                    <td>{item.prompt}</td>
                    <td>{item.text.length > 80 ? `${item.text.substring(0, 80)}...` : item.text}</td>
                    <td>{item.tags.map(t => <span key={t} className="tag">{t}</span>)}</td>
                    <td>
                      <button className="btn" onClick={() => { setAnnotateItemId(item.id); setAnnotationText(''); }}>Annotate</button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan="5">No matches found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <h2>3. Visualization</h2>
          <p><strong>Tag frequency in current view:</strong></p>
          {freq.length === 0 && <p>No tag data to display.</p>}
          {freq.map(([tag, count]) => {
            const width = clamp((count / Math.max(...freq.map(([, c]) => c), 1)) * 100, 20, 100);
            return (
              <div key={tag}>
                <div className="chart-bar" style={{ width: `${width}%`, background: '#7dd3fc' }}>
                  {tag}: {count}
                </div>
              </div>
            );
          })}
          <p style={{ marginTop: '12px', color:'#334155' }}>Total corpus size: {corpus.length} documents.</p>
        </section>

        <section className="panel">
          <h2>4. Hand Annotation</h2>
          {annotateItemId ? (
            <>
              <p>Annotating Document #{annotateItemId}</p>
              <textarea
                value={annotationText}
                onChange={e => setAnnotationText(e.target.value)}
                placeholder="Add notes, coding category, or pedagogical observations..."
              />
              <button className="btn" onClick={() => addAnnotation(corpus.find(item => item.id === annotateItemId))}>Save Annotation</button>
              <button className="btn" style={{ background: '#64748b' }} onClick={() => setAnnotateItemId(null)}>Cancel</button>
            </>
          ) : (
            <p>Select a row from results to apply annotations.</p>
          )}

          <h3 style={{ marginTop: '12px' }}>Saved Annotations</h3>
          {annotations.length === 0 && <p>No annotations yet.</p>}
          {annotations.map(item => (
            <div className="annotation-row" key={item.id}>
              <div style={{ flex: 1 }}><strong>Doc #{item.itemId}</strong> - {item.excerpt} ... <br/>{item.text}</div>
              <button className="btn" onClick={() => removeAnnotation(item.id)} style={{ padding: '4px 8px' }}>Delete</button>
            </div>
          ))}
        </section>

      </div>

      <section className="panel" style={{ marginTop: '16px' }}>
        <h2>5. Reporting & Export</h2>
        <p className="status">Generate first-year writing baseline reports and export CSV for further analysis.</p>
        <button className="btn" onClick={() => {
          const csvRows = ['id,prompt,author,text,tags'];
          corpus.forEach(item => csvRows.push(`${item.id},"${item.prompt.replace(/"/g, '""')}",${item.author},"${item.text.replace(/"/g, '""')}","${item.tags.join(';')}"`));
          const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'corpus-report.csv';
          link.click();
          URL.revokeObjectURL(url);
          setStatus('Corpus export CSV created.');
        }}>Export CSV</button>
      </section>

    </div>
  );
}
