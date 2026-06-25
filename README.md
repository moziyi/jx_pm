# 幻兽森林 — MoonBit + WASM 游戏

地图探索 + 五行元素 + 回合制战斗 + 道具系统 + 随机事件。  
游戏逻辑 100% 在 MoonBit，JS 负责 UI、存档、事件分发。

## 项目结构

```
projects/
├── moon.mod               模块配置
├── package.json           Bun / Vite 配置
├── vite.config.ts         Vite 开发服务器配置
├── main/                  MoonBit 游戏逻辑
│   ├── moon.pkg           包配置 + 导出列表
│   ├── config.mbt         常量：元素、地点、初始宠物、等级系统、EXP
│   ├── state.mbt          数据结构与全局状态
│   ├── battle.mbt         战斗逻辑 + 五行克制 + AI + 暴击
│   ├── items.mbt          道具使用（8 种道具）
│   ├── game.mbt           初始化、宠物管理、存档、getter
│   └── save.mbt           存档导出 v9
├── www/                   JS 前端
│   ├── app.js             应用入口 + 状态同步
│   ├── wasm.js            WASM 加载 + 字符串解码
│   ├── ui.js              动画/特效/弹窗/UI 工具
│   ├── pokedex.js         图鉴状态/标记/渲染
│   ├── items.js           道具计数 + 地图道具按钮
│   ├── pets.js            宠物列表/菜单/拖拽/初始选择
│   ├── battle.js          战斗 UI：按钮/结果处理/退场
│   ├── map.js             地图事件/特殊点位
│   ├── config.js          游戏配置（宠物、道具、地点、事件）
│   ├── storage.js         存档读写 v9
│   ├── index.html         页面结构
│   └── style.css          样式 + 战斗动画
└── _build/                moon build 编译输出（勿手动修改）
```

## 快速开始

```bash
# 安装依赖
cd projects
bun install

# 安装 MoonBit 工具链（首次）
curl -fsSL https://cli.moonbitlang.com/install/unix.sh | bash

# 编译 WASM（首次或修改 .mbt 后）
moon build --target wasm --release
cp _build/wasm/release/build/main/main.wasm www/main.wasm

# 启动开发服务器
bun run dev
# 打开 http://localhost:5173

# 生产构建
bun run build
# 输出: www/dist/
```

## 游戏系统

### 五行元素
金木土水火。克制 1.2x / 被克 0.8x / 相生 0.5x（治疗敌方）。使用「元素技」触发克制效果，1 回合冷却。

### 宠物
- 初始 5 选 1，最多携带 5 只，寄存 60 只
- 属性：HP / ATK / DEF / AGI
- 战斗中可切换上场宠物（消耗 1 回合）
- 支持改名、放生、拖拽排序
- EXP 共享：70% 分给其他存活宠物

### 战斗
- **敌人 AI**：HP>50% 每 3 动放元素技，HP≤50% 每 2 动
- **暴击**：AGI × 0.5% 概率，上限 10%，1.5x 伤害
- **闪避**：AGI × 0.5% 概率，上限 20%
- **DEF 减伤**：DEF × 0.5 固定减伤
- **捕捉**：HP 越低成功率越高，幻兽符 +15%，高级符 +30%

### 道具

| 道具 | 效果 | 初始 |
|------|------|------|
| 🧪 药草 | 恢复 20 HP | 3 |
| 💊 强效药草 | 恢复 50 HP | 1 |
| 🌸 半恢复草 | 恢复 50% 最大 HP | 1 |
| 🌟 全恢复草 | 恢复全部 HP | 0 |
| 🌿 醒神草 | 复苏，恢复 50% HP | 1 |
| ✨ 满血醒神草 | 复苏，恢复全部 HP | 0 |
| 🔮 幻兽符 | 捕捉率 +15% | 2 |
| ⭐ 高级幻兽符 | 捕捉率 +30% | 1 |

### 地图
6 个地点：🌲幽暗森林 / 💎水晶矿洞 / 🏛️古代神殿 / 🌊月影湖泊 / 🌋炎熔火山 / 🌀幻境裂隙。

点击地图标记 → 1/3 概率战斗，2/3 概率随机事件（获得道具/恢复/受伤等）。

### 特殊事件
每场战斗后有 30% 概率刷新特殊标记：💎宝藏 / ⭐稀有敌人 / 🧙神秘商人。

### 图鉴
24 种怪物，分 6 区域。遇到标记"已见"，捕捉标记"已捕获"。进度保存在 localStorage。

### 存档
v9 格式，含 UUID、道具库存、宠物完整数据（含寄存）。向下兼容 v7+。

## 修改游戏内容

- **新地点/敌人**：`config.mbt` `get_location_pool()` + `config.js` `SCENES`/`EVENTS` + `index.html` 标记按钮
- **新道具**：`state.mbt` `Inventory` + `items.mbt` 函数 + `moon.pkg` 导出 + `config.js` `INITIAL_ITEMS`
- **新事件**：`config.js` `EVENTS` 添加条目
- **新导出**：`pub fn` → `moon.pkg` `wasm.exports` 列表
