import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, StopCircle, Upload, CheckCircle, AlertCircle, ChevronRight, Camera, Clock, Apple } from 'lucide-react';
import { getProducts, createBatch, updateBatch, uploadVideo } from '../api';
import type { Product } from '../types';

const steps = ['填写信息', '录制过程', '设置有效期', '完成'];

function StepIndicator({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 14,
              background: i < current ? '#16a34a' : i === current ? '#16a34a' : '#e5e7eb',
              color: i <= current ? 'white' : '#9ca3af',
              boxShadow: i === current ? '0 0 0 4px rgba(22,163,74,0.2)' : 'none',
              transition: 'all 0.3s'
            }}>
              {i < current ? <CheckCircle size={18} /> : i + 1}
            </div>
            <div style={{ fontSize: 12, marginTop: 6, color: i === current ? '#16a34a' : '#9ca3af', fontWeight: i === current ? 600 : 400 }}>{s}</div>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex: 1, height: 2, margin: '0 8px', marginBottom: 20, background: i < current ? '#16a34a' : '#e5e7eb', transition: 'background 0.3s' }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

interface FormData {
  product_name: string;
  product_type_id: string;
  operator: string;
  weight: string;
  spec: string;
  notes: string;
}

const initialForm: FormData = { product_name: '', product_type_id: '', operator: '', weight: '', spec: '', notes: '' };

