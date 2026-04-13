import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, StopCircle, Upload, CheckCircle, AlertCircle, ChevronRight, Camera, Clock, Apple } from 'lucide-react';
import { getProducts, createBatch, updateBatch, uploadVideo } from '../api';
import type { Product } from '../types';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

const steps = ['填写信息', '录制过程', '设置有效期', '完成'];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center mb-8">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div className="flex flex-col items-center">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${i <= current ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'} ${i === current ? 'ring-4 ring-primary/20' : ''}`}>
              {i < current ? <CheckCircle size={18} /> : i + 1}
            </div>
            <div className={`text-xs mt-1.5 ${i === current ? 'font-semibold text-primary' : 'font-normal text-muted-foreground'}`}>{s}</div>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-2 mb-5 transition-colors duration-300 ${i < current ? 'bg-primary' : 'bg-muted'}`} />
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
      // Try multiple constraint levels for virtual camera compatibility
      const tryConfigs: MediaStreamConstraints[] = [
        { video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }, audio: true },
        { video: { width: { ideal: 640 }, height: { ideal: 480 } }, audio: true },
        { video: true, audio: true },
        { video: true },
      ];
      let s: MediaStream | undefined;
      for (const cfg of tryConfigs) {
        try { s = await navigator.mediaDevices.getUserMedia(cfg); break; } catch { continue; }
      }
      if (!s) { setCameraError('无法访问摄像头，请允许浏览器访问摄像头权限。'); return; }
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
    <div className="p-8 max-w-[780px] mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-2">开始新批次</h1>
      <p className="text-sm text-muted-foreground mb-8">填写产品信息并录制生产过程</p>

      <Card className="p-8">
        <StepIndicator current={step} />

        {/* Step 0: 填写信息 */}
        {step === 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-5 text-foreground">产品信息</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">水果类型</label>
                <select value={form.product_type_id} onChange={handleProductChange}
                  className="w-full px-3.5 py-2.5 border border-input rounded-lg text-sm bg-background outline-none focus:ring-2 focus:ring-ring">
                  <option value="">-- 选择水果类型 --</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}（默认保质{p.default_shelf_hours}小时）</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">产品名称 *</label>
                <input value={form.product_name} onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))} placeholder="如：草莓拼盘"
                  className="w-full px-3.5 py-2.5 border border-input rounded-lg text-sm bg-background outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">操作员 *</label>
                <input value={form.operator} onChange={e => setForm(f => ({ ...f, operator: e.target.value }))} placeholder="操作员姓名"
                  className="w-full px-3.5 py-2.5 border border-input rounded-lg text-sm bg-background outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">重量 (g)</label>
                <input type="number" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} placeholder="如：500"
                  className="w-full px-3.5 py-2.5 border border-input rounded-lg text-sm bg-background outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">规格</label>
                <input value={form.spec} onChange={e => setForm(f => ({ ...f, spec: e.target.value }))} placeholder="如：250g装、家庭装"
                  className="w-full px-3.5 py-2.5 border border-input rounded-lg text-sm bg-background outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">备注</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="可选"
                  className="w-full px-3.5 py-2.5 border border-input rounded-lg text-sm bg-background outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            {error && <div className="flex items-center gap-2 bg-destructive/5 border border-destructive/20 rounded-lg px-3.5 py-2.5 text-destructive text-xs mt-3"><AlertCircle size={16} />{error}</div>}
            <Button onClick={handleStep1} disabled={loading} size="lg" className="gap-2 mt-5 w-full">
              {loading ? '创建中...' : (<>下一步：录制过程 <ChevronRight size={18} /></>)}
            </Button>
          </div>
        )}

        {/* Step 1: 录制视频 */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold mb-1.5 text-foreground">录制生产过程</h2>
            <p className="text-xs text-muted-foreground mb-5">请录制切割和打包的完整过程，完成后上传视频</p>

            {cameraError ? (
              <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-5 mb-4 text-destructive text-sm">
                <div className="flex items-center gap-2 mb-2"><AlertCircle size={18} /><strong>摄像头错误</strong></div>
                {cameraError}
                <Button variant="destructive" size="sm" onClick={startCamera} className="mt-3">重试</Button>
              </div>
            ) : (
              <div className="relative bg-black rounded-xl overflow-hidden mb-4 aspect-video">
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                {isRecording && (
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 rounded-full px-3.5 py-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-white text-sm font-semibold">{fmtTime(recordingTime)}</span>
                  </div>
                )}
                {!stream && !cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                    <Camera size={40} className="opacity-50 mb-2" />
                    <span className="opacity-70">摄像头加载中...</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 flex-wrap mb-4">
              {!isRecording && !recordedBlob && (
                <Button onClick={startRecording} disabled={!stream} className="gap-2">
                  <Video size={18} /> 开始录制
                </Button>
              )}
              {isRecording && (
                <Button onClick={stopRecording} variant="destructive" className="gap-2">
                  <StopCircle size={18} /> 停止录制
                </Button>
              )}
              {recordedBlob && !videoUploaded && (
                <>
                  <Badge variant="success" className="gap-2 py-2 px-4 text-sm">
                    <CheckCircle size={16} /> 录制完成 · {fmtTime(recordingTime)}
                  </Badge>
                  <Button onClick={handleUploadVideo} disabled={uploading} className="gap-2">
                    {uploading ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 上传中 {uploadProgress}%</>) : (<><Upload size={18} /> 上传视频</>)}
                  </Button>
                </>
              )}
              {videoUploaded && (
                <Badge variant="success" className="gap-2 py-2 px-4 text-sm">
                  <CheckCircle size={16} /> 视频上传成功！
                </Badge>
              )}
            </div>

            {recordedBlob && <video ref={previewRef} controls className="w-full rounded-xl mb-4 max-h-[200px]" />}
            {uploading && (
              <div className="mb-4">
                <div className="bg-muted rounded-full h-2 overflow-hidden">
                  <div className="bg-primary h-full rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
                <div className="text-xs text-muted-foreground mt-1">上传进度 {uploadProgress}%</div>
              </div>
            )}

            {error && <div className="flex items-center gap-2 bg-destructive/5 border border-destructive/20 rounded-lg px-3.5 py-2.5 text-destructive text-xs mt-3"><AlertCircle size={16} />{error}</div>}
            <div className="flex gap-3">
              <Button variant="secondary" onClick={handleSkipVideo} className="gap-2 mt-5">
                跳过视频，继续下一步
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: 设置有效期 */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold mb-1.5 text-foreground">设置有效期</h2>
            <p className="text-xs text-muted-foreground mb-6">设置产品的保质时间，将显示在标签和扫码页面上</p>

            <div className="flex flex-wrap gap-3 mb-6">
              {[6, 12, 24, 36, 48, 72].map(h => (
                <Button key={h} variant={shelfHours === h ? 'default' : 'outline'} onClick={() => setShelfHours(h)} className="px-5">
                  {h}小时
                </Button>
              ))}
            </div>

            <div className="mb-5">
              <label className="block text-xs font-medium text-foreground mb-1.5">自定义小时数</label>
              <div className="flex items-center gap-2">
                <input type="number" min={1} max={720} value={shelfHours} onChange={e => setShelfHours(parseInt(e.target.value) || 24)}
                  className="w-[120px] px-3.5 py-2.5 border border-input rounded-lg text-sm bg-background outline-none focus:ring-2 focus:ring-ring" />
                <span className="text-sm text-muted-foreground">小时</span>
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6 flex items-center gap-3">
              <Clock size={20} className="text-primary" />
              <div>
                <div className="font-semibold text-primary">过期时间预览</div>
                <div className="text-green-400 text-sm">
                  {new Date(Date.now() + shelfHours * 3600 * 1000).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            {error && <div className="flex items-center gap-2 bg-destructive/5 border border-destructive/20 rounded-lg px-3.5 py-2.5 text-destructive text-xs mt-3"><AlertCircle size={16} />{error}</div>}
            <Button onClick={handleStep3} disabled={loading} size="lg" className="gap-2 mt-5 w-full">
              {loading ? '保存中...' : (<>确认有效期，生成标签 <ChevronRight size={18} /></>)}
            </Button>
          </div>
        )}

        {/* Step 3: 完成 */}
        {step === 3 && (
          <div className="text-center py-5">
            <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={44} className="text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">批次创建成功！</h2>
            <p className="text-sm text-muted-foreground mb-7">产品信息已记录，现在可以打印标签或查看详情</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => batchId && navigate(`/batches/${batchId}`)} size="lg" className="gap-2">
                <Apple size={18} /> 查看详情 & 打印标签
              </Button>
              <Button variant="secondary" onClick={() => { setBatchId(null); setStep(0); setForm(initialForm); setRecordedBlob(null); setRecordingTime(0); setVideoUploaded(false); }} className="gap-2">
                继续新批次
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
