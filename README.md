# 幻兽森林 — MoonBit + WASM 游戏原型

地图探索 + 回合制战斗 + 捕捉系统。  
游戏逻辑 100% 在 MoonBit，JS 只做 DOM 渲染（约 150 行）。

## 项目结构

```
jiuxuan_pm/
├── CLAUDE.md                  AI 辅助开发指南
└── projects/
    ├── moon.mod.json           模块配置
    ├── main/
    │   ├── moon.pkg.json       包配置 + 导出列表（wasm / wasm-gc 双目标）
    │   └── game.mbt            全部游戏逻辑（MoonBit）
    ├── www/
    │   ├── index.html          页面结构
    │   ├── style.css           样式
    │   └── main.js             JS 胶水层（~150行，无游戏逻辑）
    └── _build/                 moon build 编译输出（勿手动修改）
        └── wasm/release/build/main/
            └── main.wasm       WASM 二进制
```

## 环境准备

```bash
# 安装 MoonBit 工具链
curl -fsSL https://cli.moonbitlang.com/install/unix.sh | bash

# 验证安装
moon version
```

## 编译 & 运行

```bash
cd projects

# 编译 MoonBit → WASM（输出到 _build/wasm/release/build/main/）
moon build --target wasm --release

# 启动本地服务器（从 projects/ 目录启动，确保 www/ 和 _build/ 都可访问）
python3 -m http.server 3000

# 打开浏览器（Chrome / Firefox / Safari 均支持）
open http://localhost:3000/www/
```

> **注意**：必须从 `projects/` 目录启动服务器，因为 `www/main.js` 通过绝对路径 `/_build/wasm/...` 加载 WASM，需要 `www/` 和 `_build/` 在同一根目录下。

## 浏览器兼容性

使用 MoonBit 常规 `wasm` 目标（线性内存），**不依赖**任何浏览器专有 API。

| 浏览器 | 支持 |
|--------|------|
| Chrome | ✅ |
| Firefox | ✅ |
| Safari | ✅ |
| Edge | ✅ |

## MoonBit ↔ JS 通信模式

MoonBit wasm 目标无法直接返回结构体给 JS，因此采用**全局结果 + getter + 字符串解码**模式：

```
JS 调用 MoonBit（行动函数）     MoonBit 把结果写入全局 _result
─────────────────────────────────────────────────────────────
exports.player_attack()    →   _result.message = "..."
                               _result.damage_dealt = 34
                               ...

JS 读取结果（getter）
─────────────────────────────────────────────────────────────
exports.get_last_message()         → Int (WASM 内存指针)
exports.get_last_damage_dealt()    → Int
exports.get_last_enemy_defeated()  → Bool
...
```

String 类型返回值是 WASM 线性内存中的指针。MoonBit 以 UTF-16LE 格式存储，指针前 4 字节（低 16 位）存放字符串长度。JS 侧通过 `decodeString(ptr)` 解码：

```js
function decodeString(ptr) {
  const len = new DataView(mem.buffer).getUint32(ptr - 4, true) & 0xffff
  return new TextDecoder('utf-16le').decode(mem.slice(ptr, ptr + len * 2))
}
```

## 核心文件说明

### main/game.mbt

| 函数 | 说明 |
|------|------|
| `new_game()` | 初始化 / 重置游戏状态 |
| `start_battle(id)` | 根据地点 ID 设置敌人数据 |
| `player_attack()` | 计算玩家攻击 + 敌方反击，写入 _result |
| `try_catch()` | 计算捕捉概率，写入 _result |
| `run_away()` | 逃跑，写入 _result |
| `recover_after_defeat()` | 玩家倒下后恢复 HP |
| `get_*` | 各种状态 getter |

JS 导入采用 `"module" "function"` 语法：

```moonbit
fn math_random() -> Double = "env" "math_random"
```

### main/moon.pkg.json

- `link.wasm.exports` — 控制哪些函数对 JS 可见
- `export-memory-name: "memory"` — 导出线性内存供 JS 读取字符串
- 同时配置了 `wasm-gc` 目标（`use-js-builtin-string: true`）作为备选，但该目标仅 Chrome/Edge 可用

## 捕捉概率

| 敌人血量比例 | 捕捉成功率 |
|------------|----------|
| > 50%      | 15%      |
| 25% ~ 50%  | 45%      |
| < 25%      | 75%      |

## 扩展方向

**加新地点**：在 `game.mbt` 的 `get_location()` 加一行 match 分支，并在 `index.html` 中添加对应 `data-id` 的标记按钮

```moonbit
5 => { name: "火山熔岩", emoji: "🌋", hp: 60, atk: 18 }
```

**改伤害公式**：修改 `roll_damage()`

**加技能**：给 `player_attack` 加参数

```moonbit
pub fn player_attack(skill_id : Int) -> Unit { ... }
```

**存档**：在 JS 侧把 `get_captured_count()` 等序列化到 `localStorage`
