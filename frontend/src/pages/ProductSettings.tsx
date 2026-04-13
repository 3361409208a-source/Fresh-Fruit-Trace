import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Settings, Clock, Apple } from 'lucide-react';
import { getProducts, createProduct, deleteProduct } from '../api';
import type { Product } from '../types';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';

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
    <div className="p-8 max-w-[700px]">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
          <Settings size={24} className="text-primary" /> 产品类型设置
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">管理水果种类及默认保质时间，创建批次时可快速选择</p>
      </div>

      {/* 添加新产品 */}
      <Card className="p-6 mb-5">
        <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <Plus size={18} className="text-primary" /> 添加产品类型
        </h2>
        <div className="flex gap-3 flex-wrap items-end">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-foreground mb-1.5">产品名称</label>
            <input
              value={newName}
              onChange={e => { setNewName(e.target.value); setError(''); }}
              placeholder="如：榴莲、荔枝..."
              className="w-full px-3.5 py-2.5 border border-input rounded-lg text-sm bg-background outline-none focus:ring-2 focus:ring-ring"
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <div className="min-w-[140px]">
            <label className="block text-xs font-medium text-foreground mb-1.5">默认保质时长（小时）</label>
            <input
              type="number" min={1} max={720}
              value={newHours}
              onChange={e => setNewHours(parseInt(e.target.value) || 24)}
              className="w-[140px] px-3.5 py-2.5 border border-input rounded-lg text-sm bg-background outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <Button onClick={handleAdd} disabled={adding} className="gap-1.5 shrink-0">
            <Plus size={16} /> {adding ? '添加中...' : '添加'}
          </Button>
        </div>
        {/* 快速选择保质时长 */}
        <div className="mt-3">
          <div className="text-xs text-muted-foreground mb-2">快速设置保质时长：</div>
          <div className="flex gap-2 flex-wrap">
            {shelfPresets.map(p => (
              <Button key={p.hours} variant={newHours === p.hours ? 'default' : 'outline'} size="sm" onClick={() => setNewHours(p.hours)}>
                {p.label}
              </Button>
            ))}
          </div>
        </div>
        {error && (
          <div className="mt-3 bg-destructive/5 border border-destructive/20 rounded-lg px-3.5 py-2 text-destructive text-xs">
            {error}
          </div>
        )}
      </Card>

      {/* 产品类型列表 */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Apple size={18} className="text-primary" />
          <span className="font-semibold text-sm text-foreground">已有产品类型（{products.length}）</span>
        </div>
        {loading ? (
          <div className="py-10 text-center text-muted-foreground">
            <div className="w-7 h-7 border-2 border-muted border-t-primary rounded-full animate-spin mx-auto mb-2.5" />
            加载中...
          </div>
        ) : products.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            <Apple size={36} className="mx-auto mb-2.5 opacity-30" />
            <div>暂无产品类型，请添加</div>
          </div>
        ) : (
          products.map((p, i) => (
            <div key={p.id} className={`flex items-center px-5 py-3.5 hover:bg-secondary/30 transition-colors ${i < products.length - 1 ? 'border-b border-border/50' : ''}`}>
              <div className="flex-1">
                <div className="font-semibold text-sm text-foreground">{p.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Clock size={12} /> 默认保质 {p.default_shelf_hours} 小时
                  {p.default_shelf_hours >= 24 && <span>（{Math.round(p.default_shelf_hours / 24 * 10) / 10}天）</span>}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(p.id)} className="text-destructive hover:bg-destructive/10 gap-1">
                <Trash2 size={14} /> 删除
              </Button>
            </div>
          ))
        )}
      </Card>

      {/* 删除确认 */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]">
          <Card className="p-7 max-w-[360px] w-[90%] shadow-2xl">
            <h3 className="text-base font-bold text-foreground mb-3">确认删除产品类型？</h3>
            <p className="text-sm text-muted-foreground mb-5">删除后不影响已有批次记录，但后续创建批次时不可选择此类型。</p>
            <div className="flex gap-2.5">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(null)}>取消</Button>
              <Button variant="destructive" className="flex-1" onClick={() => handleDelete(deleteConfirm)}>确认删除</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
