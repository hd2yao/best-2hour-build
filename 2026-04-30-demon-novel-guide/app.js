const visuals = [
  {
    title: "恶魔之树",
    note: "魔契、代价、深渊力量",
    className: "scene-tree",
  },
  {
    title: "高天之城",
    note: "大夏天空防线与总院",
    className: "scene-city",
  },
  {
    title: "破晓星域",
    note: "蓝星破笼后的新家园",
    className: "scene-star",
  },
  {
    title: "真理道门",
    note: "终局世界结构核心",
    className: "scene-gate",
  },
];

const arcs = [
  {
    range: "1-72",
    title: "锦城觉醒篇",
    summary: "任杰从锦城打工少年变成魔契者，恶魔之树、代价、破妄之眸和家庭动机全部奠基。",
    people: ["任杰", "陶夭夭", "安宁", "诺颜", "姜九黎", "夜月", "卫平生", "陆千帆"],
    details: [
      "锦城魔灾中，任杰死亡后从焚尸炉爬回，黑色碎片和恶魔之树改变了他的命运。",
      "他第一次知道魔契者必须支付代价，也因此背上了身份暴露和被天门教会盯上的风险。",
      "陶夭夭的魔痕病、安宁的家庭线、晋城旧案和陆千帆的出现，为后续大主线埋下根。",
    ],
  },
  {
    range: "73-172",
    title: "猎魔学院入门篇",
    summary: "任杰进入锦城猎魔学院，顶呱呱核心队成形，学院成长线与历史空白线并行推进。",
    people: ["任杰", "姜九黎", "陆沉", "梅钱", "墨婉柔", "团雀", "楚笙"],
    details: [
      "猎魔大测、南柯森林和鄴城危机让任杰从野路子战斗者变成系统培养的学员。",
      "姜九黎、陆沉、梅钱、墨婉柔等伙伴逐渐成为主线固定班底。",
      "团雀的课程和循环幻境开始提示：人族历史可能并不完整，世界背后有人拨动棋盘。",
    ],
  },
  {
    range: "173-349",
    title: "永恒小镇与赤土禁区篇",
    summary: "群星公会任务把任杰带向永恒小镇，水墨世界、呱呱、叶禾、红豆和回响权杖登场。",
    people: ["任杰", "姜九黎", "陆沉", "梅钱", "呱呱", "叶禾", "红豆", "祁墨"],
    details: [
      "不老圣泉表面是青春永驻，实质牵出水墨世界与被隐藏的旧事。",
      "叶禾与呱呱的百年约定，让早期副本从搞笑冒险变成带有强烈遗憾的历史追认。",
      "赤土禁区、回响权杖、红豆和旧时代强者的线索，让故事从城市扩大到禁区和历史深处。",
    ],
  },
  {
    range: "350-462",
    title: "高天选拔个人赛篇",
    summary: "各城天骄汇聚，任杰用不按常理的打法击穿对手，拿到个人赛冠军。",
    people: ["任杰", "姜九黎", "陆沉", "千流", "千狩", "温牧之", "乔青松"],
    details: [
      "高天选拔是大夏年轻代舞台，任杰第一次被全国视野看见。",
      "姜九黎的群星体系、千流的极速、温牧之的梦境与文气等能力集中展示。",
      "任杰击败千流后，完成从锦城怪胎到年轻一代顶尖人物的身份转变。",
    ],
  },
  {
    range: "463-541",
    title: "魔城求生与团体赛篇",
    summary: "团体赛被改写成真正的生死局，塔罗牌、圣祭和魔胎危机全面介入。",
    people: ["任杰", "颜如玉", "倒吊人", "缝尸人", "红豆", "千流", "姜九黎"],
    details: [
      "赛事不再只是排名竞争，而变成关乎学员与城市生死的魔城求生。",
      "颜如玉试图制造道德选择题，倒吊人等执行官则把任杰推入真正死局。",
      "任杰在保护同伴、赢下比赛、对抗暗线组织之间同时推进，少年热血线转向时代阴谋。",
    ],
  },
  {
    range: "542-710",
    title: "山海境营救篇",
    summary: "任杰离开大夏保护圈，进入妖族山海境营救与搅局，开始独立承担高风险任务。",
    people: ["任杰", "姜九黎", "程琳", "夜晴", "龙玦", "苟启", "龙冉", "叮铛"],
    details: [
      "山海境展示妖族社会、山海联盟和异族地盘的运行逻辑。",
      "任杰在伪装、交易、追杀和反杀中成长，真正从被保护对象转为开路者。",
      "夜晴点出核心：人族缺的不是温室天才，而是能在风雨里杀出来的拓荒之剑。",
    ],
  },
  {
    range: "711-980",
    title: "问神仪式与无序之渊篇",
    summary: "夏研所、玖叶、陶夭夭、天门教会和无序之渊线交汇，任杰触及深渊与星空秘密。",
    people: ["任杰", "陶夭夭", "玖叶", "夜未央", "夜王百舸", "刃心", "钢铁新娘", "葵"],
    details: [
      "夏研所和玖叶线让任杰接触更高科技、人族实验和过去真相。",
      "天门教会将任杰视为圣祭目标，夜未央则呈现神眷者被教会控制的悲剧侧面。",
      "无序之渊中，塔罗牌围杀、钢铁新娘与旧时代誓约登场，任杰最终走向群星地下基地。",
    ],
  },
  {
    range: "981-1069",
    title: "群星真相与大夏防线篇",
    summary: "星纪与群星基地揭示虚假星空，大夏则在月蚀和教会攻势中燃起守城战。",
    people: ["任杰", "星纪", "玖叶", "云天遥", "唐朝", "阎十八", "蜃妖"],
    details: [
      "任杰确认眼前星空并非真实，群星基地背后隐藏旧时代科技断层。",
      "月蚀之刻、大夏多城战火、高天之城危机同时爆发，云天遥等人死守防线。",
      "任杰从天才学生被推到战争核心，主线开始向破笼方向不可逆推进。",
    ],
  },
  {
    range: "1070-1134",
    title: "猎魔总院与灵境准备篇",
    summary: "总院生活表面回到校园，实则集中补课、布置退路，为灵境七域行动做准备。",
    people: ["任杰", "陆沉", "姜九黎", "陶夭夭", "云天遥", "张道仙", "司空凌霄"],
    details: [
      "高天之城和猎魔总院展示大夏顶级培养体系，任杰继续强化天武与魔契道路。",
      "永夜惧象、芽计划、帝岁肉和永恒之门等线索陆续浮现。",
      "任杰开始以最坏结果为前提安排传承和后手，说明接下来的灵境行动危险等级极高。",
    ],
  },
  {
    range: "1135-1279",
    title: "灵境七域篇",
    summary: "任杰进入灵境七域，在灵族、帝灵、火种和星之匙之间寻找破局资源。",
    people: ["任杰", "陆沉", "慧灵树王", "白胜雪", "奴娇", "菇奈奈", "帝岁"],
    details: [
      "灵境七域揭示灵族、帝灵和生命体系的复杂结构。",
      "火种、星之匙、节气罗盘等资源既是宝物，也是各方势力争夺蓝星未来的筹码。",
      "任杰在救人、杀敌、结盟和利用之间反复取舍，最终把主线推向魔剎禁海。",
    ],
  },
  {
    range: "1280-1426",
    title: "魔剎禁海与永夜之心篇",
    summary: "三族共同进入魔剎禁海，遗迹、七曜天魔、永夜之心和神界降诞不断抬高战力层级。",
    people: ["任杰", "慧灵树王", "黑溟", "龙骁", "红豆", "愚者", "神乐"],
    details: [
      "魔剎禁海成为人族、妖族、灵族共享又互相防备的高危公共区域。",
      "遗迹古城、黑玉鲸、七曜天魔等设定把禁海变成多方博弈棋盘。",
      "永夜之心和斩我本质让任杰进一步掌控自己的深渊道路。",
    ],
  },
  {
    range: "1427-1590",
    title: "葬神计划与人族劫篇",
    summary: "葬神计划展开，任杰与神族、教会和人族内部腐烂力量正面清算。",
    people: ["任杰", "红豆", "闫律", "方舟", "神之子", "无妄战神", "陆沉"],
    details: [
      "登峰神坛、隐墟、魔方数据库、言灵祖魔和神赐圣泉集中推进神族线。",
      "任杰在极端压力下甚至一度举世皆敌，必须亲手斩开人族内部病灶。",
      "这一篇之后，任杰不再只是守护者，也成为旧秩序的清算者。",
    ],
  },
  {
    range: "1591-1788",
    title: "荡天魔域与蓝盟成形篇",
    summary: "任杰转入魔域创业，建立黎明城，推动四方和平与蓝盟成形。",
    people: ["任杰", "愚者", "秀豆", "葵", "红豆", "龙玦", "夜晴"],
    details: [
      "荡天魔域从危险禁地变成任杰整合力量、制定规则的新舞台。",
      "黎明城、狩夜军团、薪火禁区等设定让任杰从战斗者转为组织者。",
      "蓝盟和融合特区出现，蓝星各族从内耗走向共同面对星空和方舟真相。",
    ],
  },
  {
    range: "1789-2013",
    title: "破笼与方舟真相篇",
    summary: "虚假星空、方舟计划和003号观测站真相揭开，蓝星开始从星笼中醒来。",
    people: ["任杰", "陶夭夭", "星纪", "朔", "陆千帆", "愚者", "刘波"],
    details: [
      "蓝星被确认是方舟计划中的星笼实验场，神魔长期推动各族冲突。",
      "白族战争、火种大殿、月心世界和虚假历史让蓝盟不得不提前破局。",
      "神魔共识与铸方舟标志蓝星从被观测样本转向星空参与者。",
    ],
  },
  {
    range: "2014-2279",
    title: "星空远征与夺胜战争篇",
    summary: "蓝星进入真正星空，夺神藏、建破晓、改写神国格局。",
    people: ["任杰", "花菱", "星纪", "愚者", "陆千帆", "寒菲", "玄盏", "任缘"],
    details: [
      "月星太空港、黑洞能量炉、崩坏乐园等设定让蓝盟进入文明级战争。",
      "任杰以劫主式打法抢资源、谈条件、下套，夺取神藏之匙。",
      "破晓星域建立，蓝星各族不再只守着母星，而拥有了星空根据地。",
    ],
  },
  {
    range: "2280-2416",
    title: "帝冢与真理道门篇",
    summary: "故事从星空战争升入维度、界海和真理层面，无序之王的终局轮廓出现。",
    people: ["任杰", "姜九黎", "任缘", "姜繁", "陈横", "陆千帆", "黑帝"],
    details: [
      "帝冢、至高方碑、火种刻录和无垠界塔连接过去时代与高维真相。",
      "奈落忘川、世界旅人、巨兽星空文明和超脱者设定打开更大舞台。",
      "真理道门与无序王座出现，任杰意识到破开星笼远不是自由终点。",
    ],
  },
  {
    range: "2417-2523",
    title: "奈落忘川与最后拼图篇",
    summary: "任杰深入奈落忘川，在破碎世界、梦境和记忆里补齐最终战拼图。",
    people: ["任杰", "姜九黎", "空琉", "米卡", "坐忘鲸", "丹青", "君篾"],
    details: [
      "任杰在多个破碎世界中扮演救世主，理解不同文明和失败者的答案。",
      "坐忘鲸、丹青、君篾、无忧乡、源始粒子等设定为终局提供方法和资源。",
      "这一篇重点是补全自我、守护和选择，而不是单纯堆战力。",
    ],
  },
  {
    range: "2524-2624",
    title: "穹顶总攻与至高终局篇",
    summary: "南墙、界川、真理道门和古初之域全面开战，任杰等人赢下终局并继续远行。",
    people: ["任杰", "姜繁", "杨坚", "江南", "陆千帆", "愚者", "萧吹火", "姜九黎"],
    details: [
      "穹顶之上总攻打响，任杰斩断界川、叩门、踏足古初。",
      "无序之王、永恒仙族和终极真理结构被清算，陆千帆、愚者、姜繁等人走向至高。",
      "结局回到婚礼和人间值得，但任杰没有停在终点，而是继续奔赴未知之无。",
    ],
  },
];

