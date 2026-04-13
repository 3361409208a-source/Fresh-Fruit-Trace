import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, PlayCircle, CheckCircle, Printer, Package, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { getTodayStats, getBatches } from '../api';
import type { Batch, TodayStats, StatusConfig } from '../types';

const statusConfig: Record<string, StatusConfig> = {
  preparing: { label: '准备中', color: '#f59e0b', bg: '#fef3c7' },
  recording: { label: '录制中', color: '#ef4444', bg: '#fee2e2' },
  done: { label: '已完成', color: '#3b82f6', bg: '#dbeafe' },
  printed: { label: '已打印', color: '#22c55e', bg: '#dcfce7' },
};

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number | undefined | null;
  color: string;
  bg: string;
}

function StatCard({ icon: Icon, label, value, color, bg }: StatCardProps) {
  return (
    <div style={{
      background: 'white', borderRadius: 16, padding: '20px 24px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 16
    }}>
      <div style={{ background: bg, borderRadius: 12, padding: 12, display: 'flex' }}>
        <Icon size={24} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{value ?? 0}</div>
        <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{label}</div>
      </div>
    </div>
  );
}

interface BatchRowProps {
  batch: Batch;
  onClick: (id: string) => void;
}

function BatchRow({ batch, onClick }: BatchRowProps) {
  const cfg = statusConfig[batch.status] || statusConfig.preparing;
  const time = batch.created_at ? new Date(batch.created_at * 1000).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '--';
  const isExpired = batch.expire_at ? batch.expire_at < Math.floor(Date.now() / 1000) : false;

  return (
    <div onClick={() => onClick(batch.id)} style={{
      display: 'flex', alignItems: 'center', padding: '14px 20px',
      borderBottom: '1px solid #f3f4f6', cursor: 'pointer', transition: 'background 0.1s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 15, color: '#111827' }}>{batch.product_name}</div>
        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
          {batch.operator} · {batch.weight ? `${batch.weight}g` : '未称重'} · {time}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {isExpired && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#ef4444', fontSize: 12 }}>
            <AlertCircle size={14} /> 已过期
          </div>
        )}
        <span style={{
          background: cfg.bg, color: cfg.color,
          padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500
        }}>{cfg.label}</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<TodayStats | null>(null);
  const [recentBatches, setRecentBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getTodayStats(), getBatches({ limit: 8 })])
      .then(([statsRes, batchesRes]) => {
        setStats(statsRes.data ?? null);
        setRecentBatches(batchesRes.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

  return (
    <div style={{ padding: '32px 32px', maxWidth: 1100, animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111827' }}>生产控制台</h1>
          <div style={{ color: '#6b7280', fontSize: 14, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={14} /> {today}
          </div>
        </div>
        <button onClick={() => navigate('/batches/new')} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'linear-gradient(135deg, #16a34a, #22c55e)',
          color: 'white', border: 'none', borderRadius: 12, padding: '12px 22px',
          fontWeight: 600, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 12px rgba(22,163,74,0.3)'
        }}>
          <PlusCircle size={18} /> 开始新批次
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
          <div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#16a34a', borderRadius: '50%', margin: '0 auto 12px' }} />
          加载中...
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
            <StatCard icon={Package} label="今日总批次" value={stats?.total} color="#16a34a" bg="#dcfce7" />
            <StatCard icon={PlayCircle} label="录制中" value={stats?.recording} color="#ef4444" bg="#fee2e2" />
            <StatCard icon={CheckCircle} label="已完成" value={stats?.completed} color="#3b82f6" bg="#dbeafe" />
            <StatCard icon={Printer} label="已打印标签" value={stats?.printed} color="#8b5cf6" bg="#ede9fe" />
            <StatCard icon={TrendingUp} label="总重量(g)" value={stats?.total_weight ? Math.round(stats.total_weight) : 0} color="#f59e0b" bg="#fef3c7" />
          </div>

          <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 600, fontSize: 16, color: '#111827' }}>最近批次</div>
              <button onClick={() => navigate('/batches')} style={{ color: '#16a34a', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
                查看全部 →
              </button>
            </div>
            {recentBatches.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af' }}>
                <Package size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <div>暂无批次记录</div>
                <button onClick={() => navigate('/batches/new')} style={{
                  marginTop: 16, background: '#16a34a', color: 'white', border: 'none',
                  borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontSize: 13
                }}>开始第一个批次</button>
              </div>
            ) : (
              recentBatches.map(b => <BatchRow key={b.id} batch={b} onClick={(id) => navigate(`/batches/${id}`)} />)
            )}
          </div>
        </>
      )}
    </div>
  );
}
