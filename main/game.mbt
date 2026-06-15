// ===========================================================================
// game.mbt — 游戏核心逻辑
// MoonBit 编译到 wasm-gc，由 JS 胶水层调用
// ===========================================================================

// ---------------------------------------------------------------------------
// JS 互操作：从宿主环境导入 math_random
// JS 侧需要在 importObject 里提供 "env"."math_random"
// ---------------------------------------------------------------------------
fn math_random() -> Double = "env" "math_random"

// ---------------------------------------------------------------------------
// 数据结构（内部类型加 priv，消除编译器警告）
// ---------------------------------------------------------------------------

priv struct LocationConfig {
  name  : String
  emoji : String
  hp    : Int
  atk   : Int
}

priv struct CapturedEntry {
  name  : String
  emoji : String
}

// 最后一次行动的结果（全局存储，供 JS 用 getter 读取）
priv struct LastResult {
  mut message         : String
  mut damage_dealt    : Int
  mut damage_taken    : Int
  mut catch_success   : Bool
  mut catch_rate      : Double
  mut player_defeated : Bool
  mut enemy_defeated  : Bool
}

// 游戏状态（全局单例）
priv struct GameState {
  mut player_hp      : Int
  mut player_max_hp  : Int
  mut enemy_hp       : Int
  mut enemy_max_hp   : Int
  mut enemy_atk      : Int
  mut enemy_name     : String
  mut enemy_emoji    : String
  mut captured       : Array[CapturedEntry]
}

// ---------------------------------------------------------------------------
// 全局实例
// ---------------------------------------------------------------------------

let _state : GameState = {
  player_hp:     50,
  player_max_hp: 50,
  enemy_hp:      0,
  enemy_max_hp:  0,
  enemy_atk:     0,
  enemy_name:    "",
  enemy_emoji:   "",
  captured:      [],
}

let _result : LastResult = {
  message:         "",
  damage_dealt:    0,
  damage_taken:    0,
  catch_success:   false,
  catch_rate:      0.0,
  player_defeated: false,
  enemy_defeated:  false,
}

// ---------------------------------------------------------------------------
// 内部工具函数
// ---------------------------------------------------------------------------

fn get_location(id : Int) -> LocationConfig {
  match id {
    1 => { name: "幽林精灵", emoji: "🧚", hp: 35, atk: 8  }
    2 => { name: "水晶蝙蝠", emoji: "🦇", hp: 28, atk: 10 }
    3 => { name: "神殿卫士", emoji: "⚗️",  hp: 50, atk: 14 }
    4 => { name: "月影水灵", emoji: "💧", hp: 32, atk: 7  }
    _ => { name: "未知生物", emoji: "❓", hp: 30, atk: 9  }
  }
}

fn roll_damage(base : Int, variance : Int) -> Int {
  let mult  = 0.85 + math_random() * 0.30          // 0.85 ~ 1.15
  let bonus = (math_random() * variance.to_double()).to_int()
  let dmg   = (base.to_double() * mult).to_int() + bonus
  if dmg < 1 { 1 } else { dmg }
}

fn calc_catch_rate() -> Double {
  let ratio = _state.enemy_hp.to_double() / _state.enemy_max_hp.to_double()
  if ratio > 0.50      { 0.15 }
  else if ratio > 0.25 { 0.45 }
  else                 { 0.75 }
}

fn clamp_min(v : Int, min : Int) -> Int {
  if v < min { min } else { v }
}

// 敌方反击，返回实际伤害
fn enemy_counter_attack() -> Int {
  let d = roll_damage(_state.enemy_atk, 4)
  _state.player_hp = clamp_min(_state.player_hp - d, 0)
  d
}

// ---------------------------------------------------------------------------
// 公开给 JS 的行动函数
// ---------------------------------------------------------------------------

/// 初始化 / 重置游戏
pub fn new_game() -> Unit {
  _state.player_hp     = 50
  _state.player_max_hp = 50
  _state.captured      = []
}

/// 根据地点 ID 开始一场战斗
pub fn start_battle(location_id : Int) -> Unit {
  let cfg = get_location(location_id)
  _state.enemy_name   = cfg.name
  _state.enemy_emoji  = cfg.emoji
  _state.enemy_hp     = cfg.hp
  _state.enemy_max_hp = cfg.hp
  _state.enemy_atk    = cfg.atk
}

