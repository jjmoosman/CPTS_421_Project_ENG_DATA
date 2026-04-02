const tools = [
  { id: 'tool1', title: 'Concordance', description: 'Analyze text documents to find word occurrences in context.', gradient: 'linear-gradient(135deg, #8c0a0a, #cc3d3d)' },
  { id: 'tool2', title: 'Keyword', description: 'Extract and rank keywords from multiple texts by frequency.', gradient: 'linear-gradient(135deg, #ae3600, #f2a43b)' },
  { id: 'tool3', title: 'Wordcloud', description: 'Create a visual word cloud based on word frequency.', gradient: 'linear-gradient(135deg, #1d6f78, #2a9d95)' }
];

function Header({ text, subtext }) {
  return (
    <div className="header">
      <h1>{text}</h1>
      <p>{subtext}</p>
    </div>
  );
}

function ToolCard({ data, onOpen }) {
  return (
    <article className="card">
      <div className="card-top" style={{ background: data.gradient }}>
        <h2 className="card-title">{data.title}</h2>
      </div>
      <div className="card-content">
        <p className="card-text">{data.description}</p>
        <button className="primary-button" onClick={() => onOpen(data.id)}>
          Open {data.title}
        </button>
      </div>
    </article>
  );
}

function Dashboard({ onSelectTool }) {
  return (
    <section>
      <Header text="Dashboard" subtext="Select a tool card to view or launch the feature quickly." />
      <div className="cards">
        {tools.map((t) => <ToolCard key={t.id} data={t} onOpen={onSelectTool} />)}
      </div>
    </section>
  );
}

function ToolPage({ toolId, onBack }) {
  const tool = tools.find((t) => t.id === toolId);
  if (!tool) return null;

  return (
    <section className="tool-page">
      <h1>{tool.title}</h1>
      <p>{tool.description}</p>
      <p>Now this is running as React. Add your full tool implementation in this component.</p>
      <button className="link-btn" onClick={onBack}>{'\u2190'} Back to Dashboard</button>
    </section>
  );
}

function App() {
  const [activeView, setActiveView] = React.useState('dashboard');
  const [activeTool, setActiveTool] = React.useState(null);

  const setView = (view) => {
    setActiveView(view);
    setActiveTool(null);
  };

  const openTool = (toolId) => {
    setActiveTool(toolId);
    setActiveView('tool');
  };

  const renderView = () => {
    if (activeView === 'courses') {
      return (<section><Header text="Courses" subtext="Manage your course list and settings here." /><p>Course management content.</p></section>);
    }

    if (activeView === 'calendar') {
      return (<section><Header text="Calendar" subtext="View events, deadlines, and schedule in the calendar." /><p>Calendar content.</p></section>);
    }

    if (activeView === 'tool' && activeTool) {
      return <ToolPage toolId={activeTool} onBack={() => setView('dashboard')} />;
    }

    return <Dashboard onSelectTool={openTool} />;
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">Wsu Dashboard</div>
        <ul className="nav-links">
          <li><button className={activeView === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}>🏠 Dashboard</button></li>
          <li><button className={activeView === 'courses' ? 'active' : ''} onClick={() => setView('courses')}>📚 Courses</button></li>
          <li><button className={activeView === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')}>🗓️ Calendar</button></li>
        </ul>
      </aside>
      <main className="main">{renderView()}</main>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
