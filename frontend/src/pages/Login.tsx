import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf, Eye, EyeOff, Building2, User, Lock, Phone, UserCircle } from 'lucide-react';
import { login, register, saveAuthData } from '../api';

type TabType = 'login' | 'register';

export default function Login() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabType>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 登录表单
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });

  // 注册表单
  const [regForm, setRegForm] = useState({
    company_name: '',
    contact_name: '',
    contact_phone: '',
    username: '',
    password: '',
    display_name: '',
  });

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!loginForm.username || !loginForm.password) {
      setError('请输入用户名和密码');
      return;
    }
    setLoading(true);
    try {
      const res = await login(loginForm);
      if (res.success && res.data) {
        saveAuthData(res.data);
        navigate('/');
      } else {
        setError(res.message || '登录失败');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!regForm.company_name || !regForm.username || !regForm.password) {
      setError('企业名称、用户名和密码不能为空');
      return;
    }
    if (regForm.password.length < 6) {
      setError('密码长度至少6位');
      return;
    }
    setLoading(true);
    try {
      const res = await register(regForm);
      if (res.success && res.data) {
        saveAuthData(res.data);
        navigate('/');
      } else {
        setError(res.message || '注册失败');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '注册失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#1d1d1f] rounded-2xl mb-4">
            <Leaf size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#1d1d1f]">鲜切水果追溯系统</h1>
          <p className="text-[#6e6e73] text-sm mt-1">Fresh Fruit Trace System</p>
        </div>

        {/* Tab 切换 */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#d2d2d7] overflow-hidden">
          <div className="flex border-b border-[#e8e8ed]">
            <button
              onClick={() => { setTab('login'); setError(''); }}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                tab === 'login' ? 'text-[#1d1d1f] border-b-2 border-[#1d1d1f]' : 'text-[#6e6e73] hover:text-[#1d1d1f]'
              }`}
            >
              登录
            </button>
            <button
              onClick={() => { setTab('register'); setError(''); }}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                tab === 'register' ? 'text-[#1d1d1f] border-b-2 border-[#1d1d1f]' : 'text-[#6e6e73] hover:text-[#1d1d1f]'
              }`}
            >
              注册企业
            </button>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            {tab === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">用户名</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e6e73]" />
                    <input
                      type="text"
                      value={loginForm.username}
                      onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 border border-[#d2d2d7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] focus:border-transparent"
                      placeholder="请输入用户名"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">密码</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e6e73]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={loginForm.password}
                      onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                      className="w-full pl-10 pr-10 py-2.5 border border-[#d2d2d7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] focus:border-transparent"
                      placeholder="请输入密码"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6e6e73] hover:text-[#1d1d1f]"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-[#1d1d1f] text-white rounded-lg text-sm font-semibold hover:bg-[#333] disabled:opacity-50 transition-colors"
                >
                  {loading ? '登录中...' : '登录'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">企业名称 *</label>
                  <div className="relative">
                    <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e6e73]" />
                    <input
                      type="text"
                      value={regForm.company_name}
                      onChange={e => setRegForm({ ...regForm, company_name: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 border border-[#d2d2d7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] focus:border-transparent"
                      placeholder="如：鲜果坊水果店"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">联系人</label>
                    <div className="relative">
                      <UserCircle size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e6e73]" />
                      <input
                        type="text"
                        value={regForm.contact_name}
                        onChange={e => setRegForm({ ...regForm, contact_name: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 border border-[#d2d2d7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] focus:border-transparent"
                        placeholder="联系人姓名"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">联系电话</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e6e73]" />
                      <input
                        type="text"
                        value={regForm.contact_phone}
                        onChange={e => setRegForm({ ...regForm, contact_phone: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 border border-[#d2d2d7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] focus:border-transparent"
                        placeholder="手机号码"
                      />
                    </div>
                  </div>
                </div>
                <div className="border-t border-[#e8e8ed] pt-4">
                  <p className="text-xs text-[#6e6e73] mb-3">管理员账号（注册后可添加员工）</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">用户名 *</label>
                      <div className="relative">
                        <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e6e73]" />
                        <input
                          type="text"
                          value={regForm.username}
                          onChange={e => setRegForm({ ...regForm, username: e.target.value })}
                          className="w-full pl-10 pr-4 py-2.5 border border-[#d2d2d7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] focus:border-transparent"
                          placeholder="登录用户名"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">密码 * (至少6位)</label>
                      <div className="relative">
                        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e6e73]" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={regForm.password}
                          onChange={e => setRegForm({ ...regForm, password: e.target.value })}
                          className="w-full pl-10 pr-10 py-2.5 border border-[#d2d2d7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] focus:border-transparent"
                          placeholder="设置密码"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6e6e73] hover:text-[#1d1d1f]"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">显示名称</label>
                      <div className="relative">
                        <UserCircle size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e6e73]" />
                        <input
                          type="text"
                          value={regForm.display_name}
                          onChange={e => setRegForm({ ...regForm, display_name: e.target.value })}
                          className="w-full pl-10 pr-4 py-2.5 border border-[#d2d2d7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] focus:border-transparent"
                          placeholder="如：张店长"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-[#1d1d1f] text-white rounded-lg text-sm font-semibold hover:bg-[#333] disabled:opacity-50 transition-colors"
                >
                  {loading ? '注册中...' : '注册企业账号'}
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-[#6e6e73] text-xs mt-6">
          鲜切水果全程追溯系统 v2.0 · SaaS版
        </p>
      </div>
    </div>
  );
}
