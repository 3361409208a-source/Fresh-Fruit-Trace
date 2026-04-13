import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Circle, Square, CheckCircle2, User, Loader2 } from 'lucide-react';
import { createBatch, updateBatch, uploadVideo } from '../api';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';

const S = { IDLE: 'idle', RECORDING: 'recording', UPLOADING: 'uploading', DONE: 'done' } as const;
type Phase = typeof S[keyof typeof S];

const SHELF_PRESETS = [
  { h: 1,  label: '1小时' },
  { h: 6,  label: '6小时' },
  { h: 12, label: '12小时' },
  { h: 24, label: '1天' },
  { h: 48, label: '2天' },
];

function pad(n: number) { return String(n).padStart(2, '0'); }
function fmtTime(s: number) { return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; }

interface MediaRecorderExt extends MediaRecorder {
  _stopPromise?: Promise<void>;
}

export default function QuickRecord() {
  const [phase, setPhase]         = useState<Phase>(S.IDLE);
  const [operator, setOperator]   = useState(() => localStorage.getItem('qr_operator') || '操作员');
  const [editOp, setEditOp]       = useState(false);
  const [shelfH, setShelfH]       = useState(1);
  const [elapsed, setElapsed]     = useState(0);
  const [uploadPct, setUploadPct] = useState(0);
  const [batchId, setBatchId]     = useState<string | null>(null);
  const [traceUrl, setTraceUrl]   = useState('');
  const [expireAt, setExpireAt]   = useState<number | null>(null);
  const [error, setError]         = useState('');
  const [camDebug, setCamDebug]   = useState('');
  const [stream, setStream]       = useState<MediaStream | null>(null);
  const [hasCam, setHasCam]       = useState(true);

  const videoRef    = useRef<HTMLVideoElement>(null);
  const mrRef       = useRef<MediaRecorderExt | null>(null);
  const chunksRef   = useRef<Blob[]>([]);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const blobRef     = useRef<Blob | null>(null);

  useEffect(() => {
    let s: MediaStream | undefined;
    if (!navigator.mediaDevices?.getUserMedia) { setHasCam(false); return; }
    // Try multiple constraint levels for virtual camera compatibility
    const tryConfigs: MediaStreamConstraints[] = [
      { video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }, audio: true },
      { video: { width: { ideal: 640 }, height: { ideal: 480 } }, audio: true },
      { video: true, audio: true },
      { video: true },
    ];
    let idx = 0;
    function tryNext() {
      if (idx >= tryConfigs.length) { setHasCam(false); setCamDebug('所有摄像头配置均失败'); return; }
      setCamDebug(`尝试摄像头配置 #${idx + 1}...`);
      navigator.mediaDevices.getUserMedia(tryConfigs[idx])
        .then(st => { s = st; setStream(st); setCamDebug('摄像头已连接'); if (videoRef.current) { videoRef.current.srcObject = st; videoRef.current.play(); } })
        .catch((err) => { setCamDebug(`配置 #${idx + 1} 失败: ${err.name}`); idx++; tryNext(); });
    }
    tryNext();
    return () => { if (s) s.getTracks().forEach(t => t.stop()); };
  }, []);

  useEffect(() => {
    if (phase === S.RECORDING) { timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000); }
    else if (timerRef.current) { clearInterval(timerRef.current); }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  const saveOperator = (v: string) => { setOperator(v); localStorage.setItem('qr_operator', v); setEditOp(false); };

  const getLocation = useCallback((): Promise<{ latitude: number; longitude: number; location_name: string } | null> => {
    return new Promise(resolve => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          let location_name = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          try {
            const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=zh`);
            const data = await resp.json();
            if (data.display_name) location_name = data.display_name.split(',').slice(0, 3).join(', ');
          } catch {}
          resolve({ latitude, longitude, location_name });
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
      );
    });
  }, []);

  const handleStart = useCallback(async () => {
    if (!operator.trim()) { setOperator('操作员'); }
    setError('');
    const opName = operator.trim() || '操作员';
    try {
      const res = await createBatch({ product_name: '鲜切水果', operator: opName });
      const id = res.data!.id;
      setBatchId(id);
      await updateBatch(id, { status: 'recording' });
      getLocation().then(loc => { if (loc && id) updateBatch(id, { latitude: loc.latitude, longitude: loc.longitude, location_name: loc.location_name }).catch(() => {}); });
      const tracks = stream ? stream.getTracks() : [];
      if (tracks.length > 0 && stream) {
        chunksRef.current = [];
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const MIME_TYPES = isIOS ? ['video/mp4', ''] : ['video/webm;codecs=vp9', 'video/webm', 'video/mp4', ''];
        const mime = MIME_TYPES.find(t => t === '' || MediaRecorder.isTypeSupported(t));
        let mr: MediaRecorderExt;
        try { mr = new MediaRecorder(stream, mime ? { mimeType: mime } : {}) as MediaRecorderExt; }
        catch { mr = new MediaRecorder(stream) as MediaRecorderExt; }
        mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        mrRef.current = mr;
        mrRef.current._stopPromise = new Promise(resolve => {
          mr.onstop = () => {
            const actualMime = mr.mimeType || 'video/mp4';
            blobRef.current = new Blob(chunksRef.current, { type: isIOS && actualMime.includes('mp4') ? 'video/mp4' : actualMime });
            resolve();
          };
        });
        mr.start(500);
      } else { mrRef.current = null; blobRef.current = null; }
      setElapsed(0); setPhase(S.RECORDING);
    } catch (err) { setError('创建失败：' + (err as Error).message); }
  }, [operator, stream, getLocation]);

  const handleStop = useCallback(async () => {
    if (mrRef.current && mrRef.current.state !== 'inactive') {
      try { mrRef.current.requestData(); } catch (e) {}
      await new Promise(r => setTimeout(r, 100));
      mrRef.current.stop(); await mrRef.current._stopPromise;
    }
    let wait = 0;
    while (!blobRef.current && wait < 3000) { await new Promise(r => setTimeout(r, 100)); wait += 100; }
    const now = Math.floor(Date.now() / 1000);
    const exp = now + shelfH * 3600;
    if (!batchId) return;
    await updateBatch(batchId, { status: 'done', expire_at: exp, production_time: now });
    setExpireAt(exp);
    const lanHost = process.env.REACT_APP_LAN_HOST || window.location.hostname;
    setTraceUrl(`${window.location.protocol}//${lanHost}:${window.location.port}/trace/${batchId}`);
    setPhase(S.DONE); setUploadPct(0);
    if (blobRef.current && blobRef.current.size > 0) {
      uploadVideo(batchId, blobRef.current, setUploadPct)
        .then(() => { setUploadPct(100); })
        .catch(err => { setError('视频上传失败：' + (err as Error).message + '（可稍后重试）'); });
    }
  }, [batchId, shelfH]);

  useEffect(() => {
    if (phase !== S.DONE) return;
    const timer = setTimeout(() => {
      if (batchId) updateBatch(batchId, { status: 'printed' }).catch(() => {});
      window.print();
      setTimeout(() => {
        setBatchId(null); setTraceUrl(''); setExpireAt(null);
        setElapsed(0); setUploadPct(0); setError('');
        blobRef.current = null; setPhase(S.IDLE);
      }, 500);
    }, 600);
    return () => clearTimeout(timer);
  }, [phase, batchId]);

  const expStr = expireAt
    ? new Date(expireAt * 1000).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── 顶栏 ── */}
      <header className="no-print flex items-center justify-between px-3 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <span className="text-lg">🍓</span>
          <span className="font-bold text-sm tracking-tight">快速记录</span>
        </div>
        {editOp ? (
          <OperatorInput value={operator} onSave={saveOperator} onCancel={() => setEditOp(false)} />
        ) : (
          <button onClick={() => setEditOp(true)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-secondary">
            <User size={12} /> {operator}
          </button>
        )}
      </header>

      {/* ── 摄像头画面 ── */}
      <div className="no-print relative flex-1 min-h-[180px] bg-black overflow-hidden">
        <video ref={videoRef} autoPlay muted playsInline className={cn('w-full h-full object-cover', !hasCam && 'hidden')} />
        {!hasCam && (
          <div className="w-full h-full min-h-[180px] flex flex-col items-center justify-center bg-card gap-2">
            <span className="text-3xl">📷</span>
            <p className="text-xs text-muted-foreground">摄像头不可用，仍可记录时间</p>
            {camDebug && <p className="text-[10px] text-muted-foreground/60">{camDebug}</p>}
            <button
              onClick={async () => {
                setHasCam(true);
                setCamDebug('手动请求摄像头...');
                try {
                  const s = await navigator.mediaDevices.getUserMedia({ video: true });
                  setStream(s);
                  setCamDebug('摄像头已连接');
                  if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play(); }
                } catch (err: any) {
                  setHasCam(false);
                  setCamDebug(`手动请求失败: ${err.name} - ${err.message}`);
                }
              }}
              className="mt-2 px-4 py-1.5 bg-[#1d1d1f] text-white text-xs font-medium rounded-lg hover:bg-[#333] transition-colors"
            >
              重新请求摄像头权限
            </button>
          </div>
        )}
        {phase === S.RECORDING && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1">
            <Circle size={8} className="fill-red-500 text-red-500 animate-pulse-dot" />
            <span className="text-white text-sm font-bold tabular-nums">{fmtTime(elapsed)}</span>
          </div>
        )}
        {uploadPct > 0 && uploadPct < 100 && (
          <div className="absolute bottom-0 inset-x-0 bg-black/70 backdrop-blur-sm px-3 py-1.5 flex items-center gap-2">
            <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${uploadPct}%` }} />
            </div>
            <span className="text-white text-xs font-semibold whitespace-nowrap">上传中 {uploadPct}%</span>
          </div>
        )}
      </div>

      {/* ── 主操作区 ── */}
      <div className="no-print bg-card px-3 py-3 flex flex-col items-center gap-2.5 border-t border-border">
        {error && (
          <div className="w-full bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-3 py-2 text-xs text-center">
            {error}
          </div>
        )}

        {phase === S.IDLE && (
          <>
            <div className="flex gap-1.5 flex-wrap justify-center">
              {SHELF_PRESETS.map(p => (
                <button
                  key={p.h}
                  onClick={() => setShelfH(p.h)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border',
                    shelfH === p.h
                      ? 'border-primary bg-primary/15 text-primary font-semibold'
                      : 'border-border bg-secondary/50 text-muted-foreground hover:bg-secondary'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <Button onClick={handleStart} size="lg" className="w-full h-14 text-lg font-extrabold gap-2 shadow-lg shadow-primary/25">
              <Circle size={20} className="fill-white" /> 开始记录
            </Button>
          </>
        )}

        {phase === S.RECORDING && (
          <Button onClick={handleStop} variant="destructive" size="lg" className="w-full h-14 text-lg font-extrabold gap-2 shadow-lg shadow-destructive/25 animate-pulse-dot">
            <Square size={18} className="fill-white" /> 完成记录
          </Button>
        )}

        {phase === S.DONE && (
          <div className="flex flex-col items-center gap-2 py-2">
            <CheckCircle2 size={32} className="text-primary" />
            <div className="text-primary font-bold text-lg">记录完成，正在打印...</div>
            <div className="text-muted-foreground text-xs">有效期至 {expStr}（{shelfH}小时）</div>
          </div>
        )}
      </div>

      {/* ── 打印区域 ── */}
      {phase === S.DONE && (
        <div id="print-area" className="absolute -left-[9999px] top-0 invisible">
          <PrintLabel traceUrl={traceUrl} operator={operator} expStr={expStr} shelfH={shelfH} batchId={batchId} />
        </div>
      )}
    </div>
  );
}

function OperatorInput({ value, onSave, onCancel }: { value: string; onSave: (v: string) => void; onCancel: () => void }) {
  const [v, setV] = useState(value);
  return (
    <div className="flex items-center gap-1.5">
      <input
        autoFocus value={v} onChange={e => setV(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onSave(v); if (e.key === 'Escape') onCancel(); }}
        placeholder="输入姓名"
        className="bg-secondary text-foreground border border-primary rounded-md px-2 py-1 text-xs outline-none w-24 focus:ring-1 focus:ring-primary"
      />
      <button onClick={() => onSave(v)} className="bg-primary text-primary-foreground rounded-md px-2 py-1 text-xs font-bold hover:bg-primary/90 transition-colors">✓</button>
      <button onClick={onCancel} className="bg-secondary text-muted-foreground rounded-md px-2 py-1 text-xs hover:bg-secondary/80 transition-colors">✕</button>
    </div>
  );
}

function PrintLabel({ traceUrl, operator, expStr, shelfH, batchId }: {
  traceUrl: string; operator: string; expStr: string; shelfH: number; batchId: string | null;
}) {
  const now = new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  return (
    <>
      <style>{`@media print { @page { size: 80mm 50mm; margin: 0; } }`}</style>
      <div style={{
        width: '80mm', height: '50mm', padding: '2mm 3mm',
        border: '1px solid #16a34a', borderRadius: 3,
        fontFamily: 'sans-serif', background: 'white',
        display: 'flex', flexDirection: 'row', alignItems: 'center',
        gap: '2mm', boxSizing: 'border-box',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: '10pt', color: '#15803d', marginBottom: '1mm' }}>🍓 鲜切水果</div>
          <div style={{ fontSize: '7pt', marginBottom: '0.8mm' }}><b>操作员：</b>{operator}</div>
          <div style={{ fontSize: '7pt', marginBottom: '0.8mm' }}><b>生产：</b>{now}</div>
          <div style={{ fontSize: '7pt', color: '#dc2626', marginBottom: '0.8mm' }}><b>效期：</b>{expStr}</div>
          <div style={{ fontSize: '6pt', color: '#9ca3af' }}>{batchId && batchId.slice(0, 8).toUpperCase()}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
          <QRCodeSVG value={traceUrl} size={60} level="M" bgColor="white" fgColor="#111" />
          <div style={{ fontSize: '5.5pt', color: '#6b7280', marginTop: '0.5mm' }}>扫码溯源</div>
        </div>
      </div>
    </>
  );
}
