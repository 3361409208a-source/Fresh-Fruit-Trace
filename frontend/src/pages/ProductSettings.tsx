import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Settings, Clock, Apple } from 'lucide-react';
import { getProducts, createProduct, deleteProduct } from '../api';
import type { Product } from '../types';

export default function ProductSettings() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newHours, setNewHours] = useState(24);
  const [adding, setAdding] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    getProducts()
      .then(r => setProducts(r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!newName.trim()) return setError('请输入产品名称');
    setAdding(true);
    try {
      await createProduct({ name: newName.trim(), default_shelf_hours: newHours });
      setNewName(''); setNewHours(24); setError('');
      load();
    } catch (err) { setError((err as Error).message); }
    finally { setAdding(false); }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteProduct(id);
      setDeleteConfirm(null);
      load();
    } catch (err) { alert('删除失败：' + (err as Error).message); }
  };

  const shelfPresets = [
    { hours: 6, label: '6小时' }, { hours: 12, label: '12小时' },
    { hours: 24, label: '1天' }, { hours: 48, label: '2天' },
    { hours: 72, label: '3天' }, { hours: 120, label: '5天' },
  ];

  return (
    <div style={{ padding: '32px', maxWidth: 700 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Settings size={24} color="#16a34a" /> 产品类型设置
        </h1>
        <p style={{ color: '#6b7280', fontSize: 14, marginTop: 6 }}>管理水果种类及默认保质时间，创建批次时可快速选择</p>
      </div>

      {/* 添加新产品 */}
      <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 6px rgba(0,0,0,0.07)', marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plus size={18} color="#16a34a" /> 添加产品类型
        </h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={labelStyle}>产品名称</label>
            <input
              value={newName}
              onChange={e => { setNewName(e.target.value); setError(''); }}
              placeholder="如：榴莲、荔枝..."
              style={inputStyle}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <div style={{ minWidth: 140 }}>
            <label style={labelStyle}>默认保质时长（小时）</label>
            <input
              type="number" min={1} max={720}
              value={newHours}
              onChange={e => setNewHours(parseInt(e.target.value) || 24)}
              style={{ ...inputStyle, width: 140 }}
            />
          </div>
          <button onClick={handleAdd} disabled={adding} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'linear-gradient(135deg, #16a34a, #22c55e)', color: 'white',
            border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 600,
            fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap', marginBottom: 1
          }}>
            <Plus size={16} /> {adding ? '添加中...' : '添加'}
          </button>
        </div>
        {/* 快速选择保质时长 */}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>快速设置保质时长：</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {shelfPresets.map(p => (
              <button key={p.hours} onClick={() => setNewHours(p.hours)} style={{
                padding: '5px 12px', borderRadius: 8, border: `1.5px solid ${newHours === p.hours ? '#16a34a' : '#e5e7eb'}`,
                background: newHours === p.hours ? '#f0fdf4' : 'white',
                color: newHours === p.hours ? '#16a34a' : '#6b7280',
                fontSize: 12, cursor: 'pointer', fontWeight: newHours === p.hours ? 600 : 400
              }}>{p.label}</button>
            ))}
          </div>
        </div>
        {error && (
          <div style={{ marginTop: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 14px', color: '#dc2626', fontSize: 13 }}>
            {error}
          </div>
        )}
      </div>

      {/* 产品类型列表 */}
      <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Apple size={18} color="#16a34a" />
          <span style={{ fontWeight: 600, fontSize: 15, color: '#111827' }}>已有产品类型（{products.length}）</span>
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
            <div className="animate-spin" style={{ width: 28, height: 28, border: '3px solid #e5e7eb', borderTopColor: '#16a34a', borderRadius: '50%', margin: '0 auto 10px' }} />
            加载中...
          </div>
        ) : products.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
            <Apple size={36} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
            <div>暂无产品类型，请添加</div>
          </div>
        ) : (
          products.map((p, i) => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', padding: '14px 20px',
              borderBottom: i < products.length - 1 ? '1px solid #f9fafb' : 'none',
              transition: 'background 0.1s'
            }}
              onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: '#111827' }}>{p.name}</div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} /> 默认保质 {p.default_shelf_hours} 小时
                  {p.default_shelf_hours >= 24 && <span>（{Math.round(p.default_shelf_hours / 24 * 10) / 10}天）</span>}
                </div>
              </div>
              <button onClick={() => setDeleteConfirm(p.id)}
                style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                <Trash2 size={14} /> 删除
              </button>
            </div>
          ))
        )}
      </div>

      {/* 删除确认 */}
      {deleteConfirm !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, maxWidth: 360, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 12 }}>确认删除产品类型？</h3>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 20 }}>删除后不影响已有批次记录，但后续创建批次时不可选择此类型。</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: 10, border: '1.5px solid #e5e7eb', borderRadius: 10, cursor: 'pointer', fontSize: 14, background: 'white' }}>取消</button>
              <button onClick={() => handleDelete(deleteConfirm)} style={{ flex: 1, padding: 10, background: '#dc2626', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>确认删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, color: '#111827', outline: 'none', background: 'white' };
