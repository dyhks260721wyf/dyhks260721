"use client";

import {
  ArrowLeft,
  Bookmark,
  Camera,
  Check,
  ChevronDown,
  Download,
  Heart,
  ImagePlus,
  MessageCircle,
  MoreHorizontal,
  Pause,
  Play,
  RotateCcw,
  Search,
  Send,
  Share2,
  ShoppingBag,
  Sparkles,
  Upload,
  Volume2,
  WandSparkles,
  X,
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { HotspotPreset, ProductPreset, VideoPreset } from "@/lib/content";

type OpenSheet = "search" | "comments" | null;
type EntrySource = "pause_tag" | "ai_analysis";

export function Experience({ initialVideos }: { initialVideos: VideoPreset[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [openSheet, setOpenSheet] = useState<OpenSheet>(null);
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotPreset | null>(null);
  const [commentTab, setCommentTab] = useState<"comments" | "analysis">("comments");
  const [tryOn, setTryOn] = useState<{ open: boolean; source: EntrySource }>({ open: false, source: "pause_tag" });
  const [introVisible, setIntroVisible] = useState(true);
  const [saved, setSaved] = useState<string[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);

  const activeVideo = initialVideos[activeIndex] ?? initialVideos[0];

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

  function openComments(tab: "comments" | "analysis" = "comments") {
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
        <div className="top-tabs">
          <button type="button">关注</button>
          <button className="active" type="button">推荐</button>
          <button className="top-search" type="button" aria-label="搜索"><Search size={21} /></button>
        </div>

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

        <nav className="bottom-nav" aria-label="主导航">
          <button className="active" type="button">首页</button>
          <button type="button">商城</button>
          <button className="publish-button" type="button" aria-label="发布"><span /></button>
          <button type="button">消息</button>
          <button type="button">我</button>
        </nav>

        {openSheet === "search" && selectedHotspot && (
          <VisualSearchSheet video={activeVideo} hotspot={selectedHotspot} onClose={() => setOpenSheet(null)} />
        )}

        {openSheet === "comments" && (
          <CommentsSheet
            video={activeVideo}
            tab={commentTab}
            onTabChange={setCommentTab}
            onClose={() => setOpenSheet(null)}
            onTryOn={() => startTryOn("ai_analysis")}
          />
        )}

        {tryOn.open && (
          <TryOnFlow
            video={activeVideo}
            entrySource={tryOn.source}
            onClose={() => setTryOn((value) => ({ ...value, open: false }))}
          />
        )}

        {introVisible && <IntroOverlay onStart={() => setIntroVisible(false)} />}
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
            <WandSparkles size={17} /> AI 上身
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

function SheetHeader({ title, eyebrow, onClose }: { title: string; eyebrow?: string; onClose: () => void }) {
  return (
    <header className="sheet-header">
      <div><span>{eyebrow}</span><h3>{title}</h3></div>
      <button type="button" onClick={onClose} aria-label="关闭"><X size={21} /></button>
    </header>
  );
}

function VisualSearchSheet({ video, hotspot, onClose }: { video: VideoPreset; hotspot: HotspotPreset; onClose: () => void }) {
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
          {fallbackProducts.map((product) => <ProductCard key={product.id} product={product} />)}
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

function ProductCard({ product }: { product: ProductPreset }) {
  return (
    <article className="product-card">
      <div className="product-image"><img src={product.imageUrl} style={{ objectPosition: product.imagePosition }} alt={product.name} /><span>{product.category}</span></div>
      <div className="product-info"><strong>{product.name}</strong><p>{product.note}</p><div><b>{product.priceLabel}</b><button type="button"><ShoppingBag size={15} />查看</button></div></div>
    </article>
  );
}

function CommentsSheet({ video, tab, onTabChange, onClose, onTryOn }: { video: VideoPreset; tab: "comments" | "analysis"; onTabChange: (tab: "comments" | "analysis") => void; onClose: () => void; onTryOn: () => void }) {
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
        ) : (
          <div className="analysis-panel">
            <div className="analysis-heading"><span><Sparkles size={16} /> AI 内容摘要</span><small>内容由 AI 辅助生成，请结合实际判断</small></div>
            <p className="analysis-summary">{video.analysis.summary}</p>
            <div className="analysis-tags">{video.analysis.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
            <button className="analysis-try-on" type="button" onClick={onTryOn}><span><WandSparkles size={20} />把这套穿到我身上</span><small>保留原场景与完整 Look</small></button>
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
        <div className="comment-input"><span>{tab === "analysis" ? "问 AI 或按住说话" : "留下你的评论"}</span><MoreHorizontal size={20} /><Send size={18} /></div>
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

function TryOnFlow({ video, entrySource, onClose }: { video: VideoPreset; entrySource: EntrySource; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [identityFile, setIdentityFile] = useState<File | null>(null);
  const [identityPreview, setIdentityPreview] = useState<string | null>(null);
  const [useDemoIdentity, setUseDemoIdentity] = useState(true);
  const [heightCm, setHeightCm] = useState(168);
  const [weightRange, setWeightRange] = useState("50_60");
  const [outfitStyle, setOutfitStyle] = useState("womenswear");
  const [consent, setConsent] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultMode, setResultMode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => {
    if (identityPreview) URL.revokeObjectURL(identityPreview);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
  }, [identityPreview, resultUrl]);

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setError("图片不能超过 4MB");
      return;
    }
    if (identityPreview) URL.revokeObjectURL(identityPreview);
    setIdentityFile(file);
    setIdentityPreview(URL.createObjectURL(file));
    setUseDemoIdentity(false);
    setError(null);
  }

  async function generate(event: FormEvent) {
    event.preventDefault();
    if (!consent) { setError("请确认你有权使用这张人像"); return; }
    setGenerating(true);
    setError(null);

    try {
      const form = new FormData();
      form.set("videoId", video.id);
      form.set("heightCm", String(heightCm));
      form.set("weightRange", weightRange);
      form.set("outfitStyle", outfitStyle);
      form.set("consentAccepted", "true");
      form.set("entrySource", entrySource);
      if (identityFile && !useDemoIdentity) form.set("identityBoard", identityFile);

      const response = await fetch("/api/generate", { method: "POST", body: form });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ message: "生成没有完成" }));
        throw new Error(payload.message ?? "生成没有完成");
      }
      const blob = await response.blob();
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      setResultUrl(URL.createObjectURL(blob));
      setResultMode(response.headers.get("X-Demo-Mode"));
      setStep(3);
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

  const stepTitle = ["选择你的形象", "补充身材信息", "确认生成输入", "你的场景 Look"][step];

  return (
    <div className="flow-layer">
      <section className="try-flow">
        <header className="flow-header">
          <button type="button" onClick={step > 0 && step < 3 ? () => setStep(step - 1) : onClose} aria-label="返回">{step > 0 && step < 3 ? <ArrowLeft size={21} /> : <X size={21} />}</button>
          <div><span>AI TRY-ON · {step + 1}/4</span><h3>{stepTitle}</h3></div>
          <div className="step-dots">{[0, 1, 2, 3].map((item) => <i key={item} className={item <= step ? "active" : ""} />)}</div>
        </header>

        {step === 0 && (
          <div className="flow-body identity-step">
            <div className="reference-strip"><img src={video.posterUrl} alt="场景参考" /><div><span>已锁定场景与 Look</span><strong>{video.location}</strong><small>系统会保留原场景氛围和完整穿搭</small></div><Check size={18} /></div>
            <div className="identity-grid">
              <button className={useDemoIdentity ? "active" : ""} type="button" onClick={() => { setUseDemoIdentity(true); setError(null); }}>
                <img src={video.posterUrl} alt="演示人物" /><span><Check size={15} /> 使用演示人物</span>
              </button>
              <label className={!useDemoIdentity ? "active" : ""}>
                {identityPreview ? <img src={identityPreview} alt="我的人像预览" /> : <div><Camera size={28} /><span>上传正面人像</span><small>JPEG / PNG / WebP</small></div>}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseFile} />
                {identityPreview && <span><Upload size={15} /> 已选择我的照片</span>}
              </label>
            </div>
            <div className="privacy-note"><ImagePlus size={17} /><p>第一版支持单张清晰正面照。正式版将增加正面、左右侧脸与全身参考。</p></div>
            {error && <p className="form-error">{error}</p>}
            <button className="flow-primary" type="button" onClick={() => setStep(1)}>继续填写身材</button>
          </div>
        )}

        {step === 1 && (
          <div className="flow-body profile-step">
            <label className="field-label">穿搭方向</label>
            <div className="segmented"><button className={outfitStyle === "womenswear" ? "active" : ""} type="button" onClick={() => setOutfitStyle("womenswear")}>女士穿搭</button><button className={outfitStyle === "menswear" ? "active" : ""} type="button" onClick={() => setOutfitStyle("menswear")}>男士穿搭</button></div>
            <label className="field-label" htmlFor="height">身高 <strong>{heightCm} cm</strong></label>
            <input id="height" className="height-range" type="range" min="140" max="210" value={heightCm} onChange={(event) => setHeightCm(Number(event.target.value))} />
            <div className="range-labels"><span>140</span><span>175</span><span>210</span></div>
            <label className="field-label">体重范围</label>
            <div className="weight-grid">
              {[['under_50', '50kg 以下'], ['50_60', '50–60kg'], ['60_70', '60–70kg'], ['70_85', '70–85kg'], ['over_85', '85kg 以上']].map(([value, label]) => <button className={weightRange === value ? "active" : ""} key={value} type="button" onClick={() => setWeightRange(value)}>{label}</button>)}
            </div>
            <p className="profile-hint">身材信息只用于大致比例，不提供尺码或合身度判断。</p>
            <button className="flow-primary" type="button" onClick={() => setStep(2)}>检查生成输入</button>
          </div>
        )}

        {step === 2 && (
          <form className="flow-body confirm-step" onSubmit={generate}>
            <div className="reference-cards">
              <article><img src={video.posterUrl} alt="场景" /><span>01 / 场景</span><strong>{video.location}</strong></article>
              <article><img src={video.posterUrl} alt="完整 Look" /><span>02 / LOOK</span><strong>{video.products.length} 件完整穿搭</strong></article>
              <article><img src={useDemoIdentity ? video.posterUrl : identityPreview ?? video.posterUrl} alt="人物" /><span>03 / 人物</span><strong>{useDemoIdentity ? "演示人物" : "我的照片"}</strong></article>
            </div>
            <div className="profile-summary"><span>{outfitStyle === "womenswear" ? "女士穿搭" : "男士穿搭"}</span><span>{heightCm} cm</span><span>{weightRange.replace("_", "–")} kg</span></div>
            <label className="consent-row"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><i>{consent && <Check size={14} />}</i><span>我确认使用本人或已获授权的人像，并同意将图片发送至图像生成服务处理。</span></label>
            {error && <p className="form-error">{error}</p>}
            <button className="flow-primary generate-button" disabled={generating} type="submit">{generating ? <><span className="spinner" />正在融合场景与 Look</> : <><WandSparkles size={18} />生成我的场景 Look</>}</button>
            <small className="generation-note">服务端通过兼容网关调用 GPT Image 2；未配置密钥时返回本地演示结果。</small>
          </form>
        )}

        {step === 3 && resultUrl && (
          <div className="result-step">
            <img className="result-image" src={resultUrl} alt="生成的场景穿搭结果" />
            <div className="result-topline"><span><Sparkles size={14} /> {resultMode === "compatible-gateway" ? "GPT Image 2 生成" : resultMode === "gateway-fallback" ? "网关超时 · 演示结果" : "本地演示结果"}</span><small>{video.location}</small></div>
            <div className="result-panel">
              <h4>你已经在这个场景里了。</h4>
              <p>场景、完整 Look 与人物形象已合并为一张可保存资产。</p>
              <div className="result-actions"><button type="button" onClick={downloadResult}><Download size={18} />保存</button><button type="button" onClick={() => setStep(2)}><RotateCcw size={18} />再生成</button><button type="button"><Share2 size={18} />分享</button></div>
              <button className="shop-look" type="button"><ShoppingBag size={18} />查看这套 Look 的 {video.products.length} 件商品</button>
              <button className="back-feed" type="button" onClick={onClose}>返回继续刷视频</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
