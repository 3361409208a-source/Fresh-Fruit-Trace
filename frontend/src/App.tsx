import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, ListOrdered, PlusCircle, Settings, Leaf, Zap, Users, Building2, LogOut, Shield } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import BatchCreate from './pages/BatchCreate';
import BatchList from './pages/BatchList';
import BatchDetail from './pages/BatchDetail';
import PublicTrace from './pages/PublicTrace';
import ProductSettings from './pages/ProductSettings';
import QuickRecord from './pages/QuickRecord';
import Login from './pages/Login';
import EnterpriseManagement from './pages/EnterpriseManagement';
import UserManagement from './pages/UserManagement';
import { cn } from './lib/utils';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  adminOnly?: boolean;
}

function getNavItems(isAdmin: boolean, isSuperAdmin: boolean): NavItem[] {
  const items: NavItem[] = [
    { to: '/', icon: LayoutDashboard, label: '控制台' },
    { to: '/batches', icon: ListOrdered, label: '批次管理' },
    { to: '/batches/new', icon: PlusCircle, label: '标准记录' },
    { to: '/settings', icon: Settings, label: '产品设置' },
  ];
  if (isAdmin) {
    items.push({ to: '/users', icon: Users, label: '用户管理', adminOnly: true });
  }
  if (isSuperAdmin) {
    items.push({ to: '/enterprises', icon: Building2, label: '企业管理', adminOnly: true });
  }
  return items;
}

function Sidebar() {
  const { user, enterprise, isAdmin, isSuperAdmin, logout } = useAuth();
  const navItems = getNavItems(isAdmin, isSuperAdmin);

  return (
    <aside className="w-[240px] min-h-screen bg-white flex flex-col fixed top-0 left-0 z-50 border-r border-[#d2d2d7]">
      <div className="px-5 pt-6 pb-4 border-b border-[#e8e8ed]">
        <div className="flex items-center gap-2.5">
          <div className="bg-[#1d1d1f] rounded-lg p-2 flex">
            <Leaf size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[#1d1d1f] font-semibold text-[15px] leading-tight tracking-tight truncate">{enterprise?.name || '追溯系统'}</div>
            <div className="text-[#6e6e73] text-[11px] flex items-center gap-1">
              {isSuperAdmin && <Shield size={10} />}
              {user?.real_name || user?.username}
            </div>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4">
        {navItems.map(({ to, icon: Icon, label, adminOnly }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => cn(
              'flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg mb-1 text-sm font-medium transition-all duration-200',
              isActive ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold' : 'text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f5f5f7]',
              adminOnly && 'border-l-2 border-transparent'
            )}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-3 py-3 border-t border-[#e8e8ed] space-y-2">
        <NavLink to="/quick" className={({ isActive }) => cn(
          'flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-sm font-bold transition-all duration-200',
          isActive
            ? 'bg-[#1d1d1f] text-white'
            : 'bg-[#f5f5f7] text-[#1d1d1f] border border-[#d2d2d7] hover:bg-[#ebebed]'
        )}>
          <Zap size={18} fill="currentColor" /> 员工快速操作
        </NavLink>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium text-[#6e6e73] hover:text-red-600 hover:bg-red-50 transition-all"
        >
          <LogOut size={18} /> 退出登录
        </button>
        <div className="text-[#6e6e73] text-[10px] text-center pt-1">v2.0.0 · 追溯系统</div>
      </div>
    </aside>
  );
}

function MainLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="ml-[240px] flex-1 min-h-screen bg-[#f5f5f7]">
        {children}
      </main>
    </div>
  );
}

function AppRoutes() {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const isPublic = location.pathname.startsWith('/trace/');
  const isQuick = location.pathname === '/quick';
  const isLogin = location.pathname === '/login';

  // 公开溯源页面 - 不需要登录
  if (isPublic) {
    return (
      <Routes>
        <Route path="/trace/:id" element={<PublicTrace />} />
      </Routes>
    );
  }

  // 登录页面 - 已登录则跳转首页
  if (isLogin) {
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      );
    }
    if (isAuthenticated) {
      return <Navigate to="/" replace />;
    }
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
      </Routes>
    );
  }

  // 快速操作页面 - 不需要完整布局，但需要认证
  if (isQuick) {
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      );
    }
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    return (
      <Routes>
        <Route path="/quick" element={<QuickRecord />} />
      </Routes>
    );
  }

  // 主布局页面 - 需要认证
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/batches" element={<BatchList />} />
        <Route path="/batches/new" element={<BatchCreate />} />
        <Route path="/batches/:id" element={<BatchDetail />} />
        <Route path="/settings" element={<ProductSettings />} />
        <Route path="/quick" element={<QuickRecord />} />
        <Route path="/enterprises" element={<EnterpriseManagement />} />
        <Route path="/users" element={<UserManagement />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
      </Routes>
    </MainLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
