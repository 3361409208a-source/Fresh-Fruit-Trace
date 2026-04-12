import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { createBatch, updateBatch, uploadVideo } from '../api';

// ─── 状态枚举 ────────────────────────────────────────────────────────────────
const S = { IDLE: 'idle', RECORDING: 'recording', UPLOADING: 'uploading', DONE: 'done' };

const SHELF_PRESETS = [
  { h: 6,  label: '6小时' },
  { h: 12, label: '12小时' },
  { h: 24, label: '1天' },
  { h: 48, label: '2天' },
  { h: 72, label: '3天' },
];

function pad(n) { return String(n).padStart(2, '0'); }
function fmtTime(s) { return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; }

export default function QuickRecord() {
  const [phase, setPhase]         = useState(S.IDLE);
  const [operator, setOperator]   = useState(() => localStorage.getItem('qr_operator') || '');
  const [editOp, setEditOp]       = useState(false);
  const [shelfH, setShelfH]       = useState(24);
  const [elapsed, setElapsed]     = useState(0);
  const [uploadPct, setUploadPct] = useState(0);
  const [batchId, setBatchId]     = useState(null);
  const [traceUrl, setTraceUrl]   = useState('');
  const [expireAt, setExpireAt]   = useState(null);
  const [error, setError]         = useState('');
  const [stream, setStream]       = useState(null);
  const [hasCam, setHasCam]       = useState(true);

  const videoRef    = useRef(null);
  const mrRef       = useRef(null);
  const chunksRef   = useRef([]);
  const timerRef    = useRef(null);
  const blobRef     = useRef(null);

  // 摄像头预览（仅 HTTPS/localhost 下可用 navigator.mediaDevices）
  useEffect(() => {
    let s;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasCam(false);
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: true })
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
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const saveOperator = (v) => {
    setOperator(v);
    localStorage.setItem('qr_operator', v);
    setEditOp(false);
  };

  // ── 开始 ──────────────────────────────────────────────────────────────────
  const handleStart = useCallback(async () => {
    if (!operator.trim()) { setEditOp(true); return; }
    setError('');
    try {
      const res = await createBatch({ product_name: '鲜切水果', operator: operator.trim() });
      const id = res.data.id;
      setBatchId(id);
      await updateBatch(id, { status: 'recording' });

      // 只有在 stream 有真实轨道时才启动录制，否则仅计时
      const tracks = stream ? stream.getTracks() : [];
      if (tracks.length > 0) {
        chunksRef.current = [];
        const MIME_TYPES = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm', ''];
        const mime = MIME_TYPES.find(t => t === '' || MediaRecorder.isTypeSupported(t));
        let mr;
        try {
          const mrOpts = mime ? { mimeType: mime } : {};
          mr = new MediaRecorder(stream, mrOpts);
        } catch (e) {
          mr = new MediaRecorder(stream);
        }
        mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        mr.onstop = () => { blobRef.current = new Blob(chunksRef.current, { type: mr.mimeType || 'video/mp4' }); };
        mr.start(1000);
        mrRef.current = mr;
      } else {
        mrRef.current = null;
        blobRef.current = null;
      }

      setElapsed(0);
      setPhase(S.RECORDING);
    } catch (err) { setError('创建失败：' + err.message); }
  }, [operator, stream]);

  // ── 停止并完成 ────────────────────────────────────────────────────────────
  const handleStop = useCallback(async () => {
    setPhase(S.UPLOADING);
    setUploadPct(0);

    // 停止录制器（若存在）
    if (mrRef.current && mrRef.current.state !== 'inactive') {
      mrRef.current.stop();
      // 等待 onstop 回调写入 blobRef
      await new Promise(r => setTimeout(r, 1500));
    }

    await updateBatch(batchId, { status: 'done' });

    try {
      if (blobRef.current && blobRef.current.size > 0) {
        await uploadVideo(batchId, blobRef.current, setUploadPct);
      }
      const now = Math.floor(Date.now() / 1000);
      const exp = now + shelfH * 3600;
      await updateBatch(batchId, { expire_at: exp, production_time: now });
      setExpireAt(exp);
      setTraceUrl(`${window.location.origin}/trace/${batchId}`);
      setPhase(S.DONE);
    } catch (err) { setError('上传失败：' + err.message); setPhase(S.RECORDING); }
  }, [batchId, shelfH]);

  // ── 重置，准备下一个 ──────────────────────────────────────────────────────
  const handleReset = () => {
    setBatchId(null); setTraceUrl(''); setExpireAt(null);
    setElapsed(0); setUploadPct(0); setError('');
    blobRef.current = null;
    setPhase(S.IDLE);
  };

  const handlePrint = async () => {
    if (batchId) await updateBatch(batchId, { status: 'printed' }).catch(() => {});
    window.print();
  };

  const expStr = expireAt
    ? new Date(expireAt * 1000).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '';

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={styles.root}>
      {/* ── 顶栏 ── */}
      <div style={styles.topBar} className="no-print">
        <div style={styles.logo}>🍓 快速记录</div>

        {/* 操作员 */}
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
        <video
          ref={videoRef}
          autoPlay muted playsInline
          style={{ ...styles.video, display: hasCam ? 'block' : 'none' }}
        />
        {!hasCam && (
          <div style={styles.noCam}>
            <span style={{ fontSize: 48 }}>📷</span>
            <div style={{ marginTop: 8, color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>摄像头不可用，仍可记录时间</div>
          </div>
        )}

        {/* 录制中叠加 */}
        {phase === S.RECORDING && (
          <div style={styles.recOverlay}>
            <span style={styles.recDot} />
            <span style={styles.recTime}>{fmtTime(elapsed)}</span>
          </div>
        )}

        {/* 上传中遮罩 */}
        {phase === S.UPLOADING && (
          <div style={styles.uploadMask}>
            <div style={styles.uploadSpinner} />
            <div style={{ color: 'white', marginTop: 16, fontSize: 18, fontWeight: 700 }}>
              上传中 {uploadPct}%
            </div>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${uploadPct}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* ── 主操作区 ── */}
      <div style={styles.controls} className="no-print">
        {/* 错误提示 */}
        {error && (
          <div style={styles.errorBox}>{error}</div>
        )}

        {/* IDLE：显示保质时长选择 + 开始按钮 */}
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

        {/* RECORDING：停止按钮 */}
        {phase === S.RECORDING && (
          <button onClick={handleStop} style={styles.bigRed} className="record-btn-active">
            <span style={styles.bigIcon}>■</span>
            完成记录
          </button>
        )}

        {/* UPLOADING：禁用状态 */}
        {phase === S.UPLOADING && (
          <button style={{ ...styles.bigGray }} disabled>
            <span style={{ fontSize: 32 }}>⏳</span>
            正在保存...
          </button>
        )}

        {/* DONE：显示二维码 + 打印 + 下一个 */}
        {phase === S.DONE && (
          <DonePanel
            traceUrl={traceUrl}
            expStr={expStr}
            shelfH={shelfH}
            operator={operator}
            onPrint={handlePrint}
            onNext={handleReset}
          />
        )}
      </div>

      {/* ── 打印区域（仅打印时可见） ── */}
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
function OperatorInput({ value, onSave, onCancel }) {
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

// ─── 完成面板 ─────────────────────────────────────────────────────────────────
function DonePanel({ traceUrl, expStr, shelfH, operator, onPrint, onNext }) {
  return (
    <div style={styles.donePanel}>
      <div style={styles.doneTop}>
        <span style={{ fontSize: 36 }}>✅</span>
        <div style={styles.doneTxt}>记录完成！</div>
        <div style={styles.doneExp}>有效期至 {expStr}（{shelfH}小时）</div>
      </div>

      <div style={styles.qrBox}>
        <QRCodeSVG value={traceUrl} size={140} level="M" bgColor="white" fgColor="#111" />
        <div style={styles.qrSub}>消费者扫码查看全程</div>
      </div>

      <div style={styles.doneActions}>
        <button onClick={onPrint} style={styles.printBtn}>🖨️ 打印标签</button>
        <button onClick={onNext}  style={styles.nextBtn}>➕ 下一个</button>
      </div>
    </div>
  );
}

// ─── 打印标签 ─────────────────────────────────────────────────────────────────
function PrintLabel({ traceUrl, operator, expStr, shelfH, batchId }) {
  const now = new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  return (
    <>
      {/* @page 限制纸张为标签尺寸 */}
      <style>{`@media print { @page { size: 80mm 50mm; margin: 0; } }`}</style>
      <div style={{
        width: '80mm', height: '50mm', padding: '2mm 3mm',
        border: '1px solid #16a34a', borderRadius: 3,
        fontFamily: 'sans-serif', background: 'white',
        display: 'flex', flexDirection: 'row', alignItems: 'center',
        gap: '2mm', boxSizing: 'border-box',
      }}>
        {/* 左侧文字 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: '10pt', color: '#15803d', marginBottom: '1mm' }}>🍓 鲜切水果</div>
          <div style={{ fontSize: '7pt', marginBottom: '0.8mm' }}><b>操作员：</b>{operator}</div>
          <div style={{ fontSize: '7pt', marginBottom: '0.8mm' }}><b>生产：</b>{now}</div>
          <div style={{ fontSize: '7pt', color: '#dc2626', marginBottom: '0.8mm' }}><b>效期：</b>{expStr}</div>
          <div style={{ fontSize: '6pt', color: '#9ca3af' }}>{batchId && batchId.slice(0, 8).toUpperCase()}</div>
        </div>
        {/* 右侧二维码 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
          <QRCodeSVG value={traceUrl} size={60} level="M" bgColor="white" fgColor="#111" />
          <div style={{ fontSize: '5.5pt', color: '#6b7280', marginTop: '0.5mm' }}>扫码溯源</div>
        </div>
      </div>
    </>
  );
}

// ─── 样式 ─────────────────────────────────────────────────────────────────────
const styles = {
  root: {
    minHeight: '100vh', background: '#0f1117',
    display: 'flex', flexDirection: 'column',
    fontFamily: 'Inter, -apple-system, sans-serif',
  },
  topBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 20px', background: '#1a1d27',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  logo: { color: 'white', fontWeight: 800, fontSize: 18, letterSpacing: '-0.5px' },
  opBtn: {
    background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
    padding: '8px 16px', fontSize: 14, cursor: 'pointer',
  },
  opInput: {
    background: '#2a2d3a', color: 'white', border: '1.5px solid #22c55e',
    borderRadius: 8, padding: '8px 14px', fontSize: 14, outline: 'none', width: 160,
  },
  opSave: { background: '#22c55e', color: 'white', border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontWeight: 700 },
  opCancel: { background: '#374151', color: 'white', border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' },

  videoWrap: {
    flex: 1, position: 'relative', background: '#000', minHeight: 240,
    overflow: 'hidden',
  },
  video: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  noCam: {
    width: '100%', height: '100%', minHeight: 240,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    background: '#1a1d27',
  },
  recOverlay: {
    position: 'absolute', top: 16, left: 16,
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'rgba(0,0,0,0.65)', borderRadius: 20, padding: '6px 16px',
    backdropFilter: 'blur(4px)',
  },
  recDot: {
    width: 12, height: 12, borderRadius: '50%', background: '#ef4444',
    display: 'inline-block', animation: 'pulse 1s infinite',
  },
  recTime: { color: 'white', fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums' },
  uploadMask: {
    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  },
  uploadSpinner: {
    width: 48, height: 48, border: '4px solid rgba(255,255,255,0.2)',
    borderTopColor: '#22c55e', borderRadius: '50%', animation: 'spin 1s linear infinite',
  },
  progressBar: { width: 220, height: 8, background: 'rgba(255,255,255,0.15)', borderRadius: 20, marginTop: 14, overflow: 'hidden' },
  progressFill: { height: '100%', background: '#22c55e', borderRadius: 20, transition: 'width 0.3s' },

  controls: {
    background: '#1a1d27', padding: '20px 20px 28px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
  },
  errorBox: {
    background: '#450a0a', border: '1px solid #dc2626', borderRadius: 10,
    color: '#fca5a5', padding: '10px 16px', fontSize: 14, width: '100%', maxWidth: 480, textAlign: 'center',
  },
  shelfRow: { display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  shelfBtn: {
    padding: '10px 18px', borderRadius: 12,
    border: '1.5px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)',
    fontSize: 15, cursor: 'pointer', fontWeight: 500,
  },
  shelfBtnActive: {
    border: '1.5px solid #22c55e', background: 'rgba(34,197,94,0.15)',
    color: '#4ade80', fontWeight: 700,
  },
  bigGreen: {
    width: '100%', maxWidth: 480, padding: '22px 0', fontSize: 26, fontWeight: 800,
    background: 'linear-gradient(135deg, #16a34a, #22c55e)',
    color: 'white', border: 'none', borderRadius: 18, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
    boxShadow: '0 8px 32px rgba(22,163,74,0.45)', letterSpacing: '-0.5px',
  },
  bigRed: {
    width: '100%', maxWidth: 480, padding: '22px 0', fontSize: 26, fontWeight: 800,
    background: 'linear-gradient(135deg, #dc2626, #ef4444)',
    color: 'white', border: 'none', borderRadius: 18, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
    boxShadow: '0 8px 32px rgba(239,68,68,0.45)', letterSpacing: '-0.5px',
  },
  bigGray: {
    width: '100%', maxWidth: 480, padding: '22px 0', fontSize: 22, fontWeight: 700,
    background: '#374151', color: '#9ca3af', border: 'none', borderRadius: 18,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  bigIcon: { fontSize: 28 },

  donePanel: {
    width: '100%', maxWidth: 480,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
  },
  doneTop: { textAlign: 'center' },
  doneTxt: { color: '#4ade80', fontWeight: 800, fontSize: 26, marginTop: 4 },
  doneExp: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 4 },
  qrBox: {
    background: 'white', borderRadius: 16, padding: '16px 20px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
  },
  qrSub: { color: '#6b7280', fontSize: 12 },
  doneActions: { display: 'flex', gap: 14, width: '100%' },
  printBtn: {
    flex: 1, padding: '16px 0', fontSize: 18, fontWeight: 700,
    background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)', color: 'white',
    border: 'none', borderRadius: 14, cursor: 'pointer',
  },
  nextBtn: {
    flex: 1, padding: '16px 0', fontSize: 18, fontWeight: 700,
    background: 'linear-gradient(135deg, #16a34a, #22c55e)', color: 'white',
    border: 'none', borderRadius: 14, cursor: 'pointer',
  },

  printArea: { position: 'absolute', left: '-9999px', top: 0, visibility: 'hidden' },
};
