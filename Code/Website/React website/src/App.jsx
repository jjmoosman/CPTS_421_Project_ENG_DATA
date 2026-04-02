import { NavLink, Route, Routes, Navigate } from 'react-router-dom';
import './App.css';

const tools = [
  { name: 'Tool 1', description: 'Placeholder for tool 1 features' },
  { name: 'Tool 2', description: 'Placeholder for tool 2 features' },
  { name: 'Tool 3', description: 'Placeholder for tool 3 features' }
];

function Dashboard() {
  return (
    <section className="content-grid" aria-label="tools">
      {tools.map((tool) => (
        <article key={tool.name} className="card">
          <h2>{tool.name}</h2>
          <p>{tool.description}</p>
          <button>Open</button>
        </article>
      ))}
    </section>
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
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">Dashboard</div>
        <nav>
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active' : '')}>Dashboard</NavLink>
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
          <Route path="/courses" element={<Courses />} />
          <Route path="*" element={<h2>Page not found</h2>} />
        </Routes>
      </main>
    </div>
  );
}
