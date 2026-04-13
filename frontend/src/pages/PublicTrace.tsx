import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, Clock, Video, Package, Leaf, Activity, Play, MapPin } from 'lucide-react';
import { getTrace, API_BASE_URL } from '../api';
import type { TraceData } from '../types';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

interface EventLabelCfg {
  label: string;
  color: string;
  dot: string;
}

const eventLabels: Record<string, EventLabelCfg> = {
  created: { label: '批次创建', color: '#6b7280', dot: '#e5e7eb' },
  recording_started: { label: '开始录制生产', color: '#ef4444', dot: '#fecaca' },
  production_done: { label: '生产完成', color: '#3b82f6', dot: '#bfdbfe' },
  video_uploaded: { label: '过程视频上传', color: '#8b5cf6', dot: '#ddd6fe' },
  label_printed: { label: '标签打印', color: '#22c55e', dot: '#bbf7d0' },
};

function CountdownTimer({ expireAt }: { expireAt: number }) {
  const [remaining, setRemaining] = useState(Math.max(0, expireAt - Math.floor(Date.now() / 1000)));
  const isExpired = remaining <= 0;

  useEffect(() => {
    if (isExpired) return;
    const t = setInterval(() => {
      const r = Math.max(0, expireAt - Math.floor(Date.now() / 1000));
      setRemaining(r);
      if (r <= 0) clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
  }, [expireAt, isExpired]);

  if (isExpired) return (
    <div className="bg-destructive/5 border border-destructive/20 rounded-xl px-5 py-4 flex items-center gap-3">
      <AlertCircle size={24} className="text-destructive" />
      <div>
        <div className="font-bold text-base text-destructive">已超过有效期</div>
        <div className="text-xs text-red-400 mt-0.5">该产品已不在保质期内，请谨慎食用</div>
      </div>
    </div>
  );

  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  const isWarning = remaining < 6 * 3600;

  return (
    <div className={`rounded-xl px-5 py-4 ${isWarning ? 'bg-amber-50 border border-amber-200' : 'bg-primary/5 border border-primary/20'}`}>
      <div className="flex items-center gap-2 mb-3">
        <Clock size={18} className={isWarning ? 'text-amber-600' : 'text-primary'} />
        <span className={`font-semibold text-sm ${isWarning ? 'text-amber-800' : 'text-primary'}`}>
          {isWarning ? '⚠️ 即将到期' : '✅ 在有效期内'}
        </span>
      </div>
      <div className="flex gap-2.5">
        {days > 0 && <TimePart value={days} label="天" warn={isWarning} />}
        <TimePart value={hours} label="时" warn={isWarning} />
        <TimePart value={minutes} label="分" warn={isWarning} />
        <TimePart value={seconds} label="秒" warn={isWarning} />
      </div>
      <div className={`text-xs mt-2.5 ${isWarning ? 'text-amber-700' : 'text-muted-foreground'}`}>
        有效期至：{new Date(expireAt * 1000).toLocaleString('zh-CN')}
      </div>
    </div>
  );
}

function TimePart({ value, label, warn }: { value: number; label: string; warn: boolean }) {
  return (
    <div className="text-center">
      <div className={`rounded-lg px-2.5 py-1.5 text-xl font-bold min-w-[44px] ${warn ? 'bg-amber-100 text-amber-800' : 'bg-primary/10 text-primary'}`}>
        {String(value).padStart(2, '0')}
      </div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

export default function PublicTrace() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<TraceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [videoVisible, setVideoVisible] = useState(false);

  useEffect(() => {
    if (!id) return;
    getTrace(id)
      .then(r => setData(r.data ?? null))
      .catch(err => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-primary/10 flex items-center justify-center flex-col gap-3.5">
      <div className="bg-primary rounded-2xl p-4 flex">
        <Leaf size={28} className="text-primary-foreground" />
      </div>
      <div className="w-8 h-8 border-2 border-muted border-t-primary rounded-full animate-spin" />
      <div className="text-muted-foreground">加载产品信息...</div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-primary/10 flex items-center justify-center p-5">
      <Card className="p-8 max-w-[400px] w-full text-center shadow-lg">
        <AlertCircle size={48} className="text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">未找到产品信息</h2>
        <p className="text-sm text-muted-foreground">{error}</p>
      </Card>
    </div>
  );

  if (!data) return null;
  const prodTime = data.production_time ? new Date(data.production_time * 1000).toLocaleString('zh-CN') : new Date(data.created_at * 1000).toLocaleString('zh-CN');

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-primary/10">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/90 to-primary px-5 pb-10 pt-5 text-center">
        <div className="flex items-center justify-center gap-2.5 mb-2">
          <div className="bg-white/20 rounded-xl p-2">
            <Leaf size={20} className="text-white" />
          </div>
          <span className="text-white/85 text-xs">鲜切水果追溯系统</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white m-0 drop-shadow-lg">
          {data.product_name}
        </h1>
        {data.spec && <div className="text-white/80 text-sm mt-1.5">{data.spec}</div>}
        <Badge variant={data.is_expired ? 'destructive' : 'success'} className="mt-3 gap-1.5">
          {data.is_expired ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
          {data.is_expired ? '已过有效期' : '新鲜在售'}
        </Badge>
      </div>

      <div className="max-w-[520px] mx-auto px-4 pb-10">
        {/* 有效期倒计时 */}
        <div className="-translate-y-5 mb-[-4px]">
          {data.expire_at ? (
            <CountdownTimer expireAt={data.expire_at} />
          ) : (
            <Card className="px-5 py-3.5 flex items-center gap-2 text-muted-foreground text-sm">
              <Clock size={16} /> 未设置有效期
            </Card>
          )}
        </div>

        {/* 产品详情 */}
        <Card className="p-5 mb-3.5">
          <SectionTitle icon={Package} title="产品信息" />
          <div className="grid grid-cols-2 gap-3.5">
            <DetailItem label="产品名称" value={data.product_name} />
            <DetailItem label="操作员" value={data.operator} />
            {data.weight && <DetailItem label="重量" value={`${data.weight}g`} />}
            {data.spec && <DetailItem label="规格" value={data.spec} />}
            <DetailItem label="生产时间" value={prodTime} span />
            {data.expire_at && <DetailItem label="有效期至" value={new Date(data.expire_at * 1000).toLocaleString('zh-CN')} span highlight={data.is_expired} />}
          </div>
          {data.notes && (
            <div className="mt-3.5 bg-secondary/50 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">备注</div>
              <div className="text-sm text-foreground">{data.notes}</div>
            </div>
          )}
        </Card>

        {/* 生产位置 */}
        {data.location_name && (
          <Card className="p-5 mb-3.5">
            <SectionTitle icon={MapPin} title="生产地点" />
            <div className="flex flex-col gap-2.5">
              <div className="flex items-start gap-2.5">
                <MapPin size={18} className="text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm text-foreground font-semibold">{data.location_name}</div>
                  {data.latitude != null && data.longitude != null && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {data.latitude.toFixed(6)}, {data.longitude.toFixed(6)}
                    </div>
                  )}
                </div>
              </div>
              {data.latitude != null && data.longitude != null && (
                <iframe
                  title="生产地点地图"
                  width="100%"
                  height="200"
                  className="rounded-xl border border-border"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${data.longitude-0.005},${data.latitude-0.003},${data.longitude+0.005},${data.latitude+0.003}&layer=mapnik&marker=${data.latitude},${data.longitude}`}
                />
              )}
            </div>
          </Card>
        )}

        {/* 生产视频 */}
        {data.video_url && (
          <Card className="p-5 mb-3.5">
            <SectionTitle icon={Video} title="生产过程视频" />
            {!videoVisible ? (
              <div onClick={() => setVideoVisible(true)} className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl aspect-video flex flex-col items-center justify-center cursor-pointer gap-3 transition-opacity hover:opacity-90">
                <div className="bg-white/15 rounded-full w-16 h-16 flex items-center justify-center backdrop-blur-sm">
                  <Play size={26} className="text-white ml-0.5" />
                </div>
                <div className="text-white/80 text-sm">点击播放生产过程视频</div>
              </div>
            ) : (
              <video controls autoPlay className="w-full rounded-xl max-h-[280px] bg-black"
                src={`${API_BASE_URL}${data.video_url}`} />
            )}
            <div className="text-xs text-muted-foreground mt-2 text-center">
              本视频记录了完整的切割和打包过程，保证食品安全可追溯
            </div>
          </Card>
        )}

        {/* 溯源时间轴 */}
        {data.events && data.events.length > 0 && (
          <Card className="p-5 mb-3.5">
            <SectionTitle icon={Activity} title="生产追溯记录" />
            <div className="relative pl-4">
              <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-primary/10" />
              {data.events.map((ev, i) => {
                const cfg = eventLabels[ev.event_type] || { label: ev.event_type, color: '#6b7280', dot: '#e5e7eb' };
                const isLast = i === data.events.length - 1;
                return (
                  <div key={i} className={`flex gap-3.5 ${isLast ? '' : 'mb-4'} relative`}>
                    <div className="w-3.5 h-3.5 rounded-full shrink-0 z-[1] mt-0.5" style={{ background: cfg.dot, border: `3px solid ${cfg.color}` }} />
                    <div>
                      <div className="font-semibold text-sm text-foreground">{cfg.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{ev.description}</div>
                      <div className="text-[11px] text-muted-foreground/60 mt-0.5">
                        {new Date(ev.occurred_at * 1000).toLocaleString('zh-CN')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* 底部品牌 */}
        <div className="text-center py-5 text-muted-foreground text-xs">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Leaf size={14} className="text-primary" />
            <span className="text-primary font-semibold">鲜切水果追溯系统</span>
          </div>
          全程可追溯 · 新鲜有保障
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4 font-bold text-sm text-foreground">
      <Icon size={18} className="text-primary" />
      {title}
    </div>
  );
}

function DetailItem({ label, value, span, highlight }: { label: string; value: string; span?: boolean; highlight?: boolean }) {
  return (
    <div className={span ? 'col-span-2' : ''}>
      <div className="text-[11px] text-muted-foreground mb-0.5">{label}</div>
      <div className={`text-sm font-semibold ${highlight ? 'text-destructive' : 'text-foreground'}`}>{value}</div>
    </div>
  );
}
