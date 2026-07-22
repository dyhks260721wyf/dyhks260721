"use client";

import {
  AlertCircle,
  ArrowLeft,
  AtSign,
  Bell,
  Bookmark,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Grid2X2,
  Heart,
  Home,
  Image as ImageIcon,
  Images,
  MessageCircle,
  Minimize2,
  MoreHorizontal,
  Music2,
  Pause,
  Play,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Share2,
  ShoppingBag,
  ShoppingCart,
  Smile,
  Sparkles,
  Star,
  Store,
  Square,
  SwitchCamera,
  Truck,
  Upload,
  User,
  UserRound,
  Volume2,
  VolumeX,
  Video,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import type { ProductPreset, VideoPreset } from "@/lib/content";

type OpenSheet = "comments" | null;
type EntrySource = "pause_tag" | "ai_analysis";
type CommentTab = "comments" | "analysis";
type AppScreen = "feed" | "friends" | "messages" | "assets" | "publish";
type PoseStyle = "candid" | "walking" | "glance" | "editorial";
type GenerationMode = "fast" | "refined";

type UserTryOnProfile = {
  outfitStyle: string;
  bodyType: string;
  poseStyle: PoseStyle;
  heightCm: number;
  weightKg?: number;
  weightRange?: string;
  identityDataUrl: string | null;
  useDemoIdentity: boolean;
  consentAccepted: boolean;
  updatedAt: string;
};

type GeneratedAsset = {
  id: string;
  imageUrl: string;
  video: VideoPreset;
  description: string;
  createdAt: string;
};

type LookVersion = {
  id: string;
  imageUrl: string;
  prompt: string;
  createdAt: string;
  resultMode: string | null;
  saved: boolean;
  products: ProductPreset[];
  productStatus: "not_required" | "completed" | "failed";
  generationMode: GenerationMode;
};

type GenerationJobPayload = {
  jobId: string;
  status: "queued" | "processing" | "completed" | "failed";
  stage?: "queued" | "analyzing" | "generating" | "rendering" | "completed" | "failed";
  message?: string;
  statusUrl?: string;
  resultUrl?: string;
  resultMode?: string;
  error?: { message?: string };
  productStatus?: "not_required" | "queued" | "analyzing" | "completed" | "failed";
  productMessage?: string;
  products?: ProductPreset[];
  productError?: { message?: string };
  generationMode?: GenerationMode;
};

const profileStorageKey = "scene-fit:user-profile:v1";
const assetStorageKey = "scene-fit:generated-assets:v1";
const poseOptions: Array<{ value: PoseStyle; label: string; hint: string }> = [
  { value: "candid", label: "自然抓拍", hint: "松弛三分之四站姿" },
  { value: "walking", label: "漫步动态", hint: "迈步与衣料动势" },
  { value: "glance", label: "氛围回眸", hint: "转身看向镜头" },
  { value: "editorial", label: "时尚大片", hint: "不对称镜头姿势" },
];
const bodyTypeOptions = [["pear", "梨形"], ["triangle", "倒三角形"], ["hourglass", "沙漏型"], ["rectangle", "H 型"], ["apple", "苹果型"]] as const;
const legacyWeightMidpoints: Record<string, number> = { under_50: 47, "50_60": 55, "60_70": 65, "70_85": 77, over_85: 90 };

export function Experience({ initialVideos }: { initialVideos: VideoPreset[] }) {
  const [feedVideos, setFeedVideos] = useState(initialVideos);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [openSheet, setOpenSheet] = useState<OpenSheet>(null);
  const [commentTab, setCommentTab] = useState<CommentTab>("comments");
  const [pausedFrame, setPausedFrame] = useState<{ videoId: string; dataUrl: string } | null>(null);
  const [tryOn, setTryOn] = useState<{ open: boolean; source: EntrySource; videoId: string; sceneFrameDataUrl: string | null }>({ open: false, source: "pause_tag", videoId: initialVideos[0]?.id ?? "", sceneFrameDataUrl: null });
  const [tryOnMinimized, setTryOnMinimized] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [screen, setScreen] = useState<AppScreen>("feed");
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  const [userProfile, setUserProfile] = useState<UserTryOnProfile | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [activeAsset, setActiveAsset] = useState<GeneratedAsset | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductPreset | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  const activeVideo = feedVideos[Math.min(activeIndex, Math.max(feedVideos.length - 1, 0))] ?? initialVideos[0];
  const tryOnVideo = feedVideos.find((video) => video.id === tryOn.videoId) ?? activeVideo;
  const publishAsset = activeAsset ?? assets[0] ?? {
    id: `demo-${activeVideo.id}`,
    imageUrl: activeVideo.posterUrl,
    video: activeVideo,
    description: `在${activeVideo.location}，把原视频的完整 Look 换到自己的形象上。`,
    createdAt: "刚刚",
  };

  useEffect(() => {
    try {
      const rawProfile = localStorage.getItem(profileStorageKey);
      if (rawProfile) setUserProfile(JSON.parse(rawProfile) as UserTryOnProfile);

      const rawAssets = localStorage.getItem(assetStorageKey);
      if (rawAssets) {
        const persisted = JSON.parse(rawAssets) as Array<Omit<GeneratedAsset, "video"> & { videoId: string }>;
        setAssets(persisted.flatMap((asset) => {
          const video = feedVideos.find((item) => item.id === asset.videoId);
          return video ? [{ ...asset, video }] : [];
        }));
      }
    } catch {
      localStorage.removeItem(profileStorageKey);
      localStorage.removeItem(assetStorageKey);
    } finally {
      setStorageReady(true);
    }
  }, [feedVideos]);

  useEffect(() => {
    if (!storageReady) return;
    try {
      if (userProfile) localStorage.setItem(profileStorageKey, JSON.stringify(userProfile));
    } catch {
      // Storage can be unavailable in private browsing; the current session still works.
    }
  }, [storageReady, userProfile]);

  useEffect(() => {
    if (!storageReady) return;
    try {
      const persisted = assets.slice(0, 8).map(({ video, ...asset }) => ({ ...asset, videoId: video.id }));
      localStorage.setItem(assetStorageKey, JSON.stringify(persisted));
    } catch {
      // Keep the in-memory asset if browser storage quota is reached.
    }
  }, [assets, storageReady]);

  useEffect(() => {
    setPaused(false);
    setOpenSheet(null);
    setPausedFrame(null);
  }, [activeIndex]);

  function handleFeedScroll() {
    const feed = feedRef.current;
    if (!feed) return;
    const next = Math.round(feed.scrollTop / Math.max(feed.clientHeight, 1));
    if (next !== activeIndex && next >= 0 && next <= feedVideos.length) setActiveIndex(next);
  }

  function rememberPausedFrame(dataUrl: string | null) {
    if (dataUrl) setPausedFrame({ videoId: activeVideo.id, dataUrl });
  }

  function openComments(tab: CommentTab = "comments", frameDataUrl: string | null = null) {
    rememberPausedFrame(frameDataUrl);
    setPaused(true);
    setCommentTab(tab);
    setOpenSheet("comments");
  }

  function startTryOn(source: EntrySource, frameDataUrl: string | null = null) {
    const currentFrame = frameDataUrl ?? (pausedFrame?.videoId === activeVideo.id ? pausedFrame.dataUrl : null);
    setOpenSheet(null);
    setTryOnMinimized(false);
    setTryOn({ open: true, source, videoId: activeVideo.id, sceneFrameDataUrl: currentFrame });
  }

  function toggleSaved(videoId: string) {
    setSaved((current) => current.includes(videoId) ? current.filter((id) => id !== videoId) : [...current, videoId]);
  }

  function changeScreen(next: AppScreen) {
    setOpenSheet(null);
    setSelectedProduct(null);
    if (!tryOnMinimized) setTryOn((value) => ({ ...value, open: false }));
    setScreen(next);
    setActiveAsset(null);
  }

  function saveAsset(asset: GeneratedAsset) {
    setAssets((current) => [asset, ...current.filter((item) => item.id !== asset.id)]);
    setActiveAsset(asset);
  }

  function appendUploadedVideo(video: VideoPreset) {
    if (feedVideos.some((item) => item.id === video.id)) return;
    const nextIndex = feedVideos.length;
    setFeedVideos((current) => [...current, video]);
    setActiveIndex(nextIndex);
    requestAnimationFrame(() => feedRef.current?.scrollTo({ top: nextIndex * feedRef.current.clientHeight, behavior: "auto" }));
  }

  function jumpToUpload() {
    const nextIndex = feedVideos.length;
    setOpenSheet(null);
    setPaused(false);
    setScreen("feed");
    setActiveIndex(nextIndex);
    requestAnimationFrame(() => feedRef.current?.scrollTo({ top: nextIndex * feedRef.current.clientHeight, behavior: "auto" }));
  }

  function cycleToFirstVideo() {
    setActiveIndex(0);
    requestAnimationFrame(() => feedRef.current?.scrollTo({ top: 0, behavior: "auto" }));
  }

  function jumpToOriginal(videoId: string) {
    const index = feedVideos.findIndex((video) => video.id === videoId);
    if (index >= 0) {
      setActiveIndex(index);
      setScreen("feed");
      setActiveAsset(null);
      setTryOnMinimized(false);
      setTryOn((value) => ({ ...value, open: false }));
      requestAnimationFrame(() => feedRef.current?.scrollTo({ top: index * feedRef.current.clientHeight, behavior: "smooth" }));
    }
  }

  return (
    <main className="app-canvas">
      <aside className="desktop-notes" aria-hidden="true">
        <div className="brand-mark"><span>入</span><span>镜</span></div>
        <div className="desktop-copy">
          <p className="eyebrow">SCENE / SELF / STYLE</p>
          <h1>刷到心动场景，<br />先让自己入镜。</h1>
          <p>一条短视频，保留场景、整套 Look 和你的形象。暂停定格，继续生成。</p>
        </div>
        <div className="desktop-status">
          <span className="status-dot" />
          <span>FULL-STACK DEMO · V0.1</span>
        </div>
      </aside>

      <section className="device-frame" aria-label="场景化穿搭短视频体验">
        {screen === "feed" && <>
          <div className="top-tabs">
            <button type="button">同城</button>
            <button type="button">关注</button>
            <button className="active" type="button">推荐</button>
            <button className="top-search" type="button" aria-label="搜索"><Search size={21} /></button>
          </div>
          <button className="top-upload-shortcut" type="button" aria-label="上传视频或图片" onClick={jumpToUpload}><Plus size={23} /></button>
        </>}

        <div className="video-feed" ref={feedRef} onScroll={handleFeedScroll}>
          {feedVideos.map((video, index) => (
            <FeedSlide
              key={video.id}
              video={video}
              active={index === activeIndex}
              paused={index === activeIndex && (video.mediaType === "image" || paused)}
              saved={saved.includes(video.id)}
              soundEnabled={soundEnabled}
              onSoundChange={setSoundEnabled}
              onPause={(frameDataUrl) => { if (index !== activeIndex) return; rememberPausedFrame(frameDataUrl); setPaused(true); }}
              onResume={() => index === activeIndex && setPaused(false)}
              onComments={(frameDataUrl) => openComments("comments", frameDataUrl)}
              onTryOn={(frameDataUrl) => startTryOn("pause_tag", frameDataUrl)}
              onSave={() => toggleSaved(video.id)}
            />
          ))}
          <UploadSlide
            active={activeIndex === feedVideos.length}
            uploadCount={feedVideos.filter((video) => video.userUploaded).length}
            onUploaded={appendUploadedVideo}
            onCycle={cycleToFirstVideo}
          />
        </div>

        {screen !== "feed" && (
          <div className="app-screen-layer">
            {screen === "friends" && <FriendsScreen videos={feedVideos} onJumpOriginal={jumpToOriginal} />}
            {screen === "messages" && <MessagesScreen />}
            {screen === "assets" && (activeAsset
              ? <AssetDetailScreen asset={activeAsset} onBack={() => setActiveAsset(null)} onPublish={() => changeScreen("publish")} onJumpOriginal={() => jumpToOriginal(activeAsset.video.id)} onOpenProduct={setSelectedProduct} />
              : <AssetLibraryScreen assets={assets} videos={feedVideos} saved={saved} onOpenAsset={setActiveAsset} onJumpOriginal={jumpToOriginal} />)}
            {screen === "publish" && <PublishScreen asset={publishAsset} onBack={() => changeScreen("assets")} onJumpOriginal={() => jumpToOriginal(publishAsset.video.id)} onOpenProduct={setSelectedProduct} />}
          </div>
        )}

        <BottomNavigation active={screen} onChange={changeScreen} />

        {openSheet === "comments" && (
          <CommentsSheet
            video={activeVideo}
            tab={commentTab}
            onTabChange={setCommentTab}
            onClose={() => setOpenSheet(null)}
            onTryOn={startTryOn}
          />
        )}

        {tryOn.open && (
          <TryOnFlow
            video={tryOnVideo}
            entrySource={tryOn.source}
            sceneFrameDataUrl={tryOn.sceneFrameDataUrl}
            initialProfile={userProfile}
            onClose={() => { setTryOnMinimized(false); setTryOn((value) => ({ ...value, open: false })); }}
            onMinimizedChange={(minimized) => { setTryOnMinimized(minimized); if (minimized) { setPaused(false); setOpenSheet(null); } }}
            onSaveProfile={setUserProfile}
            onSaveAsset={saveAsset}
            onOpenProduct={setSelectedProduct}
            onPublish={(asset) => { saveAsset(asset); setTryOnMinimized(false); setTryOn((value) => ({ ...value, open: false })); setScreen("publish"); }}
          />
        )}

        {selectedProduct && <ProductDetail product={selectedProduct} onClose={() => setSelectedProduct(null)} />}
      </section>
    </main>
  );
}

function UploadSlide({ active, uploadCount, onUploaded, onCycle }: {
  active: boolean;
  uploadCount: number;
  onUploaded: (video: VideoPreset) => void;
  onCycle: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const touchStartYRef = useRef<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraMode, setCameraMode] = useState<"chooser" | "photo" | "video" | null>(null);

  async function uploadMedia(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await uploadFile(file);
  }

  async function uploadFile(file: File) {
    if (!["video/mp4", "video/webm", "video/quicktime", "image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("请选择 MP4、MOV、WebM、JPEG、PNG 或 WebP 文件");
      return;
    }
    if (file.size > 60 * 1024 * 1024) {
      setError("文件不能超过 60MB");
      return;
    }

    setUploading(true);
    setError(null);
    setStatus(file.type.startsWith("video/") ? "正在读取视频并制作首帧" : "正在整理图片预览");
    try {
      const posterFrame = await createMediaPoster(file);
      setStatus("正在上传到你的内容流");
      const form = new FormData();
      form.set("media", file);
      form.set("posterFrame", posterFrame);
      const response = await fetch("/api/uploads", { method: "POST", body: form });
      const payload = await response.json().catch(() => ({ message: "上传失败" })) as { video?: VideoPreset; message?: string };
      if (!response.ok || !payload.video) throw new Error(payload.message ?? "上传失败");
      onUploaded(payload.video);
      setStatus("已加入内容流，正在打开你的场景");
    } catch (caught) {
      setStatus(null);
      setError(caught instanceof Error ? caught.message : "上传失败，请重试");
    } finally {
      setUploading(false);
    }
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLElement>) {
    const startY = touchStartYRef.current;
    touchStartYRef.current = null;
    if (!active || uploading || startY === null) return;
    const endY = event.changedTouches[0]?.clientY ?? startY;
    if (startY - endY > 52) onCycle();
  }

  return (
    <article
      className={`feed-slide upload-slide ${active ? "active" : ""} ${cameraMode ? "camera-open" : ""}`}
      onTouchStart={(event) => { touchStartYRef.current = event.touches[0]?.clientY ?? null; }}
      onTouchEnd={handleTouchEnd}
      onWheel={(event) => { if (active && !uploading && event.deltaY > 48) onCycle(); }}
    >
      <div className="upload-aurora" aria-hidden="true"><i /><i /><i /></div>
      <div className="upload-stage">
        <div className="upload-kicker"><span>FEED END</span><i />轮到你的画面</div>
        <div className="upload-lens" aria-hidden="true"><span><Camera size={34} /></span><i /></div>
        <h2>把你刷到的场景，<br />放进这条内容流。</h2>
        <p>上传视频或图片。视频暂停在哪一帧，AI 就从哪一帧提取场景和完整穿搭。</p>
        <input ref={inputRef} className="upload-media-input" type="file" accept="video/mp4,video/quicktime,video/webm,image/jpeg,image/png,image/webp" tabIndex={-1} aria-hidden="true" onChange={uploadMedia} />
        {uploading
          ? <div className="upload-processing"><span className="spinner" />{status ?? "正在上传"}</div>
          : <div className="upload-action-grid">
              <button className="upload-media-button" type="button" onClick={() => inputRef.current?.click()}><Upload size={18} />选择文件</button>
              <button className="upload-media-button camera" type="button" onClick={() => setCameraMode("chooser")}><Camera size={18} />打开相机</button>
            </div>}
        {error && <p className="upload-error">{error}</p>}
        {!error && status && !uploading && <p className="upload-success"><CheckCircle2 size={15} />{status}</p>}
        <div className="upload-meta">
          <span><ShieldCheck size={14} />上传即加入项目内容流</span>
          <span><Images size={14} />已有 {uploadCount} 个我的场景</span>
        </div>
        <small>支持 MP4 / MOV / WebM / JPG / PNG / WebP · 最大 60MB</small>
      </div>
      <button className="upload-next-hint" type="button" onClick={onCycle}><ChevronDown size={17} />继续上滑，回到第一条视频</button>
      {cameraMode === "chooser" && <CameraModeChooser onChoose={setCameraMode} onClose={() => setCameraMode(null)} />}
      {(cameraMode === "photo" || cameraMode === "video") && (
        <CameraCapture
          mode={cameraMode}
          onClose={() => setCameraMode(null)}
          onCaptured={(file) => { setCameraMode(null); void uploadFile(file); }}
        />
      )}
    </article>
  );
}

function CameraModeChooser({ onChoose, onClose }: {
  onChoose: (mode: "photo" | "video") => void;
  onClose: () => void;
}) {
  return (
    <div className="camera-choice-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="camera-choice-card" role="dialog" aria-modal="true" aria-labelledby="camera-choice-title">
        <header><div><span>DIRECT CAPTURE</span><h3 id="camera-choice-title">选择拍摄方式</h3></div><button type="button" onClick={onClose} aria-label="关闭相机选择"><X size={20} /></button></header>
        <p>拍摄完成后会直接上传到你的内容流，不再经过系统文件选择器。</p>
        <div>
          <button type="button" onClick={() => onChoose("photo")}><span><ImageIcon size={24} /></span><strong>拍照片</strong><small>拍摄当前场景</small></button>
          <button type="button" onClick={() => onChoose("video")}><span><Video size={24} /></span><strong>录视频</strong><small>最长录制 60 秒</small></button>
        </div>
        <small><ShieldCheck size={14} />仅在拍摄时访问相机；视频模式同时请求麦克风权限</small>
      </section>
    </div>
  );
}

function CameraCapture({ mode, onClose, onCaptured }: {
  mode: "photo" | "video";
  onClose: () => void;
  onCaptured: (file: File) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [cameraState, setCameraState] = useState<"requesting" | "ready" | "recording" | "error">("requesting");
  const [duration, setDuration] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);

  function stopTimer() {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  useEffect(() => {
    let disposed = false;
    cancelledRef.current = false;
    async function openCamera() {
      stopStream();
      setCameraState("requesting");
      setCameraError(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraState("error");
        setCameraError("当前浏览器不支持网页相机，请使用系统浏览器打开或选择本地文件");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode }, width: { ideal: 1080 }, height: { ideal: 1920 } },
          audio: mode === "video",
        });
        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const preview = videoRef.current;
        if (preview) {
          preview.srcObject = stream;
          await preview.play();
        }
        setCameraState("ready");
      } catch (caught) {
        if (disposed) return;
        const name = caught instanceof DOMException ? caught.name : "";
        setCameraState("error");
        setCameraError(name === "NotAllowedError"
          ? mode === "video" ? "请允许访问相机和麦克风后重试" : "请允许访问相机后重试"
          : name === "NotFoundError" ? mode === "video" ? "没有检测到可用相机或麦克风" : "没有检测到可用相机"
          : "相机启动失败，请关闭其他正在使用相机的应用后重试");
      }
    }
    void openCamera();
    return () => {
      disposed = true;
      cancelledRef.current = true;
      stopTimer();
      const recorder = recorderRef.current;
      if (recorder?.state === "recording") recorder.stop();
      recorderRef.current = null;
      stopStream();
    };
    // Re-open the physical camera only when capture mode or lens changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode, mode]);

  function closeCamera() {
    cancelledRef.current = true;
    stopTimer();
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") recorder.stop();
    stopStream();
    onClose();
  }

  async function takePhoto() {
    const preview = videoRef.current;
    if (!preview || preview.videoWidth === 0) return;
    try {
      const file = await captureCameraPhoto(preview);
      cancelledRef.current = true;
      stopStream();
      onCaptured(file);
    } catch {
      setCameraState("error");
      setCameraError("照片生成失败，请重新拍摄");
    }
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream || typeof MediaRecorder === "undefined") {
      setCameraState("error");
      setCameraError("当前浏览器不支持网页录制，请选择本地视频文件");
      return;
    }
    const mimeType = supportedRecordingType();
    if (!mimeType) {
      setCameraState("error");
      setCameraError("当前浏览器没有可用的视频编码器，请选择本地视频文件");
      return;
    }
    chunksRef.current = [];
    cancelledRef.current = false;
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 });
    } catch {
      setCameraState("error");
      setCameraError("视频编码器启动失败，请重新打开相机或选择本地视频");
      return;
    }
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => { if (event.data.size > 0) chunksRef.current.push(event.data); };
    recorder.onerror = () => {
      stopTimer();
      setCameraState("error");
      setCameraError("录制过程中出现错误，请重试");
    };
    recorder.onstop = () => {
      stopTimer();
      if (cancelledRef.current) return;
      const actualType = (recorder.mimeType || mimeType).split(";")[0];
      const extension = actualType === "video/mp4" ? "mp4" : "webm";
      const blob = new Blob(chunksRef.current, { type: actualType });
      stopStream();
      if (blob.size === 0) {
        setCameraState("error");
        setCameraError("没有录到有效画面，请重新拍摄");
        return;
      }
      onCaptured(new File([blob], `camera-${Date.now()}.${extension}`, { type: actualType }));
    };
    recorder.start(1_000);
    setDuration(0);
    setCameraState("recording");
    timerRef.current = window.setInterval(() => {
      setDuration((current) => {
        if (current >= 59 && recorder.state === "recording") recorder.stop();
        return Math.min(60, current + 1);
      });
    }, 1_000);
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") recorder.stop();
  }

  return (
    <section className="camera-capture-layer" role="dialog" aria-modal="true" aria-label={mode === "photo" ? "拍摄照片" : "录制视频"}>
      <video ref={videoRef} muted playsInline aria-label="相机实时预览" />
      <div className="camera-capture-shade" />
      <header><button type="button" onClick={closeCamera} aria-label="关闭相机"><X size={23} /></button><span>{mode === "photo" ? "PHOTO" : cameraState === "recording" ? `REC · ${formatRecordingTime(duration)}` : "VIDEO"}</span><button type="button" disabled={cameraState === "recording"} onClick={() => setFacingMode((current) => current === "environment" ? "user" : "environment")} aria-label="切换前后摄像头"><SwitchCamera size={22} /></button></header>
      <div className="camera-guide"><i /><i /><i /><i /><span>{cameraState === "requesting" ? "正在请求相机权限" : cameraState === "recording" ? "正在录制，保持手机稳定" : mode === "photo" ? "将人物或场景放入取景框" : "视频最长录制 60 秒"}</span></div>
      {cameraState === "error" && <div className="camera-capture-error"><AlertCircle size={21} /><strong>无法打开相机</strong><span>{cameraError}</span><button type="button" onClick={closeCamera}>返回上传页</button></div>}
      {cameraState !== "error" && <footer>
        {cameraState === "requesting" && <span className="camera-requesting"><span className="spinner" />等待授权</span>}
        {cameraState === "ready" && mode === "photo" && <button className="camera-shutter photo" type="button" onClick={() => void takePhoto()} aria-label="拍摄照片"><span><Camera size={24} /></span></button>}
        {cameraState === "ready" && mode === "video" && <button className="camera-shutter video" type="button" onClick={startRecording} aria-label="开始录制视频"><span><Video size={23} /></span></button>}
        {cameraState === "recording" && <button className="camera-shutter recording" type="button" onClick={stopRecording} aria-label="停止录制"><span><Square size={22} fill="currentColor" /></span></button>}
        <small>{cameraState === "recording" ? "点击停止并上传" : mode === "photo" ? "点击拍照并上传" : "点击开始录制"}</small>
      </footer>}
    </section>
  );
}

