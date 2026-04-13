import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Printer, CheckCircle, Clock, Video, AlertCircle, Package, Calendar, User, Weight, FileText, Activity, MapPin } from 'lucide-react';
import { getBatch, updateBatch, API_BASE_URL } from '../api';
import type { Batch, StatusConfig } from '../types';

const statusConfig: Record<string, StatusConfig> = {
  preparing: { label: '准备中', color: '#d97706', bg: '#fef3c7' },
  recording: { label: '录制中', color: '#dc2626', bg: '#fee2e2' },
  done: { label: '已完成', color: '#1d4ed8', bg: '#dbeafe' },
  printed: { label: '已打印', color: '#15803d', bg: '#dcfce7' },
};

interface EventLabel {
  label: string;
  icon: React.ElementType;
  color: string;
}

const eventLabels: Record<string, EventLabel> = {
  created: { label: '批次创建', icon: Package, color: '#6b7280' },
  recording_started: { label: '开始录制', icon: Video, color: '#ef4444' },
  production_done: { label: '生产完成', icon: CheckCircle, color: '#3b82f6' },
  video_uploaded: { label: '视频上传', icon: Video, color: '#8b5cf6' },
  label_printed: { label: '标签打印', icon: Printer, color: '#22c55e' },
};

export default function BatchDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const lanHost = process.env.REACT_APP_LAN_HOST || window.location.hostname;
  const traceUrl = `${window.location.protocol}//${lanHost}:${window.location.port}/trace/${id}`;
  const now = Math.floor(Date.now() / 1000);

  useEffect(() => {
    if (!id) return;
    getBatch(id)
      .then(r => setBatch(r.data ?? null))
      .catch(err => alert('加载失败：' + (err as Error).message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (searchParams.get('print') === '1' && batch) {
      setTimeout(() => handlePrint(), 800);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch]);

  const handlePrint = async () => {
    if (!batch || !id) return;
    setPrinting(true);
    if (batch.status !== 'printed') {
      await updateBatch(id, { status: 'printed' }).catch(console.error);
      setBatch(b => b ? { ...b, status: 'printed' } : b);
    }
    window.print();
    setPrinting(false);
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400, flexDirection: 'column', gap: 12, color: '#9ca3af' }}>
      <div className="animate-spin" style={{ width: 36, height: 36, border: '3px solid #e5e7eb', borderTopColor: '#16a34a', borderRadius: '50%' }} />
      加载中...
    </div>
  );

  if (!batch) return null;

  const cfg = statusConfig[batch.status] || statusConfig.preparing;
  const isExpired = batch.expire_at ? batch.expire_at < now : false;
  const prodTime = batch.production_time ? new Date(batch.production_time * 1000).toLocaleString('zh-CN') : '--';
  const expTime = batch.expire_at ? new Date(batch.expire_at * 1000).toLocaleString('zh-CN') : '--';
  const createdTime = batch.created_at ? new Date(batch.created_at * 1000).toLocaleString('zh-CN') : '--';

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1000 }}>
      {/* 顶部导航 */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <button onClick={() => navigate('/batches')} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>
          <ArrowLeft size={18} /> 返回批次列表
        </button>
        <button onClick={handlePrint} disabled={printing} style={{
          display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
          color: 'white', border: 'none', borderRadius: 12, padding: '11px 22px', fontWeight: 600, fontSize: 14, cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(124,58,237,0.3)'
        }}>
          <Printer size={17} /> {printing ? '打印中...' : '打印标签'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        {/* 左侧：批次信息 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 基本信息卡片 */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 4 }}>{batch.product_name}</h1>
                <div style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'monospace' }}>批次ID: {batch.id}</div>
              </div>
              <span style={{ background: cfg.bg, color: cfg.color, padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
                {cfg.label}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <InfoItem icon={User} label="操作员" value={batch.operator} />
              <InfoItem icon={Weight} label="重量" value={batch.weight ? `${batch.weight}g` : '未填写'} />
              <InfoItem icon={Package} label="规格" value={batch.spec || '未填写'} />
              <InfoItem icon={Calendar} label="生产时间" value={prodTime} />
              <InfoItem icon={Clock} label="有效期至" value={expTime} highlight={isExpired ? 'red' : batch.expire_at ? 'green' : undefined} />
              {batch.location_name && <InfoItem icon={MapPin} label="生产地点" value={batch.location_name} />}
              <InfoItem icon={Calendar} label="创建时间" value={createdTime} />
            </div>
            {batch.notes && (
              <div style={{ marginTop: 14, background: '#f9fafb', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}><FileText size={12} /> 备注</div>
                <div style={{ fontSize: 14, color: '#374151' }}>{batch.notes}</div>
              </div>
            )}
            {isExpired && (
              <div style={{ marginTop: 14, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, color: '#dc2626', fontSize: 13 }}>
                <AlertCircle size={16} /> 该产品已过有效期，请勿销售！
              </div>
            )}
          </div>

          {/* 视频播放 */}
          {batch.video_url && (
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontWeight: 600, color: '#111827' }}>
                <Video size={18} color="#8b5cf6" /> 生产过程视频
              </div>
              <video controls style={{ width: '100%', borderRadius: 10, maxHeight: 300, background: '#000' }}
                src={`${API_BASE_URL}${batch.video_url}`} />
            </div>
          )}

          {/* 事件时间轴 */}
          {batch.events && batch.events.length > 0 && (
            <div style={card} className="no-print">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontWeight: 600, color: '#111827' }}>
                <Activity size={18} color="#16a34a" /> 操作记录
              </div>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 17, top: 0, bottom: 0, width: 2, background: '#f3f4f6' }} />
                {batch.events.map((ev, i) => {
                  const cfg = eventLabels[ev.event_type] || { label: ev.event_type, icon: Activity, color: '#6b7280' };
                  const Icon = cfg.icon;
                  return (
                    <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 16, position: 'relative' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f9fafb', border: '2px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1 }}>
                        <Icon size={16} color={cfg.color} />
                      </div>
                      <div style={{ paddingTop: 6 }}>
                        <div style={{ fontWeight: 500, fontSize: 14, color: '#111827' }}>{cfg.label}</div>
                        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{ev.description}</div>
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
        </div>

        {/* 右侧：二维码标签 */}
        <div>
          <div style={{ ...card, position: 'sticky', top: 20 }}>
            <div className="no-print" style={{ fontWeight: 600, fontSize: 15, color: '#111827', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Printer size={18} color="#7c3aed" /> 打印标签预览
            </div>
            <div id="print-area" ref={printRef}>
              <PrintLabel batch={batch} traceUrl={traceUrl} isExpired={isExpired} />
            </div>
            <button onClick={handlePrint} className="no-print" style={{
              width: '100%', marginTop: 14, background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
              color: 'white', border: 'none', borderRadius: 12, padding: '12px', fontWeight: 600,
              fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}>
              <Printer size={18} /> 打印此标签
            </button>
            <div className="no-print" style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 8 }}>
              消费者扫码后可查看生产视频和详情
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PrintLabelProps {
  batch: Batch;
  traceUrl: string;
  isExpired: boolean;
}

function PrintLabel({ batch, traceUrl, isExpired }: PrintLabelProps) {
  const expTime = batch.expire_at ? new Date(batch.expire_at * 1000).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '--';
  const prodTime = batch.production_time ? new Date(batch.production_time * 1000).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : new Date(batch.created_at * 1000).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{
      border: '2px solid #16a34a', borderRadius: 12, padding: '16px',
      background: 'white', fontFamily: 'sans-serif'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, borderBottom: '1px solid #e5e7eb', paddingBottom: 10 }}>
        <div style={{ background: '#16a34a', borderRadius: 6, width: 8, height: 28, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>{batch.product_name}</div>
          {batch.spec && <div style={{ fontSize: 12, color: '#6b7280' }}>{batch.spec}</div>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14 }}>
        <div style={{ flex: 1 }}>
          <LabelRow label="重量" value={batch.weight ? `${batch.weight}g` : '--'} />
          <LabelRow label="操作员" value={batch.operator} />
          <LabelRow label="生产时间" value={prodTime} />
          <LabelRow label="有效期至" value={expTime} highlight={isExpired} />
          {batch.location_name && <LabelRow label="地点" value={batch.location_name} />}
          {batch.notes && <LabelRow label="备注" value={batch.notes} />}
          <div style={{ marginTop: 10, fontSize: 10, color: '#9ca3af' }}>批次: {batch.id.slice(0, 8).toUpperCase()}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <QRCodeSVG value={traceUrl} size={90} level="M" includeMargin={false}
            fgColor="#111827" bgColor="white" />
          <div style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center' }}>扫码查看详情</div>
        </div>
      </div>

      {isExpired && (
        <div style={{ marginTop: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '6px 10px', color: '#dc2626', fontSize: 12, textAlign: 'center', fontWeight: 600 }}>
          ⚠️ 已过有效期
        </div>
      )}
    </div>
  );
}

interface LabelRowProps {
  label: string;
  value: string;
  highlight?: boolean;
}

function LabelRow({ label, value, highlight }: LabelRowProps) {
  return (
    <div style={{ marginBottom: 6 }}>
      <span style={{ fontSize: 11, color: '#9ca3af' }}>{label}：</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: highlight ? '#dc2626' : '#111827' }}>{value}</span>
    </div>
  );
}

interface InfoItemProps {
  icon: React.ElementType;
  label: string;
  value: string;
  highlight?: 'red' | 'green';
}

function InfoItem({ icon: Icon, label, value, highlight }: InfoItemProps) {
  const colors: Record<string, string> = { red: '#dc2626', green: '#16a34a' };
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div style={{ background: '#f3f4f6', borderRadius: 8, padding: 8, marginTop: 2, flexShrink: 0 }}>
        <Icon size={15} color="#6b7280" />
      </div>
      <div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 500, color: highlight ? colors[highlight] : '#111827' }}>{value}</div>
      </div>
    </div>
  );
}

const card: React.CSSProperties = {
  background: 'white', borderRadius: 16, padding: '20px',
  boxShadow: '0 1px 6px rgba(0,0,0,0.07)'
};