const worldSections = [
  {
    name: "基础世界",
    accent: "#d66a5f",
    entries: [
      {
        title: "大灾变后的蓝星",
        body: "蓝星保留现代城市、科技、学校、军队和科研机构，但神圣天门、时空魔渊、灵气复苏和魔灾改变了文明结构。人族不再占据绝对优势，只能依靠星火城市和官方战斗体系在多族夹缝中存续。",
      },
      {
        title: "星火城市",
        body: "大夏三十三座星火主城是人族生存核心。城市中有火柴杆等大型防御装置，用于在魔灾爆发时生成结界、控制灾害范围。普通人的日常生活与高危魔灾长期并存。",
      },
      {
        title: "虚假星空",
        body: "中后期揭示，蓝星看到的星空并非真正自由星空，而是方舟计划制造和维持的星笼环境。破开星空幻象，是蓝盟从被观察对象变成星空文明的转折。",
      },
    ],
  },
  {
    name: "力量体系",
    accent: "#5fb7aa",
    entries: [
      {
        title: "基因武者",
        body: "人类通过启灵基因药剂打开基因锁，觉醒自身基因序列能力。觉醒者进入神武高中、猎魔学院等体系培养，是人族最基础也最稳定的战斗路线。",
      },
      {
        title: "神眷者",
        body: "被神圣天门或神明体系选中的人，获得赐福和神系能力。神眷者力量强大，但也容易被天门教会和神明意志束缚，夜未央就是这种矛盾的代表。",
      },
      {
        title: "魔契者",
        body: "与恶魔立下契约的人，能够魔化并使用恶魔力量。魔契者往往被社会恐惧、被天门教会追杀，使用力量后必须支付代价，否则可能遭受魔痕病或恶魔侵蚀。",
      },
      {
        title: "境界等级",
        body: "常见等级为觉境、脊境、力境、藏境、体境、启境、命境、噬境、天境、威境、我境。后期继续升级到主宰、大主宰、无限主宰、川境和至高之王。",
      },
    ],
  },
  {
    name: "核心种族",
    accent: "#d8a84e",
    entries: [
      {
        title: "人族",
        body: "故事核心种族。早期靠大夏、星火城市和猎魔体系守住文明火种，后期在任杰推动下整合蓝盟、破开星笼、建立破晓星域。",
      },
      {
        title: "妖族",
        body: "主要占据山海境、荒野和天空区域。妖族不是单纯反派，它们有自己的联盟、霸主、尊严和生存压力，后期逐步纳入蓝盟框架。",
      },
      {
        title: "灵族",
        body: "与森林、灵境、生命、帝岁和火种等设定相关。灵境七域展示了灵族的生命体系和族内复杂利益。",
      },
      {
        title: "神族与魔族",
        body: "神族通过神圣天门和诸神宫影响蓝星，魔族则与时空魔渊、荡天魔域相关。两族高层并非单纯善恶，而是方舟计划和终极灾厄压力下的操盘者。",
      },
    ],
  },
  {
    name: "组织势力",
    accent: "#9c80d6",
    entries: [
      {
        title: "大夏官方体系",
        body: "包括司耀厅、镇魔司、防卫军、猎魔学院、猎魔总院、高天之城和夏研所。它们分别承担救援、镇魔、军事防御、人才培养、空域守护和科研推进。",
      },
      {
        title: "天门教会",
        body: "自认奉神明意志救赎人类，极端敌视魔契者。它有理想主义的一面，也有把人当作神明资产和祭品的残酷一面。",
      },
      {
        title: "塔罗牌",
        body: "暗线执行官组织，长期寻找任杰这类特殊魔契者。倒吊人、审判、隐者等执行官能力诡异，行事狠辣。",
      },
      {
        title: "蓝盟与破晓联盟",
        body: "蓝盟代表蓝星各族结束内耗、共同破笼。破晓联盟则是星空时代的升级形态，目标是守住新家园并改写星空格局。",
      },
    ],
  },
  {
    name: "计划概念",
    accent: "#8bbf66",
    entries: [
      {
        title: "方舟计划",
        body: "神魔两族为应对更高层灾厄而推动的文明实验。蓝星各族被放在星笼中，长期被冲突、灾难和时代轮回压迫，以培养所谓奇迹之种。",
      },
      {
        title: "葬神计划",
        body: "任杰对抗神族、教会和旧秩序的重要行动。它标志着任杰不再只防守，而开始主动斩断压在人族头顶的神权结构。",
      },
      {
        title: "薪火",
        body: "贯穿全书的精神核心。个人会死，城市会毁，时代会结束，但前人点燃的火必须交到后来人手里。",
      },
    ],
  },
  {
    name: "终局结构",
    accent: "#c98bd3",
    entries: [
      {
        title: "界海与界川",
        body: "高维世界结构。无数世界泡在界源禁海中浮沉，界川则像能量与真理的主干河流。终局中斩断或争夺界川，直接决定世界体系走向。",
      },
      {
        title: "真理道门",
        body: "穹顶尽头的核心门户，象征既定真理和答案。无序之王占据道门，让世界体系长期被污染和阻断。",
      },
      {
        title: "古初之域与未知之无",
        body: "古初之域是至高点所在的终极场域。至高之后仍有未知之无，结局选择继续远行，说明故事真正的答案不在终点，而在路上。",
      },
    ],
  },
];

