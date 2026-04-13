import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, ListOrdered, PlusCircle, Settings, Leaf, Zap } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import BatchCreate from './pages/BatchCreate';
import BatchList from './pages/BatchList';
import BatchDetail from './pages/BatchDetail';
import PublicTrace from './pages/PublicTrace';
import ProductSettings from './pages/ProductSettings';
import QuickRecord from './pages/QuickRecord';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
}

const navItems: NavItem[] = [
  { to: '/', icon: LayoutDashboard, label: '控制台' },
  { to: '/batches', icon: ListOrdered, label: '批次管理' },
  { to: '/batches/new', icon: PlusCircle, label: '标准记录' },
  { to: '/settings', icon: Settings, label: '产品设置' },
];

function Sidebar() {
  return (
    <aside style={{
      width: 220, minHeight: '100vh', background: 'linear-gradient(180deg, #14532d 0%, #166534 100%)',
      display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, zIndex: 100, boxShadow: '2px 0 12px rgba(0,0,0,0.15)'
    }}>
      <div style={{ padding: '28px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: '#22c55e', borderRadius: 10, padding: 8, display: 'flex' }}>
            <Leaf size={22} color="white" />
          </div>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>鲜果追溯</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>Fresh Fruit Trace</div>
          </div>
        </div>
      </div>
      <nav style={{ flex: 1, padding: '16px 12px' }}>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 14px', borderRadius: 10, marginBottom: 4,
              textDecoration: 'none', fontSize: 14, fontWeight: 500,
              color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
              background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
              transition: 'all 0.15s',
            })}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <NavLink to="/quick" style={({ isActive }) => ({
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '13px 14px', borderRadius: 12, textDecoration: 'none',
          background: isActive ? '#22c55e' : 'rgba(34,197,94,0.2)',
          color: 'white', fontWeight: 700, fontSize: 14,
          border: '1.5px solid rgba(34,197,94,0.5)',
          boxShadow: isActive ? '0 4px 12px rgba(34,197,94,0.4)' : 'none',
        })}>
          <Zap size={18} fill="currentColor" /> 员工快速操作
        </NavLink>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, textAlign: 'center', marginTop: 8 }}>v1.0.0 · 鲜切追溯系统</div>
      </div>
    </aside>
  );
}

function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main style={{ marginLeft: 220, flex: 1, minHeight: '100vh', background: '#f0fdf4' }}>
        {children}
      </main>
    </div>
  );
}

function AppRoutes() {
  const location = useLocation();
  const isPublic = location.pathname.startsWith('/trace/');
  const isQuick  = location.pathname === '/quick';

  if (isPublic) {
    return (
      <Routes>
        <Route path="/trace/:id" element={<PublicTrace />} />
      </Routes>
    );
  }

  if (isQuick) {
    return (
      <Routes>
        <Route path="/quick" element={<QuickRecord />} />
      </Routes>
    );
  }

  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/batches" element={<BatchList />} />
        <Route path="/batches/new" element={<BatchCreate />} />
        <Route path="/batches/:id" element={<BatchDetail />} />
        <Route path="/settings" element={<ProductSettings />} />
        <Route path="/quick" element={<QuickRecord />} />
      </Routes>
    </MainLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
