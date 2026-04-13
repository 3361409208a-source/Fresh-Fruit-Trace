import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, Clock, Video, Package, Leaf, Activity, Play, MapPin } from 'lucide-react';
import { getTrace, API_BASE_URL } from '../api';
import type { TraceData } from '../types';

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
    <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <AlertCircle size={24} color="#dc2626" />
      <div>
        <div style={{ fontWeight: 700, fontSize: 16, color: '#dc2626' }}>已超过有效期</div>
        <div style={{ fontSize: 13, color: '#f87171', marginTop: 2 }}>该产品已不在保质期内，请谨慎食用</div>
      </div>
    </div>
  );

  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  const isWarning = remaining < 6 * 3600;

  return (
    <div style={{ background: isWarning ? '#fffbeb' : '#f0fdf4', border: `1.5px solid ${isWarning ? '#fcd34d' : '#bbf7d0'}`, borderRadius: 14, padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Clock size={18} color={isWarning ? '#d97706' : '#16a34a'} />
        <span style={{ fontWeight: 600, fontSize: 15, color: isWarning ? '#92400e' : '#15803d' }}>
          {isWarning ? '⚠️ 即将到期' : '✅ 在有效期内'}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        {days > 0 && <TimePart value={days} label="天" warn={isWarning} />}
        <TimePart value={hours} label="时" warn={isWarning} />
        <TimePart value={minutes} label="分" warn={isWarning} />
        <TimePart value={seconds} label="秒" warn={isWarning} />
      </div>
      <div style={{ fontSize: 12, color: isWarning ? '#b45309' : '#6b7280', marginTop: 10 }}>
        有效期至：{new Date(expireAt * 1000).toLocaleString('zh-CN')}
      </div>
    </div>
  );
}

function TimePart({ value, label, warn }: { value: number; label: string; warn: boolean }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        background: warn ? '#fef3c7' : '#dcfce7', borderRadius: 8, padding: '6px 10px',
        fontSize: 22, fontWeight: 700, color: warn ? '#92400e' : '#15803d', minWidth: 44
      }}>
        {String(value).padStart(2, '0')}
      </div>
      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{label}</div>
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
    <div style={{ minHeight: '100vh', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: '#16a34a', borderRadius: 16, padding: 16, display: 'flex' }}>
        <Leaf size={28} color="white" />
      </div>
      <div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#16a34a', borderRadius: '50%' }} />
      <div style={{ color: '#6b7280' }}>加载产品信息...</div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 20, padding: 32, maxWidth: 400, width: '100%', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 8 }}>未找到产品信息</h2>
        <p style={{ color: '#6b7280', fontSize: 14 }}>{error}</p>
      </div>
    </div>
  );

  if (!data) return null;
  const prodTime = data.production_time ? new Date(data.production_time * 1000).toLocaleString('zh-CN') : new Date(data.created_at * 1000).toLocaleString('zh-CN');

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%)', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #14532d, #16a34a)', padding: '20px 20px 40px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: 8 }}>
            <Leaf size={20} color="white" />
          </div>
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>鲜切水果追溯系统</span>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'white', margin: 0, textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
          {data.product_name}
        </h1>
        {data.spec && <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, marginTop: 6 }}>{data.spec}</div>}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: data.is_expired ? '#ef4444' : '#22c55e', borderRadius: 20, padding: '5px 14px', marginTop: 12 }}>
          {data.is_expired ? <AlertCircle size={14} color="white" /> : <CheckCircle size={14} color="white" />}
          <span style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>{data.is_expired ? '已过有效期' : '新鲜在售'}</span>
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 16px 40px' }}>
        {/* 有效期倒计时 */}
        <div style={{ transform: 'translateY(-20px)', marginBottom: -4 }}>
          {data.expire_at ? (
            <CountdownTimer expireAt={data.expire_at} />
          ) : (
            <div style={{ background: 'white', borderRadius: 14, padding: '14px 20px', border: '1px solid #e5e7eb', color: '#9ca3af', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={16} /> 未设置有效期
            </div>
          )}
        </div>

        {/* 产品详情 */}
        <div style={cardStyle}>
          <SectionTitle icon={Package} title="产品信息" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <DetailItem label="产品名称" value={data.product_name} />
            <DetailItem label="操作员" value={data.operator} />
            {data.weight && <DetailItem label="重量" value={`${data.weight}g`} />}
            {data.spec && <DetailItem label="规格" value={data.spec} />}
            <DetailItem label="生产时间" value={prodTime} span />
            {data.expire_at && <DetailItem label="有效期至" value={new Date(data.expire_at * 1000).toLocaleString('zh-CN')} span highlight={data.is_expired} />}
          </div>
          {data.notes && (
            <div style={{ marginTop: 14, background: '#f9fafb', borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>备注</div>
              <div style={{ fontSize: 14, color: '#374151' }}>{data.notes}</div>
            </div>
          )}
        </div>

        {/* 生产位置 */}
        {data.location_name && (
          <div style={cardStyle}>
            <SectionTitle icon={MapPin} title="生产地点" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <MapPin size={18} color="#16a34a" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 14, color: '#111827', fontWeight: 600 }}>{data.location_name}</div>
                  {data.latitude != null && data.longitude != null && (
                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
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
                  style={{ borderRadius: 12, border: '1px solid #e5e7eb' }}
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${data.longitude-0.005},${data.latitude-0.003},${data.longitude+0.005},${data.latitude+0.003}&layer=mapnik&marker=${data.latitude},${data.longitude}`}
                />
              )}
            </div>
          </div>
        )}

        {/* 生产视频 */}
        {data.video_url && (
          <div style={cardStyle}>
            <SectionTitle icon={Video} title="生产过程视频" />
            {!videoVisible ? (
              <div onClick={() => setVideoVisible(true)} style={{
                background: 'linear-gradient(135deg, #1a1a2e, #16213e)', borderRadius: 12, aspectRatio: '16/9',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', gap: 12, transition: 'opacity 0.2s'
              }}>
                <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '50%', width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
                  <Play size={26} color="white" style={{ marginLeft: 3 }} />
                </div>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>点击播放生产过程视频</div>
              </div>
            ) : (
              <video controls autoPlay style={{ width: '100%', borderRadius: 12, maxHeight: 280, background: '#000' }}
                src={`${API_BASE_URL}${data.video_url}`} />
            )}
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 8, textAlign: 'center' }}>
              本视频记录了完整的切割和打包过程，保证食品安全可追溯
            </div>
          </div>
        )}

        {/* 溯源时间轴 */}
        {data.events && data.events.length > 0 && (
          <div style={cardStyle}>
            <SectionTitle icon={Activity} title="生产追溯记录" />
            <div style={{ position: 'relative', paddingLeft: 16 }}>
              <div style={{ position: 'absolute', left: 15, top: 8, bottom: 8, width: 2, background: '#f0fdf4' }} />
              {data.events.map((ev, i) => {
                const cfg = eventLabels[ev.event_type] || { label: ev.event_type, color: '#6b7280', dot: '#e5e7eb' };
                const isLast = i === data.events.length - 1;
                return (
                  <div key={i} style={{ display: 'flex', gap: 14, marginBottom: isLast ? 0 : 16, position: 'relative' }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: cfg.dot, border: `3px solid ${cfg.color}`, flexShrink: 0, zIndex: 1, marginTop: 3 }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{cfg.label}</div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{ev.description}</div>
                      <div style={{ fontSize: 11, color: '#d1d5db', marginTop: 2 }}>
                        {new Date(ev.occurred_at * 1000).toLocaleString('zh-CN')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 底部品牌 */}
        <div style={{ textAlign: 'center', padding: '20px 0', color: '#9ca3af', fontSize: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
            <Leaf size={14} color="#22c55e" />
            <span style={{ color: '#22c55e', fontWeight: 600 }}>鲜切水果追溯系统</span>
          </div>
          全程可追溯 · 新鲜有保障
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontWeight: 700, fontSize: 15, color: '#111827' }}>
      <Icon size={18} color="#16a34a" />
      {title}
    </div>
  );
}

function DetailItem({ label, value, span, highlight }: { label: string; value: string; span?: boolean; highlight?: boolean }) {
  return (
    <div style={{ gridColumn: span ? '1 / -1' : 'auto' }}>
      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: highlight ? '#dc2626' : '#111827' }}>{value}</div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: 'white', borderRadius: 16, padding: '20px', marginBottom: 14,
  boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)'
};