const characters = [
  ["任杰", "主角团", "男主 / 破局者", ["恶魔之树", "破妄", "深渊", "至高"], "锦城打工少年出身，因魔灾死亡后成为魔契者。一路从猎魔学员成长为蓝盟领袖和至高之王。", "任", "#d66a5f", "#111417"],
  ["姜九黎", "主角团", "女主 / 星辰剑道", ["群星", "剑", "姜家", "婚礼"], "姜家三小姐，星辰剑道天才。与任杰从互怼到并肩，最终成为任杰最重要的人间归处。", "黎", "#5478d4", "#d8a84e"],
  ["陶夭夭", "主角团", "妹妹 / 大衍核心", ["魔痕病", "大衍", "世界塑造"], "早期受魔痕病困扰，是任杰拼命变强的理由之一。后期觉醒大衍，成为蓝盟世界级核心。", "夭", "#d8a84e", "#8bbf66"],
  ["陆沉", "主角团", "兄弟 / 百鬼传承", ["夜叉", "永夜惧象", "百鬼"], "任杰重要兄弟，承接百鬼阎罗与永夜惧象线，是魔契者道路上的关键继承者。", "沉", "#1e1f22", "#eef0ed"],
  ["梅钱", "主角团", "命运变量", ["厄运", "纯白序列", "倒霉"], "看似倒霉到离谱，实则多次成为死局里的关键变量，牵动命运和纯白序列相关设定。", "梅", "#eef0ed", "#9c80d6"],
  ["墨婉柔", "主角团", "力量防线", ["肉盾", "天下之力", "守护"], "团队力量与防御担当，早期负责扛线，后期成为大衍体系中不可缺少的力量拼图。", "墨", "#5f6670", "#d66a5f"],
  ["安宁", "锦城", "家人 / 养母", ["家", "收养", "人间锚点"], "陶夭夭母亲，收养任杰。她让任杰在失去亲人后重新拥有家。", "安", "#8bbf66", "#d8a84e"],
  ["陶然", "锦城", "牺牲者 / 司耀官", ["晋城", "救援", "牺牲"], "晋城魔灾中救出任杰后牺牲，虽然早逝，却决定了任杰后半生的起点。", "陶", "#d8a84e", "#30343b"],
  ["卫平生", "大夏", "司耀教官", ["救援", "基层", "责任"], "任杰早期教官，也是陶然战友。代表基层守护者的责任感和人情味。", "卫", "#5fb7aa", "#30343b"],
  ["诺颜", "大夏", "科研 / 装臂高手", ["华天生物", "强殖", "科研"], "早期帮任杰装机械臂，表面不靠谱，实际科研能力很强，是基因与强殖技术线的重要人物。", "诺", "#d66a5f", "#9c80d6"],
  ["陆千帆", "大夏", "人族顶梁柱", ["天剑", "主宰", "薪火"], "大夏顶级强者，陶夭夭师父。即便不在场，其留下的剑与意志仍守护人族山河。", "陆", "#d8a84e", "#eef0ed"],
  ["龙玦", "大夏", "大局掌舵者", ["总司主", "真相", "决策"], "大夏高层，负责大局判断，多次向任杰揭开更深层世界迷雾。", "龙", "#5fb7aa", "#5478d4"],
  ["云天遥", "大夏", "总院院长", ["逍遥仙", "高天", "守城"], "猎魔总院院长，高天之城核心战力。大夏危局中以逍遥仙姿态死守防线。", "云", "#9c80d6", "#eef0ed"],
  ["夜晴", "大夏", "护道人", ["影", "开路", "磨炼"], "任杰护道人。她的保护不是圈养，而是让任杰在真正危险中学会独自飞行。", "晴", "#111417", "#5fb7aa"],
  ["玖叶", "大夏", "过去真相关键", ["群星基地", "母亲线", "旧时代"], "带任杰接触群星基地与虚假星空秘密，是过去、科技断层和家庭线的关键人物。", "玖", "#30343b", "#d8a84e"],
  ["星纪", "大夏", "科技核心", ["资料库", "人工智能", "星空建设"], "群星基地与高科技体系核心，后期成为蓝盟科技、星域建设和资料整合的重要支柱。", "星", "#5fb7aa", "#5478d4"],
  ["千流", "学院同代", "极速天才", ["速度", "个人赛", "强敌"], "高天选拔个人赛最强对手之一，被任杰击败后仍是年轻代代表。", "千", "#5478d4", "#eef0ed"],
  ["温牧之", "学院同代", "文气谋士", ["梦境", "文气", "兴夏"], "同代中少数能在精神与谋略层面和任杰对抗的人物，气质沉稳。", "温", "#8bbf66", "#d8a84e"],
  ["夜未央", "天门教会", "神眷天才", ["神眷", "绝对掌控", "悲剧"], "天门教会培养的年轻天才，既想赢任杰，也被教会和神眷代价束缚。", "未", "#eef0ed", "#9c80d6"],
  ["雪鸮", "学院同代", "赛区天才", ["巅峰战队", "冰雪", "竞争"], "高天选拔中的年轻天才之一，和武理等人构成任杰同代竞争层。", "雪", "#eef0ed", "#5478d4"],
  ["武理", "学院同代", "硬碰硬武者", ["拳", "武道", "魔罗迷宫"], "武道型强者，和任杰正面交锋，代表同代硬战力。", "武", "#d66a5f", "#30343b"],
  ["夜王百舸", "魔契魔域", "百鬼领袖", ["百鬼阎罗", "永夜", "传承"], "百鬼阎罗核心人物，给魔契者在黑暗中找路，对陆沉和任杰影响巨大。", "舸", "#111417", "#9c80d6"],
  ["红豆", "魔契魔域", "梦魇强者", ["梦魇", "回响权杖", "赤土"], "早期危险又神秘，和赤土禁区、回响权杖密切相关，后期与任杰关系越来越深。", "豆", "#d66a5f", "#1e1f22"],
  ["愚者", "魔契魔域", "魔域高端战力", ["白洞", "主宰", "看戏"], "前期像幕后看戏者，后期成为破晓和至高道路的重要战力。", "愚", "#9c80d6", "#111417"],
  ["蜃妖", "魔契魔域", "第一魔子", ["月光幻界", "命定主宰", "幻"], "早中期顶级威胁，容貌与幻境能力极具压迫感。", "蜃", "#eef0ed", "#5fb7aa"],
  ["秀豆", "魔契魔域", "黎明城部下", ["魔域", "进化", "小弟"], "魔域线被任杰收服的特色角色，参与黎明城和魔域扩张。", "秀", "#8bbf66", "#111417"],
  ["钢铁新娘", "魔契魔域", "旧时代誓约", ["钢铁之心", "守墓", "誓约"], "无序之渊后期关键人物，承载守墓、爱情和旧时代遗憾。", "钢", "#5f6670", "#d66a5f"],
  ["缝尸人", "魔契魔域", "旧时代强者", ["缝尸", "隐世", "守护"], "立场偏灰，但有自己坚持守护的对象，与葵、钢铁新娘线联系很深。", "缝", "#30343b", "#8bbf66"],
  ["闫律", "天门教会", "教会高层", ["信仰", "圣祭", "救赎"], "天门教会高层，信仰坚定，认为教会是为了人族救赎而存在。", "闫", "#eef0ed", "#d8a84e"],
  ["刃心", "天门教会", "圣祭推动者", ["问神", "圣祭", "教会"], "推动圣祭名单和针对任杰的行动，是教会线重要人物。", "刃", "#d66a5f", "#eef0ed"],
  ["倒吊人", "塔罗牌", "执行官", ["颠倒", "概念", "围杀"], "塔罗牌执行官之一，能颠倒内外、生死、上下等概念，是早期极危险强敌。", "吊", "#9c80d6", "#30343b"],
  ["审判", "塔罗牌", "执行官", ["断罪", "围杀", "权杖"], "塔罗牌执行官，断罪能力危险，曾参与围杀任杰。", "审", "#d66a5f", "#111417"],
  ["颜如玉", "塔罗牌", "沙漏魅魔", ["十二时辰", "选择题", "魔城"], "擅长制造道德困境，把战场变成心理折磨的反派型人物。", "颜", "#d66a5f", "#d8a84e"],
  ["玄盏", "神族", "大神官", ["诸神宫", "决策", "神族"], "神族诸神宫核心决策者，代表神族高层秩序和算计。", "玄", "#eef0ed", "#9c80d6"],
  ["纪晨星", "神族", "主神相关", ["十二主神", "可能", "交易"], "十二主神相关人物，后期与任杰在神藏和可能性层面反复交锋。", "纪", "#5478d4", "#eef0ed"],
  ["帝禁", "神族", "世界主宰", ["规则", "炼化", "神临"], "神族强者，世界主宰和规则压制能力突出。", "禁", "#d8a84e", "#eef0ed"],
  ["程琳", "妖族", "猫系强者", ["猫", "营救", "山海"], "山海境营救线的重要战力，曾保护任杰等人脱离危机。", "琳", "#d8a84e", "#111417"],
  ["龙冉", "妖族", "妖族高层", ["山海", "霸主", "立场"], "妖族高层人物，体现山海境和妖族秩序的强硬立场。", "冉", "#8bbf66", "#d66a5f"],
  ["叮铛", "妖族", "蓝盟成员", ["夜之序章", "妖族", "蓝盟"], "妖族重要角色，后期参与蓝盟体系，是多族合流中的关键一员。", "叮", "#111417", "#d8a84e"],
  ["苟启", "妖族", "山海向导", ["求生", "滑头", "山海"], "山海境行动中的特色角色，嘴上油滑但极懂生存规则。", "苟", "#8bbf66", "#30343b"],
  ["慧灵树王", "灵族", "灵族顶尖存在", ["生命", "树王", "灵境"], "灵族核心强者，灵境七域和魔剎禁海线都有重要作用。", "慧", "#8bbf66", "#eef0ed"],
  ["白胜雪", "灵族", "慧灵一脉", ["灵主", "结盟", "灵族"], "慧灵一脉重要人物，参与灵境与禁海相关行动。", "白", "#eef0ed", "#8bbf66"],
  ["奴娇", "灵族", "灵境角色", ["灵境", "记忆", "七域"], "灵境七域中的代表人物之一，参与任杰在灵境的冒险与冲突。", "奴", "#9c80d6", "#8bbf66"],
  ["朔", "星空方舟", "观测员", ["003观测站", "方舟计划", "真相"], "方舟计划真相的关键讲述者，既是操盘者之一，也是任杰可利用的力量。", "朔", "#eef0ed", "#30343b"],
  ["花菱", "星空方舟", "命运棋手", ["棋局", "夺胜战争", "命运"], "擅长命运和布局，在夺胜战争中开启属于自己的棋局。", "花", "#d66a5f", "#8bbf66"],
  ["寒菲", "星空方舟", "星空行动者", ["崩坏乐园", "星空", "共生"], "星空远征和崩坏乐园相关人物，与任杰后期行动有重要交集。", "寒", "#5fb7aa", "#eef0ed"],
  ["任缘", "星空方舟", "特殊孩子线", ["源神", "巨兽", "能量"], "任杰后期特殊孩子线角色，源神、巨兽和能量体系相关，设定非常特殊。", "缘", "#d8a84e", "#5fb7aa"],
  ["姜繁", "终局高维", "高维剑修", ["剑", "真理道门", "总攻"], "追寻真理道门和无序王座的高维强者，穹顶总攻关键战力。", "繁", "#eef0ed", "#5478d4"],
  ["江南", "终局高维", "至高同行者", ["至高", "古初", "未知"], "终局关键人物，与任杰并肩解决古初之域问题，并继续走向未知之无。", "江", "#5fb7aa", "#d8a84e"],
  ["萧吹火", "终局高维", "至高之王", ["火", "至高", "终局"], "终局踏足至高体系的人物之一，与江南、姜繁等构成更高层战力群。", "萧", "#d66a5f", "#d8a84e"],
  ["无序之王", "终局高维", "终局核心敌人", ["无序", "真理道门", "污染"], "占据真理道门、污染界海的终局敌人，是任杰最终必须越过的结构性压迫。", "序", "#111417", "#9c80d6"],
  ["铭道", "终局高维", "永恒仙族代表", ["永恒仙族", "律法", "清算"], "永恒仙族代表人物之一，终局被任杰等人清算。", "铭", "#eef0ed", "#d66a5f"],
];

