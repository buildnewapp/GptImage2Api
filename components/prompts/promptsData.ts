export interface PromptCase {
  prompt: string;
  images: string[];
  inputVideos: string[];
  resultVideos: string[];
  note?: string;
  duration?: string;
}

export interface PromptCategory {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  cases: PromptCase[];
  gradient: string;
}

const IMG = "/sdanceai/sdance_images";
const VID = "/sdanceai/sdance_videos";

export const promptCategories: PromptCategory[] = [
  {
    id: "basic",
    title: "基础能力增强",
    titleEn: "Enhanced Fundamentals",
    description: "物理规律更合理、动作更自然流畅、指令理解更精准、风格保持更稳定",
    gradient: "from-blue-500 to-cyan-500",
    cases: [
      {
        prompt: "女孩在优雅的晒衣服，晒完接着在桶里拿出另一件，用力抖一抖衣服。",
        images: [`${IMG}/4ryp8bssv.png`],
        inputVideos: [],
        resultVideos: [`${VID}/5yazi6jph.mp4`],
      },
      {
        prompt: "画里面的人物心虚的表情，眼睛左右看了看探出画框，快速的将手伸出画框拿起可乐喝了一口，然后露出一脸满足的表情，这时传来脚步声，画中的人物赶紧将可乐放回原位，此时一位西部牛仔拿起杯子里的可乐走了，最后镜头前推画面慢慢变得纯黑背景只有顶光照耀的罐装可乐，画面最下方出现艺术感字幕和旁白：\"宜口可乐，不可不尝！\"",
        images: [`${IMG}/sel4unt33.png`],
        inputVideos: [],
        resultVideos: [`${VID}/3xh83niox.mp4`],
      },
      {
        prompt: "镜头小幅度拉远（露出街头全景）并跟随女主移动，风吹拂着女主的裙摆，女主走在19世纪的伦敦大街上；女主走着走着右边街道驶来一辆蒸汽机车，快速驶过女主身旁，风将女主的裙摆吹起，女主一脸震惊的赶忙用双手向下捂住裙摆；背景音效为走路声，人群声，汽车声等等",
        images: [`${IMG}/lexvi6oea.png`],
        inputVideos: [],
        resultVideos: [`${VID}/jn1ua8e5c.mp4`],
      },
      {
        prompt: "镜头跟随黑衣男子快速逃亡，后面一群人在追，镜头转为侧面跟拍，人物惊慌撞倒路边的水果摊爬起来继续逃，人群慌乱的声音。",
        images: [`${IMG}/ge8osrp29.png`],
        inputVideos: [],
        resultVideos: [`${VID}/ukz2o1tsj.mp4`],
      },
    ],
  },
  {
    id: "consistency",
    title: "一致性全面提升",
    titleEn: "Consistency Enhancement",
    description: "从人脸到服装，再到字体细节，整体一致性更稳、更准",
    gradient: "from-purple-500 to-pink-500",
    cases: [
      {
        prompt: "男人@图片1下班后疲惫的走在走廊，脚步变缓，最后停在家门口，脸部特写镜头，男人深呼吸，调整情绪，收起了负面情绪，变得轻松，然后特写翻找出钥匙，插入门锁，进入家里后，他的小女儿和一只宠物狗，欢快的跑过来迎接拥抱，室内非常的温馨，全程自然对话",
        images: [`${IMG}/cfjoi23t5.png`],
        inputVideos: [],
        resultVideos: [`${VID}/kewve4hf7.mp4`],
        note: "当前不支持上传含有写实人脸的素材",
      },
      {
        prompt: "将@视频1中的女生换成戏曲花旦，场景在一个精美的舞台上，参考@视频1的运镜和转场效果，利用镜头匹配人物的动作，极致的舞台美感，增强视觉冲击力",
        images: [],
        inputVideos: [`${VID}/ikpre4nte.mp4`],
        resultVideos: [`${VID}/l9eapyfux.mp4`],
        note: "当前不支持上传含有写实人脸的素材",
      },
      {
        prompt: "参考 @视频1的所有转场和运镜，一镜到底，画面以棋局为起始，镜头左移，展示地板的黄色沙砾，镜头上移来到一个沙滩，沙滩上有足印，一个穿着白色素衣的女生在沙滩上渐行渐远，镜头切到空中的俯拍视角，海水在冲刷（不要出现人物），无缝渐变转场，冲刷的海浪变成飘动的窗帘，镜头拉远，展示女孩的面部特写，一镜到底",
        images: [],
        inputVideos: [`${VID}/3s4la59c3.mp4`],
        resultVideos: [`${VID}/nlwfx2ejt.mp4`],
      },
      {
        prompt: "0-2秒画面：快速四格闪切，红、粉、紫、豹纹四款蝴蝶结依次定格，特写缎面光泽与 \"chéri\" 品牌字样。3-6秒画面：特写银色磁吸扣 \"咔嗒\" 吸合，再轻轻一拉分开，展示丝滑质感与便捷性。7-12秒画面：快速切换佩戴场景。13-15秒画面：四款蝴蝶结并排陈列",
        images: [`${IMG}/tle401l4e.png`],
        inputVideos: [],
        resultVideos: [`${VID}/cfx748nkm.mp4`],
      },
      {
        prompt: "对@图片2的包包进行商业化的摄像展示，包包的侧面参考@图片1，包包的表面材质参考@图片3，要求将包包的细节均有所展示，背景音恢宏大气",
        images: [`${IMG}/xdnerrnzc.png`, `${IMG}/daac1lyuw.png`, `${IMG}/wnjpw2sdd.png`],
        inputVideos: [],
        resultVideos: [`${VID}/dytrdicyc.mp4`],
      },
      {
        prompt: "把@图片1作为画面的首帧图，第一人称视角，参考@视频1的运镜效果，上方场景参考@图片2，左边场景参考@图片3，右边场景参考@图片4。",
        images: [`${IMG}/e3gcxijib.png`, `${IMG}/4hwmlvj5n.png`, `${IMG}/g3yqkzie3.png`, `${IMG}/28tsj5taa.png`],
        inputVideos: [`${VID}/h9gheoj3k.mp4`],
        resultVideos: [`${VID}/ur8v178p8.mp4`],
      },
    ],
  },
  {
    id: "camera-motion",
    title: "高难度运镜和动作复刻",
    titleEn: "Camera & Motion Replication",
    description: "上传参考视频即可精准复刻电影走位、运镜和复杂动作",
    gradient: "from-orange-500 to-red-500",
    cases: [
      {
        prompt: "参考@图1的男人形象，他在@图2的电梯中，完全参考@视频1的所有运镜效果还有主角的面部表情，主角在惊恐时希区柯克变焦，然后几个环绕镜头展示电梯内视角，电梯门打开，跟随镜头走出电梯，电梯外场景参考@图片3",
        images: [`${IMG}/zr7zxl72k.png`, `${IMG}/eso7mkwmz.png`, `${IMG}/tm37g7lro.png`],
        inputVideos: [`${VID}/1o4s9dn5u.mp4`],
        resultVideos: [`${VID}/d9dr0g62z.mp4`],
        note: "当前不支持上传含有写实人脸的素材",
      },
      {
        prompt: "参考@图1的男人形象，他在@图2的走廊中，完全参考@视频1的所有运镜效果，还有主角的面部表情，镜头跟随主角在@图2拐角奔跑，然后在@图3的长廊里，镜头从背面的跟随视角，通过低视角环绕到主角正面",
        images: [`${IMG}/xg95yuvgm.png`, `${IMG}/orfi11egr.png`, `${IMG}/i8tkl5zgn.png`, `${IMG}/k4rrav3xz.png`, `${IMG}/vgek3ghwv.png`],
        inputVideos: [`${VID}/rhtsyy27x.mp4`],
        resultVideos: [`${VID}/wlwligq85.mp4`],
        note: "当前不支持上传含有写实人脸的素材",
      },
      {
        prompt: "@图片1的平板电脑作为主体，运镜参考@视频1，推近到屏幕的特写，镜头旋转后平板反转展示全貌，屏幕中的数据流一直在变化，周围的环境逐渐变成科幻风格的数据空间",
        images: [`${IMG}/prg5xsp7a.png`],
        inputVideos: [`${VID}/6otnmqm39.mp4`],
        resultVideos: [`${VID}/f41ymkugr.mp4`],
      },
      {
        prompt: "@图片1的女星作为主体，参考@视频1的运镜方式进行有节奏的推拉摇移，女星的动作也参考@视频1中女子的舞蹈动作，在舞台上活力十足地表演",
        images: [`${IMG}/t5bj54vt1.png`],
        inputVideos: [`${VID}/praucx0r0.mp4`],
        resultVideos: [`${VID}/cslx142y0.mp4`],
        note: "当前不支持上传含有写实人脸的素材",
      },
      {
        prompt: "参考@图1@图2长枪角色，@图3@图4双刀角色，模仿@视频1的动作，在@图5的枫叶林中打斗",
        images: [`${IMG}/ovx52r1ct.png`, `${IMG}/16l85mwkj.png`, `${IMG}/ffqjgazf7.png`, `${IMG}/84cwkziit.png`, `${IMG}/h61s2y0p7.png`],
        inputVideos: [`${VID}/mxwchijwu.mp4`],
        resultVideos: [`${VID}/4vr3llg33.mp4`],
      },
      {
        prompt: "参考视频1的人物动作，参考视频2的环绕运镜镜头语言，生成角色1和角色2的打斗场面，打斗发生在星夜中，打斗的过程中有白色灰尘扬起，打斗场面非常华丽，气氛十分紧张。",
        images: [`${IMG}/lntpiel9o.png`, `${IMG}/o9v0b5hbb.png`],
        inputVideos: [`${VID}/k5ogjuwsb.mp4`, `${VID}/vbyre6gqk.mp4`],
        resultVideos: [`${VID}/dfagoyy22.mp4`],
        note: "当前不支持上传含有写实人脸的素材",
      },
      {
        prompt: "参考视频1的运镜、画面切换节奏，拿图片1的红色超跑进行复刻。",
        images: [`${IMG}/a40izkef9.png`],
        inputVideos: [`${VID}/6p2mlxpz3.mp4`],
        resultVideos: [`${VID}/6p2mlxpz3.mp4`],
      },
    ],
  },
  {
    id: "creative-template",
    title: "创意模版 / 特效复刻",
    titleEn: "Creative Templates & Effects",
    description: "创意转场、广告成片、电影片段、复杂剪辑，精准复刻",
    gradient: "from-violet-500 to-purple-500",
    cases: [
      {
        prompt: "将@视频1的人物换成@图片1，@图片1为首帧，人物带上虚拟科幻眼镜，参考@视频1的运镜，及近的环绕镜头，从第三人称视角变成人物的主观视角，在AI虚拟眼镜中穿梭",
        images: [`${IMG}/i1ri75mu3.png`, `${IMG}/med5l39nx.png`, `${IMG}/9qfkzq75i.png`, `${IMG}/s2qw4997z.png`],
        inputVideos: [`${VID}/j8y0k9uuh.mp4`],
        resultVideos: [`${VID}/0yk60yijj.mp4`],
        note: "当前不支持上传含有写实人脸的素材",
      },
      {
        prompt: "参考第一张图片里模特的五官长相。模特分别穿着第2-6张参考图里的服装凑近镜头，做出调皮、冷酷、可爱、惊讶、耍帅的造型",
        images: [`${IMG}/4o8l4rmdj.png`, `${IMG}/9b9p3mmog.png`, `${IMG}/dieyjidbb.png`, `${IMG}/7eh3ge3u6.png`, `${IMG}/7i3ei8dy5.png`, `${IMG}/grezd2nto.png`],
        inputVideos: [`${VID}/l32ze2ilt.mp4`],
        resultVideos: [`${VID}/nnxk9k7w5.mp4`],
        note: "当前不支持上传含有写实人脸的素材",
      },
      {
        prompt: "参考视频的广告创意，用提供的羽绒服图片，并参考鹅绒图片、天鹅图片，搭配以下广告词「这是根鹅绒，这是暖天鹅，这是能穿的极地天鹅绒羽绒服」，生成新的羽绒服广告视频。",
        images: [`${IMG}/8amfwh4ja.png`, `${IMG}/03d19ytlb.png`, `${IMG}/7uctodf3d.png`],
        inputVideos: [`${VID}/lnhfj3ti2.mp4`],
        resultVideos: [`${VID}/2c5gjm8c3.mp4`],
      },
      {
        prompt: "黑白水墨风格，@图片1的人物参考@视频1的特效和动作，上演一段水墨太极功夫",
        images: [`${IMG}/l0p3cmg11.png`],
        inputVideos: [`${VID}/6r53kizc3.mp4`],
        resultVideos: [`${VID}/vy5yu9epy.mp4`],
        note: "当前不支持上传含有写实人脸的素材",
      },
      {
        prompt: "将@视频1的首帧人物替换成@图片1，完全@参考视频1的特效和动作，手里的花蕊长出玫瑰花瓣，裂纹在脸部向上延伸，逐渐被杂草覆盖，人物双手拂过脸部，杂草变成粒子消散，最后变成@图片2的长相",
        images: [`${IMG}/u8x24mn73.png`, `${IMG}/6sggdvx8m.png`],
        inputVideos: [`${VID}/lg8skv8pg.mp4`],
        resultVideos: [`${VID}/hp4as3nrb.mp4`],
      },
      {
        prompt: "由@图片1的天花板开始，参考@视频1的拼图破碎效果进行转场，\"BELIEVE\"字体替换成\"Seedance\"，参考@图2的字体",
        images: [`${IMG}/40kz8vfor.png`, `${IMG}/ilxeib4mv.png`],
        inputVideos: [`${VID}/ckn0kfqef.mp4`],
        resultVideos: [`${VID}/qyuobijl1.mp4`],
      },
      {
        prompt: "以黑幕开场，参考视频1的粒子特效和材质，金色鎏金材质的沙砾从画面左边飘出并向右覆盖，参考@视频1的粒子吹散效果，@图片1的字体逐渐出现在画面中心",
        images: [`${IMG}/z4ynfm24d.png`],
        inputVideos: [`${VID}/5hdbgocy3.mp4`],
        resultVideos: [`${VID}/cigq76kb4.mp4`],
      },
      {
        prompt: "@图片1的人物参考@视频1中的动作和表情变化，展示吃泡面的抽象行为",
        images: [`${IMG}/2y42lulkw.png`],
        inputVideos: [`${VID}/rh6vtjztg.mp4`],
        resultVideos: [`${VID}/8oow1oraq.mp4`],
      },
    ],
  },
  {
    id: "creativity",
    title: "创意性 / 剧情补全",
    titleEn: "Creative Story Completion",
    description: "模型的创意性和剧情补全能力",
    gradient: "from-emerald-500 to-teal-500",
    cases: [
      {
        prompt: "将@图1以从左到右从上到下的顺序进行漫画演绎，保持人物说的台词与图片上的一致，分镜切换以及重点的情节演绎加入特殊音效，整体风格诙谐幽默；演绎方式参考@视频1",
        images: [`${IMG}/ejlr43fdr.png`],
        inputVideos: [`${VID}/qgonkjj82.mp4`],
        resultVideos: [`${VID}/dwgatkfa3.mp4`],
      },
      {
        prompt: "参考@图片1的专题片的分镜头脚本，参考@图片1的分镜、景别、运镜、画面和文案，创作一段15s的关于\"童年的四季\"的治愈系片头",
        images: [`${IMG}/w38bnw88m.png`],
        inputVideos: [],
        resultVideos: [`${VID}/kmw2duxev.mp4`],
      },
      {
        prompt: "参考视频1的音频，根据图1、图2、图3、图4、图5为灵感，发散出一条情绪向的视频。背景音乐参考@视频1",
        images: [`${IMG}/n2r4put22.png`, `${IMG}/fvb1i7na3.png`, `${IMG}/yq2831u4h.png`, `${IMG}/eheuc4w28.png`, `${IMG}/w8q4kw0w1.png`],
        inputVideos: [],
        resultVideos: [`${VID}/q3zb6o149.mp4`],
      },
    ],
  },
  {
    id: "video-extend",
    title: "视频延长",
    titleEn: "Video Extension",
    description: "视频支持平滑延长与衔接，可按用户提示生成连续镜头",
    gradient: "from-amber-500 to-orange-500",
    cases: [
      {
        prompt: "延长15s视频，参考@图片1、@图片2的驴骑摩托车的形象，补充一段脑洞广告",
        images: [`${IMG}/t0qqgg9rq.png`, `${IMG}/z21g7vyxe.png`],
        inputVideos: [`${VID}/4wvuids0l.mp4`],
        resultVideos: [`${VID}/598uoczz9.mp4`],
        duration: "15s",
      },
      {
        prompt: "将视频延长6s，出现电吉他的激昂音乐，视频中间出现\"JUST DO IT\"的广告字体后逐渐淡化",
        images: [`${IMG}/p8x6wq6qe.png`, `${IMG}/qimpb4tv4.png`],
        inputVideos: [`${VID}/xededardx.mp4`],
        resultVideos: [`${VID}/nuiukm7bw.mp4`],
        duration: "6s",
      },
      {
        prompt: "将@视频1延长15秒。1-5秒：光影透过百叶窗在木桌、杯身上缓缓滑过。6-10秒：一粒咖啡豆从画面上方轻轻飘落。11-15秒：英文渐显\"Lucky Coffee\"",
        images: [],
        inputVideos: [`${VID}/ehehhcjc8.mp4`],
        resultVideos: [`${VID}/6i3dguvnr.mp4`],
        duration: "15s",
      },
      {
        prompt: "向前延长10s，温暖的午后光线里，镜头先从街角那排被微风掀动的遮阳篷开始，慢慢下移到墙根处几株探出头的小雏菊",
        images: [],
        inputVideos: [`${VID}/c7m6e9lf9.mp4`],
        resultVideos: [`${VID}/2kmnnrkqv.mp4`],
        duration: "10s",
      },
    ],
  },
  {
    id: "audio",
    title: "音色更准，声音更真",
    titleEn: "Audio & Voice Precision",
    description: "音色参考、对话生成、旁白配音、音效匹配全面升级",
    gradient: "from-rose-500 to-pink-500",
    cases: [
      {
        prompt: "固定镜头，中央鱼眼镜头透过圆形孔洞向下窥视，参考视频1的鱼眼镜头，让@视频2中的马看向鱼眼镜头，参考@视频1中的说话动作，背景BGM参考@视频3中的音效。",
        images: [],
        inputVideos: [`${VID}/ovvm60cr2.mp4`, `${VID}/gyw5tla3f.mp4`, `${VID}/lcxuxabpr.mp4`],
        resultVideos: [`${VID}/fbkufgsqy.mp4`],
      },
      {
        prompt: "根据提供的写字楼宣传照，生成一段15秒电影级写实风格的地产纪录片，旁白的音色参考@视频1",
        images: [`${IMG}/8kel8yzbk.png`, `${IMG}/5eds9n13y.png`, `${IMG}/sgpk7829n.png`],
        inputVideos: [`${VID}/7y6abgcgo.mp4`],
        resultVideos: [`${VID}/wjcaidyhu.mp4`],
      },
      {
        prompt: "在\"猫狗吐槽间\"里的一段吐槽对话，要求情感丰沛，符合脱口秀表演",
        images: [`${IMG}/5ce3ldocu.png`],
        inputVideos: [],
        resultVideos: [`${VID}/sqg9ib09e.mp4`],
      },
      {
        prompt: "豫剧经前桥段《铡美案》的伴奏响起，左侧的黑衣包拯指着右侧的红衣陈世美，咬牙切齿地唱着豫剧",
        images: [`${IMG}/ychb7y36k.png`],
        inputVideos: [],
        resultVideos: [`${VID}/gn4tnkvkd.mp4`],
      },
      {
        prompt: "生成一个15秒的MV视频。关键词：稳重构图 / 轻推拉 / 低角度英雄感 / 纪实但高级",
        images: [`${IMG}/19gfhmig4.png`],
        inputVideos: [],
        resultVideos: [`${VID}/jeunl0reo.mp4`],
      },
      {
        prompt: "画面中间戴帽子的女孩温柔地唱着说\"I'm so proud of my family!\"，之后转身拥抱中间的黑人女孩。多人物对话与互动场景。",
        images: [`${IMG}/b97odqsrb.png`],
        inputVideos: [],
        resultVideos: [`${VID}/w3nkyno73.mp4`],
      },
      {
        prompt: "固定镜头。站着的壮汉（队长）握拳挥臂用西班牙语说着：\"三分钟后突袭！\"，多人物军事场景对话",
        images: [`${IMG}/x826sdku4.png`],
        inputVideos: [],
        resultVideos: [`${VID}/wclwzd6t0.mp4`],
      },
      {
        prompt: "0-3秒：开头闹钟响起来；3-10秒：快速摇镜头，转向对面特写男人面部，男人无奈的叫女生起床，语气和音色参考@视频1",
        images: [`${IMG}/y09qafa0v.png`, `${IMG}/xsnia6p7m.png`],
        inputVideos: [`${VID}/no8z28env.mp4`],
        resultVideos: [`${VID}/0go1c06d9.mp4`],
        note: "当前不支持上传含有写实人脸的图片",
      },
      {
        prompt: "@图片1的猴子走向奶茶店柜台，猴子向服务员用四川口音点单：\"幺妹儿，霸王别姬有得没得？\"",
        images: [`${IMG}/ys3w295x7.png`, `${IMG}/kjeb77lt9.png`, `${IMG}/zfnip8nb0.png`],
        inputVideos: [],
        resultVideos: [`${VID}/ds3348pal.mp4`],
      },
      {
        prompt: "用科普风格和音色，将图片1中的内容演绎出来，内容包括悟空为过火焰山，到翠云山向铁扇公主借芭蕉扇",
        images: [`${IMG}/0xi4vtd1n.png`],
        inputVideos: [],
        resultVideos: [`${VID}/jbnchxhf8.mp4`],
      },
    ],
  },
  {
    id: "one-shot",
    title: "镜头连贯性（一镜到底）",
    titleEn: "One-Shot Continuity",
    description: "更强的镜头连贯性，实现一镜到底的流畅效果",
    gradient: "from-indigo-500 to-blue-500",
    cases: [
      {
        prompt: "@图片1@图片2@图片3@图片4@图片5，一镜到底的追踪镜头，从街头跟随跑步者上楼梯、穿过走廊、进入屋顶，最终俯瞰城市。",
        images: [`${IMG}/gqf12yn8u.png`, `${IMG}/umugl7z0b.png`, `${IMG}/bu6sgo22n.png`, `${IMG}/yw5f6w80c.png`, `${IMG}/61zp0zza8.png`],
        inputVideos: [],
        resultVideos: [`${VID}/8p3xda402.mp4`],
      },
      {
        prompt: "以@图片1为首帧，画面放大至飞机舷窗外，一团团云朵缓缓飘至画面中，其中一朵为彩色糖豆点缀的云朵，缓缓变形为@图片2的冰淇淋",
        images: [`${IMG}/0t28d7e1r.png`, `${IMG}/f0bx05dgb.png`, `${IMG}/ukkeoaq3h.png`],
        inputVideos: [],
        resultVideos: [`${VID}/yysaoq0la.mp4`],
      },
      {
        prompt: "谍战片风格，@图片1作为首帧画面，镜头正面跟拍穿着红风衣的女特工向前走，不断有路人遮挡红衣女子，全程不要切镜头，一镜到底。",
        images: [`${IMG}/htmir28rk.png`, `${IMG}/5q1nw5ook.png`, `${IMG}/o0rv5081p.png`, `${IMG}/44w51z3p1.png`],
        inputVideos: [],
        resultVideos: [`${VID}/eddn94864.mp4`],
        note: "当前不支持上传含有写实人脸的素材",
      },
      {
        prompt: "根据@图片1外景的镜头，第一人称主观视角快推镜头到木屋内的环境场景近景，一只小鹿@图片2和一只羊@图片3在围炉旁喝茶聊天，镜头推进特写茶杯的样式参考@图片4",
        images: [`${IMG}/3d7cshoah.png`, `${IMG}/ynlkw0s0o.png`, `${IMG}/1aqbxscus.png`, `${IMG}/hr9m2q177.png`],
        inputVideos: [],
        resultVideos: [`${VID}/gqwuo5uqz.mp4`],
      },
      {
        prompt: "@图片1@图片2@图片3@图片4@图片5，主观视角一镜到底的惊险过山车的镜头，过山车的速度越来越快。",
        images: [`${IMG}/tgbpwfwfc.png`, `${IMG}/9ltapr3aw.png`, `${IMG}/ybp3tjcqw.png`, `${IMG}/gj4q0nvw2.png`, `${IMG}/hi0r5a8ct.png`],
        inputVideos: [],
        resultVideos: [`${VID}/v7805u177.mp4`],
      },
    ],
  },
  {
    id: "video-edit",
    title: "视频编辑",
    titleEn: "Video Editing",
    description: "直接用已有视频作为输入，指定片段、动作或节奏进行定向修改",
    gradient: "from-teal-500 to-cyan-500",
    cases: [
      {
        prompt: "颠覆@视频1里的剧情，男人眼神从温柔瞬间转为冰冷狠厉，在女主毫无防备的瞬间，猛地将女主从桥上往外推",
        images: [],
        inputVideos: [`${VID}/r6hrjnq34.mp4`],
        resultVideos: [`${VID}/et0kiyndt.mp4`],
        note: "当前不支持上传含有写实人脸的素材",
      },
      {
        prompt: "颠覆@视频1的整个剧情，西装男坐在酒吧，突然从桌下掏出一大包体积夸张的零食礼包",
        images: [],
        inputVideos: [`${VID}/u53fwebga.mp4`],
        resultVideos: [`${VID}/7precgjcc.mp4`],
        note: "当前不支持上传含有写实人脸的素材",
      },
      {
        prompt: "视频1中的女主唱换成图片1的男主唱，动作完全模仿原视频，不要出现切镜，乐队演唱音乐。",
        images: [`${IMG}/jkx01ic8s.png`],
        inputVideos: [`${VID}/3s9u7tz3g.mp4`],
        resultVideos: [`${VID}/gomdqjkt4.mp4`],
        note: "当前不支持上传含有写实人脸的素材",
      },
      {
        prompt: "将视频1女人发型变成红色长发，图片1中的大白鲨缓缓浮出半个脑袋，在她身后。",
        images: [`${IMG}/7y309v1bd.png`],
        inputVideos: [`${VID}/11zk59mk6.mp4`],
        resultVideos: [`${VID}/x1jc24pnp.mp4`],
      },
      {
        prompt: "视频1镜头右摇，炸鸡老板忙碌地将炸鸡递给排队的客户，特写展示老板拿印有图1的纸袋子",
        images: [`${IMG}/31dkwitrm.png`],
        inputVideos: [`${VID}/m4xgx7p0f.mp4`],
        resultVideos: [`${VID}/96bzxil23.mp4`],
        note: "当前不支持上传含有写实人脸的素材",
      },
    ],
  },
  {
    id: "music-sync",
    title: "音乐卡点",
    titleEn: "Music Beat Sync",
    description: "上传音频轨道，创建精准卡点的视频",
    gradient: "from-fuchsia-500 to-rose-500",
    cases: [
      {
        prompt: "海报中的女生在不停的换装，服装参考@图片1@图片2的样式，手中提着@图片3的包，视频节奏参考@视频",
        images: [`${IMG}/bw5b6h0ur.png`, `${IMG}/bveesro29.png`, `${IMG}/jq19ri9yq.png`, `${IMG}/rthxgreoc.png`],
        inputVideos: [`${VID}/y2kmy3bt4.mp4`],
        resultVideos: [`${VID}/lh59smnhq.mp4`],
        note: "当前不支持上传含有写实人脸的素材",
      },
      {
        prompt: "@图片1-7中的图片根据@视频中的画面关键帧的位置和整体节奏进行卡点，画面中的人物更有动感，整体画面风格更梦幻",
        images: [`${IMG}/3fa1yg78l.png`, `${IMG}/hnxbhc38j.png`, `${IMG}/rr3y1se7y.png`, `${IMG}/8kyuojubx.png`, `${IMG}/8dr2uta31.png`, `${IMG}/t0mummtjz.png`],
        inputVideos: [`${VID}/gbu9pv0um.mp4`],
        resultVideos: [`${VID}/lawqspmq0.mp4`],
      },
      {
        prompt: "@图片1-6的风光场景图，参考@视频中的画面节奏，转场间画面风格及音乐节奏进行卡点",
        images: [`${IMG}/wt052p6ci.png`, `${IMG}/5ngtf5bqd.png`, `${IMG}/ntmlrh3kj.png`, `${IMG}/fa4dkft6r.png`, `${IMG}/ljgp4kyed.png`, `${IMG}/rr6970ip9.png`],
        inputVideos: [`${VID}/8ue5h0bq4.mp4`],
        resultVideos: [`${VID}/es600fg0x.mp4`],
      },
      {
        prompt: "8秒智性博弈式战斗动漫片段，贴合复仇主题。分镜图1-5的场景依次展开",
        images: [],
        inputVideos: [],
        resultVideos: [`${VID}/88jhjdm4l.mp4`],
      },
    ],
  },
  {
    id: "emotion",
    title: "情绪演绎更好",
    titleEn: "Emotional Performance",
    description: "角色情绪表现更丰富、更真实",
    gradient: "from-red-500 to-orange-500",
    cases: [
      {
        prompt: "@图片1的女子走到镜子前，看着镜子里面的自己，姿势参考@图片2，沉思了一会突然开始崩溃大叫，抓镜子的动作崩溃大叫的情绪和表情完全参考@视频1。",
        images: [`${IMG}/m37jbpna9.png`, `${IMG}/y6xrneidl.png`],
        inputVideos: [`${VID}/olhpahc6h.mp4`],
        resultVideos: [`${VID}/4x2mnoodl.mp4`],
      },
      {
        prompt: "这是一个油烟机广告，@图片1作为首帧画面，女人在优雅的做饭，没有烟雾，镜头快速向右边摇动，拍摄@图片2男人满头大汗面红耳赤在做饭",
        images: [`${IMG}/ptellmr1v.png`, `${IMG}/hsrrifd4y.png`, `${IMG}/xjbs1j4v9.png`],
        inputVideos: [],
        resultVideos: [`${VID}/d1mavxw3z.mp4`],
        note: "当前不支持上传含有写实人脸的素材",
      },
      {
        prompt: "@图片1作为画面的首帧图，镜头旋转推近，人物突然抬头，面部长相参考@图片2，开始大声咆哮，激动带有一些喜剧色彩，参考@图片3的表情神态。然后人物身体变身成为一只熊，参考@图片4",
        images: [`${IMG}/9iaeq4uhg.png`, `${IMG}/p493rrg2b.png`, `${IMG}/z7z5f5dv7.png`, `${IMG}/qdtx9jbrn.png`],
        inputVideos: [],
        resultVideos: [`${VID}/nf3vdfl8a.mp4`],
      },
    ],
  },
];
