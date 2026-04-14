import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Ban, CheckCircle, Search, Loader2, Shield, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../api';
import type { User as UserType, UserRole } from '../types';
import { cn } from '../lib/utils';

const roleLabels: Record<UserRole, string> = {
  super_admin: '超级管理员',
  admin: '管理员',
  manager: '经理',
  operator: '操作员',
};

const roleColors: Record<UserRole, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  admin: 'bg-blue-100 text-blue-700',
  manager: 'bg-green-100 text-green-700',
  operator: 'bg-gray-100 text-gray-700',
};

export default function UserManagement() {
  const { user: currentUser, isAdmin, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<UserType | null>(null);
  const [form, setForm] = useState({
    username: '',
    password: '',
    real_name: '',
    phone: '',
    role: 'operator' as UserRole,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await api.getUsers();
      if (res.success && res.data) {
        setUsers(res.data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (editing) {
        const updateData: any = {
          real_name: form.real_name || null,
          phone: form.phone || null,
          role: form.role,
        };
        if (form.password) {
          updateData.password = form.password;
        }
        await api.updateUser(editing.id, updateData);
      } else {
        if (!form.username || !form.password) {
          throw new Error('用户名和密码为必填项');
        }
        await api.createUser({
          username: form.username,
          password: form.password,
          real_name: form.real_name || undefined,
          phone: form.phone || undefined,
          role: form.role,
        });
      }
      setShowModal(false);
      setEditing(null);
      setForm({ username: '', password: '', real_name: '', phone: '', role: 'operator' });
      loadUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (user: UserType) => {
    setEditing(user);
    setForm({
      username: user.username,
      password: '',
      real_name: user.real_name || '',
      phone: user.phone || '',
      role: user.role,
    });
    setShowModal(true);
  };

  const handleToggleStatus = async (id: number, currentStatus: number) => {
    try {
      await api.updateUserStatus(id, currentStatus === 1 ? 0 : 1);
      loadUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const canManage = (targetUser: UserType) => {
    if (isSuperAdmin) return true;
    if (currentUser?.id === targetUser.id) return false; // 不能管理自己
    const roleLevels = { operator: 0, manager: 1, admin: 2, super_admin: 3 };
    return roleLevels[currentUser!.role] > roleLevels[targetUser.role];
  };

  const filtered = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    (u.real_name && u.real_name.toLowerCase().includes(search.toLowerCase())) ||
    (u.phone && u.phone.includes(search))
  );

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7]">
        <div className="text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">仅管理员可访问此页面</p>
        </div>
      </div>
    );
  }

  const availableRoles: UserRole[] = isSuperAdmin
    ? ['super_admin', 'admin', 'manager', 'operator']
    : ['admin', 'manager', 'operator'];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <Users className="w-6 h-6" /> 用户管理
        </h1>
        <p className="text-sm text-gray-500 mt-1">管理企业内的所有用户账号</p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索用户..."
            className="pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none text-sm w-64"
          />
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setForm({ username: '', password: '', real_name: '', phone: '', role: 'operator' });
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800"
        >
          <Plus className="w-4 h-4" /> 新增用户
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">用户名</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">真实姓名</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">联系电话</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">角色</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">状态</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  暂无用户数据
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{u.username}</div>
                        {u.id === currentUser?.id && (
                          <span className="text-xs text-gray-400">(我)</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-sm">{u.real_name || '-'}</td>
                  <td className="px-6 py-4 text-gray-600 text-sm">{u.phone || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', roleColors[u.role])}>
                      {roleLabels[u.role]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      'px-2 py-1 rounded-full text-xs font-medium',
                      u.status === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    )}>
                      {u.status === 1 ? '启用' : '禁用'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canManage(u) && (
                        <>
                          <button
                            onClick={() => handleEdit(u)}
                            className="p-2 text-gray-500 hover:text-black hover:bg-gray-100 rounded-lg"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(u.id, u.status)}
                            className={cn(
                              'p-2 rounded-lg',
                              u.status === 1
                                ? 'text-red-500 hover:bg-red-50'
                                : 'text-green-500 hover:bg-green-50'
                            )}
                          >
                            {u.status === 1 ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md m-4">
            <h2 className="text-xl font-semibold mb-4">
              {editing ? '编辑用户' : '新增用户'}
            </h2>
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl">{error}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  用户名 {editing ? '(不可修改)' : '*'}
                </label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none"
                  required={!editing}
                  disabled={!!editing}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  密码 {editing ? '(留空则不修改)' : '*'}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none"
                  required={!editing}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">真实姓名</label>
                  <input
                    type="text"
                    value={form.real_name}
                    onChange={(e) => setForm({ ...form, real_name: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">联系电话</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none"
                >
                  {availableRoles.map((r) => (
                    <option key={r} value={r}>{roleLabels[r]}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