const places = [
  ["锦城", "任杰成长起点，有司耀厅、家庭线和最初魔灾。它代表任杰最不愿失去的人间烟火。", ["任杰", "安宁", "陶夭夭"], "#d66a5f"],
  ["晋城", "任杰童年悲剧发生地。晋城甲级魔灾夺走他原本的家，也让陶然救出任杰后牺牲。", ["陶然", "任杰"], "#5f6670"],
  ["高天之城", "人族天空防线和猎魔总院所在地，常年巡航大夏空域，是大夏高端战力象征。", ["云天遥", "唐朝"], "#d8a84e"],
  ["赤土禁区", "血色荒芜禁区，隐藏古老遗迹、魔渊线索和回响权杖等重要设定。", ["红豆", "祁墨"], "#d66a5f"],
  ["山海境", "妖族核心地盘，山海联盟和五大霸主盘踞，人族进入极度危险。", ["程琳", "龙冉", "苟启"], "#8bbf66"],
  ["灵境七域", "灵族核心副本，帝岁、火种、星之匙等资源集中出现。", ["慧灵树王", "白胜雪"], "#5fb7aa"],
  ["荡天魔域", "时空魔渊与魔族力量的重要区域，后期成为任杰建立黎明城的舞台。", ["愚者", "秀豆"], "#9c80d6"],
  ["破晓星域", "蓝星破笼后建立的新根据地，承载蓝盟各族进入星空后的秩序。", ["任杰", "陶夭夭", "星纪"], "#5fb7aa"],
  ["奈落忘川", "高维世界线重要区域，记忆、梦境、坐忘鲸和最终拼图集中于此。", ["坐忘鲸", "丹青", "君篾"], "#5478d4"],
  ["真理道门", "穹顶尽头的核心门户，被无序之王占据，终局战的关键目标。", ["无序之王", "姜繁"], "#9c80d6"],
  ["古初之域", "至高点所在的终极场域，永恒仙族和至高体系在这里收束。", ["江南", "任杰", "铭道"], "#d8a84e"],
  ["未知之无", "至高之后仍然存在的空白远方，大结局中任杰等人继续前往。", ["任杰", "江南"], "#eef0ed"],
];

