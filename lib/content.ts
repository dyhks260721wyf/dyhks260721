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
const nalatiImage = "/media/images/nalati-blue-dress.jpg";
const guilinImage = "/media/images/guilin-window-look.jpg";
const islandImage = "/media/images/island-summer-look.jpg";

export const contentManifest: { schemaVersion: "1"; contentVersion: string; videos: VideoPreset[] } = {
  schemaVersion: "1",
  contentVersion: "2026-07-22.1",
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
    {
      id: "nalati-blue-dress",
      author: "YQ_shopqian2.0",
      avatarLabel: "YQ",
      title: "Live 图里的生命力，是无法复刻的瞬间。蓝裙转起来，就是那拉提的夏天。",
      location: "新疆 · 那拉提小溪",
      audio: "那拉提的夏天 · 原声",
      videoUrl: "/media/videos/nalati-blue-dress.mp4",
      posterUrl: nalatiImage,
      counts: { likes: "89.1w", comments: "4380", saves: "9.0w" },
      eligible: true,
      accent: "blue",
      hotspots: [
        { id: "straw-hat", label: "搜同款草编礼帽", bbox: { x: 41, y: 37, width: 20, height: 11 }, labelPosition: { x: 5, y: 36 }, productIds: ["nalati-hat-01"] },
        { id: "blue-gown", label: "搜同款钴蓝长裙", bbox: { x: 16, y: 45, width: 73, height: 41 }, labelPosition: { x: 55, y: 56 }, productIds: ["nalati-dress-01"] },
      ],
      products: [
        { id: "nalati-dress-01", name: "钴蓝大摆度假长裙", category: "连衣裙", priceLabel: "¥699", imageUrl: nalatiImage, imagePosition: "52% 65%", note: "高饱和裙摆与草原、溪流形成强对比" },
        { id: "nalati-hat-01", name: "驼色宽檐草编帽", category: "帽子", priceLabel: "¥169", imageUrl: nalatiImage, imagePosition: "51% 41%", note: "暖色配饰中和蓝裙与天空的冷色调" },
      ],
      analysis: {
        summary: "钴蓝大摆裙是画面的绝对焦点，旋转时形成有生命力的放射轮廓；草编帽补入暖色和旅行感，背景的草地、溪流与蓝天让这套 Look 很适合草原打卡。",
        tags: ["草原旅拍", "大摆长裙", "高饱和蓝"],
        questions: [
          { id: "q1", question: "这条裙子怎样拍更出片？", answer: "让镜头稍微降低并留出裙摆空间，侧身提起一侧裙摆或缓慢转身，能同时保留腰线和动态弧线。" },
          { id: "q2", question: "不想穿这么夸张怎么办？", answer: "可换成同色系 A 字长裙或蓝色吊带裙，保留颜色记忆点，再用草帽延续度假氛围。" },
          { id: "q3", question: "还适合哪些场景？", answer: "湖边、森林木屋、花田和日落草坡都能承接这套高饱和蓝色 Look。" },
        ],
      },
    },
    {
      id: "guilin-window-look",
      author: "好运膏膏",
      avatarLabel: "膏",
      title: "把桂林山水装进落地窗，水墨印花刚好与窗外的青绿呼应。",
      location: "桂林 · 阳朔山景酒店",
      audio: "兰心若水 · 古意",
      videoUrl: "/media/videos/guilin-window-look.mp4",
      posterUrl: guilinImage,
      counts: { likes: "1.1w", comments: "243", saves: "333" },
      eligible: true,
      accent: "coral",
      hotspots: [
        { id: "floral-top", label: "搜同款水墨印花上衣", bbox: { x: 22, y: 28, width: 62, height: 30 }, labelPosition: { x: 3, y: 37 }, productIds: ["guilin-top-01"] },
        { id: "floral-skirt", label: "搜同款水墨印花长裙", bbox: { x: 30, y: 53, width: 44, height: 40 }, labelPosition: { x: 54, y: 70 }, productIds: ["guilin-skirt-01"] },
      ],
      products: [
        { id: "guilin-top-01", name: "水墨花卉薄纱上衣", category: "上衣", priceLabel: "¥329", imageUrl: guilinImage, imagePosition: "51% 45%", note: "柔软廓形呼应山水的层叠雾感" },
        { id: "guilin-skirt-01", name: "水墨花卉垂感长裙", category: "半身裙", priceLabel: "¥459", imageUrl: guilinImage, imagePosition: "49% 77%", note: "同花色套装拉长纵向比例" },
      ],
      analysis: {
        summary: "上衣和长裙使用同一组低饱和水墨花色，人物与窗外喀斯特山景形成近似的色彩层次。轻薄面料和舒展动作让室内取景不显沉闷。",
        tags: ["桂林旅拍", "新中式", "水墨套装"],
        questions: [
          { id: "q1", question: "这种印花会显得老气吗？", answer: "关键是保留轻薄面料和清晰腰线，配饰尽量简洁；妆发保持自然，整体会更接近轻新中式。" },
          { id: "q2", question: "窗边怎么避免逆光黑脸？", answer: "人物与玻璃保持一点距离，身体转向侧窗约 30 度，并让相机按人脸测光，可同时保留面部和山景层次。" },
          { id: "q3", question: "可以拆开搭配吗？", answer: "可以。印花上衣可配米白直筒裤，长裙可配无图案的奶油色针织上衣，减少大面积印花。" },
        ],
      },
    },
    {
      id: "island-summer-look",
      author: "无语的田",
      avatarLabel: "田",
      title: "夏天需要海岛和好天气，也需要一套能走沙滩、能拍照的轻盈 Look。",
      location: "热带海岛 · 白沙滩",
      audio: "无语的田 · 原声",
      videoUrl: "/media/videos/island-summer-look.mp4",
      posterUrl: islandImage,
      counts: { likes: "3.2w", comments: "111", saves: "1802" },
      eligible: true,
      accent: "cyan",
      hotspots: [
        { id: "beach-hat", label: "搜同款流苏草帽", bbox: { x: 33, y: 23, width: 38, height: 17 }, labelPosition: { x: 5, y: 24 }, productIds: ["island-hat-01"] },
        { id: "crochet-top", label: "搜同款镂空针织上衣", bbox: { x: 30, y: 42, width: 45, height: 28 }, labelPosition: { x: 52, y: 48 }, productIds: ["island-top-01"] },
        { id: "denim-shorts", label: "搜同款黑色牛仔短裤", bbox: { x: 31, y: 66, width: 43, height: 18 }, labelPosition: { x: 4, y: 73 }, productIds: ["island-shorts-01"] },
        { id: "crochet-bag", label: "搜同款镂空托特包", bbox: { x: 12, y: 43, width: 27, height: 35 }, labelPosition: { x: 55, y: 80 }, productIds: ["island-bag-01"] },
      ],
      products: [
        { id: "island-hat-01", name: "自然毛边宽檐草帽", category: "帽子", priceLabel: "¥139", imageUrl: islandImage, imagePosition: "52% 28%", note: "遮阳同时给面部留下柔和纹理光" },
        { id: "island-top-01", name: "奶油白镂空针织上衣", category: "上衣", priceLabel: "¥269", imageUrl: islandImage, imagePosition: "52% 54%", note: "轻透层次适合叠穿泳装" },
        { id: "island-shorts-01", name: "炭黑低腰牛仔短裤", category: "裤装", priceLabel: "¥299", imageUrl: islandImage, imagePosition: "54% 73%", note: "深色下装压住全身浅色单品" },
        { id: "island-bag-01", name: "奶油色钩针托特包", category: "包袋", priceLabel: "¥199", imageUrl: islandImage, imagePosition: "27% 60%", note: "呼应上衣纹理，适合轻量沙滩物品" },
      ],
      analysis: {
        summary: "草帽、镂空针织和钩针包形成统一的自然材质语言，黑色短裤提供清晰腰线。浅色上装在强日照与蓝色海面前保持轻盈，适合海岛步行和近景拍摄。",
        tags: ["海岛度假", "针织叠穿", "沙滩 Look"],
        questions: [
          { id: "q1", question: "去海边这样穿实用吗？", answer: "上装和包袋都轻便，但镂空针织容易勾挂；下水前建议单独收好，行走时注意足部防晒。" },
          { id: "q2", question: "怎样拍得自然？", answer: "扶帽沿、沿浪线慢走或倚靠椰树都比正面站直更松弛；镜头略低于胸口可保留海平线和腿部比例。" },
          { id: "q3", question: "不穿短裤还能怎么搭？", answer: "可以换成白色亚麻长裤或轻薄围裹裙，色调仍与草帽、针织上衣保持统一。" },
        ],
      },
    },
  ],
};

export function findVideo(videoId: string) {
  return contentManifest.videos.find((video) => video.id === videoId);
}