export default function BatchCreate() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<FormData>(initialForm);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 录制状态
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [cameraError, setCameraError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [videoUploaded, setVideoUploaded] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // 有效期
  const [shelfHours, setShelfHours] = useState(24);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    getProducts().then(r => setProducts(r.data || [])).catch(console.error);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [stream]);

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const p = products.find(p => String(p.id) === id);
    setForm(f => ({ ...f, product_type_id: id, product_name: p ? p.name : f.product_name }));
    if (p) setShelfHours(p.default_shelf_hours || 24);
  };

  const handleStep1 = async () => {
    if (!form.product_name.trim()) return setError('请填写产品名称');
    if (!form.operator.trim()) return setError('请填写操作员姓名');
    setError(''); setLoading(true);
    try {
      const res = await createBatch({ ...form, weight: form.weight ? parseFloat(form.weight) : null });
      setBatchId(res.data!.id);
      await updateBatch(res.data!.id, { status: 'recording' });
      setStep(1);
      startCamera();
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  };

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('摄像头不可用：请使用 HTTPS 或 localhost 访问以启用摄像头权限。');
        return;
      }
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }, audio: true });
      setStream(s);
      if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play(); }
      setCameraError('');
    } catch (err) {
      setCameraError('无法访问摄像头：' + (err as Error).message + '。请允许浏览器访问摄像头权限。');
    }
  };

  const startRecording = useCallback(() => {
    if (!stream) return;
    chunksRef.current = [];
    const MIME_TYPES = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm', ''];
    const mimeType = MIME_TYPES.find(t => t === '' || MediaRecorder.isTypeSupported(t));
    let mr: MediaRecorder;
    try {
      const mrOpts = mimeType ? { mimeType } : {};
      mr = new MediaRecorder(stream, mrOpts);
    } catch (e) {
      mr = new MediaRecorder(stream);
    }
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mr.mimeType });
      setRecordedBlob(blob);
      if (previewRef.current) previewRef.current.src = URL.createObjectURL(blob);
    };
    mr.start(1000);
    mediaRecorderRef.current = mr;
    setIsRecording(true);
    setRecordingTime(0);
    timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
  }, [stream]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (stream) stream.getTracks().forEach(t => t.stop());
    }
  }, [isRecording, stream]);

  const handleUploadVideo = async () => {
    if (!recordedBlob || !batchId) return;
    setUploading(true);
    try {
      await uploadVideo(batchId, recordedBlob, setUploadProgress);
      setVideoUploaded(true);
      await updateBatch(batchId, { status: 'done' });
      setTimeout(() => setStep(2), 800);
    } catch (err) { setError('视频上传失败：' + (err as Error).message); }
    finally { setUploading(false); }
  };

  const handleSkipVideo = async () => {
    if (!batchId) return;
    await updateBatch(batchId, { status: 'done' });
    setStep(2);
  };

  const handleStep3 = async () => {
    if (!batchId) return;
    setLoading(true);
    try {
      const now = Math.floor(Date.now() / 1000);
      const expire_at = now + shelfHours * 3600;
      await updateBatch(batchId, { expire_at, production_time: now });
      setStep(3);
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  };

  const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div style={{ padding: '32px', maxWidth: 780, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 8 }}>开始新批次</h1>
      <p style={{ color: '#6b7280', marginBottom: 32, fontSize: 14 }}>填写产品信息并录制生产过程</p>

      <div style={{ background: 'white', borderRadius: 20, padding: 32, boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
        <StepIndicator current={step} />

        {/* Step 0: 填写信息 */}
        {step === 0 && (
          <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, color: '#111827' }}>产品信息</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>水果类型</label>
                <select value={form.product_type_id} onChange={handleProductChange} style={inputStyle}>
                  <option value="">-- 选择水果类型 --</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}（默认保质{p.default_shelf_hours}小时）</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>产品名称 *</label>
                <input value={form.product_name} onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))} placeholder="如：草莓拼盘" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>操作员 *</label>
                <input value={form.operator} onChange={e => setForm(f => ({ ...f, operator: e.target.value }))} placeholder="操作员姓名" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>重量 (g)</label>
                <input type="number" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} placeholder="如：500" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>规格</label>
                <input value={form.spec} onChange={e => setForm(f => ({ ...f, spec: e.target.value }))} placeholder="如：250g装、家庭装" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>备注</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="可选" style={inputStyle} />
              </div>
            </div>
            {error && <div style={errorStyle}><AlertCircle size={16} />{error}</div>}
            <button onClick={handleStep1} disabled={loading} style={btnPrimaryStyle}>
              {loading ? '创建中...' : (<>下一步：录制过程 <ChevronRight size={18} /></>)}
            </button>
          </div>
        )}

        {/* Step 1: 录制视频 */}
        {step === 1 && (
          <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 6, color: '#111827' }}>录制生产过程</h2>
            <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 20 }}>请录制切割和打包的完整过程，完成后上传视频</p>

            {cameraError ? (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 20, marginBottom: 16, color: '#dc2626', fontSize: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><AlertCircle size={18} /><strong>摄像头错误</strong></div>
                {cameraError}
                <button onClick={startCamera} style={{ marginTop: 12, background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' }}>重试</button>
              </div>
            ) : (
              <div style={{ position: 'relative', background: '#000', borderRadius: 12, overflow: 'hidden', marginBottom: 16, aspectRatio: '16/9' }}>
                <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {isRecording && (
                  <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.6)', borderRadius: 20, padding: '6px 14px' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite' }} />
                    <span style={{ color: 'white', fontSize: 14, fontWeight: 600 }}>{fmtTime(recordingTime)}</span>
                  </div>
                )}
                {!stream && !cameraError && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                    <Camera size={40} style={{ opacity: 0.5, marginBottom: 8 }} />
                    <span style={{ opacity: 0.7 }}>摄像头加载中...</span>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              {!isRecording && !recordedBlob && (
                <button onClick={startRecording} disabled={!stream} style={{ ...btnPrimaryStyle, flex: '0 0 auto', marginTop: 0 }}>
                  <Video size={18} /> 开始录制
                </button>
              )}
              {isRecording && (
                <button onClick={stopRecording} style={{ ...btnStyle, background: '#ef4444', color: 'white', flex: '0 0 auto' }}
                  className="record-btn-active">
                  <StopCircle size={18} /> 停止录制
                </button>
              )}
              {recordedBlob && !videoUploaded && (
                <>
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#15803d', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle size={16} /> 录制完成 · {fmtTime(recordingTime)}
                  </div>
                  <button onClick={handleUploadVideo} disabled={uploading} style={{ ...btnPrimaryStyle, flex: '0 0 auto', marginTop: 0 }}>
                    {uploading ? (<><div className="animate-spin" style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }} /> 上传中 {uploadProgress}%</>) : (<><Upload size={18} /> 上传视频</>)}
                  </button>
                </>
              )}
              {videoUploaded && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#15803d', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={16} /> 视频上传成功！
                </div>
              )}
            </div>

            {recordedBlob && <video ref={previewRef} controls style={{ width: '100%', borderRadius: 10, marginBottom: 16, maxHeight: 200 }} />}
            {uploading && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ background: '#e5e7eb', borderRadius: 20, height: 8, overflow: 'hidden' }}>
                  <div style={{ background: '#16a34a', width: `${uploadProgress}%`, height: '100%', borderRadius: 20, transition: 'width 0.3s' }} />
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>上传进度 {uploadProgress}%</div>
              </div>
            )}

            {error && <div style={errorStyle}><AlertCircle size={16} />{error}</div>}
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={handleSkipVideo} style={{ ...btnStyle, color: '#6b7280', background: '#f3f4f6', border: 'none', flex: '0 0 auto' }}>
                跳过视频，继续下一步
              </button>
            </div>
          </div>
        )}

        {/* Step 2: 设置有效期 */}
        {step === 2 && (
          <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 6, color: '#111827' }}>设置有效期</h2>
            <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 24 }}>设置产品的保质时间，将显示在标签和扫码页面上</p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
              {[6, 12, 24, 36, 48, 72].map(h => (
                <button key={h} onClick={() => setShelfHours(h)} style={{
                  padding: '10px 20px', borderRadius: 10, border: `2px solid ${shelfHours === h ? '#16a34a' : '#e5e7eb'}`,
                  background: shelfHours === h ? '#f0fdf4' : 'white', color: shelfHours === h ? '#16a34a' : '#374151',
                  fontWeight: shelfHours === h ? 600 : 400, cursor: 'pointer', fontSize: 14
                }}>{h}小时</button>
              ))}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>自定义小时数</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="number" min={1} max={720} value={shelfHours} onChange={e => setShelfHours(parseInt(e.target.value) || 24)} style={{ ...inputStyle, width: 120 }} />
                <span style={{ color: '#6b7280', fontSize: 14 }}>小时</span>
              </div>
            </div>

            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 16, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
              <Clock size={20} color="#16a34a" />
              <div>
                <div style={{ fontWeight: 600, color: '#15803d' }}>过期时间预览</div>
                <div style={{ color: '#4ade80', fontSize: 14 }}>
                  {new Date(Date.now() + shelfHours * 3600 * 1000).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            {error && <div style={errorStyle}><AlertCircle size={16} />{error}</div>}
            <button onClick={handleStep3} disabled={loading} style={btnPrimaryStyle}>
              {loading ? '保存中...' : (<>确认有效期，生成标签 <ChevronRight size={18} /></>)}
            </button>
          </div>
        )}

        {/* Step 3: 完成 */}
        {step === 3 && (
          <div style={{ textAlign: 'center', padding: '20px 0', animation: 'fadeIn 0.3s ease-out' }}>
            <div style={{ background: '#f0fdf4', width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <CheckCircle size={44} color="#16a34a" />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 8 }}>批次创建成功！</h2>
            <p style={{ color: '#6b7280', marginBottom: 28 }}>产品信息已记录，现在可以打印标签或查看详情</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => batchId && navigate(`/batches/${batchId}`)} style={btnPrimaryStyle}>
                <Apple size={18} /> 查看详情 & 打印标签
              </button>
              <button onClick={() => { setBatchId(null); setStep(0); setForm(initialForm); setRecordedBlob(null); setRecordingTime(0); setVideoUploaded(false); }} style={{ ...btnStyle, color: '#374151', background: '#f3f4f6', border: 'none' }}>
                继续新批次
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 };
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: 10,
  fontSize: 14, color: '#111827', outline: 'none', background: 'white',
  transition: 'border-color 0.15s',
};
const btnPrimaryStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  background: 'linear-gradient(135deg, #16a34a, #22c55e)', color: 'white',
  border: 'none', borderRadius: 12, padding: '12px 24px', fontWeight: 600,
  fontSize: 15, cursor: 'pointer', marginTop: 20, boxShadow: '0 4px 12px rgba(22,163,74,0.25)'
};
const btnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '11px 20px',
  fontWeight: 500, fontSize: 14, cursor: 'pointer', marginTop: 20, background: 'white'
};
const errorStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, background: '#fef2f2',
  border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px',
  color: '#dc2626', fontSize: 13, marginTop: 12
};
