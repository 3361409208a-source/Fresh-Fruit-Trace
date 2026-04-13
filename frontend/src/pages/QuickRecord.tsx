import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { createBatch, updateBatch, uploadVideo } from '../api';

// ─── 状态枚举 ────────────────────────────────────────────────────────────────
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

// Extended MediaRecorder to hold stop promise
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
  const [stream, setStream]       = useState<MediaStream | null>(null);
  const [hasCam, setHasCam]       = useState(true);

  const videoRef    = useRef<HTMLVideoElement>(null);
  const mrRef       = useRef<MediaRecorderExt | null>(null);
  const chunksRef   = useRef<Blob[]>([]);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const blobRef     = useRef<Blob | null>(null);

  // 摄像头预览（常开）
  useEffect(() => {
    let s: MediaStream | undefined;
    if (!navigator.mediaDevices?.getUserMedia) { setHasCam(false); return; }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }, audio: true })
      .then(st => {
        s = st; setStream(st);
        if (videoRef.current) { videoRef.current.srcObject = st; videoRef.current.play(); }
      })
      .catch(() => setHasCam(false));
    return () => { if (s) s.getTracks().forEach(t => t.stop()); };
  }, []);

  // 计时器
  useEffect(() => {
    if (phase === S.RECORDING) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  const saveOperator = (v: string) => {
    setOperator(v);
    localStorage.setItem('qr_operator', v);
    setEditOp(false);
  };

  // ── 获取定位 ──────────────────────────────────────────────────────────────
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

  // ── 开始 ──────────────────────────────────────────────────────────────────
  const handleStart = useCallback(async () => {
    if (!operator.trim()) { setOperator('操作员'); }
    setError('');
    const opName = operator.trim() || '操作员';
    try {
      const res = await createBatch({
        product_name: '鲜切水果',
        operator: opName,
      });
      const id = res.data!.id;
      setBatchId(id);
      await updateBatch(id, { status: 'recording' });

      // 定位在后台异步获取，不阻塞流程
      getLocation().then(loc => {
        if (loc && id) updateBatch(id, { latitude: loc.latitude, longitude: loc.longitude, location_name: loc.location_name }).catch(() => {});
      });

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
      } else {
        mrRef.current = null; blobRef.current = null;
      }
      setElapsed(0);
      setPhase(S.RECORDING);
    } catch (err) { setError('创建失败：' + (err as Error).message); }
  }, [operator, stream, getLocation]);

  // ── 停止并完成 ────────────────────────────────────────────────────────────
  const handleStop = useCallback(async () => {
    if (mrRef.current && mrRef.current.state !== 'inactive') {
      try { mrRef.current.requestData(); } catch (e) {}
      await new Promise(r => setTimeout(r, 100));
      mrRef.current.stop();
      await mrRef.current._stopPromise;
    }
    let wait = 0;
    while (!blobRef.current && wait < 3000) {
      await new Promise(r => setTimeout(r, 100));
      wait += 100;
    }

    const now = Math.floor(Date.now() / 1000);
    const exp = now + shelfH * 3600;
    if (!batchId) return;
    await updateBatch(batchId, { status: 'done', expire_at: exp, production_time: now });
    setExpireAt(exp);
    const lanHost = process.env.REACT_APP_LAN_HOST || window.location.hostname;
    setTraceUrl(`${window.location.protocol}//${lanHost}:${window.location.port}/trace/${batchId}`);
    setPhase(S.DONE);
    setUploadPct(0);

    if (blobRef.current && blobRef.current.size > 0) {
      uploadVideo(batchId, blobRef.current, setUploadPct)
        .then(() => {
          setUploadPct(100);
          console.log('[DEBUG] Video upload complete for batch:', batchId);
        })
        .catch(err => {
          console.error('[DEBUG] Video upload failed:', err);
          setError('视频上传失败：' + (err as Error).message + '（可稍后重试）');
        });
    }
  }, [batchId, shelfH]);

  // ── 自动打印+重置 ──────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== S.DONE) return;
    // 等待打印区域渲染后自动打印，然后重置
    const timer = setTimeout(() => {
      if (batchId) updateBatch(batchId, { status: 'printed' }).catch(() => {});
      window.print();
      // 打印对话框关闭后自动重置
      setTimeout(() => {
        setBatchId(null); setTraceUrl(''); setExpireAt(null);
        setElapsed(0); setUploadPct(0); setError('');
        blobRef.current = null;
        setPhase(S.IDLE);
      }, 500);
    }, 600);
    return () => clearTimeout(timer);
  }, [phase, batchId]);


  const expStr = expireAt
    ? new Date(expireAt * 1000).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '';

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={styles.root}>
      {/* ── 顶栏 ── */}
      <div style={styles.topBar} className="no-print">
        <div style={styles.logo}>🍓 快速记录</div>

        {editOp ? (
          <OperatorInput
            value={operator}
            onSave={saveOperator}
            onCancel={() => setEditOp(false)}
          />
        ) : (
          <button style={styles.opBtn} onClick={() => setEditOp(true)}>
            👤 {operator || '点击设置姓名'}
          </button>
        )}
      </div>

      {/* ── 摄像头画面 ── */}
      <div style={styles.videoWrap} className="no-print">
        <video ref={videoRef} autoPlay muted playsInline
          style={{ ...styles.video, display: hasCam ? 'block' : 'none' }} />
        {!hasCam && (
          <div style={styles.noCam}>
            <span style={{ fontSize: 32 }}>📷</span>
            <div style={{ marginTop: 6, color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>摄像头不可用，仍可记录时间</div>
          </div>
        )}
        {phase === S.RECORDING && (
          <div style={styles.recOverlay}>
            <span style={styles.recDot} />
            <span style={styles.recTime}>{fmtTime(elapsed)}</span>
          </div>
        )}
        {uploadPct > 0 && uploadPct < 100 && (
          <div style={styles.uploadBarBottom}>
            <div style={styles.uploadBarTrack}>
              <div style={{ ...styles.uploadBarFill, width: `${uploadPct}%` }} />
            </div>
            <span style={styles.uploadBarText}>上传中 {uploadPct}%</span>
          </div>
        )}
      </div>

      {/* ── 主操作区 ── */}
      <div style={styles.controls} className="no-print">
        {error && (
          <div style={styles.errorBox}>{error}</div>
        )}

        {phase === S.IDLE && (
          <>
            <div style={styles.shelfRow}>
              {SHELF_PRESETS.map(p => (
                <button
                  key={p.h}
                  onClick={() => setShelfH(p.h)}
                  style={{ ...styles.shelfBtn, ...(shelfH === p.h ? styles.shelfBtnActive : {}) }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button onClick={handleStart} style={styles.bigGreen}>
              <span style={styles.bigIcon}>▶</span>
              开始记录
            </button>
          </>
        )}

        {phase === S.RECORDING && (
          <button onClick={handleStop} style={styles.bigRed} className="record-btn-active">
            <span style={styles.bigIcon}>■</span>
            完成记录
          </button>
        )}

        {phase === S.DONE && (
          <div style={styles.donePanel}>
            <div style={styles.doneTop}>
              <span style={{ fontSize: 36 }}>✅</span>
              <div style={styles.doneTxt}>记录完成，正在打印...</div>
              <div style={styles.doneExp}>有效期至 {expStr}（{shelfH}小时）</div>
            </div>
          </div>
        )}
      </div>

      {/* ── 打印区域 ── */}
      {phase === S.DONE && (
        <div id="print-area" style={styles.printArea}>
          <PrintLabel
            traceUrl={traceUrl}
            operator={operator}
            expStr={expStr}
            shelfH={shelfH}
            batchId={batchId}
          />
        </div>
      )}
    </div>
  );
}

// ─── 操作员输入 ───────────────────────────────────────────────────────────────
function OperatorInput({ value, onSave, onCancel }: { value: string; onSave: (v: string) => void; onCancel: () => void }) {
  const [v, setV] = useState(value);
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input
        autoFocus
        value={v}
        onChange={e => setV(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onSave(v); if (e.key === 'Escape') onCancel(); }}
        placeholder="输入姓名"
        style={styles.opInput}
      />
      <button onClick={() => onSave(v)} style={styles.opSave}>✓</button>
      <button onClick={onCancel} style={styles.opCancel}>✕</button>
    </div>
  );
}

// ─── 打印标签 ─────────────────────────────────────────────────────────────────
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

// ─── 样式 ─────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh', background: '#0f1117',
    display: 'flex', flexDirection: 'column',
    fontFamily: 'Inter, -apple-system, sans-serif',
  },
  topBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 12px', background: '#1a1d27',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  logo: { color: 'white', fontWeight: 800, fontSize: 15, letterSpacing: '-0.5px' },
  opBtn: {
    background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6,
    padding: '5px 10px', fontSize: 12, cursor: 'pointer',
  },
  opInput: {
    background: '#2a2d3a', color: 'white', border: '1.5px solid #22c55e',
    borderRadius: 6, padding: '5px 10px', fontSize: 13, outline: 'none', width: 120,
  },
  opSave: { background: '#22c55e', color: 'white', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontWeight: 700, fontSize: 13 },
  opCancel: { background: '#374151', color: 'white', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 13 },

  videoWrap: {
    flex: 1, position: 'relative', background: '#000', minHeight: 180,
    overflow: 'hidden',
  },
  video: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  noCam: {
    width: '100%', height: '100%', minHeight: 180,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    background: '#1a1d27',
  },
  recOverlay: {
    position: 'absolute', top: 8, left: 8,
    display: 'flex', alignItems: 'center', gap: 6,
    background: 'rgba(0,0,0,0.65)', borderRadius: 14, padding: '4px 10px',
    backdropFilter: 'blur(4px)',
  },
  recDot: {
    width: 8, height: 8, borderRadius: '50%', background: '#ef4444',
    display: 'inline-block', animation: 'pulse 1s infinite',
  },
  recTime: { color: 'white', fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' },
  uploadBarBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
    padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8,
  },
  uploadBarTrack: { flex: 1, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 8, overflow: 'hidden' },
  uploadBarFill: { height: '100%', background: '#22c55e', borderRadius: 8, transition: 'width 0.3s' },
  uploadBarText: { color: 'white', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' },

  controls: {
    background: '#1a1d27', padding: '12px 12px 16px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
  },
  errorBox: {
    background: '#450a0a', border: '1px solid #dc2626', borderRadius: 8,
    color: '#fca5a5', padding: '8px 12px', fontSize: 12, width: '100%', textAlign: 'center',
  },
  shelfRow: { display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' },
  shelfBtn: {
    padding: '6px 12px', borderRadius: 8,
    border: '1.5px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)',
    fontSize: 13, cursor: 'pointer', fontWeight: 500,
  },
  shelfBtnActive: {
    border: '1.5px solid #22c55e', background: 'rgba(34,197,94,0.15)',
    color: '#4ade80', fontWeight: 700,
  },
  bigGreen: {
    width: '100%', padding: '16px 0', fontSize: 20, fontWeight: 800,
    background: 'linear-gradient(135deg, #16a34a, #22c55e)',
    color: 'white', border: 'none', borderRadius: 14, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    boxShadow: '0 6px 24px rgba(22,163,74,0.45)', letterSpacing: '-0.5px',
  },
  bigRed: {
    width: '100%', padding: '16px 0', fontSize: 20, fontWeight: 800,
    background: 'linear-gradient(135deg, #dc2626, #ef4444)',
    color: 'white', border: 'none', borderRadius: 14, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    boxShadow: '0 6px 24px rgba(239,68,68,0.45)', letterSpacing: '-0.5px',
  },
  bigIcon: { fontSize: 22 },

  donePanel: {
    width: '100%',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
  },
  doneTop: { textAlign: 'center' },
  doneTxt: { color: '#4ade80', fontWeight: 800, fontSize: 20, marginTop: 2 },
  doneExp: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },

  printArea: { position: 'absolute', left: '-9999px', top: 0, visibility: 'hidden' },
};