function FeedSlide({
  video,
  active,
  paused,
  saved,
  soundEnabled,
  onSoundChange,
  onPause,
  onResume,
  onComments,
  onTryOn,
  onSave,
}: {
  video: VideoPreset;
  active: boolean;
  paused: boolean;
  saved: boolean;
  soundEnabled: boolean;
  onSoundChange: (enabled: boolean) => void;
  onPause: (frameDataUrl: string | null) => void;
  onResume: () => void;
  onComments: (frameDataUrl: string | null) => void;
  onTryOn: (frameDataUrl: string | null) => void;
  onSave: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [liked, setLiked] = useState(false);
  const isImage = video.mediaType === "image";

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;
    element.muted = !soundEnabled;
    element.volume = 1;
    if (active && !paused) {
      void element.play().catch(() => {
        if (!element.muted) {
          element.muted = true;
          onSoundChange(false);
          void element.play().catch(() => undefined);
        }
      });
    } else {
      element.pause();
    }
    if (!active) element.currentTime = 0;
  }, [active, onSoundChange, paused, soundEnabled]);

  function togglePlayback() {
    if (isImage) return;
    const element = videoRef.current;
    if (!element || !active) return;
    if (paused) {
      onResume();
      return;
    }
    element.pause();
    onPause(captureVideoFrame(element));
  }

  function openTryOnFromCurrentFrame(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    const element = videoRef.current;
    onTryOn(isImage ? captureImageFrame(imageRef.current) : element ? captureVideoFrame(element) : null);
  }

  function openCommentsFromCurrentFrame() {
    const element = videoRef.current;
    element?.pause();
    onComments(isImage ? captureImageFrame(imageRef.current) : element ? captureVideoFrame(element) : null);
  }

  function toggleSound(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    const element = videoRef.current;
    if (!element || isImage) return;
    const next = !soundEnabled;
    element.muted = !next;
    element.volume = 1;
    onSoundChange(next);
    if (next) {
      if (paused) onResume();
      void element.play().catch(() => {
        element.muted = true;
        onSoundChange(false);
      });
    }
  }

  return (
    <article className={`feed-slide tone-${video.accent}`} onClick={togglePlayback}>
      {isImage
        ? <img ref={imageRef} className="feed-media" src={video.posterUrl} alt={video.title} />
        : <video ref={videoRef} className="feed-media" src={video.videoUrl} poster={video.posterUrl} loop muted={!soundEnabled} playsInline preload={active ? "auto" : "metadata"} />}
      <div className="media-shade" />

      {paused && (
        <div className="pause-action-layer">
          <button className="pause-tryon-tag" type="button" onClick={openTryOnFromCurrentFrame}>
            <span className="pause-tryon-dot" />
            试试这套穿搭
          </button>
        </div>
      )}

      {!isImage && !paused && active && <div className="tap-hint"><Pause size={13} /> 点击暂停</div>}
      {!isImage && paused && <div className="pause-glyph"><Play size={34} fill="currentColor" /></div>}

      <div className="feed-copy">
        <h2>@{video.author}</h2>
        <p>{video.title}</p>
        <div className="location-chip">{video.location}</div>
        {isImage
          ? <div className="audio-line"><Volume2 size={14} /><span>{video.audio}</span></div>
          : <button className={`audio-line sound-toggle ${soundEnabled ? "enabled" : "muted"}`} type="button" aria-pressed={soundEnabled} aria-label={soundEnabled ? "关闭视频声音" : "开启视频声音"} onClick={toggleSound}>{soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}<span>{soundEnabled ? video.audio : "开启声音 · 播放原声"}</span></button>}
      </div>

      <div className="action-rail" onClick={(event) => event.stopPropagation()}>
        <button className="avatar-action" type="button" aria-label="作者主页"><span>{video.avatarLabel}</span><i>+</i></button>
        <RailAction active={liked} label={video.counts.likes} onClick={() => setLiked((value) => !value)}><Heart size={29} fill={liked ? "currentColor" : "none"} /></RailAction>
        <RailAction label={video.counts.comments} onClick={openCommentsFromCurrentFrame}><MessageCircle size={28} fill="currentColor" /></RailAction>
        <RailAction active={saved} label={video.counts.saves} onClick={onSave}><Bookmark size={27} fill={saved ? "currentColor" : "none"} /></RailAction>
        <RailAction label="分享"><Share2 size={27} fill="currentColor" /></RailAction>
      </div>
    </article>
  );
}

