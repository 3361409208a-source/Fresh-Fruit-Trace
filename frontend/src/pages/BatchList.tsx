import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, PlusCircle, Eye, Trash2, Printer, Package, AlertCircle, RefreshCw } from 'lucide-react';
import { getBatches, deleteBatch } from '../api';
import type { Batch, StatusConfig } from '../types';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

const statusConfig: Record<string, StatusConfig> = {
  preparing: { label: '准备中', color: '#d97706', bg: '#fef3c7', dot: '#f59e0b' },
  recording: { label: '录制中', color: '#dc2626', bg: '#fee2e2', dot: '#ef4444' },
  done: { label: '已完成', color: '#1d4ed8', bg: '#dbeafe', dot: '#3b82f6' },
  printed: { label: '已打印', color: '#15803d', bg: '#dcfce7', dot: '#22c55e' },
};

interface Filters {
  product_name: string;
  status: string;
  date: string;
}

export default function BatchList() {
  const navigate = useNavigate();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({ product_name: '', status: '', date: '' });
  const [page, setPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const limit = 15;

  const load = useCallback(() => {
    setLoading(true);
    getBatches({ ...filters, page, limit })
      .then(r => { setBatches(r.data || []); setTotal(r.total || 0); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    try {
      await deleteBatch(id);
      setDeleteConfirm(null);
      load();
    } catch (err) { alert('删除失败：' + (err as Error).message); }
  };

  const totalPages = Math.ceil(total / limit);
  const now = Math.floor(Date.now() / 1000);

  const statusVariant = (s: string) => s === 'preparing' ? 'warning' : s === 'recording' ? 'destructive' : s === 'printed' ? 'success' : 'secondary';

  return (
    <div className="p-8 max-w-[1100px]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">批次管理</h1>
          <p className="text-sm text-muted-foreground mt-1">共 {total} 条记录</p>
        </div>
        <div className="flex gap-2.5">
          <Button variant="outline" size="icon" onClick={load}><RefreshCw size={16} /></Button>
          <Button onClick={() => navigate('/batches/new')} className="gap-2">
            <PlusCircle size={16} /> 新建批次
          </Button>
        </div>
      </div>

      {/* 筛选栏 */}
      <Card className="px-5 py-4 mb-4 flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="搜索产品名称..."
            value={filters.product_name}
            onChange={e => { setFilters(f => ({ ...f, product_name: e.target.value })); setPage(1); }}
            className="w-full pl-9 pr-3 py-2 border border-input rounded-lg text-sm bg-background outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select value={filters.status} onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}
          className="px-3.5 py-2 border border-input rounded-lg text-sm bg-background outline-none text-foreground">
          <option value="">全部状态</option>
          <option value="preparing">准备中</option>
          <option value="recording">录制中</option>
          <option value="done">已完成</option>
          <option value="printed">已打印</option>
        </select>
        <input type="date" value={filters.date} onChange={e => { setFilters(f => ({ ...f, date: e.target.value })); setPage(1); }}
          className="px-3.5 py-2 border border-input rounded-lg text-sm bg-background outline-none text-foreground" />
        {(filters.product_name || filters.status || filters.date) && (
          <Button variant="outline" size="sm" onClick={() => { setFilters({ product_name: '', status: '', date: '' }); setPage(1); }}>
            清除筛选
          </Button>
        )}
      </Card>

      {/* 表格 */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-secondary/50 border-b border-border">
                {['批次号', '产品名称', '操作员', '重量', '生产时间', '有效期', '状态', '操作'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-12 text-center text-muted-foreground">
                  <div className="w-7 h-7 border-2 border-muted border-t-primary rounded-full animate-spin mx-auto mb-2.5" />
                  加载中...
                </td></tr>
              ) : batches.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-muted-foreground">
                  <Package size={36} className="mx-auto mb-2.5 opacity-30" />
                  <div>暂无批次记录</div>
                </td></tr>
              ) : (
                batches.map(batch => {
                  const cfg = statusConfig[batch.status] || statusConfig.preparing;
                  const expired = batch.expire_at ? batch.expire_at < now : false;
                  const prodTime = batch.production_time ? new Date(batch.production_time * 1000).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '--';
                  const expTime = batch.expire_at ? new Date(batch.expire_at * 1000).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '--';
                  return (
                    <tr key={batch.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3.5 text-xs text-muted-foreground font-mono">{batch.id.slice(0, 8)}...</td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-sm text-foreground">{batch.product_name}</div>
                        {batch.spec && <div className="text-xs text-muted-foreground">{batch.spec}</div>}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-foreground">{batch.operator}</td>
                      <td className="px-4 py-3.5 text-sm text-foreground">{batch.weight ? `${batch.weight}g` : '--'}</td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">{prodTime}</td>
                      <td className="px-4 py-3.5 text-xs">
                        <span className={expired ? 'text-destructive' : 'text-foreground'}>
                          {expired ? '⚠️ 已过期' : expTime}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={statusVariant(batch.status)} className="gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
                          {cfg.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex gap-1.5">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => navigate(`/batches/${batch.id}`)} title="查看详情"><Eye size={15} /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-purple-600 hover:bg-purple-50" onClick={() => navigate(`/batches/${batch.id}?print=1`)} title="打印标签"><Printer size={15} /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setDeleteConfirm(batch.id)} title="删除"><Trash2 size={15} /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="px-5 py-3.5 border-t border-border flex justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>上一页</Button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => i + 1).map(p => (
              <Button key={p} variant={p === page ? 'default' : 'outline'} size="sm" onClick={() => setPage(p)}>{p}</Button>
            ))}
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>下一页</Button>
          </div>
        )}
      </Card>

      {/* 删除确认弹窗 */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]">
          <Card className="p-7 max-w-[380px] w-[90%] shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl p-2.5 bg-destructive/10"><AlertCircle size={22} className="text-destructive" /></div>
              <div className="font-bold text-base text-foreground">确认删除</div>
            </div>
            <p className="text-sm text-muted-foreground mb-6">删除后数据无法恢复，包含的视频文件也将一并删除。</p>
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
