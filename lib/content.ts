export type NormalizedRect = { x: number; y: number; width: number; height: number };

export type ProductPreset = {
  id: string;
  name: string;
  category: string;
  priceLabel: string;
  imageUrl: string;
  imagePosition: string;
  note: string;
};

export type HotspotPreset = {
  id: string;
  label: string;
  bbox: NormalizedRect;
  labelPosition: { x: number; y: number };
  productIds: string[];
};

export type VideoPreset = {
  id: string;
  author: string;
  avatarLabel: string;
  title: string;
  location: string;
  audio: string;
  videoUrl: string;
  posterUrl: string;
  counts: { likes: string; comments: string; saves: string };
  eligible: boolean;
  accent: string;
  hotspots: HotspotPreset[];
  products: ProductPreset[];
  analysis: {
    summary: string;
    tags: string[];
    questions: Array<{ id: string; question: string; answer: string }>;
  };
};

const alpineImage = "/media/images/alpine-look.jpg";
const neonImage = "/media/images/neon-look.jpg";
const museumImage = "/media/images/museum-look.jpg";

export const contentManifest: { schemaVersion: "1"; contentVersion: string; videos: VideoPreset[] } = {
  schemaVersion: "1",
  contentVersion: "2026-07-21.1",
  videos: [
    {
      id: "alpine-lake",
      author: "野岸穿搭实验室",
      avatarLabel: "岸",
      title: "雪线之下，用象牙白把冷调湖景穿得更轻。",
      location: "班夫 · 冰川湖",
      audio: "冷湖来信 · 原声",
      videoUrl: "/media/videos/alpine-look.mp4",
      posterUrl: alpineImage,
      counts: { likes: "12.8w", comments: "1.8w", saves: "3.4w" },
      eligible: true,
      accent: "cyan",
      hotspots: [
        { id: "beret", label: "搜同款贝雷帽", bbox: { x: 39, y: 24, width: 27, height: 14 }, labelPosition: { x: 7, y: 28 }, productIds: ["beret-01"] },
        { id: "overshirt", label: "搜同款羊毛外套", bbox: { x: 25, y: 42, width: 62, height: 39 }, labelPosition: { x: 4, y: 51 }, productIds: ["shirt-01"] },
        { id: "gloves", label: "搜同款酒红手套", bbox: { x: 23, y: 72, width: 54, height: 18 }, labelPosition: { x: 49, y: 76 }, productIds: ["glove-01"] },
      ],
      products: [
        { id: "beret-01", name: "炭灰羊毛贝雷帽", category: "帽子", priceLabel: "¥239", imageUrl: alpineImage, imagePosition: "50% 24%", note: "同色系压住湖景冷感" },
        { id: "shirt-01", name: "象牙白肌理外套", category: "外套", priceLabel: "¥899", imageUrl: alpineImage, imagePosition: "58% 56%", note: "宽松廓形，适合叠穿" },
        { id: "glove-01", name: "酒红皮质手套", category: "配饰", priceLabel: "¥319", imageUrl: alpineImage, imagePosition: "60% 77%", note: "低饱和造型焦点" },
      ],
      analysis: {
        summary: "这套 Look 用大面积象牙白承接雪山和阴天的漫反射，炭灰帽子与裤装收住轮廓，再用酒红手套制造一个面积很小但明确的视觉焦点。",
        tags: ["旅行打卡", "冷调叠穿", "松弛廓形"],
        questions: [
          { id: "q1", question: "这套适合什么温度？", answer: "从画面层次看，更适合约 3–12°C 的干冷环境；实际保暖度仍取决于内层和面料克重。" },
          { id: "q2", question: "小个子怎么调整？", answer: "保留同色系，缩短外套长度并抬高包带位置，能减少上半身被宽松廓形吞没的感觉。" },
          { id: "q3", question: "还有什么场景能穿？", answer: "同一套配色也适合冬季咖啡馆、城市公园和低饱和建筑空间。" },
        ],
      },
    },
    {
      id: "neon-cafe",
      author: "夜行衣橱",
      avatarLabel: "夜",
      title: "雨后霓虹不是背景，是酒红皮衣的第二层光。",
      location: "上海 · 夜间街区",
      audio: "After rain · 城市采样",
      videoUrl: "/media/videos/neon-look.mp4",
      posterUrl: neonImage,
      counts: { likes: "8.6w", comments: "6200", saves: "1.9w" },
      eligible: true,
      accent: "coral",
      hotspots: [
        { id: "jacket", label: "搜同款酒红皮衣", bbox: { x: 24, y: 27, width: 47, height: 36 }, labelPosition: { x: 3, y: 42 }, productIds: ["jacket-01"] },
        { id: "scarf", label: "搜同款灰色围巾", bbox: { x: 42, y: 27, width: 22, height: 36 }, labelPosition: { x: 56, y: 34 }, productIds: ["scarf-01"] },
      ],
      products: [
        { id: "jacket-01", name: "短款酒红机车夹克", category: "外套", priceLabel: "¥1,299", imageUrl: neonImage, imagePosition: "43% 42%", note: "借霓虹反光强化皮革质感" },
        { id: "scarf-01", name: "石墨灰羊毛围巾", category: "配饰", priceLabel: "¥399", imageUrl: neonImage, imagePosition: "54% 41%", note: "连接上装与黑色裤装" },
      ],
      analysis: {
        summary: "酒红皮衣与暖红霓虹互相借色，灰色针织和围巾提供哑光过渡，宽腿黑裤把反光密集的上半身稳住。",
        tags: ["城市夜景", "雨天皮革", "男士叠穿"],
        questions: [
          { id: "q1", question: "皮衣怎么避免太硬？", answer: "用针织高领和软羊毛围巾增加哑光、柔软材质，裤装选有垂感的宽腿版型。" },
          { id: "q2", question: "白天能穿吗？", answer: "可以。白天建议减少高反光配饰，用灰黑内搭保留皮衣本身的颜色重点。" },
        ],
      },
    },
    {
      id: "museum-blue",
      author: "建筑里的衣服",
      avatarLabel: "构",
      title: "高饱和蓝放进石灰岩建筑，轮廓比颜色更先被看见。",
      location: "海边美术馆",
      audio: "Hard light · 原声",
      videoUrl: "/media/videos/museum-look.mp4",
      posterUrl: museumImage,
      counts: { likes: "6.2w", comments: "4100", saves: "2.1w" },
      eligible: true,
      accent: "blue",
      hotspots: [
        { id: "blazer", label: "搜同款钴蓝西装", bbox: { x: 37, y: 35, width: 39, height: 33 }, labelPosition: { x: 4, y: 47 }, productIds: ["blazer-01"] },
        { id: "trousers", label: "搜同款奶油长裤", bbox: { x: 40, y: 56, width: 32, height: 36 }, labelPosition: { x: 56, y: 69 }, productIds: ["trouser-01"] },
      ],
      products: [
        { id: "blazer-01", name: "钴蓝结构西装", category: "外套", priceLabel: "¥1,099", imageUrl: museumImage, imagePosition: "56% 48%", note: "硬朗肩线呼应建筑拱券" },
        { id: "trouser-01", name: "奶油白垂感长裤", category: "裤装", priceLabel: "¥599", imageUrl: museumImage, imagePosition: "55% 73%", note: "低对比下装延长视觉比例" },
      ],
      analysis: {
        summary: "钴蓝西装是唯一高饱和色，白色内搭与奶油裤装融入石材背景。建筑硬阴影和西装肩线形成同一种几何秩序。",
        tags: ["建筑打卡", "通勤改造", "高饱和重点"],
        questions: [
          { id: "q1", question: "蓝西装日常怎么搭？", answer: "保留白色或米色内搭，把其他单品控制在低饱和中性色，蓝色就不会显得用力过度。" },
          { id: "q2", question: "适合正式场合吗？", answer: "版型足够正式，但颜色更有表达感，适合创意行业会议、展览或轻商务场合。" },
        ],
      },
    },
  ],
};

export function findVideo(videoId: string) {
  return contentManifest.videos.find((video) => video.id === videoId);
}
