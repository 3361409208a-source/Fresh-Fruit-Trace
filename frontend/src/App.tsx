import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ListOrdered, PlusCircle, Settings, Leaf, Zap, LogOut } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import BatchCreate from './pages/BatchCreate';
import BatchList from './pages/BatchList';
import BatchDetail from './pages/BatchDetail';
import PublicTrace from './pages/PublicTrace';
import ProductSettings from './pages/ProductSettings';
import QuickRecord from './pages/QuickRecord';
import Login from './pages/Login';
import { cn } from './lib/utils';
import { getAuthData, clearAuthData, isLoggedIn } from './api';

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
  const navigate = useNavigate();
  const authData = getAuthData();

  function handleLogout() {
    clearAuthData();
    navigate('/login');
  }

  return (
    <aside className="w-[220px] min-h-screen bg-white flex flex-col fixed top-0 left-0 z-50 border-r border-[#d2d2d7]">
      <div className="px-5 pt-6 pb-5 border-b border-[#e8e8ed]">
        <div className="flex items-center gap-2.5">
          <div className="bg-[#1d1d1f] rounded-lg p-2 flex">
            <Leaf size={20} className="text-white" />
          </div>
          <div>
            <div className="text-[#1d1d1f] font-semibold text-[15px] leading-tight tracking-tight">
              {authData?.tenant?.name || '追溯系统'}
            </div>
            <div className="text-[#6e6e73] text-[11px]">Trace System</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => cn(
              'flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg mb-1 text-sm font-medium transition-all duration-200',
              isActive ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold' : 'text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f5f5f7]'
            )}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-3 py-3 border-t border-[#e8e8ed]">
        <NavLink to="/quick" className={({ isActive }) => cn(
          'flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-sm font-bold transition-all duration-200',
          isActive
            ? 'bg-[#1d1d1f] text-white'
            : 'bg-[#f5f5f7] text-[#1d1d1f] border border-[#d2d2d7] hover:bg-[#ebebed]'
        )}>
          <Zap size={18} className={(({ isActive }: any) => isActive ? 'text-primary' : '') as any} fill="currentColor" /> 员工快速操作
        </NavLink>
        {authData && (
          <div className="flex items-center justify-between mt-3 px-1">
            <span className="text-xs text-[#6e6e73] truncate">{authData.user.display_name || authData.user.username}</span>
            <button onClick={handleLogout} className="text-[#6e6e73] hover:text-[#1d1d1f] transition-colors" title="退出登录">
              <LogOut size={14} />
            </button>
          </div>
        )}
        <div className="text-[#6e6e73] text-[10px] text-center mt-2">v2.0.0 · SaaS版</div>
      </div>
    </aside>
  );
}

function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <Sidebar />
      <main className="ml-[220px] flex-1 min-h-screen bg-background">
        {children}
      </main>
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!isLoggedIn()) {
    return <Login />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  const location = useLocation();
  const isPublic = location.pathname.startsWith('/trace/');
  const isQuick  = location.pathname === '/quick';
  const isLogin  = location.pathname === '/login';

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

  if (isLogin) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
      </Routes>
    );
  }

  return (
    <RequireAuth>
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
    </RequireAuth>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