const state = {
  activeCharacterFaction: "全部",
  activeWorldCategory: worldSections[0].name,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function renderVisuals() {
  $("#visualGallery").innerHTML = visuals.map((visual) => `
    <article class="visual-card ${visual.className}">
      <div class="visual-title">
        <strong>${visual.title}</strong>
        <span>${visual.note}</span>
      </div>
    </article>
  `).join("");
}

function renderArcs() {
  const query = $("#arcSearch").value.trim().toLowerCase();
  const filtered = arcs.filter((arc) => {
    const haystack = [arc.range, arc.title, arc.summary, ...arc.people, ...arc.details].join(" ").toLowerCase();
    return haystack.includes(query);
  });

  $("#arcList").innerHTML = filtered.length ? filtered.map((arc, index) => `
    <article class="arc-card" data-arc="${index}">
      <div class="arc-main">
        <div class="arc-range">${arc.range}</div>
        <div>
          <h3>${arc.title}</h3>
          <p class="arc-summary">${arc.summary}</p>
        </div>
        <button class="expand-button" type="button" aria-label="展开${arc.title}" aria-expanded="false">+</button>
      </div>
      <div class="arc-detail">
        <ul class="detail-list">
          ${arc.details.map((item) => `<li>${item}</li>`).join("")}
        </ul>
        <div class="chip-row">
          ${arc.people.map((person) => `<span class="chip">${person}</span>`).join("")}
        </div>
      </div>
    </article>
  `).join("") : `<div class="empty-state">没有找到匹配的篇章。</div>`;
}

function renderWorldCategories() {
  $("#worldCategoryRail").innerHTML = worldSections.map((section) => `
    <button class="category-button ${section.name === state.activeWorldCategory ? "is-active" : ""}" type="button" data-world="${section.name}">
      ${section.name}
    </button>
  `).join("");
}

function renderWorldEntries() {
  const section = worldSections.find((item) => item.name === state.activeWorldCategory) || worldSections[0];
  $("#worldEntries").innerHTML = section.entries.map((entry) => `
    <article class="world-entry" style="--accent:${section.accent}">
      <h3>${entry.title}</h3>
      <p>${entry.body}</p>
    </article>
  `).join("");
}

function factionList() {
  return ["全部", ...new Set(characters.map((character) => character[1]))];
}

function renderCharacterFilters() {
  $("#characterFilters").innerHTML = factionList().map((faction) => `
    <button class="filter-button ${faction === state.activeCharacterFaction ? "is-active" : ""}" type="button" data-faction="${faction}">
      ${faction}
    </button>
  `).join("");
}

function characterMatches(character, query) {
  if (!query) return true;
  return character.join(" ").toLowerCase().includes(query);
}

function portraitHtml(character, large = false) {
  const [name,,,,,, symbol, c1, c2] = character;
  return `<span class="portrait ${large ? "portrait-large" : ""}" style="--c1:${c1};--c2:${c2}" aria-label="${name}生成形象"><span>${symbol}</span></span>`;
}

function renderCharacters() {
  const query = $("#characterSearch").value.trim().toLowerCase();
  const rows = characters.filter((character) => {
    const factionOk = state.activeCharacterFaction === "全部" || character[1] === state.activeCharacterFaction;
    return factionOk && characterMatches(character, query);
  });

  $("#characterRows").innerHTML = rows.length ? rows.map((character) => {
    const [name, faction, role, keywords, intro] = character;
    return `
      <tr>
        <td>${portraitHtml(character)}</td>
        <td class="name-cell"><strong>${name}</strong><span>${role}</span></td>
        <td>${faction}</td>
        <td>${role}</td>
        <td><div class="keyword-list">${keywords.map((keyword) => `<span>${keyword}</span>`).join("")}</div></td>
        <td><button class="detail-link" type="button" data-profile="${name}">${intro}</button></td>
      </tr>
    `;
  }).join("") : `<tr><td colspan="6"><div class="empty-state">没有找到匹配的人物。</div></td></tr>`;
}

function renderPlaces() {
  $("#placeGrid").innerHTML = places.map(([name, body, people, accent]) => `
    <article class="place-card" style="--accent:${accent}">
      <div>
        <h3>${name}</h3>
        <p>${body}</p>
      </div>
      <div class="chip-row">
        ${people.map((person) => `<span class="chip">${person}</span>`).join("")}
      </div>
    </article>
  `).join("");
}

function openProfile(name) {
  const character = characters.find((item) => item[0] === name);
  if (!character) return;

  const [characterName, faction, role, keywords, intro] = character;
  $("#profileContent").innerHTML = `
    <article class="profile-card">
      ${portraitHtml(character, true)}
      <div class="profile-copy">
        <p class="section-kicker">${faction}</p>
        <h2>${characterName}</h2>
        <div class="profile-meta">
          <span class="chip">${role}</span>
          ${keywords.map((keyword) => `<span class="chip">${keyword}</span>`).join("")}
        </div>
        <p>${intro}</p>
        <p>形象设定：第一版以页面内生成头像呈现，颜色和符号取自角色气质与能力关键词；后续可以替换为独立 AI 生图人物立绘。</p>
      </div>
    </article>
  `;

  const dialog = $("#profileDialog");
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

function bindEvents() {
  $(".tabs").addEventListener("click", (event) => {
    const button = event.target.closest(".tab-button");
    if (!button) return;

    $$(".tab-button").forEach((item) => item.classList.remove("is-active"));
    $$(".tab-panel").forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    $(`#${button.dataset.tab}`).classList.add("is-active");
  });

  $("#globalSearch").addEventListener("input", (event) => {
    const value = event.target.value;
    $("#arcSearch").value = value;
    $("#characterSearch").value = value;
    renderArcs();
    renderCharacters();
  });

  $("#arcSearch").addEventListener("input", renderArcs);

  $("#arcList").addEventListener("click", (event) => {
    const button = event.target.closest(".expand-button");
    if (!button) return;

    const card = button.closest(".arc-card");
    const isOpen = card.classList.toggle("is-open");
    button.textContent = isOpen ? "−" : "+";
    button.setAttribute("aria-expanded", String(isOpen));
  });

  $("#worldCategoryRail").addEventListener("click", (event) => {
    const button = event.target.closest(".category-button");
    if (!button) return;
    state.activeWorldCategory = button.dataset.world;
    renderWorldCategories();
    renderWorldEntries();
  });

  $("#characterFilters").addEventListener("click", (event) => {
    const button = event.target.closest(".filter-button");
    if (!button) return;
    state.activeCharacterFaction = button.dataset.faction;
    renderCharacterFilters();
    renderCharacters();
  });

  $("#characterSearch").addEventListener("input", renderCharacters);

  $("#characterRows").addEventListener("click", (event) => {
    const button = event.target.closest("[data-profile]");
    if (!button) return;
    openProfile(button.dataset.profile);
  });

  $(".dialog-close").addEventListener("click", () => {
    $("#profileDialog").close();
  });

  $("#profileDialog").addEventListener("click", (event) => {
    const dialog = event.currentTarget;
    const rect = dialog.getBoundingClientRect();
    const inDialog = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (!inDialog) dialog.close();
  });
}

function init() {
  renderVisuals();
  renderArcs();
  renderWorldCategories();
  renderWorldEntries();
  renderCharacterFilters();
  renderCharacters();
  renderPlaces();
  bindEvents();
}

init();
