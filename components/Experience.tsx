"use client";

import {
  ArrowLeft,
  Bell,
  Bookmark,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  Grid2X2,
  Heart,
  Home,
  Images,
  MessageCircle,
  MoreHorizontal,
  Music2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  ScanFace,
  Search,
  Send,
  ShieldCheck,
  Share2,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Star,
  Store,
  Truck,
  Upload,
  User,
  UserRound,
  Volume2,
  WandSparkles,
  X,
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import type { HotspotPreset, ProductPreset, VideoPreset } from "@/lib/content";

type OpenSheet = "search" | "comments" | null;
type EntrySource = "pause_tag" | "comment_tab" | "ai_analysis";
type CommentTab = "comments" | "analysis" | "tryon";
type AppScreen = "feed" | "friends" | "messages" | "assets" | "publish";
type PoseStyle = "candid" | "walking" | "glance" | "editorial";

type UserTryOnProfile = {
  outfitStyle: string;
  bodyType: string;
  poseStyle: PoseStyle;
  heightCm: number;
  weightRange: string;
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

type GenerationJobPayload = {
  jobId: string;
  status: "queued" | "processing" | "completed" | "failed";
  stage?: "queued" | "analyzing" | "generating" | "rendering" | "completed" | "failed";
  message?: string;
  statusUrl?: string;
  resultUrl?: string;
  resultMode?: string;
  error?: { message?: string };
};

const profileStorageKey = "scene-fit:user-profile:v1";
const assetStorageKey = "scene-fit:generated-assets:v1";
const poseOptions: Array<{ value: PoseStyle; label: string; hint: string }> = [
  { value: "candid", label: "自然抓拍", hint: "松弛三分之四站姿" },
  { value: "walking", label: "漫步动态", hint: "迈步与衣料动势" },
  { value: "glance", label: "氛围回眸", hint: "转身看向镜头" },
  { value: "editorial", label: "时尚大片", hint: "不对称镜头姿势" },
];

export function Experience({ initialVideos }: { initialVideos: VideoPreset[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [openSheet, setOpenSheet] = useState<OpenSheet>(null);
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotPreset | null>(null);
  const [commentTab, setCommentTab] = useState<CommentTab>("comments");
  const [tryOn, setTryOn] = useState<{ open: boolean; source: EntrySource }>({ open: false, source: "pause_tag" });
  const [saved, setSaved] = useState<string[]>([]);
  const [screen, setScreen] = useState<AppScreen>("feed");
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  const [userProfile, setUserProfile] = useState<UserTryOnProfile | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [activeAsset, setActiveAsset] = useState<GeneratedAsset | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductPreset | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  const activeVideo = initialVideos[activeIndex] ?? initialVideos[0];
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
          const video = initialVideos.find((item) => item.id === asset.videoId);
          return video ? [{ ...asset, video }] : [];
        }));
      }
    } catch {
      localStorage.removeItem(profileStorageKey);
      localStorage.removeItem(assetStorageKey);
    } finally {
      setStorageReady(true);
    }
  }, [initialVideos]);

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
    setSelectedHotspot(null);
  }, [activeIndex]);

  function handleFeedScroll() {
    const feed = feedRef.current;
    if (!feed) return;
    const next = Math.round(feed.scrollTop / Math.max(feed.clientHeight, 1));
    if (next !== activeIndex && next >= 0 && next < initialVideos.length) setActiveIndex(next);
  }

  function openSearch(hotspot: HotspotPreset) {
    setPaused(true);
    setSelectedHotspot(hotspot);
    setOpenSheet("search");
  }

  function openComments(tab: CommentTab = "comments") {
    setPaused(true);
    setCommentTab(tab);
    setOpenSheet("comments");
  }

  function startTryOn(source: EntrySource) {
    setOpenSheet(null);
    setTryOn({ open: true, source });
  }

  function toggleSaved(videoId: string) {
    setSaved((current) => current.includes(videoId) ? current.filter((id) => id !== videoId) : [...current, videoId]);
  }

  function changeScreen(next: AppScreen) {
    setOpenSheet(null);
    setScreen(next);
    setActiveAsset(null);
  }

  function saveAsset(asset: GeneratedAsset) {
    setAssets((current) => [asset, ...current.filter((item) => item.id !== asset.id)]);
    setActiveAsset(asset);
  }

  function jumpToOriginal(videoId: string) {
    const index = initialVideos.findIndex((video) => video.id === videoId);
    if (index >= 0) {
      setActiveIndex(index);
      setScreen("feed");
      setActiveAsset(null);
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
          <p>一条短视频，拆出场景、整套 Look 和你的形象。暂停识物，继续生成。</p>
        </div>
        <div className="desktop-status">
          <span className="status-dot" />
          <span>FULL-STACK DEMO · V0.1</span>
        </div>
      </aside>

      <section className="device-frame" aria-label="场景化穿搭短视频体验">
        {screen === "feed" && <div className="top-tabs">
          <button type="button">同城</button>
          <button type="button">关注</button>
          <button className="active" type="button">推荐</button>
          <button className="top-search" type="button" aria-label="搜索"><Search size={21} /></button>
        </div>}

        <div className="video-feed" ref={feedRef} onScroll={handleFeedScroll}>
          {initialVideos.map((video, index) => (
            <FeedSlide
              key={video.id}
              video={video}
              active={index === activeIndex}
              paused={index === activeIndex && paused}
              saved={saved.includes(video.id)}
              onTogglePause={() => index === activeIndex && setPaused((value) => !value)}
              onSearch={openSearch}
              onComments={() => openComments("comments")}
              onTryOn={() => startTryOn("pause_tag")}
              onSave={() => toggleSaved(video.id)}
            />
          ))}
        </div>

        {screen !== "feed" && (
          <div className="app-screen-layer">
            {screen === "friends" && <FriendsScreen videos={initialVideos} onJumpOriginal={jumpToOriginal} />}
            {screen === "messages" && <MessagesScreen />}
            {screen === "assets" && (activeAsset
              ? <AssetDetailScreen asset={activeAsset} onBack={() => setActiveAsset(null)} onPublish={() => changeScreen("publish")} onJumpOriginal={() => jumpToOriginal(activeAsset.video.id)} onOpenProduct={setSelectedProduct} />
              : <AssetLibraryScreen assets={assets} videos={initialVideos} saved={saved} onOpenAsset={setActiveAsset} onJumpOriginal={jumpToOriginal} />)}
            {screen === "publish" && <PublishScreen asset={publishAsset} onBack={() => changeScreen("assets")} onJumpOriginal={() => jumpToOriginal(publishAsset.video.id)} onOpenProduct={setSelectedProduct} />}
          </div>
        )}

        <BottomNavigation active={screen} onChange={changeScreen} />

        {openSheet === "search" && selectedHotspot && (
          <VisualSearchSheet video={activeVideo} hotspot={selectedHotspot} onClose={() => setOpenSheet(null)} onOpenProduct={setSelectedProduct} />
        )}

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
            video={activeVideo}
            entrySource={tryOn.source}
            initialProfile={userProfile}
            onClose={() => setTryOn((value) => ({ ...value, open: false }))}
            onSaveProfile={setUserProfile}
            onSaveAsset={saveAsset}
            onOpenProduct={setSelectedProduct}
            onPublish={(asset) => { saveAsset(asset); setTryOn((value) => ({ ...value, open: false })); setScreen("publish"); }}
            onJumpOriginal={() => jumpToOriginal(activeVideo.id)}
          />
        )}

        {selectedProduct && <ProductDetail product={selectedProduct} onClose={() => setSelectedProduct(null)} />}
      </section>
    </main>
  );
}