function captureImageFrame(image: HTMLImageElement | null) {
  if (!image?.naturalWidth || !image.naturalHeight) return null;
  try {
    const maxEdge = 1280;
    const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.9);
  } catch {
    return null;
  }
}

function captureVideoFrame(video: HTMLVideoElement) {
  if (!video.videoWidth || !video.videoHeight || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return null;
  try {
    const maxEdge = 1280;
    const scale = Math.min(1, maxEdge / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.9);
  } catch {
    return null;
  }
}

function RailAction({ children, label, active = false, onClick }: { children: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return <button className={`rail-action ${active ? "active" : ""}`} type="button" onClick={onClick}>{children}<span>{label}</span></button>;
}

function BottomNavigation({ active, onChange }: { active: AppScreen; onChange: (screen: AppScreen) => void }) {
  return (
    <nav className={`bottom-nav ${active === "feed" ? "dark" : "light"}`} aria-label="主导航">
      <button className={active === "feed" ? "active" : ""} type="button" aria-current={active === "feed" ? "page" : undefined} onClick={() => onChange("feed")}><Home size={18} /><span>首页</span></button>
      <button className={active === "friends" ? "active" : ""} type="button" aria-current={active === "friends" ? "page" : undefined} onClick={() => onChange("friends")}><UserRound size={18} /><span>朋友</span></button>
      <button className={`publish-button ${active === "publish" ? "active" : ""}`} type="button" aria-label="发布" aria-current={active === "publish" ? "page" : undefined} onClick={() => onChange("publish")}><span><Plus size={20} /></span></button>
      <button className={active === "messages" ? "active" : ""} type="button" aria-current={active === "messages" ? "page" : undefined} onClick={() => onChange("messages")}><Bell size={18} /><span>消息</span></button>
      <button className={active === "assets" ? "active" : ""} type="button" aria-current={active === "assets" ? "page" : undefined} onClick={() => onChange("assets")}><User size={18} /><span>我</span></button>
    </nav>
  );
}

function GeneratedImageStage({ src, alt, className = "", children }: { src: string; alt: string; className?: string; children?: React.ReactNode }) {
  return (
    <div className={`generated-image-stage ${className}`.trim()}>
      <img className="generated-image-backdrop" src={src} alt="" aria-hidden="true" />
      <img className="generated-image-full" src={src} alt={alt} />
      {children}
    </div>
  );
}

function SheetHeader({ title, eyebrow, onClose }: { title: string; eyebrow?: string; onClose: () => void }) {
  return (
    <header className="sheet-header">
      <div><span>{eyebrow}</span><h3>{title}</h3></div>
      <button type="button" onClick={onClose} aria-label="关闭"><X size={21} /></button>
    </header>
  );
}

function ProductCard({ product, onOpen }: { product: ProductPreset; onOpen?: () => void }) {
  return (
    <article className="product-card" onClick={onOpen}>
      <div className="product-image"><img src={product.imageUrl} style={{ objectPosition: product.imagePosition }} alt={product.name} /><span>{product.category}</span></div>
      <div className="product-info"><strong>{product.name}</strong><p>{product.note}</p><div><b>{product.priceLabel}</b><button type="button" onClick={(event) => { event.stopPropagation(); onOpen?.(); }}><ShoppingBag size={15} />查看</button></div></div>
    </article>
  );
}

function CommentsSheet({ video, tab, onTabChange, onClose, onTryOn }: { video: VideoPreset; tab: CommentTab; onTabChange: (tab: CommentTab) => void; onClose: () => void; onTryOn: (source: EntrySource) => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const comments = [
    ["山茶", "这个配色和背景太贴了，像从湖里取的颜色。", "18分钟前", "5570"],
    ["Rin", "想看小个子版本，外套长度是关键。", "1小时前", "193"],
    ["北纬三十七", "手套这一点酒红真的很妙。", "2小时前", "28"],
  ];

  return (
    <div className="sheet-layer" onClick={onClose}>
      <section className="bottom-sheet comments-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="sheet-grabber" />
        <div className="comment-context">
          <img src={video.posterUrl} alt="" />
          <div><span>大家都在搜</span><strong>{video.analysis.tags[0]}穿搭</strong></div>
          <Search size={18} />
          <button className="comment-close" type="button" onClick={onClose} aria-label="关闭"><X size={20} /></button>
        </div>
        <div className="comment-tabs">
          <button className={tab === "comments" ? "active" : ""} type="button" onClick={() => onTabChange("comments")}>评论 <span>{video.counts.comments}</span></button>
          <button className={tab === "analysis" ? "active" : ""} type="button" onClick={() => onTabChange("analysis")}><Sparkles size={14} /> AI 解析</button>
        </div>

        {tab === "comments" ? (
          <div className="comment-list">
            {comments.map(([name, text, time, likes], index) => (
              <article className="comment-item" key={name}>
                <div className={`comment-avatar avatar-${index}`}>{name.slice(0, 1)}</div>
                <div><strong>{name}</strong><p>{text}</p><span>{time} · 回复</span></div>
                <div className="comment-like"><Heart size={18} /><span>{likes}</span></div>
              </article>
            ))}
          </div>
        ) : (
          <div className="analysis-panel">
            <div className="analysis-heading"><span><Sparkles size={16} /> AI 内容摘要</span><small>内容由 AI 辅助生成，请结合实际判断</small></div>
            <p className="analysis-summary">{video.analysis.summary}</p>
            <div className="analysis-tags">{video.analysis.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
            <button className="analysis-try-on" type="button" onClick={() => onTryOn("ai_analysis")}><span><WandSparkles size={20} />试试这套</span><small>用我的形象预览原场景与完整 Look</small></button>
            <div className="question-list">
              <span>你可能想问</span>
              {video.analysis.questions.map((item) => (
                <button className={expanded === item.id ? "expanded" : ""} type="button" key={item.id} onClick={() => setExpanded(expanded === item.id ? null : item.id)}>
                  <span>{item.question}<ChevronDown size={15} /></span>
                  {expanded === item.id && <p>{item.answer}</p>}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="comment-input"><span>{tab === "analysis" ? "问 AI 或按住说话" : "留下你的评论"}</span><ImageIcon size={20} /><AtSign size={20} /><Smile size={20} /></div>
      </section>
    </div>
  );
}

function IntroOverlay({ onStart }: { onStart: () => void }) {
  return (
    <section className="intro-overlay">
      <div className="intro-image"><img src="/media/images/nalati-blue-dress.jpg" alt="那拉提溪谷蓝裙穿搭" /><div className="intro-scan" /></div>
      <div className="intro-content">
        <p className="eyebrow">SCENE FIT / 01</p>
        <h2>先看见场景，<br />再看见自己。</h2>
        <p>暂停在你喜欢的瞬间，用这一帧的场景与整套 Look，生成你在画面里的样子。</p>
        <div className="intro-steps"><span>暂停视频</span><i /><span>试试穿搭</span><i /><span>生成新图</span></div>
        <button type="button" onClick={onStart}>开始刷视频 <span>向上滑</span></button>
      </div>
    </section>
  );
}

function TryOnFlow({ video, entrySource, sceneFrameDataUrl, initialProfile, onClose, onMinimizedChange, onSaveProfile, onSaveAsset, onOpenProduct, onPublish }: {
  video: VideoPreset;
  entrySource: EntrySource;
  sceneFrameDataUrl: string | null;
  initialProfile: UserTryOnProfile | null;
  onClose: () => void;
  onMinimizedChange: (minimized: boolean) => void;
  onSaveProfile: (profile: UserTryOnProfile) => void;
  onSaveAsset: (asset: GeneratedAsset) => void;
  onOpenProduct: (product: ProductPreset) => void;
  onPublish: (asset: GeneratedAsset) => void;
}) {
  const hasSavedIdentity = Boolean(initialProfile?.identityDataUrl);
  const [step, setStep] = useState(hasSavedIdentity ? 2 : 0);
  const [identityDataUrl, setIdentityDataUrl] = useState<string | null>(initialProfile?.identityDataUrl ?? null);
  const [heightCm, setHeightCm] = useState(initialProfile?.heightCm ?? 168);
  const [weightKg, setWeightKg] = useState(initialProfile?.weightKg ?? legacyWeightMidpoints[initialProfile?.weightRange ?? "50_60"] ?? 55);
  const [outfitStyle, setOutfitStyle] = useState(initialProfile?.outfitStyle ?? "womenswear");
  const [bodyType, setBodyType] = useState(initialProfile?.bodyType ?? "hourglass");
  const [poseStyle, setPoseStyle] = useState<PoseStyle>(initialProfile?.poseStyle ?? "candid");
  const [consent, setConsent] = useState(initialProfile?.consentAccepted ?? false);
  const [generationMode, setGenerationMode] = useState<GenerationMode>("fast");
  const [generating, setGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState(0);
  const [generationStatusMessage, setGenerationStatusMessage] = useState<string | null>(null);
  const [resultVersions, setResultVersions] = useState<LookVersion[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [revisionPrompt, setRevisionPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [captureFrames, setCaptureFrames] = useState<string[]>([]);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const revisionInputRef = useRef<HTMLTextAreaElement>(null);
  const faceDirections = ["正视镜头", "缓慢向左转", "缓慢向右转", "轻轻抬头", "轻轻低头"];
  const generationMessages = generationMode === "refined"
    ? ["正在准备精细生成任务", "正在分析场景与形象信息", "正在生成高质量穿搭图", "正在完善图片细节"]
    : ["正在准备快速生成任务", "正在整理场景与形象信息", "正在生成场景穿搭图", "正在完善图片细节"];
  const activeVersion = resultVersions.find((version) => version.id === activeVersionId) ?? resultVersions.at(-1) ?? null;
  const activeProducts = activeVersion?.products.length ? activeVersion.products : video.products;
  const sceneReferenceUrl = sceneFrameDataUrl ?? video.posterUrl;
  const revisionSuggestions = ["换到海边日落，保留这套穿搭", "改成自然向前走的抓拍姿势", "镜头拉远，完整看到鞋子和环境"];

  useEffect(() => () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("当前浏览器无法使用摄像头，请更换支持摄像头的浏览器后重试");
      return;
    }
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 960 } }, audio: false });
      cameraStreamRef.current = stream;
      setCameraActive(true);
      setCaptureFrames([]);
      setError(null);
      requestAnimationFrame(() => {
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
          void cameraVideoRef.current.play();
        }
      });
    } catch {
      setError("没有获得摄像头权限，请允许访问后重试");
    }
  }

  function stopCamera() {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setCameraActive(false);
  }

  async function captureFaceAngle() {
    const videoElement = cameraVideoRef.current;
    if (!videoElement || videoElement.videoWidth === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 720;
    const context = canvas.getContext("2d");
    if (!context) return;
    const sourceSize = Math.min(videoElement.videoWidth, videoElement.videoHeight);
    const sourceX = (videoElement.videoWidth - sourceSize) / 2;
    const sourceY = (videoElement.videoHeight - sourceSize) / 2;
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(videoElement, sourceX, sourceY, sourceSize, sourceSize, 0, 0, canvas.width, canvas.height);
    const nextFrames = [...captureFrames, canvas.toDataURL("image/jpeg", 0.84)];
    setCaptureFrames(nextFrames);
    if (nextFrames.length === faceDirections.length) {
      setIdentityDataUrl(await combineIdentityFrames(nextFrames));
      stopCamera();
    }
  }

  async function requestLookVersion(options?: { revisionPrompt: string; revisionImageUrl: string }) {
    const form = new FormData();
    form.set("videoId", video.id);
    form.set("heightCm", String(heightCm));
    form.set("weightKg", String(weightKg));
    form.set("bodyType", bodyType);
    form.set("poseStyle", poseStyle);
    form.set("outfitStyle", outfitStyle);
    form.set("consentAccepted", "true");
    form.set("entrySource", entrySource);
    form.set("generationMode", generationMode);
    if (sceneFrameDataUrl) form.set("sceneFrame", await dataUrlToFile(sceneFrameDataUrl, `${video.id}-paused-frame.jpg`));
    if (identityDataUrl) form.set("identityBoard", await dataUrlToFile(identityDataUrl, "identity-board.jpg"));
    if (options) {
      form.set("revisionPrompt", options.revisionPrompt);
      form.set("revisionImage", await dataUrlToFile(options.revisionImageUrl, "previous-look.jpg"));
    }

    const createResponse = await fetch("/api/generate", { method: "POST", body: form });
    const created = await createResponse.json().catch(() => ({ message: "生成任务创建失败" })) as GenerationJobPayload & { message?: string };
    if (!createResponse.ok || !created.jobId) throw new Error(created.message ?? "生成任务创建失败");

    const statusUrl = created.statusUrl ?? `/api/generate/${created.jobId}`;
    for (;;) {
      let statusResponse: Response;
      try {
        statusResponse = await fetch(statusUrl, { cache: "no-store" });
      } catch {
        setGenerationStatusMessage("网络连接暂时中断，正在继续等待生成任务");
        await waitForPoll();
        continue;
      }
      const job = await statusResponse.json().catch(() => ({ message: "无法读取生成状态" })) as GenerationJobPayload & { message?: string };
      if (!statusResponse.ok) throw new Error(job.message ?? "无法读取生成状态");

      setGenerationStatusMessage(job.message ?? null);
      const stageIndex = job.stage === "rendering" ? 3 : job.stage === "generating" ? 2 : job.stage === "analyzing" ? 1 : 0;
      setGenerationStage(stageIndex);

      if (job.status === "failed") throw new Error(job.error?.message ?? job.message ?? "生图服务返回失败");
      if (job.status === "completed" && job.resultUrl) {
        const productPending = video.userUploaded && (job.productStatus === "queued" || job.productStatus === "analyzing" || !job.productStatus);
        if (productPending) {
          setGenerationStage(3);
          setGenerationStatusMessage(job.productMessage ?? "图片已生成，Luna 正在整理穿搭商品");
          await waitForPoll();
          continue;
        }
        const resultResponse = await fetch(job.resultUrl, { cache: "no-store" });
        if (!resultResponse.ok) {
          const payload = await resultResponse.json().catch(() => ({ message: "生成图片暂时无法读取" }));
          throw new Error(payload.message ?? "生成图片暂时无法读取");
        }
        return {
          id: created.jobId,
          imageUrl: job.resultUrl,
          prompt: options?.revisionPrompt ?? "初始生成",
          createdAt: "刚刚",
          resultMode: job.resultMode ?? resultResponse.headers.get("X-Demo-Mode"),
          saved: false,
          products: job.products?.length ? job.products : video.products,
          productStatus: job.productStatus === "failed" ? "failed" : job.productStatus === "completed" ? "completed" : "not_required",
          generationMode: job.generationMode ?? generationMode,
        } satisfies LookVersion;
      }
      await waitForPoll();
    }
  }

  async function generate(event: FormEvent) {
    event.preventDefault();
    if (!consent) { setError("请确认你有权使用这张人像"); return; }
    setGenerating(true);
    setGenerationStage(0);
    setGenerationStatusMessage(null);
    setError(null);

    try {
      onSaveProfile({
        outfitStyle,
        bodyType,
        poseStyle,
        heightCm,
        weightKg,
        identityDataUrl,
        useDemoIdentity: false,
        consentAccepted: true,
        updatedAt: new Date().toISOString(),
      });
      const version = await requestLookVersion();
      setResultVersions([version]);
      setActiveVersionId(version.id);
      setStep(3);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "生成没有完成");
    } finally {
      setGenerating(false);
    }
  }

  async function refineResult(event: FormEvent) {
    event.preventDefault();
    const request = revisionPrompt.trim();
    if (!activeVersion || request.length < 2) return;
    setGenerating(true);
    setGenerationStage(0);
    setGenerationStatusMessage("正在提交你的修改需求");
    setError(null);

    try {
      const version = await requestLookVersion({ revisionPrompt: request, revisionImageUrl: activeVersion.imageUrl });
      setResultVersions((current) => [...current, version]);
      setActiveVersionId(version.id);
      setRevisionPrompt("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "新版本没有生成完成");
    } finally {
      setGenerating(false);
    }
  }

  function buildAsset(version: LookVersion | null = activeVersion): GeneratedAsset | null {
    if (!version) return null;
    return {
      id: `${video.id}-${version.id}`,
      imageUrl: version.imageUrl,
      video: { ...video, products: version.products.length ? version.products : video.products },
      description: version.prompt === "初始生成"
        ? `在${video.location}的光线里，用我的比例和动作重新演绎这套 ${video.analysis.tags.slice(0, 2).join("、")} Look。`
        : `继续修改：${version.prompt}`,
      createdAt: version.createdAt,
    };
  }

  function saveResult() {
    if (!activeVersion || activeVersion.saved) return;
    const asset = buildAsset(activeVersion);
    if (!asset) return;
    onSaveAsset(asset);
    setResultVersions((current) => current.map((version) => version.id === activeVersion.id ? { ...version, saved: true } : version));
  }

  function publishResult() {
    const asset = buildAsset();
    if (asset) onPublish(asset);
  }

  function minimizeGeneration() {
    if (!generating) return;
    setMinimized(true);
    onMinimizedChange(true);
  }

  function restoreGeneration() {
    setMinimized(false);
    onMinimizedChange(false);
  }

  const stepTitle = ["录入我的形象", "补充身材信息", "确认生成内容", "我的场景穿搭"][step];
  const canStepBack = step > 0 && step < 3 && !(hasSavedIdentity && step === 2);
  const floatingState = generating ? "working" : error ? "failed" : "complete";
  const selectedBodyTypeLabel = bodyTypeOptions.find(([value]) => value === bodyType)?.[1] ?? "沙漏型";
  const selectedPoseLabel = poseOptions.find((option) => option.value === poseStyle)?.label ?? "自然抓拍";

  if (minimized) {
    return (
      <button className={`generation-float ${floatingState}`} type="button" onClick={restoreGeneration} aria-live="polite" aria-label={floatingState === "working" ? "场景穿搭图正在生成，点击查看" : floatingState === "complete" ? "场景穿搭图已生成，点击查看结果" : "场景穿搭图生成失败，点击查看详情"}>
        <span className="generation-float-visual"><img src={activeVersion?.imageUrl ?? sceneReferenceUrl} alt="" /><i>{floatingState === "complete" ? <Check size={14} /> : floatingState === "failed" ? <X size={14} /> : <Sparkles size={13} />}</i></span>
        <span className="generation-float-copy">
          <strong>{floatingState === "working" ? "正在生成场景穿搭图" : floatingState === "complete" ? "你的新穿搭图已生成" : "生成遇到问题"}</strong>
          <small>{floatingState === "working" ? generationMessages[generationStage] : floatingState === "complete" ? `${resultVersions.length} 张照片 · 点击查看` : `${error ?? "点击返回查看详情"}`}</small>
          {floatingState === "working" && <span className="generation-float-track"><i style={{ width: `${(generationStage + 1) / generationMessages.length * 100}%` }} /></span>}
        </span>
        <ChevronRight size={17} />
      </button>
    );
  }

  return (
    <div className="flow-layer">
      <section className="try-flow">
        <header className="flow-header">
          <button type="button" onClick={canStepBack ? () => setStep(step - 1) : onClose} aria-label={canStepBack ? "返回" : "关闭"}>{canStepBack ? <ArrowLeft size={21} /> : <X size={21} />}</button>
          <div><h3>{stepTitle}</h3></div>
        </header>

        {step === 0 && (
          <div className="flow-body identity-step">
            <div className={`face-capture-stage ${cameraActive ? "is-camera" : ""}`}>
              <div className="face-orbit" aria-label="人脸录入预览">
                {cameraActive
                  ? <video ref={cameraVideoRef} muted playsInline aria-label="摄像头实时预览" />
                  : identityDataUrl
                    ? <img src={identityDataUrl} alt="已录入的人像" />
                    : <div className="face-placeholder" aria-label="等待录入人脸"><UserRound size={106} /></div>}
                {cameraActive && <span className="face-scan-line" />}
                {(cameraActive || identityDataUrl) && <><i className="face-corner corner-one" /><i className="face-corner corner-two" /></>}
              </div>
              {(cameraActive || identityDataUrl) && <div className="capture-direction">
                <span>{cameraActive ? `动作 ${Math.min(captureFrames.length + 1, faceDirections.length)}/${faceDirections.length}` : "录入完成"}</span>
                <strong>{cameraActive ? faceDirections[Math.min(captureFrames.length, faceDirections.length - 1)] : "已保存全脸特征"}</strong>
              </div>}
              <div className="face-progress" aria-label="录入进度">
                {faceDirections.map((direction, index) => <span key={direction} className={index < captureFrames.length || (!cameraActive && Boolean(identityDataUrl)) ? "done" : index === captureFrames.length && cameraActive ? "active" : ""}>{index < captureFrames.length || (!cameraActive && Boolean(identityDataUrl)) ? <Check size={11} /> : index + 1}<small>{direction.replace("缓慢", "").replace("轻轻", "")}</small></span>)}
              </div>
              {cameraActive && <button className="capture-frame-button" disabled={captureFrames.length >= faceDirections.length} type="button" onClick={captureFaceAngle}><Camera size={18} />记录「{faceDirections[Math.min(captureFrames.length, faceDirections.length - 1)]}」</button>}
            </div>
            <div className="capture-actions">
              <button className={identityDataUrl && !cameraActive ? "recorded" : ""} type="button" onClick={startCamera}><Camera size={17} />{cameraActive ? "重新录入" : "动态录入"}</button>
            </div>
            <div className="privacy-note"><ShieldCheck size={17} /><p>仅上传本人或已获授权的人像；图片用于本次生成与个人 AIGC 相册，不用于身份识别。</p></div>
            {error && <p className="form-error">{error}</p>}
            <button className={`flow-primary identity-next ${identityDataUrl && !cameraActive ? "ready" : ""}`} disabled={cameraActive || !identityDataUrl} type="button" onClick={() => setStep(1)}>下一步</button>
          </div>
        )}

        {step === 1 && (
          <div className="flow-body profile-step">
            <label className="field-label">穿搭方向</label>
            <div className="segmented"><button className={outfitStyle === "womenswear" ? "active" : ""} type="button" onClick={() => setOutfitStyle("womenswear")}>女士穿搭</button><button className={outfitStyle === "menswear" ? "active" : ""} type="button" onClick={() => setOutfitStyle("menswear")}>男士穿搭</button></div>
            <label className="field-label">身材类型</label>
            <div className="body-type-grid">
              {bodyTypeOptions.map(([value, label]) => (
                <button className={bodyType === value ? "active" : ""} key={value} type="button" onClick={() => setBodyType(value)}><span className={`body-shape shape-${value}`}><UserRound size={28} /></span><strong>{label}</strong>{bodyType === value && <CheckCircle2 size={13} />}</button>
              ))}
            </div>
            <label className="field-label"><span>动作氛围</span><small>不复刻原视频姿势</small></label>
            <div className="pose-style-grid">
              {poseOptions.map((option) => (
                <button className={poseStyle === option.value ? "active" : ""} key={option.value} type="button" onClick={() => setPoseStyle(option.value)}>
                  <span className={`pose-glyph pose-${option.value}`}><UserRound size={23} /></span>
                  <span><strong>{option.label}</strong><small>{option.hint}</small></span>
                  {poseStyle === option.value && <CheckCircle2 size={14} />}
                </button>
              ))}
            </div>
            <label className="field-label" htmlFor="height">身高 <strong>{heightCm} cm</strong></label>
            <input id="height" className="measure-range" type="range" min="140" max="210" value={heightCm} onChange={(event) => setHeightCm(Number(event.target.value))} />
            <div className="range-labels"><span>140</span><span>175</span><span>210</span></div>
            <label className="field-label" htmlFor="weight">体重 <strong>{weightKg} kg</strong></label>
            <input id="weight" className="measure-range" type="range" min="35" max="120" value={weightKg} onChange={(event) => setWeightKg(Number(event.target.value))} />
            <div className="range-labels"><span>35</span><span>78</span><span>120</span></div>
            <p className="profile-hint">生成时会按身高、体重与体型重建全身比例，并重新编排姿势；结果仅作视觉预览，不提供尺码判断。</p>
            <button className="flow-primary" type="button" onClick={() => setStep(2)}>下一步</button>
          </div>
        )}

        {step === 2 && (
          <form className="flow-body confirm-step" onSubmit={generate}>
            <section className="confirm-section confirm-profile-section" aria-labelledby="confirm-profile-title">
              <header className="confirm-section-heading"><strong id="confirm-profile-title">信息确认</strong><span>检查刚刚录入的内容</span></header>
              <div className="confirm-profile-card">
                <div className="confirm-identity-summary">
                  <span className="confirm-identity-thumb">{identityDataUrl && <img src={identityDataUrl} alt="刚刚录入的正脸" />}</span>
                  <div><strong>我的形象</strong><small>已录入 5 个角度</small></div>
                  <button type="button" onClick={() => setStep(0)}>修改</button>
                </div>
                <div className="confirm-body-summary">
                  <header><div><strong>身材信息</strong><small>{selectedBodyTypeLabel}</small></div><button type="button" onClick={() => setStep(1)}>修改</button></header>
                  <div><span>{outfitStyle === "menswear" ? "男士穿搭" : "女士穿搭"}</span><span>{heightCm} cm</span><span>{weightKg} kg</span><span>{selectedPoseLabel}</span></div>
                </div>
              </div>
            </section>
            <section className="confirm-section generation-mode-section" aria-labelledby="generation-mode-title">
              <header className="confirm-section-heading"><strong id="generation-mode-title">选择生成方式</strong></header>
              <div className="generation-mode-selector" role="radiogroup" aria-label="生成方式">
                <button className={generationMode === "fast" ? "active" : ""} type="button" role="radio" aria-checked={generationMode === "fast"} disabled={generating} onClick={() => setGenerationMode("fast")}>
                  <i><Zap size={16} /></i><span><strong>快速生成</strong><small>Seedream 直接生成，适合快速预览效果</small></span><b>约 1 分钟</b><div className="mode-meter"><u /><u /><u /></div>
                </button>
                <button className={generationMode === "refined" ? "active" : ""} type="button" role="radio" aria-checked={generationMode === "refined"} disabled={generating} onClick={() => setGenerationMode("refined")}>
                  <i><Sparkles size={16} /></i><span><strong>精细生成</strong><small>Sol 分析并调用 image2，适合高质量出图</small></span><b>约 2～3 分钟</b><div className="mode-meter"><u /><u /><u /></div>
                </button>
              </div>
            </section>
            <section className="confirm-section consent-section" aria-labelledby="consent-title">
              <header className="confirm-section-heading"><strong id="consent-title">安全确认</strong></header>
              <label className="consent-row"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><i>{consent && <Check size={14} />}</i><span><strong>我已确认使用本人或已获授权的人像</strong><small>图片仅用于本次 AIGC 生成，并发送至图像生成服务处理。</small></span></label>
            </section>
            <section className="confirm-section generate-action-section" aria-labelledby="generate-action-title">
              <header className="confirm-section-heading"><strong id="generate-action-title">开始生成</strong></header>
              {!generating && <div className="background-generation-tip"><Minimize2 size={17} /><span><strong>生成后可收起继续刷</strong><small>任务会变成视频旁的进度浮层，完成后提醒你查看。</small></span></div>}
              {error && <p className="form-error">{error}</p>}
              <button className={`flow-primary generate-button mode-${generationMode}`} disabled={generating || !consent} type="submit">{generating ? <><span className="spinner" />正在生成场景穿搭图</> : <>{generationMode === "fast" ? <Zap size={18} /> : <WandSparkles size={18} />}{generationMode === "fast" ? "快速生成场景穿搭图" : "精细生成场景穿搭图"}</>}</button>
              {generating && <div className="generation-progress" role="status" aria-live="polite"><div><Minimize2 size={17} /><span><strong>图片正在生成</strong><small>收起后任务会在后台继续</small></span></div><div className="generation-track"><i style={{ width: `${(generationStage + 1) / generationMessages.length * 100}%` }} /></div><button className="minimize-generation" type="button" onClick={minimizeGeneration}>收起，继续刷视频</button></div>}
            </section>
          </form>
        )}

        {step === 3 && activeVersion && (
          <div className="result-step">
            <div className="result-scroll">
              <GeneratedImageStage className="result-image-stage" src={activeVersion.imageUrl} alt="生成的场景穿搭图片">
                {generating && <div className="revision-image-progress" role="status"><span className="spinner" /><strong>{generationStatusMessage ?? generationMessages[generationStage]}</strong><small>正在保留当前图片，并生成新的效果</small><button className="revision-minimize" type="button" onClick={minimizeGeneration}><Minimize2 size={15} />收起，继续浏览</button></div>}
              </GeneratedImageStage>
              <div className="result-panel">
                <button className={`result-primary-action ${activeVersion.saved ? "publish-ready" : ""}`} type="button" onClick={activeVersion.saved ? publishResult : saveResult}><span>{activeVersion.saved ? <Sparkles size={20} /> : <Bookmark size={20} />}<strong>{activeVersion.saved ? "发布为作品" : "收藏当前图片"}</strong></span><small>{activeVersion.saved ? "图片已添加到「我-收藏-我的穿搭」" : "收藏后可在我的穿搭中查看和发布"}</small></button>
                <div className="result-products-heading"><strong>购买相似商品</strong><ShoppingCart size={20} /></div>
                {activeProducts.length > 0
                  ? <div className="result-product-grid">{activeProducts.map((product) => <ProductCard key={product.id} product={product} onOpen={() => onOpenProduct(product)} />)}</div>
                  : <div className="product-analysis-empty"><Search size={19} /><div><strong>这一帧没有识别到清晰单品</strong><span>{activeVersion.productStatus === "failed" ? "商品识别暂时未完成，生成图片仍可正常收藏" : "可以返回视频，换一帧人物与穿搭更清晰的画面"}</span></div></div>}
              </div>
            </div>
            <section className="revision-float" aria-label="继续修改图片">
              <div className="revision-suggestions" aria-label="修改建议">
                {revisionSuggestions.map((suggestion) => <button key={suggestion} disabled={generating} type="button" onClick={() => { setRevisionPrompt(suggestion); revisionInputRef.current?.focus(); }}>{suggestion}</button>)}
              </div>
              <form className="revision-composer" onSubmit={refineResult}>
                <WandSparkles size={18} aria-hidden="true" />
                <textarea ref={revisionInputRef} value={revisionPrompt} maxLength={300} rows={1} disabled={generating} aria-label="输入图片修改需求" placeholder="例如：换到雨后的上海街头，改成自然回眸…" onChange={(event) => setRevisionPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} />
                <button disabled={generating || revisionPrompt.trim().length < 2} type="submit" aria-label="生成新图片">{generating ? <span className="spinner" /> : <Send size={18} />}</button>
              </form>
              {error && <p className="revision-error">{error}</p>}
            </section>
          </div>
        )}
      </section>
    </div>
  );
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("无法读取生成图片"));
    reader.readAsDataURL(blob);
  });
}

function captureCameraPhoto(video: HTMLVideoElement) {
  const maxEdge = 1920;
  const scale = Math.min(1, maxEdge / Math.max(video.videoWidth, video.videoHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
  canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) return Promise.reject(new Error("CAMERA_CANVAS_UNAVAILABLE"));
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise<File>((resolve, reject) => canvas.toBlob((blob) => blob
    ? resolve(new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" }))
    : reject(new Error("CAMERA_PHOTO_FAILED")), "image/jpeg", 0.9));
}

function supportedRecordingType() {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

function formatRecordingTime(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function canvasPosterFile(source: CanvasImageSource, sourceWidth: number, sourceHeight: number) {
  const maxEdge = 1280;
  const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) return Promise.reject(new Error("当前浏览器无法制作媒体预览"));
  context.fillStyle = "#0a0a0b";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return new Promise<File>((resolve, reject) => canvas.toBlob((blob) => {
    if (!blob) reject(new Error("媒体预览生成失败"));
    else resolve(new File([blob], "poster-frame.jpg", { type: "image/jpeg" }));
  }, "image/jpeg", 0.88));
}

async function createMediaPoster(file: File) {
  const objectUrl = URL.createObjectURL(file);
  try {
    if (file.type.startsWith("image/")) {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error("图片无法读取，请换一张重试"));
        element.src = objectUrl;
      });
      return await canvasPosterFile(image, image.naturalWidth, image.naturalHeight);
    }

    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.src = objectUrl;
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("视频无法读取，请确认文件为 MP4、MOV 或 WebM"));
      video.load();
    });
    if (Number.isFinite(video.duration) && video.duration > 0.4) {
      const seekTarget = Math.min(2, Math.max(0.1, video.duration * 0.12));
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
        video.currentTime = seekTarget;
      });
    }
    return await canvasPosterFile(video, video.videoWidth, video.videoHeight);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function waitForPoll() {
  return new Promise<void>((resolve) => window.setTimeout(resolve, 2_000));
}

