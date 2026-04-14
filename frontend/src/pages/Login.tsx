import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Leaf, Building2, User, Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, register, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const isRegister = searchParams.get('mode') === 'register';
  
  const [form, setForm] = useState({
    enterprise_code: '',
    enterprise_name: '',
    username: '',
    password: '',
    confirmPassword: '',
    real_name: '',
    phone: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate('/');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!form.enterprise_name || !form.enterprise_code || !form.username || !form.password) {
          throw new Error('请填写所有必填项');
        }
        if (form.password !== form.confirmPassword) {
          throw new Error('两次输入的密码不一致');
        }
        if (form.password.length < 6) {
          throw new Error('密码至少需要6位');
        }
        await register({
          enterprise_name: form.enterprise_name,
          enterprise_code: form.enterprise_code,
          username: form.username,
          password: form.password,
          real_name: form.real_name || undefined,
          phone: form.phone || undefined,
        });
      } else {
        if (!form.username || !form.password) {
          throw new Error('请输入用户名和密码');
        }
        await login(form.username, form.password, form.enterprise_code || undefined);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message || (isRegister ? '注册失败' : '登录失败'));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm';

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mb-4">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">鲜切水果追溯系统</h1>
          <p className="text-sm text-gray-500 mt-1">Fresh Fruit Traceability</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {isRegister ? '注册企业账号' : '欢迎回来'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {isRegister ? '创建新企业并设置管理员账号' : '请登录您的账号'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    企业名称 <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={form.enterprise_name}
                      onChange={(e) => setForm({ ...form, enterprise_name: e.target.value })}
                      className={cn(inputClass, 'pl-10')}
                      placeholder="请输入企业名称"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    企业编码 <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={form.enterprise_code}
                      onChange={(e) => setForm({ ...form, enterprise_code: e.target.value })}
                      className={cn(inputClass, 'pl-10')}
                      placeholder="用于登录的唯一编码"
                    />
                  </div>
                </div>
              </>
            )}

            {!isRegister && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  企业编码 <span className="text-gray-400">(可选)</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={form.enterprise_code}
                    onChange={(e) => setForm({ ...form, enterprise_code: e.target.value })}
                    className={cn(inputClass, 'pl-10')}
                    placeholder="超级管理员可留空"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                用户名 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className={cn(inputClass, 'pl-10')}
                  placeholder="请输入用户名"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                密码 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={cn(inputClass, 'pl-10 pr-10')}
                  placeholder={isRegister ? '至少6位字符' : '请输入密码'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  确认密码 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    className={cn(inputClass, 'pl-10')}
                    placeholder="再次输入密码"
                  />
                </div>
              </div>
            )}

            {isRegister && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">真实姓名</label>
                  <input
                    type="text"
                    value={form.real_name}
                    onChange={(e) => setForm({ ...form, real_name: e.target.value })}
                    className={inputClass}
                    placeholder="请输入真实姓名"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">联系电话</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className={inputClass}
                    placeholder="请输入联系电话"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-3.5 rounded-xl font-medium hover:bg-gray-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isRegister ? '注册' : '登录'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to={isRegister ? '/login' : '/login?mode=register'}
              className="text-sm text-gray-600 hover:text-black transition-colors"
            >
              {isRegister ? '已有账号？去登录' : '没有账号？去注册'}
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-8">
          默认超级管理员: admin / admin123 (企业编码可不填)
        </p>
      </div>
    </div>
  );
}