/// 玩家攻击
pub fn player_attack() -> Unit {
  let dealt = roll_damage(12, 6)
  _state.enemy_hp = clamp_min(_state.enemy_hp - dealt, 0)
  let enemy_defeated = _state.enemy_hp <= 0

  let taken = if enemy_defeated { 0 } else { enemy_counter_attack() }
  let player_defeated = _state.player_hp <= 0

  _result.damage_dealt    = dealt
  _result.damage_taken    = taken
  _result.catch_success   = false
  _result.catch_rate      = 0.0
  _result.enemy_defeated  = enemy_defeated
  _result.player_defeated = player_defeated
  _result.message =
    if enemy_defeated {
      "你造成了 \{dealt} 点伤害。\{_state.enemy_name} 被击败了！"
    } else if player_defeated {
      "你造成了 \{dealt} 点伤害，但受到 \{taken} 点反击。你倒下了…"
    } else {
      "你造成了 \{dealt} 点伤害，受到 \{taken} 点反击。敌人还剩 \{_state.enemy_hp} HP。"
    }
}

/// 尝试捕捉
pub fn try_catch() -> Unit {
  let rate    = calc_catch_rate()
  let success = math_random() < rate
  let pct     = (rate * 100.0).to_int()

  if success {
    _state.captured.push({ name: _state.enemy_name, emoji: _state.enemy_emoji })
  }

  let taken = if success { 0 } else { enemy_counter_attack() }
  let player_defeated = _state.player_hp <= 0

  _result.damage_dealt    = 0
  _result.damage_taken    = taken
  _result.catch_success   = success
  _result.catch_rate      = rate
  _result.enemy_defeated  = success
  _result.player_defeated = player_defeated
  _result.message =
    if success {
      "捕捉成功！\{_state.enemy_name} 加入了你的队伍！"
    } else if player_defeated {
      "捕捉失败（\{pct}% 概率）。\{_state.enemy_name} 反击，你倒下了…"
    } else {
      "捕捉失败（\{pct}% 概率）。受到 \{taken} 点反击。"
    }
}

/// 逃跑（总是成功）
pub fn run_away() -> Unit {
  _result.damage_dealt    = 0
  _result.damage_taken    = 0
  _result.catch_success   = false
  _result.catch_rate      = 0.0
  _result.enemy_defeated  = false
  _result.player_defeated = false
  _result.message         = "成功逃跑了！"
}

/// 倒下后恢复 HP（由 JS 在切回地图时调用）
pub fn recover_after_defeat() -> Unit {
  if _state.player_hp <= 0 {
    _state.player_hp = _state.player_max_hp
  }
}

// ---------------------------------------------------------------------------
// 状态 Getters（JS 读取游戏状态）
// ---------------------------------------------------------------------------

pub fn get_player_hp()      -> Int    { _state.player_hp }
pub fn get_player_max_hp()  -> Int    { _state.player_max_hp }
pub fn get_enemy_hp()       -> Int    { _state.enemy_hp }
pub fn get_enemy_max_hp()   -> Int    { _state.enemy_max_hp }
pub fn get_enemy_name()     -> String { _state.enemy_name }
pub fn get_enemy_emoji()    -> String { _state.enemy_emoji }
pub fn get_captured_count() -> Int    { _state.captured.length() }

pub fn get_captured_name(i : Int) -> String {
  if i >= 0 && i < _state.captured.length() {
    _state.captured[i].name
  } else {
    ""
  }
}

pub fn get_captured_emoji(i : Int) -> String {
  if i >= 0 && i < _state.captured.length() {
    _state.captured[i].emoji
  } else {
    ""
  }
}

// ---------------------------------------------------------------------------
// 行动结果 Getters（JS 在每次行动后读取）
// ---------------------------------------------------------------------------

pub fn get_last_message()         -> String { _result.message }
pub fn get_last_damage_dealt()    -> Int    { _result.damage_dealt }
pub fn get_last_damage_taken()    -> Int    { _result.damage_taken }
pub fn get_last_catch_success()   -> Bool   { _result.catch_success }
pub fn get_last_catch_rate()      -> Double { _result.catch_rate }
pub fn get_last_player_defeated() -> Bool   { _result.player_defeated }
pub fn get_last_enemy_defeated()  -> Bool   { _result.enemy_defeated }
