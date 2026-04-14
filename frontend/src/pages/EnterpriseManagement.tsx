import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, Ban, CheckCircle, Search, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../api';
import type { Enterprise } from '../types';
import { cn } from '../lib/utils';

export default function EnterpriseManagement() {
  const { isSuperAdmin } = useAuth();
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Enterprise | null>(null);
  const [form, setForm] = useState({
    name: '',
    code: '',
    contact_person: '',
    contact_phone: '',
    address: '',
    license_no: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadEnterprises();
  }, []);

  const loadEnterprises = async () => {
    try {
      const res = await api.getEnterprises();
      if (res.success && res.data) {
        setEnterprises(res.data);
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
        await api.updateEnterprise(editing.id, {
          name: form.name,
          contact_person: form.contact_person || null,
          contact_phone: form.contact_phone || null,
          address: form.address || null,
          license_no: form.license_no || null,
        });
      } else {
        if (!form.code) {
          throw new Error('企业编码为必填项');
        }
        await api.createEnterprise({
          name: form.name,
          code: form.code,
          contact_person: form.contact_person || undefined,
          contact_phone: form.contact_phone || undefined,
          address: form.address || undefined,
          license_no: form.license_no || undefined,
        });
      }
      setShowModal(false);
      setEditing(null);
      setForm({ name: '', code: '', contact_person: '', contact_phone: '', address: '', license_no: '' });
      loadEnterprises();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (enterprise: Enterprise) => {
    setEditing(enterprise);
    setForm({
      name: enterprise.name,
      code: enterprise.code,
      contact_person: enterprise.contact_person || '',
      contact_phone: enterprise.contact_phone || '',
      address: enterprise.address || '',
      license_no: enterprise.license_no || '',
    });
    setShowModal(true);
  };

  const handleToggleStatus = async (id: number, currentStatus: number) => {
    try {
      await api.updateEnterpriseStatus(id, currentStatus === 1 ? 0 : 1);
      loadEnterprises();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filtered = enterprises.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.code.toLowerCase().includes(search.toLowerCase())
  );

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7]">
        <div className="text-center">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">仅超级管理员可访问此页面</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <Building2 className="w-6 h-6" /> 企业管理
        </h1>
        <p className="text-sm text-gray-500 mt-1">管理系统中的所有企业</p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索企业..."
            className="pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none text-sm w-64"
          />
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setForm({ name: '', code: '', contact_person: '', contact_phone: '', address: '', license_no: '' });
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800"
        >
          <Plus className="w-4 h-4" /> 新增企业
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">企业名称</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">编码</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">联系人</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">联系电话</th>
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
                  暂无企业数据
                </td>
              </tr>
            ) : (
              filtered.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{e.name}</td>
                  <td className="px-6 py-4 text-gray-600 text-sm font-mono">{e.code}</td>
                  <td className="px-6 py-4 text-gray-600 text-sm">{e.contact_person || '-'}</td>
                  <td className="px-6 py-4 text-gray-600 text-sm">{e.contact_phone || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      'px-2 py-1 rounded-full text-xs font-medium',
                      e.status === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    )}>
                      {e.status === 1 ? '启用' : '禁用'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(e)}
                        className="p-2 text-gray-500 hover:text-black hover:bg-gray-100 rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(e.id, e.status)}
                        className={cn(
                          'p-2 rounded-lg',
                          e.status === 1
                            ? 'text-red-500 hover:bg-red-50'
                            : 'text-green-500 hover:bg-green-50'
                        )}
                      >
                        {e.status === 1 ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                      </button>
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
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg m-4">
            <h2 className="text-xl font-semibold mb-4">
              {editing ? '编辑企业' : '新增企业'}
            </h2>
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl">{error}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">企业名称 *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  企业编码 {editing ? '(不可修改)' : '*'}
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none"
                  required={!editing}
                  disabled={!!editing}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">联系人</label>
                  <input
                    type="text"
                    value={form.contact_person}
                    onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">联系电话</label>
                  <input
                    type="text"
                    value={form.contact_phone}
                    onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">地址</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">营业执照号</label>
                <input
                  type="text"
                  value={form.license_no}
                  onChange={(e) => setForm({ ...form, license_no: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none"
                />
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