async function dataUrlToFile(dataUrl: string, fileName: string) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], fileName, { type: blob.type || "image/jpeg" });
}

function loadDataUrlImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("IMAGE_LOAD_FAILED"));
    image.src = dataUrl;
  });
}

async function combineIdentityFrames(frames: string[]) {
  const images = await Promise.all(frames.map(loadDataUrlImage));
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 720;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("CANVAS_UNAVAILABLE");
  context.fillStyle = "#101014";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const cells = [
    [0, 0], [360, 0], [720, 0], [180, 360], [540, 360],
  ];
  images.forEach((image, index) => {
    const [x, y] = cells[index];
    context.drawImage(image, x, y, 360, 360);
  });
  return canvas.toDataURL("image/jpeg", 0.82);
}

function ScreenHeader({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return <header className="screen-header"><div><span>{eyebrow}</span><h2>{title}</h2></div>{action}</header>;
}

function FriendsScreen({ videos, onJumpOriginal }: { videos: VideoPreset[]; onJumpOriginal: (videoId: string) => void }) {
  return (
    <section className="app-screen friends-screen">
      <ScreenHeader eyebrow="FRIENDS" title="朋友" action={<button type="button" aria-label="添加朋友"><UserRound size={20} /></button>} />
      <div className="friends-recent"><span>最近更新</span><div>{videos.map((video) => <button key={video.id} type="button" onClick={() => onJumpOriginal(video.id)}><i><img src={video.posterUrl} alt="" /></i><small>{video.author.slice(0, 4)}</small></button>)}</div></div>
      <div className="friend-feed">
        {videos.slice(0, 2).map((video, index) => <article key={video.id}>
          <header><div className="friend-avatar">{video.avatarLabel}</div><div><strong>{video.author}</strong><span>{index === 0 ? "12 分钟前" : "1 小时前"} · {video.location}</span></div><button type="button" aria-label={`查看 ${video.author} 的更多操作`}><MoreHorizontal size={19} /></button></header>
          <button className="friend-media" type="button" onClick={() => onJumpOriginal(video.id)}><img src={video.posterUrl} alt={video.title} /><span><Play size={18} fill="currentColor" />看原视频</span></button>
          <p>{video.title}</p>
          <footer><button type="button"><Heart size={18} />喜欢</button><button type="button"><MessageCircle size={18} />评论</button><button type="button"><Share2 size={18} />分享</button></footer>
        </article>)}
      </div>
    </section>
  );
}

function MessagesScreen() {
  const messages = [
    { icon: <Sparkles size={19} />, title: "AI 生成完成", text: "你的场景 Look 已生成，可前往 AIGC 相册查看。", time: "刚刚" },
    { icon: <ShoppingBag size={19} />, title: "同款价格更新", text: "你收藏的象牙白肌理外套有新的优惠。", time: "12:30" },
    { icon: <Heart size={19} />, title: "互动消息", text: "山茶赞了你的场景穿搭。", time: "昨天" },
  ];
  return (
    <section className="app-screen messages-screen">
      <ScreenHeader eyebrow="INBOX" title="消息" action={<button type="button" aria-label="更多"><MoreHorizontal size={21} /></button>} />
      <div className="message-filter"><button className="active" type="button">全部</button><button type="button">互动</button><button type="button">订单</button></div>
      <div className="message-list">{messages.map((message) => <article key={message.title}><i>{message.icon}</i><div><strong>{message.title}</strong><p>{message.text}</p></div><span>{message.time}</span></article>)}</div>
    </section>
  );
}

function AssetLibraryScreen({ assets, videos, saved, onOpenAsset, onJumpOriginal }: { assets: GeneratedAsset[]; videos: VideoPreset[]; saved: string[]; onOpenAsset: (asset: GeneratedAsset) => void; onJumpOriginal: (videoId: string) => void }) {
  const [tab, setTab] = useState<"assets" | "saved">("assets");
  const demoAssets: GeneratedAsset[] = assets.length ? assets : videos.slice(0, 2).map((video, index) => ({
    id: `preview-${video.id}`,
    imageUrl: video.posterUrl,
    video,
    description: index === 0 ? "雪线之下的柔光，适合一套低饱和叠穿。" : "雨后霓虹给酒红皮衣加上第二层光。",
    createdAt: index === 0 ? "今天" : "昨天",
  }));
  const savedVideos = videos.filter((video) => saved.includes(video.id));
  return (
    <section className="app-screen asset-screen">
      <div className="profile-hero"><img src="/media/images/nalati-blue-dress.jpg" alt="个人主页背景" /><div className="profile-shade" /><div className="profile-avatar">镜<span>+</span></div><div className="profile-name"><strong>Scene Fitter</strong><span>场景穿搭创作者</span></div><button type="button">编辑主页</button></div>
      <div className="profile-stats"><span><strong>12</strong>获赞</span><span><strong>{assets.length}</strong>AIGC 资产</span><span><strong>{saved.length}</strong>收藏视频</span><span><strong>8</strong>关注</span></div>
      <div className="asset-tabs"><button className={tab === "assets" ? "active" : ""} type="button" onClick={() => setTab("assets")}><Images size={15} />我的穿搭</button><button className={tab === "saved" ? "active" : ""} type="button" onClick={() => setTab("saved")}><Bookmark size={15} />收藏视频</button></div>
      {tab === "assets" ? (
        <div className="asset-gallery">{demoAssets.map((asset) => <button key={asset.id} type="button" aria-label={`${asset.description} ${asset.createdAt}`} onClick={() => onOpenAsset(asset)}><img src={asset.imageUrl} alt="" /><span><Sparkles size={12} />{asset.createdAt}</span></button>)}</div>
      ) : savedVideos.length ? (
        <div className="saved-video-list">{savedVideos.map((video) => <button key={video.id} type="button" onClick={() => onJumpOriginal(video.id)}><img src={video.posterUrl} alt={video.title} /><div><strong>{video.location}</strong><p>{video.title}</p><span><Play size={12} />跳转原视频</span></div></button>)}</div>
      ) : <div className="empty-state"><Bookmark size={28} /><strong>还没有收藏视频</strong><p>在首页点击收藏，原视频会出现在这里。</p></div>}
    </section>
  );
}

function AssetDetailScreen({ asset, onBack, onPublish, onJumpOriginal, onOpenProduct }: { asset: GeneratedAsset; onBack: () => void; onPublish: () => void; onJumpOriginal: () => void; onOpenProduct: (product: ProductPreset) => void }) {
  return (
    <section className="app-screen asset-detail-screen">
      <header className="floating-screen-header"><button type="button" onClick={onBack} aria-label="返回"><ArrowLeft size={21} /></button><span>AIGC 图片资产</span><button type="button" aria-label="更多"><MoreHorizontal size={21} /></button></header>
      <GeneratedImageStage className="asset-detail-image" src={asset.imageUrl} alt={asset.description} />
      <div className="asset-detail-content">
        <span className="asset-badge"><Sparkles size={13} />AI 场景穿搭 · {asset.createdAt}</span>
        <h2>这张照片，已经属于你的场景。</h2>
        <p>{asset.description}</p>
        <div className="asset-main-actions"><button type="button" onClick={onPublish}><Sparkles size={17} />一键发布</button><button type="button" onClick={onJumpOriginal}><Music2 size={17} />跳转原视频</button></div>
        <div className="source-row"><img src={asset.video.posterUrl} alt="原视频" /><div><span>原视频 / 原声</span><strong>{asset.video.location}</strong><small>{asset.video.audio}</small></div><ChevronRight size={18} /></div>
        <div className="section-heading"><div><span>SHOP THE LOOK</span><strong>同款商品</strong></div><Grid2X2 size={18} /></div>
        <div className="screen-product-grid compact">{asset.video.products.map((product) => <ProductCard key={product.id} product={product} onOpen={() => onOpenProduct(product)} />)}</div>
      </div>
    </section>
  );
}

function PublishScreen({ asset, onBack, onJumpOriginal, onOpenProduct }: { asset: GeneratedAsset; onBack: () => void; onJumpOriginal: () => void; onOpenProduct: (product: ProductPreset) => void }) {
  const [caption, setCaption] = useState(asset.description);
  const [published, setPublished] = useState(false);
  return (
    <section className="app-screen publish-screen">
      <header className="publish-header"><button type="button" onClick={onBack} aria-label="返回"><ArrowLeft size={21} /></button><div><span>CREATE POST</span><h2>发布场景穿搭</h2></div><button className="publish-submit" type="button" disabled={published} onClick={() => setPublished(true)}>{published ? "已发布" : "发布"}</button></header>
      <div className="publish-scroll">
        <GeneratedImageStage className="publish-preview" src={asset.imageUrl} alt="发布图片预览"><span><Sparkles size={13} />AIGC 图片</span></GeneratedImageStage>
        <label className="caption-field"><span>说说这张图</span><textarea value={caption} maxLength={180} onChange={(event) => setCaption(event.target.value)} /><small>{caption.length}/180</small></label>
        <button className="source-row" type="button" onClick={onJumpOriginal}><img src={asset.video.posterUrl} alt="原视频" /><div><span>使用原视频音乐</span><strong>{asset.video.audio}</strong><small>内容可溯源至 @{asset.video.author}</small></div><ChevronRight size={18} /></button>
        <div className="publish-options"><button type="button"><User size={17} />谁可以看 <span>公开 <ChevronRight size={15} /></span></button><button type="button"><Images size={17} />保存到相册 <span><CheckCircle2 size={16} /></span></button></div>
        <div className="section-heading"><div><span>ADD PRODUCTS</span><strong>关联同款商品</strong></div><span>{asset.video.products.length} 件</span></div>
        <div className="publish-products">{asset.video.products.map((product) => <button key={product.id} type="button" onClick={() => onOpenProduct(product)}><img src={product.imageUrl} style={{ objectPosition: product.imagePosition }} alt={product.name} /><div><strong>{product.name}</strong><span>{product.priceLabel}</span></div><CheckCircle2 size={18} /></button>)}</div>
        {published && <div className="publish-success"><CheckCircle2 size={22} /><div><strong>发布成功</strong><span>作品已进入你的主页与 AIGC 相册。</span></div></div>}
      </div>
    </section>
  );
}

function ProductDetail({ product, onClose }: { product: ProductPreset; onClose: () => void }) {
  const [liked, setLiked] = useState(false);
  const [added, setAdded] = useState(false);
  return (
    <div className="product-detail-layer">
      <section className="product-detail">
        <header><button type="button" onClick={onClose} aria-label="返回"><ArrowLeft size={21} /></button><strong>SCENE STORE</strong><div><button type="button" aria-label="收藏" onClick={() => setLiked((value) => !value)}><Star size={20} fill={liked ? "currentColor" : "none"} /></button><button type="button" aria-label="更多"><MoreHorizontal size={21} /></button></div></header>
        <div className="product-detail-hero"><img src={product.imageUrl} style={{ objectPosition: product.imagePosition }} alt={product.name} /><span>场景同款 · {product.category}</span><button type="button"><Search size={15} />找同款</button></div>
        <div className="product-detail-body">
          <div className="product-thumbs">{[0, 1, 2, 3].map((item) => <button className={item === 0 ? "active" : ""} type="button" key={item}><img src={product.imageUrl} style={{ objectPosition: `${40 + item * 7}% ${45 + item * 5}%` }} alt={`${product.name}细节 ${item + 1}`} /></button>)}</div>
          <div className="product-price"><strong>{product.priceLabel}</strong><span>已售 1000+</span></div>
          <h2>{product.name}</h2><p>{product.note}。同款单品可以复用到日常、旅行与城市拍摄等不同场景。</p>
          <div className="product-badges"><span><Truck size={14} />运费险</span><span><Star size={14} />好评率 96.2%</span><span>7 天无理由</span></div>
          <button className="delivery-row" type="button"><Truck size={18} /><div><strong>部分现货，预计明天发货</strong><span>支持 7 天无理由退货</span></div><ChevronRight size={18} /></button>
          <div className="product-scene-note"><Sparkles size={18} /><div><strong>来自场景 Look</strong><span>该商品已被 AI 识别，并关联到原视频完整搭配。</span></div></div>
        </div>
        <footer><button type="button"><Store size={18} /><span>进店</span></button><button type="button"><MessageCircle size={18} /><span>客服</span></button><button className="cart-button" type="button" onClick={() => setAdded(true)}>{added ? "已加入购物袋" : "加入购物袋"}</button><button className="buy-button" type="button">立即购买</button></footer>
      </section>
    </div>
  );
}
