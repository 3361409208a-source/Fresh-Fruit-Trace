import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, PlayCircle, CheckCircle, Printer, Package, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { getTodayStats, getBatches } from '../api';
import type { Batch, TodayStats, StatusConfig } from '../types';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

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
    <Card className="flex items-center gap-4 p-5">
      <div className="rounded-2xl p-3.5 flex shrink-0" style={{ background: bg }}>
        <Icon size={26} style={{ color }} />
      </div>
      <div>
        <div className="text-3xl font-extrabold text-foreground leading-none tracking-tight">{value ?? 0}</div>
        <div className="text-xs text-muted-foreground mt-1.5 font-medium">{label}</div>
      </div>
    </Card>
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
  const variant = batch.status === 'preparing' ? 'warning' : batch.status === 'recording' ? 'destructive' : batch.status === 'printed' ? 'success' : 'secondary';

  return (
    <div onClick={() => onClick(batch.id)} className="flex items-center px-5 py-3.5 border-b border-border cursor-pointer hover:bg-secondary/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-foreground">{batch.product_name}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {batch.operator} · {batch.weight ? `${batch.weight}g` : '未称重'} · {time}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {isExpired && (
          <div className="flex items-center gap-1 text-destructive text-xs">
            <AlertCircle size={14} /> 已过期
          </div>
        )}
        <Badge variant={variant}>{cfg.label}</Badge>
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
    <div className="p-8 max-w-[1100px]">
      <div className="flex justify-between items-start mb-7 pb-6 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">生产控制台</h1>
          <div className="text-sm text-muted-foreground mt-1.5 flex items-center gap-1.5">
            <Clock size={14} /> {today}
          </div>
        </div>
        <Button onClick={() => navigate('/batches/new')} size="lg" className="gap-2 shadow-lg shadow-primary/20">
          <PlusCircle size={18} /> 开始新批次
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="w-8 h-8 border-2 border-muted border-t-primary rounded-full animate-spin mx-auto mb-3" />
          加载中...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-8">
            <StatCard icon={Package} label="今日总批次" value={stats?.total} color="#1d1d1f" bg="#f5f5f7" />
            <StatCard icon={PlayCircle} label="录制中" value={stats?.recording} color="#ff3b30" bg="#fff1f0" />
            <StatCard icon={CheckCircle} label="已完成" value={stats?.completed} color="#34c759" bg="#f0fff4" />
            <StatCard icon={Printer} label="已打印标签" value={stats?.printed} color="#1d1d1f" bg="#f5f5f7" />
            <StatCard icon={TrendingUp} label="总重量(g)" value={stats?.total_weight ? Math.round(stats.total_weight) : 0} color="#1d1d1f" bg="#f5f5f7" />
          </div>

          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex justify-between items-center">
              <div className="font-semibold text-base text-foreground">最近批次</div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/batches')} className="text-primary">
                查看全部 →
              </Button>
            </div>
            {recentBatches.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Package size={40} className="mx-auto mb-3 opacity-30" />
                <div>暂无批次记录</div>
                <Button variant="default" size="sm" onClick={() => navigate('/batches/new')} className="mt-4">
                  开始第一个批次
                </Button>
              </div>
            ) : (
              recentBatches.map(b => <BatchRow key={b.id} batch={b} onClick={(id) => navigate(`/batches/${id}`)} />)
            )}
          </Card>
        </>
      )}
    </div>
  );
}
