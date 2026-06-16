# 幻兽森林 — MoonBit + WASM 游戏

地图探索 + 五行元素 + 回合制战斗 + 道具系统 + 随机事件。  
游戏逻辑 100% 在 MoonBit，JS 负责 UI、存档、事件分发。

## 项目结构

```
projects/
├── moon.mod.json           模块配置
├── main/                   MoonBit 游戏逻辑
│   ├── moon.pkg.json       包配置 + 导出列表
│   ├── config.mbt          游戏常量：元素、地点、初始宠物、初始道具
│   ├── state.mbt           数据结构与全局状态
│   ├── battle.mbt          战斗逻辑 + 五行克制
│   ├── items.mbt           道具使用
│   └── game.mbt            初始化、宠物管理、存档、getter
├── www/                    JS 前端
│   ├── config.js           游戏配置（宠物、道具、地点、事件）
│   ├── storage.js          存档读写
│   ├── main.js             应用逻辑
│   ├── index.html          页面结构
│   └── style.css           样式
└── _build/                 moon build 编译输出（勿手动修改）
```

## 快速开始

```bash
# 安装 MoonBit
curl -fsSL https://cli.moonbitlang.com/install/unix.sh | bash

# 编译
cd projects
moon build --target wasm --release

# 启动
python3 -m http.server 3000
# 打开 http://localhost:3000/www/
```

> Chrome / Firefox / Safari 均支持。务必从 `projects/` 目录启动服务器。

## 游戏系统

### 五行元素
金木土水火，克制 1.2x / 被克 0.8x / 相生 0.5x。使用「元素技」触发克制效果。

### 宠物
- 初始宠物「小幽」🔥火元素，最多携带 5 只
- 战斗中可切换上场宠物（消耗 1 回合）
- HP=0 的宠物无法出战
- 支持改名、放生

### 道具
| 道具 | 效果 | 场景 |
|------|------|------|
| 🧪 药草 | 恢复 20 HP | 地图/战斗 |
| 🌿 醒神草 | 复苏倒下宠物，恢复 50% HP | 地图/战斗 |
| 🔮 幻兽符 | 40% 固定捕捉率（替代普通捕捉） | 仅战斗 |

初始持有: 药草 x3, 醒神草 x1, 幻兽符 x2。战斗中消耗 1 回合。

### 地图事件
点击地图标记触发随机事件（每个地点 5 种）：
- 遭遇敌人（战斗）
- 捡到道具
- 宠物恢复 / 受伤

事件配置在 `www/config.js` → `EVENTS`，可自由编辑。

## 修改游戏内容

- **加新地点/敌人**：修改 `config.mbt` 和 `config.js`
- **改初始宠物**：修改 `config.mbt` 的 `_starter`
- **改道具配置**：修改 `config.js` 的 `INITIAL_ITEMS`
- **加新事件**：修改 `config.js` 的 `EVENTS`