function FeedSlide({
  video,
  active,
  paused,
  saved,
  onTogglePause,
  onSearch,
  onComments,
  onTryOn,
  onSave,
}: {
  video: VideoPreset;
  active: boolean;
  paused: boolean;
  saved: boolean;
  onTogglePause: () => void;
  onSearch: (hotspot: HotspotPreset) => void;
  onComments: () => void;
  onTryOn: () => void;
  onSave: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;
    if (active && !paused) {
      void element.play().catch(() => undefined);
    } else {
      element.pause();
    }
    if (!active) element.currentTime = 0;
  }, [active, paused]);

  return (
    <article className={`feed-slide tone-${video.accent}`} onClick={onTogglePause}>
      <video ref={videoRef} className="feed-media" src={video.videoUrl} poster={video.posterUrl} loop muted playsInline preload={active ? "auto" : "metadata"} />
      {paused && <img className="freeze-frame" src={video.posterUrl} alt="当前视频的高清识物帧" />}
      <div className="media-shade" />

      {paused && (
        <div className="recognition-layer" aria-label="已识别的穿搭单品">
          <div className="scan-line" />
          <div className="recognition-caption"><Sparkles size={13} /> AI 已拆解这套 Look</div>
          {video.hotspots.map((hotspot) => (
            <button
              className="hotspot-label"
              key={hotspot.id}
              style={{ left: `${hotspot.labelPosition.x}%`, top: `${hotspot.labelPosition.y}%` }}
              type="button"
              onClick={(event) => { event.stopPropagation(); onSearch(hotspot); }}
            >
              <span className="hotspot-dot" />
              {hotspot.label}
            </button>
          ))}
          <button className="try-on-float" type="button" onClick={(event) => { event.stopPropagation(); onTryOn(); }}>
            <WandSparkles size={17} /> 试试这套
          </button>
        </div>
      )}

      {!paused && active && <div className="tap-hint"><Pause size={13} /> 点击暂停 · 识别穿搭</div>}
      {paused && <div className="pause-glyph"><Play size={34} fill="currentColor" /></div>}

      <div className="feed-copy">
        <div className="location-chip">{video.location}</div>
        <h2>@{video.author}</h2>
        <p>{video.title}</p>
        <div className="audio-line"><Volume2 size={14} /><span>{video.audio}</span></div>
      </div>

      <div className="action-rail" onClick={(event) => event.stopPropagation()}>
        <button className="avatar-action" type="button" aria-label="作者主页"><span>{video.avatarLabel}</span><i>+</i></button>
        <RailAction active={liked} label={video.counts.likes} onClick={() => setLiked((value) => !value)}><Heart size={29} fill={liked ? "currentColor" : "none"} /></RailAction>
        <RailAction label={video.counts.comments} onClick={onComments}><MessageCircle size={28} fill="currentColor" /></RailAction>
        <RailAction active={saved} label={video.counts.saves} onClick={onSave}><Bookmark size={27} fill={saved ? "currentColor" : "none"} /></RailAction>
        <RailAction label="分享"><Share2 size={27} fill="currentColor" /></RailAction>
      </div>
    </article>
  );
}

