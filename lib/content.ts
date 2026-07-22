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
  mediaType?: "video" | "image";
  userUploaded?: boolean;
  uploadedAt?: string;
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

const nalatiImage = "/media/images/nalati-blue-dress.jpg";
const guilinImage = "/media/images/guilin-window-look.jpg";
const islandImage = "/media/images/island-summer-look.jpg";
const linenRanchImage = "/media/images/linen-ranch-look.jpg";
const blackSuitImage = "/media/images/black-suit-look.jpg";
const turquoiseBeachImage = "/media/images/turquoise-beach-look.jpg";

export const contentManifest: { schemaVersion: "1"; contentVersion: string; videos: VideoPreset[] } = {
  schemaVersion: "1",
  contentVersion: "2026-07-23.2",
  videos: [
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
        { id: "nalati-dress-02", name: "湖蓝收腰吊带长裙", category: "连衣裙", priceLabel: "¥529", imageUrl: nalatiImage, imagePosition: "50% 58%", note: "轻量裙摆保留草原旅拍的明快色彩" },
        { id: "nalati-skirt-01", name: "宝蓝高腰大摆半身裙", category: "半身裙", priceLabel: "¥399", imageUrl: nalatiImage, imagePosition: "48% 72%", note: "同色系替代款，日常搭配更灵活" },
        { id: "nalati-top-01", name: "水蓝刺绣收腰上衣", category: "上衣", priceLabel: "¥259", imageUrl: nalatiImage, imagePosition: "51% 51%", note: "保留原造型的腰线与清爽层次" },
        { id: "nalati-hat-02", name: "浅麦色度假遮阳帽", category: "帽子", priceLabel: "¥129", imageUrl: nalatiImage, imagePosition: "48% 38%", note: "同材质相似款，适合草原与海边场景" },
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
        { id: "guilin-set-01", name: "新中式晕染两件套", category: "套装", priceLabel: "¥739", imageUrl: guilinImage, imagePosition: "50% 60%", note: "低饱和花色与山景色调自然衔接" },
        { id: "guilin-top-02", name: "茶棕印花修身长袖", category: "上衣", priceLabel: "¥289", imageUrl: guilinImage, imagePosition: "47% 43%", note: "修身剪裁让繁复印花更显利落" },
        { id: "guilin-pants-01", name: "烟茶色垂感阔腿裤", category: "裤装", priceLabel: "¥359", imageUrl: guilinImage, imagePosition: "52% 80%", note: "宽松裤型适合酒店与山水旅拍" },
        { id: "guilin-bracelet-01", name: "温润白玉细条手镯", category: "配饰", priceLabel: "¥199", imageUrl: guilinImage, imagePosition: "41% 39%", note: "小面积亮色提升新中式造型的精致感" },
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
        { id: "island-top-02", name: "波点系带海边上衣", category: "上衣", priceLabel: "¥219", imageUrl: islandImage, imagePosition: "52% 59%", note: "细小波点保留轻盈的海岛度假感" },
        { id: "island-bag-02", name: "米白网眼沙滩包", category: "包袋", priceLabel: "¥159", imageUrl: islandImage, imagePosition: "25% 57%", note: "容量轻巧，材质与草帽形成呼应" },
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
    {
      id: "linen-ranch-look",
      author: "挽苏Elio",
      avatarLabel: "苏",
      title: "亚麻套装是不是上辈子救过男生的命。轻松、干净，又很适合户外度假。",
      location: "户外牧场 · 白色围栏",
      audio: "If I Ain't Got You · 原声",
      videoUrl: "/media/videos/linen-ranch-look.mp4",
      posterUrl: linenRanchImage,
      counts: { likes: "3111", comments: "36", saves: "364" },
      eligible: true,
      accent: "blue",
      hotspots: [
        { id: "linen-shirt", label: "搜同款亚麻短袖衬衫", bbox: { x: 31, y: 43, width: 38, height: 21 }, labelPosition: { x: 4, y: 43 }, productIds: ["linen-shirt-01"] },
        { id: "linen-trousers", label: "搜同款米白阔腿裤", bbox: { x: 32, y: 62, width: 36, height: 30 }, labelPosition: { x: 55, y: 67 }, productIds: ["linen-trousers-01"] },
      ],
      products: [
        { id: "linen-shirt-01", name: "米白亚麻翻领短袖衬衫", category: "衬衫", priceLabel: "¥329", imageUrl: linenRanchImage, imagePosition: "50% 49%", note: "自然褶皱与宽松领型保留老钱风的松弛感" },
        { id: "linen-trousers-01", name: "垂感亚麻高腰阔腿裤", category: "裤装", priceLabel: "¥399", imageUrl: linenRanchImage, imagePosition: "51% 76%", note: "同色长裤延伸纵向比例，适合户外度假" },
        { id: "linen-hat-01", name: "燕麦色宽檐巴拿马帽", category: "帽子", priceLabel: "¥159", imageUrl: linenRanchImage, imagePosition: "50% 37%", note: "帽檐为浅色套装增加清晰的旅行氛围" },
        { id: "linen-belt-01", name: "深咖复古细皮带", category: "配饰", priceLabel: "¥129", imageUrl: linenRanchImage, imagePosition: "50% 61%", note: "小面积深色收紧腰线并呼应鞋履" },
        { id: "linen-shirt-02", name: "奶油色古巴领衬衫", category: "衬衫", priceLabel: "¥289", imageUrl: linenRanchImage, imagePosition: "49% 50%", note: "相似领型与轻薄材质，通勤也容易搭配" },
        { id: "linen-trousers-02", name: "象牙白宽松西装裤", category: "裤装", priceLabel: "¥359", imageUrl: linenRanchImage, imagePosition: "50% 78%", note: "保留宽腿轮廓，面料更适合城市穿着" },
      ],
      analysis: {
        summary: "米白亚麻短袖衬衫与同色阔腿裤形成干净的纵向轮廓，深咖皮带和草帽压住浅色面积。牧场草地、白色围栏与复古汽车让这套 Look 很适合轻度假和户外约会。",
        tags: ["男士亚麻", "老钱风", "牧场度假"],
        questions: [
          { id: "q1", question: "全身浅色会不会显得单调？", answer: "用深咖皮带、鞋和墨镜形成三个小面积锚点，既保留干净感，也能让比例更清楚。" },
          { id: "q2", question: "亚麻衬衫怎样避免太居家？", answer: "选择有翻领和清晰门襟的款式，袖口保持利落，裤腰和鞋履也尽量整洁。" },
          { id: "q3", question: "还能穿去哪些场景？", answer: "海边餐厅、周末市集、庄园婚礼和轻商务度假都适合这套低饱和搭配。" },
        ],
      },
    },
    {
      id: "black-suit-look",
      author: "沐洲✨",
      avatarLabel: "沐",
      title: "利落黑西装不只适合正式场合，收紧配色之后，氛围感会更集中。",
      location: "酒店 · 室内",
      audio: "少一点天分 · 原声",
      videoUrl: "/media/videos/black-suit-look.mp4",
      posterUrl: blackSuitImage,
      counts: { likes: "61", comments: "19", saves: "7" },
      eligible: true,
      accent: "coral",
      hotspots: [
        { id: "black-shirt", label: "搜同款修身黑衬衫", bbox: { x: 31, y: 38, width: 41, height: 30 }, labelPosition: { x: 4, y: 43 }, productIds: ["black-shirt-01"] },
        { id: "black-trousers", label: "搜同款黑色西装裤", bbox: { x: 37, y: 67, width: 35, height: 27 }, labelPosition: { x: 56, y: 71 }, productIds: ["black-trousers-01"] },
      ],
      products: [
        { id: "black-shirt-01", name: "修身暗门襟黑色衬衫", category: "衬衫", priceLabel: "¥299", imageUrl: blackSuitImage, imagePosition: "52% 53%", note: "同色门襟减少视觉切割，轮廓更利落" },
        { id: "black-trousers-01", name: "高腰垂感黑色西装裤", category: "裤装", priceLabel: "¥429", imageUrl: blackSuitImage, imagePosition: "53% 82%", note: "顺直裤线承接上身的窄长比例" },
        { id: "black-tie-01", name: "哑光窄版黑色领带", category: "配饰", priceLabel: "¥99", imageUrl: blackSuitImage, imagePosition: "51% 38%", note: "哑光材质让全黑搭配保持细节层次" },
        { id: "black-chain-01", name: "星芒胸针链条", category: "配饰", priceLabel: "¥139", imageUrl: blackSuitImage, imagePosition: "58% 45%", note: "银色小面积高光打破全黑造型的沉闷" },
        { id: "black-shirt-02", name: "黑色翻领修身西装上衣", category: "外套", priceLabel: "¥599", imageUrl: blackSuitImage, imagePosition: "52% 55%", note: "相近窄身线条，正式感更强" },
        { id: "black-shoes-01", name: "亮面方头德比鞋", category: "鞋履", priceLabel: "¥469", imageUrl: blackSuitImage, imagePosition: "52% 91%", note: "鞋面微光与胸针形成上下呼应" },
      ],
      analysis: {
        summary: "黑衬衫、窄领带与黑色长裤把视觉重心集中在人物轮廓，星芒胸针链条提供少量高光。暖色酒店灯光柔化了全黑穿搭，适合晚宴、约会与室内写真。",
        tags: ["全黑穿搭", "窄领带", "酒店氛围"],
        questions: [
          { id: "q1", question: "全黑穿搭怎样拍出层次？", answer: "让人物靠近侧光，用哑光衬衫、微亮领带和金属配饰形成不同反光层级。" },
          { id: "q2", question: "日常穿会不会太正式？", answer: "去掉领带并把衬衫袖口卷起，换成简洁皮鞋或黑色运动鞋，就能降低正式度。" },
          { id: "q3", question: "适合什么背景？", answer: "酒店走廊、深色咖啡馆、剧院和夜景街道都能衬托这套窄长黑色轮廓。" },
        ],
      },
    },
    {
      id: "turquoise-beach-look",
      author: "谢安人",
      avatarLabel: "谢",
      title: "夏天出去玩就这样拍转场，薄荷蓝衬衫和白色短裤把海水颜色穿在身上。",
      location: "热带海岛 · 白沙滩",
      audio: "海岛转场 · 原声",
      videoUrl: "/media/videos/turquoise-beach-look.mp4",
      posterUrl: turquoiseBeachImage,
      counts: { likes: "18.5w", comments: "2085", saves: "2.2w" },
      eligible: true,
      accent: "cyan",
      hotspots: [
        { id: "turquoise-shirt", label: "搜同款薄荷蓝衬衫", bbox: { x: 25, y: 36, width: 51, height: 29 }, labelPosition: { x: 4, y: 40 }, productIds: ["turquoise-shirt-01"] },
        { id: "white-shorts", label: "搜同款白色百慕大短裤", bbox: { x: 36, y: 61, width: 34, height: 24 }, labelPosition: { x: 55, y: 68 }, productIds: ["white-shorts-01"] },
      ],
      products: [
        { id: "turquoise-shirt-01", name: "薄荷蓝轻量防晒衬衫", category: "衬衫", priceLabel: "¥269", imageUrl: turquoiseBeachImage, imagePosition: "50% 48%", note: "清透蓝绿色与近岸海水形成同色呼应" },
        { id: "white-shorts-01", name: "象牙白百慕大短裤", category: "裤装", priceLabel: "¥239", imageUrl: turquoiseBeachImage, imagePosition: "51% 72%", note: "宽松裤腿适合海边步行和动态拍摄" },
        { id: "knit-scarf-01", name: "奶油白针织披肩", category: "针织", priceLabel: "¥199", imageUrl: turquoiseBeachImage, imagePosition: "51% 39%", note: "肩部叠穿增加浅色造型的层次" },
        { id: "beach-sandals-01", name: "深棕轻量夹趾凉鞋", category: "鞋履", priceLabel: "¥189", imageUrl: turquoiseBeachImage, imagePosition: "50% 91%", note: "深色鞋履稳定大面积明亮配色" },
        { id: "turquoise-shirt-02", name: "湖水绿宽松度假衬衫", category: "衬衫", priceLabel: "¥299", imageUrl: turquoiseBeachImage, imagePosition: "49% 50%", note: "更宽松的相似款，适合泳装外搭" },
        { id: "white-shorts-02", name: "白色抽绳沙滩短裤", category: "裤装", priceLabel: "¥179", imageUrl: turquoiseBeachImage, imagePosition: "51% 73%", note: "轻量替代款适合高温和涉水场景" },
      ],
      analysis: {
        summary: "薄荷蓝宽松衬衫、奶油白披肩与白色百慕大短裤组成高明度海岛配色，深色墨镜和凉鞋补入对比。画面中的蓝绿色海水让整套 Look 很适合夏日转场和旅行短片。",
        tags: ["男士海岛", "薄荷蓝", "夏日转场"],
        questions: [
          { id: "q1", question: "薄荷蓝显黑怎么办？", answer: "在脸部附近加入奶油白披肩或白色内搭，并选择偏灰、不过度荧光的蓝绿色。" },
          { id: "q2", question: "短裤长度怎样选？", answer: "裤脚在膝盖上方约五到八厘米最容易保留利落比例，宽度要给腿部留出活动空间。" },
          { id: "q3", question: "怎样拍出转场感？", answer: "先用衬衫或花束遮挡镜头，再在同一方向移开，保持人物中心位置一致即可自然衔接。" },
        ],
      },
    },
  ],
};

export function findVideo(videoId: string) {
  return contentManifest.videos.find((video) => video.id === videoId);
}
