import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Printer, CheckCircle, Clock, Video, AlertCircle, Package, Calendar, User, Weight, FileText, Activity, MapPin } from 'lucide-react';
import { getBatch, updateBatch, API_BASE_URL } from '../api';
import type { Batch, StatusConfig } from '../types';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

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
    <div className="flex justify-center items-center h-[400px] flex-col gap-3 text-muted-foreground">
      <div className="w-9 h-9 border-2 border-muted border-t-primary rounded-full animate-spin" />
      加载中...
    </div>
  );

  if (!batch) return null;

  const cfg = statusConfig[batch.status] || statusConfig.preparing;
  const isExpired = batch.expire_at ? batch.expire_at < now : false;
  const prodTime = batch.production_time ? new Date(batch.production_time * 1000).toLocaleString('zh-CN') : '--';
  const expTime = batch.expire_at ? new Date(batch.expire_at * 1000).toLocaleString('zh-CN') : '--';
  const createdTime = batch.created_at ? new Date(batch.created_at * 1000).toLocaleString('zh-CN') : '--';

  const statusVariant = (s: string) => s === 'preparing' ? 'warning' : s === 'recording' ? 'destructive' : s === 'printed' ? 'success' : 'secondary';

  return (
    <div className="p-7 max-w-[1000px]">
      {/* 顶部导航 */}
      <div className="no-print flex justify-between items-center mb-6">
        <Button variant="ghost" onClick={() => navigate('/batches')} className="gap-1.5 text-muted-foreground">
          <ArrowLeft size={18} /> 返回批次列表
        </Button>
        <Button onClick={handlePrint} disabled={printing} className="gap-2 bg-gradient-to-br from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 shadow-lg shadow-purple-500/25">
          <Printer size={17} /> {printing ? '打印中...' : '打印标签'}
        </Button>
      </div>

      <div className="grid grid-cols-[1fr_340px] gap-5">
        {/* 左侧：批次信息 */}
        <div className="flex flex-col gap-4">
          {/* 基本信息卡片 */}
          <Card className="p-5">
            <div className="flex justify-between items-start mb-5">
              <div>
                <h1 className="text-xl font-bold text-foreground mb-1">{batch.product_name}</h1>
                <div className="text-xs text-muted-foreground font-mono">批次ID: {batch.id}</div>
              </div>
              <Badge variant={statusVariant(batch.status)} className="text-sm px-3.5 py-1">{cfg.label}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              <InfoItem icon={User} label="操作员" value={batch.operator} />
              <InfoItem icon={Weight} label="重量" value={batch.weight ? `${batch.weight}g` : '未填写'} />
              <InfoItem icon={Package} label="规格" value={batch.spec || '未填写'} />
              <InfoItem icon={Calendar} label="生产时间" value={prodTime} />
              <InfoItem icon={Clock} label="有效期至" value={expTime} highlight={isExpired ? 'red' : batch.expire_at ? 'green' : undefined} />
              {batch.location_name && <InfoItem icon={MapPin} label="生产地点" value={batch.location_name} />}
              <InfoItem icon={Calendar} label="创建时间" value={createdTime} />
            </div>
            {batch.notes && (
              <div className="mt-3.5 bg-secondary/50 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><FileText size={12} /> 备注</div>
                <div className="text-sm text-foreground">{batch.notes}</div>
              </div>
            )}
            {isExpired && (
              <div className="mt-3.5 bg-destructive/5 border border-destructive/20 rounded-lg p-3 flex items-center gap-2 text-destructive text-xs">
                <AlertCircle size={16} /> 该产品已过有效期，请勿销售！
              </div>
            )}
          </Card>

          {/* 视频播放 */}
          {batch.video_url && (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3.5 font-semibold text-foreground">
                <Video size={18} className="text-purple-500" /> 生产过程视频
              </div>
              <video controls className="w-full rounded-xl max-h-[300px] bg-black"
                src={`${API_BASE_URL}${batch.video_url}`} />
            </Card>
          )}

          {/* 事件时间轴 */}
          {batch.events && batch.events.length > 0 && (
            <Card className="p-5 no-print">
              <div className="flex items-center gap-2 mb-4 font-semibold text-foreground">
                <Activity size={18} className="text-primary" /> 操作记录
              </div>
              <div className="relative">
                <div className="absolute left-[17px] top-0 bottom-0 w-0.5 bg-border" />
                {batch.events.map((ev, i) => {
                  const cfg = eventLabels[ev.event_type] || { label: ev.event_type, icon: Activity, color: '#6b7280' };
                  const Icon = cfg.icon;
                  return (
                    <div key={i} className="flex gap-3.5 mb-4 relative">
                      <div className="w-9 h-9 rounded-full bg-secondary border-2 border-border flex items-center justify-center shrink-0 z-[1]">
                        <Icon size={16} style={{ color: cfg.color }} />
                      </div>
                      <div className="pt-1.5">
                        <div className="font-medium text-sm text-foreground">{cfg.label}</div>
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
        </div>

        {/* 右侧：二维码标签 */}
        <div>
          <Card className="p-5 sticky top-5">
            <div className="no-print font-semibold text-sm text-foreground mb-4 flex items-center gap-2">
              <Printer size={18} className="text-purple-500" /> 打印标签预览
            </div>
            <div id="print-area" ref={printRef}>
              <PrintLabel batch={batch} traceUrl={traceUrl} isExpired={isExpired} />
            </div>
            <Button onClick={handlePrint} className="no-print w-full mt-3.5 gap-2 bg-gradient-to-br from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600">
              <Printer size={18} /> 打印此标签
            </Button>
            <div className="no-print text-xs text-muted-foreground text-center mt-2">
              消费者扫码后可查看生产视频和详情
            </div>
          </Card>
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
    <div className="border-2 border-primary rounded-xl p-4 bg-white font-sans">
      <div className="flex items-center gap-2 mb-3 border-b border-border pb-2.5">
        <div className="bg-primary rounded-md w-2 h-7 shrink-0" />
        <div>
          <div className="text-lg font-bold text-foreground leading-tight">{batch.product_name}</div>
          {batch.spec && <div className="text-xs text-muted-foreground">{batch.spec}</div>}
        </div>
      </div>

      <div className="flex gap-3.5">
        <div className="flex-1">
          <LabelRow label="重量" value={batch.weight ? `${batch.weight}g` : '--'} />
          <LabelRow label="操作员" value={batch.operator} />
          <LabelRow label="生产时间" value={prodTime} />
          <LabelRow label="有效期至" value={expTime} highlight={isExpired} />
          {batch.location_name && <LabelRow label="地点" value={batch.location_name} />}
          {batch.notes && <LabelRow label="备注" value={batch.notes} />}
          <div className="mt-2.5 text-[10px] text-muted-foreground">批次: {batch.id.slice(0, 8).toUpperCase()}</div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <QRCodeSVG value={traceUrl} size={90} level="M" includeMargin={false}
            fgColor="#111827" bgColor="white" />
          <div className="text-[10px] text-muted-foreground text-center">扫码查看详情</div>
        </div>
      </div>

      {isExpired && (
        <div className="mt-2.5 bg-destructive/5 border border-destructive/20 rounded-md p-1.5 text-destructive text-xs text-center font-semibold">
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
    <div className="mb-1.5">
      <span className="text-[11px] text-muted-foreground">{label}：</span>
      <span className={`text-[13px] font-medium ${highlight ? 'text-destructive' : 'text-foreground'}`}>{value}</span>
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
  const colorClass = highlight === 'red' ? 'text-destructive' : highlight === 'green' ? 'text-primary' : 'text-foreground';
  return (
    <div className="flex gap-2.5 items-start">
      <div className="bg-secondary rounded-lg p-2 mt-0.5 shrink-0">
        <Icon size={15} className="text-muted-foreground" />
      </div>
      <div>
        <div className="text-[11px] text-muted-foreground mb-0.5">{label}</div>
        <div className={`text-sm font-medium ${colorClass}`}>{value}</div>
      </div>
    </div>
  );
}