function RailAction({ children, label, active = false, onClick }: { children: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return <button className={`rail-action ${active ? "active" : ""}`} type="button" onClick={onClick}>{children}<span>{label}</span></button>;
}

function BottomNavigation({ active, onChange }: { active: AppScreen; onChange: (screen: AppScreen) => void }) {
  return (
    <nav className="bottom-nav" aria-label="主导航">
      <button className={active === "feed" ? "active" : ""} type="button" onClick={() => onChange("feed")}><Home size={17} /><span>首页</span></button>
      <button className={active === "friends" ? "active" : ""} type="button" onClick={() => onChange("friends")}><UserRound size={17} /><span>朋友</span></button>
      <button className={`publish-button ${active === "publish" ? "active" : ""}`} type="button" aria-label="发布" onClick={() => onChange("publish")}><span><Plus size={20} /></span></button>
      <button className={active === "messages" ? "active" : ""} type="button" onClick={() => onChange("messages")}><Bell size={17} /><span>消息</span></button>
      <button className={active === "assets" ? "active" : ""} type="button" onClick={() => onChange("assets")}><User size={17} /><span>我</span></button>
    </nav>
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

function VisualSearchSheet({ video, hotspot, onClose, onOpenProduct }: { video: VideoPreset; hotspot: HotspotPreset; onClose: () => void; onOpenProduct: (product: ProductPreset) => void }) {
  const [tab, setTab] = useState<"mixed" | "products">("mixed");
  const products = video.products.filter((product) => hotspot.productIds.includes(product.id));
  const fallbackProducts = products.length ? products : video.products;

  return (
    <div className="sheet-layer" onClick={onClose}>
      <section className="bottom-sheet search-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="sheet-grabber" />
        <SheetHeader eyebrow="VISUAL SEARCH" title={hotspot.label.replace("搜同款", "")} onClose={onClose} />
        <div className="search-target">
          <div className="target-image"><img src={video.posterUrl} alt="识别目标" /></div>
          <div><span>当前识别</span><strong>{hotspot.label.replace("搜同款", "")}</strong><small>基于外观与穿搭语义匹配</small></div>
          <Sparkles size={20} />
        </div>
        <div className="sheet-tabs">
          <button className={tab === "mixed" ? "active" : ""} type="button" onClick={() => setTab("mixed")}>综合</button>
          <button className={tab === "products" ? "active" : ""} type="button" onClick={() => setTab("products")}>商品</button>
        </div>
        <div className="product-grid">
          {fallbackProducts.map((product) => <ProductCard key={product.id} product={product} onOpen={() => onOpenProduct(product)} />)}
          {tab === "mixed" && (
            <article className="related-card">
              <img src={video.posterUrl} alt="同单品其他场景" />
              <div><span>同单品 · 其他场景</span><strong>从雪线穿回城市</strong><small>3 个可复用搭配</small></div>
            </article>
          )}
        </div>
        <div className="fake-search"><Search size={17} /><span>继续搜「{hotspot.label.replace("搜同款", "") }」</span><button type="button">搜索</button></div>
      </section>
    </div>
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
    ["山茶", "这个配色和背景太贴了，像从湖里取的颜色。", "18分钟前"],
    ["Rin", "想看小个子版本，外套长度是关键。", "1小时前"],
    ["北纬三十七", "手套这一点酒红真的很妙。", "2小时前"],
  ];

  return (
    <div className="sheet-layer" onClick={onClose}>
      <section className="bottom-sheet comments-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="sheet-grabber" />
        <div className="comment-tabs">
          <button className={tab === "comments" ? "active" : ""} type="button" onClick={() => onTabChange("comments")}>评论 <span>{video.counts.comments}</span></button>
          <button className={tab === "analysis" ? "active" : ""} type="button" onClick={() => onTabChange("analysis")}><Sparkles size={14} /> AI 解析</button>
          <button className={tab === "tryon" ? "active" : ""} type="button" onClick={() => onTabChange("tryon")}><WandSparkles size={14} /> AI 试穿</button>
          <button className="comment-close" type="button" onClick={onClose} aria-label="关闭"><X size={20} /></button>
        </div>

        {tab === "comments" ? (
          <div className="comment-list">
            {comments.map(([name, text, time], index) => (
              <article className="comment-item" key={name}>
                <div className={`comment-avatar avatar-${index}`}>{name.slice(0, 1)}</div>
                <div><strong>{name}</strong><p>{text}</p><span>{time} · 回复</span></div>
                <Heart size={17} />
              </article>
            ))}
          </div>
        ) : tab === "analysis" ? (
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
        ) : (
          <div className="tryon-tab-panel">
            <div className="tryon-tab-visual"><img src={video.posterUrl} alt="AI 上身场景预览" /><div className="tryon-tab-scan"><ScanFace size={27} /><span>人物形象</span></div><div className="tryon-tab-plus">+</div><div className="tryon-tab-look"><WandSparkles size={27} /><span>完整 Look</span></div></div>
            <p className="eyebrow">AI TRY-ON</p>
            <h3>把视频里的整套穿搭，<br />放进你的形象。</h3>
            <p>录入清晰人像与身材信息，再选择你喜欢的动作。生成时保留原场景与整套 Look，重新塑造身体比例和姿势。</p>
            <div className="tryon-tab-benefits"><span><ShieldCheck size={15} />人像授权确认</span><span><UserRound size={15} />体型与姿势个性化</span><span><Images size={15} />结果存入 AIGC 相册</span></div>
            <button className="flow-primary" type="button" onClick={() => onTryOn("comment_tab")}><Camera size={18} />开始 AI 试穿</button>
          </div>
        )}
        {tab !== "tryon" && <div className="comment-input"><span>{tab === "analysis" ? "问 AI 或按住说话" : "留下你的评论"}</span><MoreHorizontal size={20} /><Send size={18} /></div>}
      </section>
    </div>
  );
}

function IntroOverlay({ onStart }: { onStart: () => void }) {
  return (
    <section className="intro-overlay">
      <div className="intro-image"><img src="/media/images/alpine-look.jpg" alt="雪山湖畔穿搭" /><div className="intro-scan" /></div>
      <div className="intro-content">
        <p className="eyebrow">SCENE FIT / 01</p>
        <h2>先看见场景，<br />再看见自己。</h2>
        <p>暂停视频识别整套 Look，从评论区看懂搭配，再生成你在同一个场景里的样子。</p>
        <div className="intro-steps"><span>暂停识物</span><i /><span>AI 解析</span><i /><span>AI 上身</span></div>
        <button type="button" onClick={onStart}>开始刷视频 <span>向上滑</span></button>
      </div>
    </section>
  );
}

function TryOnFlow({ video, entrySource, initialProfile, onClose, onSaveProfile, onSaveAsset, onOpenProduct, onPublish, onJumpOriginal }: {
  video: VideoPreset;
  entrySource: EntrySource;
  initialProfile: UserTryOnProfile | null;
  onClose: () => void;
  onSaveProfile: (profile: UserTryOnProfile) => void;
  onSaveAsset: (asset: GeneratedAsset) => void;
  onOpenProduct: (product: ProductPreset) => void;
  onPublish: (asset: GeneratedAsset) => void;
  onJumpOriginal: () => void;
}) {
  const [step, setStep] = useState(initialProfile ? 2 : 0);
  const [identityDataUrl, setIdentityDataUrl] = useState<string | null>(initialProfile?.identityDataUrl ?? null);
  const [useDemoIdentity, setUseDemoIdentity] = useState(initialProfile?.useDemoIdentity ?? true);
  const [heightCm, setHeightCm] = useState(initialProfile?.heightCm ?? 168);
  const [weightRange, setWeightRange] = useState(initialProfile?.weightRange ?? "50_60");
  const [outfitStyle, setOutfitStyle] = useState(initialProfile?.outfitStyle ?? "womenswear");
  const [bodyType, setBodyType] = useState(initialProfile?.bodyType ?? "hourglass");
  const [poseStyle, setPoseStyle] = useState<PoseStyle>(initialProfile?.poseStyle ?? "candid");
  const [consent, setConsent] = useState(initialProfile?.consentAccepted ?? false);
  const [generating, setGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState(0);
  const [generationStatusMessage, setGenerationStatusMessage] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultMode, setResultMode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultSaved, setResultSaved] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [captureFrames, setCaptureFrames] = useState<string[]>([]);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const faceDirections = ["正视镜头", "缓慢向左转", "缓慢向右转", "轻轻抬头", "轻轻低头"];
  const generationMessages = ["正在提交场景与授权人像", "Sol 正在识别场景与完整 Look", "Sol 已调用 image-2 生成画面", "正在完成最终渲染"];

  useEffect(() => () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setError("图片不能超过 4MB");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("请选择 JPEG、PNG 或 WebP 图片");
      return;
    }
    try {
      setIdentityDataUrl(await normalizeIdentityFile(file));
      setCaptureFrames([]);
      setUseDemoIdentity(false);
      setError(null);
    } catch {
      setError("这张照片无法读取，请换一张重试");
    }
  }

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("当前浏览器无法使用摄像头，请从相册选择照片");
      return;
    }
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 960 } }, audio: false });
      cameraStreamRef.current = stream;
      setCameraActive(true);
      setCaptureFrames([]);
      setUseDemoIdentity(false);
      setError(null);
      requestAnimationFrame(() => {
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
          void cameraVideoRef.current.play();
        }
      });
    } catch {
      setError("没有获得摄像头权限，请允许访问或从相册选择照片");
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
        weightRange,
        identityDataUrl,
        useDemoIdentity,
        consentAccepted: true,
        updatedAt: new Date().toISOString(),
      });
      const form = new FormData();
      form.set("videoId", video.id);
      form.set("heightCm", String(heightCm));
      form.set("weightRange", weightRange);
      form.set("bodyType", bodyType);
      form.set("poseStyle", poseStyle);
      form.set("outfitStyle", outfitStyle);
      form.set("consentAccepted", "true");
      form.set("entrySource", entrySource);
      if (identityDataUrl && !useDemoIdentity) form.set("identityBoard", await dataUrlToFile(identityDataUrl, "identity-board.jpg"));

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
          const resultResponse = await fetch(job.resultUrl, { cache: "no-store" });
          if (!resultResponse.ok) {
            const payload = await resultResponse.json().catch(() => ({ message: "生成图片暂时无法读取" }));
            throw new Error(payload.message ?? "生成图片暂时无法读取");
          }
          const dataUrl = await blobToDataUrl(await resultResponse.blob());
          setResultUrl(dataUrl);
          setResultMode(job.resultMode ?? resultResponse.headers.get("X-Demo-Mode"));
          setStep(3);
          break;
        }
        await waitForPoll();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "生成没有完成");
    } finally {
      setGenerating(false);
    }
  }

  function downloadResult() {
    if (!resultUrl) return;
    const anchor = document.createElement("a");
    anchor.href = resultUrl;
    anchor.download = `scene-fit-${video.id}.jpg`;
    anchor.click();
  }

  function buildAsset(): GeneratedAsset | null {
    if (!resultUrl) return null;
    return {
      id: `${video.id}-${Date.now()}`,
      imageUrl: resultUrl,
      video,
      description: `在${video.location}的光线里，用我的比例和动作重新演绎这套 ${video.analysis.tags.slice(0, 2).join("、")} Look。`,
      createdAt: "刚刚",
    };
  }

  function saveResult() {
    const asset = buildAsset();
    if (!asset) return;
    onSaveAsset(asset);
    setResultSaved(true);
  }

  function publishResult() {
    const asset = buildAsset();
    if (asset) onPublish(asset);
  }

  const stepTitle = ["录入你的形象", "补充身材信息", "确认生成内容", "你的场景 Look"][step];
  const canStepBack = step > 0 && step < 3 && !(initialProfile && step === 2);

  return (
    <div className="flow-layer">
      <section className="try-flow">
        <header className="flow-header">
          <button type="button" onClick={canStepBack ? () => setStep(step - 1) : onClose} aria-label={canStepBack ? "返回" : "关闭"}>{canStepBack ? <ArrowLeft size={21} /> : <X size={21} />}</button>
          <div><span>AI TRY-ON · {step + 1}/4</span><h3>{stepTitle}</h3></div>
          <div className="step-dots">{[0, 1, 2, 3].map((item) => <i key={item} className={item <= step ? "active" : ""} />)}</div>
        </header>

        {step === 0 && (
          <div className="flow-body identity-step">
            <div className="reference-strip"><img src={video.posterUrl} alt="场景参考" /><div><span>已锁定场景与 Look</span><strong>{video.location}</strong><small>系统会保留原场景氛围和完整穿搭</small></div><Check size={18} /></div>
            <div className={`face-capture-stage ${cameraActive ? "is-camera" : ""}`}>
              <div className="face-orbit" aria-label="人脸录入预览">
                {cameraActive
                  ? <video ref={cameraVideoRef} muted playsInline aria-label="摄像头实时预览" />
                  : <img src={useDemoIdentity ? video.posterUrl : identityDataUrl ?? video.posterUrl} alt={useDemoIdentity ? "演示人物" : "已录入的人像"} />}
                <span className="face-scan-line" />
                <i className="face-corner corner-one" /><i className="face-corner corner-two" />
              </div>
              <div className="capture-direction">
                <span>{cameraActive ? `动作 ${Math.min(captureFrames.length + 1, faceDirections.length)}/${faceDirections.length}` : useDemoIdentity ? "演示模式" : "形象已录入"}</span>
                <strong>{cameraActive ? faceDirections[Math.min(captureFrames.length, faceDirections.length - 1)] : useDemoIdentity ? "使用当前视频人物体验完整链路" : "已保存全脸特征，可继续生成"}</strong>
              </div>
              <div className="face-progress" aria-label="录入进度">
                {faceDirections.map((direction, index) => <span key={direction} className={index < captureFrames.length || (!cameraActive && !useDemoIdentity) ? "done" : index === captureFrames.length && cameraActive ? "active" : ""}>{index < captureFrames.length || (!cameraActive && !useDemoIdentity) ? <Check size={11} /> : index + 1}<small>{direction.replace("缓慢", "").replace("轻轻", "")}</small></span>)}
              </div>
              {cameraActive && <button className="capture-frame-button" disabled={captureFrames.length >= faceDirections.length} type="button" onClick={captureFaceAngle}><Camera size={18} />记录「{faceDirections[Math.min(captureFrames.length, faceDirections.length - 1)]}」</button>}
            </div>
            <div className="capture-actions">
              <button type="button" onClick={startCamera}><Camera size={17} />{cameraActive ? "重新录入" : "动态录入"}</button>
              <label><Upload size={17} />从相册选择<input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseFile} /></label>
            </div>
            <button className={`demo-identity-toggle ${useDemoIdentity ? "active" : ""}`} type="button" onClick={() => { stopCamera(); setUseDemoIdentity(true); setError(null); }}><CheckCircle2 size={16} />暂不录入，使用演示人物</button>
            <div className="privacy-note"><ShieldCheck size={17} /><p>仅上传本人或已获授权的人像；图片用于本次生成与个人 AIGC 相册，不用于身份识别。</p></div>
            {error && <p className="form-error">{error}</p>}
            <button className="flow-primary" disabled={cameraActive || (!useDemoIdentity && !identityDataUrl)} type="button" onClick={() => setStep(1)}>继续填写身材</button>
          </div>
        )}

        {step === 1 && (
          <div className="flow-body profile-step">
            <label className="field-label">穿搭方向</label>
            <div className="segmented"><button className={outfitStyle === "womenswear" ? "active" : ""} type="button" onClick={() => setOutfitStyle("womenswear")}>女士穿搭</button><button className={outfitStyle === "menswear" ? "active" : ""} type="button" onClick={() => setOutfitStyle("menswear")}>男士穿搭</button></div>
            <label className="field-label">身材类型</label>
            <div className="body-type-grid">
              {[["hourglass", "沙漏型"], ["triangle", "倒三角"], ["pear", "梨型"], ["rectangle", "直筒型"]].map(([value, label], index) => (
                <button className={bodyType === value ? "active" : ""} key={value} type="button" onClick={() => setBodyType(value)}><span className={`body-shape shape-${index}`}><UserRound size={31} /></span><strong>{label}</strong>{bodyType === value && <CheckCircle2 size={14} />}</button>
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
            <input id="height" className="height-range" type="range" min="140" max="210" value={heightCm} onChange={(event) => setHeightCm(Number(event.target.value))} />
            <div className="range-labels"><span>140</span><span>175</span><span>210</span></div>
            <label className="field-label">体重范围</label>
            <div className="weight-grid">
              {[['under_50', '50kg 以下'], ['50_60', '50–60kg'], ['60_70', '60–70kg'], ['70_85', '70–85kg'], ['over_85', '85kg 以上']].map(([value, label]) => <button className={weightRange === value ? "active" : ""} key={value} type="button" onClick={() => setWeightRange(value)}>{label}</button>)}
            </div>
            <p className="profile-hint">生成时会按身高、体重与体型重建全身比例，并重新编排姿势；结果仅作视觉预览，不提供尺码判断。</p>
            <button className="flow-primary" type="button" onClick={() => setStep(2)}>确认这些信息</button>
          </div>
        )}

        {step === 2 && (
          <form className="flow-body confirm-step" onSubmit={generate}>
            <div className="reference-cards">
              <article><img src={video.posterUrl} alt="场景" /><span>01 / 场景</span><strong>{video.location}</strong></article>
              <article><img src={video.posterUrl} alt="完整 Look" /><span>02 / LOOK</span><strong>{video.products.length} 件完整穿搭</strong></article>
              <article><img src={useDemoIdentity ? video.posterUrl : identityDataUrl ?? video.posterUrl} alt="人物" /><span>03 / 人物</span><strong>{useDemoIdentity ? "演示人物" : "我的形象"}</strong></article>
            </div>
            {initialProfile && <div className="profile-reuse-note"><CheckCircle2 size={18} /><div><strong>已使用你上次保存的形象</strong><span>以后从三个入口进入，都可以直接生成</span></div><button type="button" onClick={() => setStep(0)}>修改</button></div>}
            <div className="profile-summary"><span>{outfitStyle === "womenswear" ? "女士穿搭" : "男士穿搭"}</span><span>{bodyType === "hourglass" ? "沙漏型" : bodyType === "triangle" ? "倒三角" : bodyType === "pear" ? "梨型" : "直筒型"}</span><span>{heightCm} cm</span><span>{weightRange.replace("_", "–")} kg</span><span>{poseOptions.find((item) => item.value === poseStyle)?.label}</span></div>
            <label className="consent-row"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><i>{consent && <Check size={14} />}</i><span>我确认使用本人或已获授权的人像，并同意将图片发送至图像生成服务处理。</span></label>
            {error && <p className="form-error">{error}</p>}
            <button className="flow-primary generate-button" disabled={generating} type="submit">{generating ? <><span className="spinner" />正在融合场景与 Look</> : <><WandSparkles size={18} />生成我的场景 Look</>}</button>
            {generating && <div className="generation-progress" role="status" aria-live="polite"><div><Sparkles size={18} /><span><strong>{generationStatusMessage ?? generationMessages[generationStage]}</strong><small>生图耗时可能较长；未返回明确错误时会持续等待，请保持页面打开</small></span></div><div className="generation-track"><i style={{ width: `${(generationStage + 1) / generationMessages.length * 100}%` }} /></div></div>}
            <small className="generation-note">场景与授权人像直接交给 gpt-5.6-sol，由 Sol 在同一请求中调用 image-2。</small>
          </form>
        )}

        {step === 3 && resultUrl && (
          <div className="result-step">
            <img className="result-image" src={resultUrl} alt="生成的场景穿搭结果" />
            <div className="result-topline"><span><Sparkles size={14} /> {resultMode === "sol-image-generation" ? "Sol · AI 场景试穿" : "本地演示结果"}</span><small>{video.location}</small></div>
            <div className="result-panel">
              <span className="result-emotion">这一刻，场景终于有了你的样子</span>
              <h4>你已经在这个场景里了。</h4>
              <p>{`画面保留了${video.location}的光线、氛围与原视频完整 Look，并按你的身材比例和「${poseOptions.find((item) => item.value === poseStyle)?.label}」重新编排。`}</p>
              <button className={`save-result-block ${resultSaved ? "saved" : ""}`} type="button" onClick={saveResult}><span>{resultSaved ? <CheckCircle2 size={20} /> : <Bookmark size={20} />}<strong>{resultSaved ? "已收藏到我的穿搭" : "收藏图片"}</strong></span><small>{resultSaved ? "可前往「我–收藏–我的穿搭」查看" : "收藏后可进入个人页发布作品"}</small></button>
              <div className="result-actions"><button type="button" onClick={downloadResult}><Download size={18} />保存本地</button><button type="button" onClick={() => setStep(2)}><RotateCcw size={18} />再生成</button><button type="button" onClick={onClose}><Play size={18} />继续刷</button></div>
              <div className="result-publish-row"><button type="button" onClick={publishResult}><Sparkles size={18} />一键发布</button><button type="button" onClick={onJumpOriginal}><Music2 size={17} />原视频 / 原声</button></div>
              <div className="result-products-heading"><div><span>搭配同款</span><strong>把画面变成可买的 Look</strong></div><ShoppingCart size={20} /></div>
              <div className="result-product-grid">{video.products.map((product) => <ProductCard key={product.id} product={product} onOpen={() => onOpenProduct(product)} />)}</div>
              <button className="shop-look" type="button" onClick={() => onOpenProduct(video.products[0])}><ShoppingBag size={18} />查看这套 Look 的 {video.products.length} 件商品</button>
              <button className="back-feed" type="button" onClick={onClose}>返回继续刷视频</button>
            </div>
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

async function normalizeIdentityFile(file: File) {
  const source = await blobToDataUrl(file);
  const image = await loadDataUrlImage(source);
  const maxEdge = 960;
  const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("CANVAS_UNAVAILABLE");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.84);
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
      <div className="profile-hero"><img src="/media/images/alpine-look.jpg" alt="个人主页背景" /><div className="profile-shade" /><div className="profile-avatar">镜<span>+</span></div><div className="profile-name"><strong>Scene Fitter</strong><span>场景穿搭创作者</span></div><button type="button">编辑主页</button></div>
      <div className="profile-stats"><span><strong>12</strong>获赞</span><span><strong>{assets.length}</strong>AIGC 资产</span><span><strong>{saved.length}</strong>收藏视频</span><span><strong>8</strong>关注</span></div>
      <div className="profile-content-tabs"><button type="button">作品</button><button type="button">日常</button><button className="active" type="button">收藏</button><button type="button">喜欢</button></div>
      <div className="asset-tabs"><button className={tab === "saved" ? "active" : ""} type="button" onClick={() => setTab("saved")}><Bookmark size={15} />视频</button><button className={tab === "assets" ? "active" : ""} type="button" onClick={() => setTab("assets")}><Images size={15} />我的穿搭</button></div>
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
      <img className="asset-detail-image" src={asset.imageUrl} alt={asset.description} />
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
        <div className="publish-preview"><img src={asset.imageUrl} alt="发布图片预览" /><span><Sparkles size={13} />AIGC 图片</span></div>
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
