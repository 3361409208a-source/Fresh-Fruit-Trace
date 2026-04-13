import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, PlusCircle, Eye, Trash2, Printer, Package, AlertCircle, RefreshCw } from 'lucide-react';
import { getBatches, deleteBatch } from '../api';
import type { Batch, StatusConfig } from '../types';

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

  return (
    <div style={{ padding: '32px', maxWidth: 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>批次管理</h1>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>共 {total} 条记录</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={load} style={iconBtnStyle}><RefreshCw size={16} /></button>
          <button onClick={() => navigate('/batches/new')} style={primaryBtnStyle}>
            <PlusCircle size={16} /> 新建批次
          </button>
        </div>
      </div>

      {/* 筛选栏 */}
      <div style={{ background: 'white', borderRadius: 14, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            placeholder="搜索产品名称..."
            value={filters.product_name}
            onChange={e => { setFilters(f => ({ ...f, product_name: e.target.value })); setPage(1); }}
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, outline: 'none' }}
          />
        </div>
        <select value={filters.status} onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}
          style={{ padding: '9px 14px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, outline: 'none', color: '#374151' }}>
          <option value="">全部状态</option>
          <option value="preparing">准备中</option>
          <option value="recording">录制中</option>
          <option value="done">已完成</option>
          <option value="printed">已打印</option>
        </select>
        <input type="date" value={filters.date} onChange={e => { setFilters(f => ({ ...f, date: e.target.value })); setPage(1); }}
          style={{ padding: '9px 14px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, outline: 'none', color: '#374151' }} />
        {(filters.product_name || filters.status || filters.date) && (
          <button onClick={() => { setFilters({ product_name: '', status: '', date: '' }); setPage(1); }}
            style={{ padding: '9px 14px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 13, cursor: 'pointer', color: '#6b7280', background: 'white' }}>
            清除筛选
          </button>
        )}
      </div>

      {/* 表格 */}
      <div style={{ background: 'white', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                {['批次号', '产品名称', '操作员', '重量', '生产时间', '有效期', '状态', '操作'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: 48, textAlign: 'center', color: '#9ca3af' }}>
                  <div className="animate-spin" style={{ width: 28, height: 28, border: '3px solid #e5e7eb', borderTopColor: '#16a34a', borderRadius: '50%', margin: '0 auto 10px' }} />
                  加载中...
                </td></tr>
              ) : batches.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 48, textAlign: 'center', color: '#9ca3af' }}>
                  <Package size={36} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                  <div>暂无批次记录</div>
                </td></tr>
              ) : (
                batches.map(batch => {
                  const cfg = statusConfig[batch.status] || statusConfig.preparing;
                  const expired = batch.expire_at ? batch.expire_at < now : false;
                  const prodTime = batch.production_time ? new Date(batch.production_time * 1000).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '--';
                  const expTime = batch.expire_at ? new Date(batch.expire_at * 1000).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '--';
                  return (
                    <tr key={batch.id} style={{ borderBottom: '1px solid #f9fafb' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#9ca3af', fontFamily: 'monospace' }}>{batch.id.slice(0, 8)}...</td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>{batch.product_name}</div>
                        {batch.spec && <div style={{ fontSize: 12, color: '#9ca3af' }}>{batch.spec}</div>}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 14, color: '#374151' }}>{batch.operator}</td>
                      <td style={{ padding: '14px 16px', fontSize: 14, color: '#374151' }}>{batch.weight ? `${batch.weight}g` : '--'}</td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#6b7280' }}>{prodTime}</td>
                      <td style={{ padding: '14px 16px', fontSize: 13 }}>
                        <span style={{ color: expired ? '#ef4444' : '#374151' }}>
                          {expired ? '⚠️ 已过期' : expTime}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ background: cfg.bg, color: cfg.color, padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5, width: 'fit-content' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, display: 'inline-block' }} />
                          {cfg.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => navigate(`/batches/${batch.id}`)} title="查看详情"
                            style={tableActionBtn('#dbeafe', '#1d4ed8')}><Eye size={15} /></button>
                          <button onClick={() => navigate(`/batches/${batch.id}?print=1`)} title="打印标签"
                            style={tableActionBtn('#f3e8ff', '#7c3aed')}><Printer size={15} /></button>
                          <button onClick={() => setDeleteConfirm(batch.id)} title="删除"
                            style={tableActionBtn('#fee2e2', '#dc2626')}><Trash2 size={15} /></button>
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
          <div style={{ padding: '14px 20px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'center', gap: 8 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={pageBtn(page === 1)}>上一页</button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)} style={pageBtn(false, p === page)}>{p}</button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pageBtn(page === totalPages)}>下一页</button>
          </div>
        )}
      </div>

      {/* 删除确认弹窗 */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, maxWidth: 380, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ background: '#fee2e2', borderRadius: 10, padding: 10 }}><AlertCircle size={22} color="#dc2626" /></div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>确认删除</div>
            </div>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>删除后数据无法恢复，包含的视频文件也将一并删除。</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: '10px', border: '1.5px solid #e5e7eb', borderRadius: 10, cursor: 'pointer', fontSize: 14, background: 'white' }}>取消</button>
              <button onClick={() => handleDelete(deleteConfirm)} style={{ flex: 1, padding: '10px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>确认删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const primaryBtnStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, #16a34a, #22c55e)', color: 'white', border: 'none', borderRadius: 10, padding: '10px 18px', fontWeight: 600, fontSize: 14, cursor: 'pointer' };
const iconBtnStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', padding: '10px', border: '1.5px solid #e5e7eb', borderRadius: 10, cursor: 'pointer', background: 'white', color: '#6b7280' };
const tableActionBtn = (bg: string, color: string): React.CSSProperties => ({ background: bg, color, border: 'none', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' });
const pageBtn = (disabled: boolean, active?: boolean): React.CSSProperties => ({
  padding: '7px 13px', border: `1.5px solid ${active ? '#16a34a' : '#e5e7eb'}`, borderRadius: 8,
  background: active ? '#16a34a' : 'white', color: active ? 'white' : disabled ? '#d1d5db' : '#374151',
  cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 13
});
