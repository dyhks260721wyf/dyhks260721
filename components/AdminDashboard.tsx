"use client";

import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Film,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { VideoPreset } from "@/lib/content";

type ManagedItem = {
  video: VideoPreset;
  source: "preset" | "upload";
  active: boolean;
};

type Notice = { tone: "success" | "error"; message: string } | null;

const passwordStorageKey = "scene-fit-admin-password";

export function AdminDashboard() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [items, setItems] = useState<ManagedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "preset" | "upload">("all");
  const [notice, setNotice] = useState<Notice>(null);
  const [pendingDelete, setPendingDelete] = useState<ManagedItem | null>(null);
  const [orderingId, setOrderingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadItems(candidatePassword = password, quiet = false) {
    if (!candidatePassword) return false;
    if (!quiet) setLoading(true);
    try {
      const response = await fetch("/api/admin/content", {
        headers: { "x-admin-password": candidatePassword },
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({ message: "无法读取视频列表" })) as { items?: ManagedItem[]; message?: string };
      if (!response.ok || !payload.items) throw new Error(payload.message ?? "无法读取视频列表");
      setItems(payload.items);
      setAuthenticated(true);
      sessionStorage.setItem(passwordStorageKey, candidatePassword);
      return true;
    } catch (error) {
      setAuthenticated(false);
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "登录失败" });
      sessionStorage.removeItem(passwordStorageKey);
      return false;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const stored = sessionStorage.getItem(passwordStorageKey);
    if (!stored) return;
    setPassword(stored);
    void loadItems(stored, true);
    // Only restore the session once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    void loadItems();
  }

  function logout() {
    sessionStorage.removeItem(passwordStorageKey);
    setPassword("");
    setItems([]);
    setAuthenticated(false);
    setNotice(null);
  }

  async function uploadVideo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["video/mp4", "video/webm"].includes(file.type)) {
      setNotice({ tone: "error", message: "请选择 MP4 或 WebM 视频" });
      return;
    }
    if (file.size > 60 * 1024 * 1024) {
      setNotice({ tone: "error", message: "视频不能超过 60MB" });
      return;
    }

    setUploading(true);
    setNotice(null);
    try {
      const posterFrame = await createVideoPoster(file);
      const form = new FormData();
      form.set("media", file);
      form.set("posterFrame", posterFrame);
      const response = await fetch("/api/uploads", { method: "POST", body: form });
      const payload = await response.json().catch(() => ({ message: "上传失败" })) as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "上传失败");
      await loadItems(password, true);
      setNotice({ tone: "success", message: `“${file.name}”已加入视频流` });
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "上传失败" });
    } finally {
      setUploading(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setLoading(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/content/${encodeURIComponent(pendingDelete.video.id)}`, {
        method: "DELETE",
        headers: { "x-admin-password": password },
      });
      const payload = await response.json().catch(() => ({ message: "删除失败" })) as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "删除失败");
      const action = pendingDelete.source === "upload" ? "已永久删除" : "已从视频流移除";
      setPendingDelete(null);
      await loadItems(password, true);
      setNotice({ tone: "success", message: `${pendingDelete.video.title}${action}` });
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "删除失败" });
    } finally {
      setLoading(false);
    }
  }

  async function restorePreset(item: ManagedItem) {
    setLoading(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/content/${encodeURIComponent(item.video.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify({ active: true }),
      });
      const payload = await response.json().catch(() => ({ message: "恢复失败" })) as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "恢复失败");
      await loadItems(password, true);
      setNotice({ tone: "success", message: `${item.video.title}已恢复到视频流` });
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "恢复失败" });
    } finally {
      setLoading(false);
    }
  }

  async function moveVideo(videoId: string, direction: -1 | 1) {
    const activeItems = items.filter((item) => item.active);
    const currentIndex = activeItems.findIndex((item) => item.video.id === videoId);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= activeItems.length) return;

    const reordered = [...activeItems];
    [reordered[currentIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[currentIndex]];
    setOrderingId(videoId);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify({ orderedVideoIds: reordered.map((item) => item.video.id) }),
      });
      const payload = await response.json().catch(() => ({ message: "调整顺序失败" })) as { items?: ManagedItem[]; message?: string };
      if (!response.ok || !payload.items) throw new Error(payload.message ?? "调整顺序失败");
      setItems(payload.items);
      setNotice({ tone: "success", message: `${reordered[targetIndex].video.title}已移动到第 ${targetIndex + 1} 条` });
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "调整顺序失败" });
    } finally {
      setOrderingId(null);
    }
  }

  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return items.filter((item) => {
      if (filter !== "all" && item.source !== filter) return false;
      if (!normalized) return true;
      return [item.video.title, item.video.author, item.video.location, item.video.id]
        .some((value) => value.toLowerCase().includes(normalized));
    });
  }, [filter, items, query]);

  if (!authenticated) {
    return (
      <main className="admin-login-shell">
        <section className="admin-login-card">
          <div className="admin-login-mark"><span>入</span><span>镜</span><i /></div>
          <p className="admin-kicker">CONTENT CONTROL</p>
          <h1>视频流管理</h1>
          <p>输入管理密码，查看、上传或移除后端视频数据。</p>
          <form onSubmit={login}>
            <label><span>管理密码</span><input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" placeholder="请输入管理密码" autoFocus /></label>
            <button type="submit" disabled={loading || !password}>{loading ? <><span className="admin-spinner" />正在验证</> : <><ShieldCheck size={17} />进入管理面板</>}</button>
          </form>
          {notice?.tone === "error" && <div className="admin-login-error"><AlertCircle size={15} />{notice.message}</div>}
          <a href="/"><ArrowUpRight size={14} />返回用户端</a>
        </section>
      </main>
    );
  }

  const activeCount = items.filter((item) => item.active).length;
  const uploadCount = items.filter((item) => item.source === "upload").length;

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand"><div><span>入</span><span>镜</span></div><small>内容控制台</small></div>
        <nav aria-label="管理导航"><button className="active" type="button"><Film size={18} />视频流</button></nav>
        <div className="admin-sidebar-note"><i /><span>后端连接正常</span><small>实时读取视频目录</small></div>
        <div className="admin-sidebar-actions"><a href="/" target="_blank" rel="noreferrer"><ArrowUpRight size={16} />打开用户端</a><button type="button" onClick={logout}><LogOut size={16} />退出管理</button></div>
      </aside>

      <section className="admin-workspace">
        <header className="admin-header">
          <div><p className="admin-kicker">VIDEO FEED / {activeCount} ACTIVE</p><h1>管理视频流</h1><span>列表即用户端播放顺序，可用上下箭头调整；新视频默认排在末尾。</span></div>
          <input ref={fileInputRef} type="file" accept="video/mp4,video/webm" onChange={uploadVideo} hidden />
          <button className="admin-upload-button" type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()}>{uploading ? <><span className="admin-spinner dark" />正在处理视频</> : <><Upload size={18} />新增视频</>}</button>
        </header>

        <div className="admin-stats">
          <article><span>当前流中</span><strong>{activeCount}</strong><small>条可播放内容</small></article>
          <article><span>用户上传</span><strong>{uploadCount}</strong><small>条服务器文件</small></article>
          <article><span>已移除</span><strong>{items.length - activeCount}</strong><small>条内置示例</small></article>
        </div>

        {notice && <div className={`admin-notice ${notice.tone}`}>{notice.tone === "success" ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}<span>{notice.message}</span><button type="button" onClick={() => setNotice(null)} aria-label="关闭提示"><X size={16} /></button></div>}

        <div className="admin-toolbar">
          <div className="admin-filters">
            {([ ["all", "全部"], ["preset", "内置示例"], ["upload", "用户上传"] ] as const).map(([value, label]) => <button className={filter === value ? "active" : ""} type="button" key={value} onClick={() => setFilter(value)}>{label}</button>)}
          </div>
          <label className="admin-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题、作者或地点" /></label>
          <button className="admin-refresh" type="button" disabled={loading} onClick={() => void loadItems()} aria-label="刷新视频列表"><RefreshCw size={17} /></button>
        </div>

        <section className="admin-video-list" aria-label="视频列表">
          {visibleItems.map((item) => {
            const feedIndex = items.filter((candidate) => candidate.active).findIndex((candidate) => candidate.video.id === item.video.id);
            return (
              <article className={`admin-video-row ${item.active ? "" : "inactive"}`} key={item.video.id}>
                <div className="admin-feed-index">{item.active ? String(feedIndex + 1).padStart(2, "0") : "—"}<small>FEED</small></div>
                <img src={item.video.posterUrl} alt="" />
                <div className="admin-video-copy"><div><span className={`admin-source ${item.source}`}>{item.source === "preset" ? "内置" : "上传"}</span>{!item.active && <span className="admin-hidden"><EyeOff size={12} />已移除</span>}</div><h2>{item.video.title}</h2><p>@{item.video.author}<i />{item.video.location}</p><small>{item.video.uploadedAt ? formatDate(item.video.uploadedAt) : "随版本发布"} · {item.video.mediaType === "image" ? "图片" : "视频"}</small></div>
                <div className="admin-video-actions">
                  {item.active && <div className="admin-order-controls" aria-label={`调整${item.video.title}的播放顺序`}>
                    <button type="button" disabled={feedIndex <= 0 || orderingId !== null} onClick={() => void moveVideo(item.video.id, -1)} aria-label="上移一位"><ArrowUp size={16} /><span>上移</span></button>
                    <button type="button" disabled={feedIndex < 0 || feedIndex >= activeCount - 1 || orderingId !== null} onClick={() => void moveVideo(item.video.id, 1)} aria-label="下移一位"><ArrowDown size={16} /><span>下移</span></button>
                  </div>}
                  <a href={item.video.videoUrl || item.video.posterUrl} target="_blank" rel="noreferrer" aria-label="预览媒体"><Eye size={17} /><span>预览</span></a>
                  {item.active ? <button className="danger" type="button" onClick={() => setPendingDelete(item)}><Trash2 size={17} /><span>{item.source === "upload" ? "删除" : "移除"}</span></button> : <button type="button" onClick={() => void restorePreset(item)}><RefreshCw size={17} /><span>恢复</span></button>}
                </div>
              </article>
            );
          })}
          {visibleItems.length === 0 && <div className="admin-empty"><Film size={26} /><strong>没有匹配的视频</strong><span>更换筛选条件，或上传一条新视频。</span></div>}
        </section>
      </section>

      {pendingDelete && <div className="admin-dialog-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setPendingDelete(null)}><section className="admin-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-title"><div className="admin-dialog-icon"><Trash2 size={22} /></div><p className="admin-kicker">CONFIRM ACTION</p><h2 id="delete-title">{pendingDelete.source === "upload" ? "永久删除这条视频？" : "从视频流移除？"}</h2><p>{pendingDelete.source === "upload" ? "视频文件、封面和对应元数据会从服务器中删除，操作无法撤销。" : "这条内置示例将不再出现在用户端，但原始素材仍会保留，可随时恢复。"}</p><strong>{pendingDelete.video.title}</strong><div><button type="button" onClick={() => setPendingDelete(null)}>取消</button><button className="danger" type="button" disabled={loading} onClick={() => void confirmDelete()}>{loading ? "正在处理" : pendingDelete.source === "upload" ? "确认永久删除" : "确认移除"}</button></div></section></div>}
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function canvasPosterFile(source: CanvasImageSource, width: number, height: number) {
  const maxEdge = 1280;
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d");
  if (!context) return Promise.reject(new Error("当前浏览器无法制作视频封面"));
  context.fillStyle = "#101217";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return new Promise<File>((resolve, reject) => canvas.toBlob((blob) => blob
    ? resolve(new File([blob], "poster-frame.jpg", { type: "image/jpeg" }))
    : reject(new Error("视频封面生成失败")), "image/jpeg", 0.88));
}

async function createVideoPoster(file: File) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.src = objectUrl;
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("视频无法读取，请确认编码为 H.264 或 WebM"));
      video.load();
    });
    if (Number.isFinite(video.duration) && video.duration > 0.4) {
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
        video.currentTime = Math.min(2, Math.max(0.1, video.duration * 0.12));
      });
    }
    return await canvasPosterFile(video, video.videoWidth, video.videoHeight);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
