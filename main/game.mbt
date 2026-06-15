// game.mbt — 游戏初始化与状态查询

// 注意：数据结构（_state, _result, get_location 等）定义在 state.mbt
//        战斗逻辑（player_attack, try_catch, run_away）定义在 battle.mbt
//        MoonBit 同包内所有文件共享命名空间

// ── 初始化 ────────────────────────────────────────────────────────────────

pub fn new_game() -> Unit {
  _state.player_hp     = 50
  _state.player_max_hp = 50
  _state.captured      = []
}

pub fn start_battle(location_id : Int) -> Unit {
  let cfg = get_location(location_id)
  _state.enemy_name   = cfg.name
  _state.enemy_emoji  = cfg.emoji
  _state.enemy_hp     = cfg.hp
  _state.enemy_max_hp = cfg.hp
  _state.enemy_atk    = cfg.atk
}

pub fn recover_after_defeat() -> Unit {
  if _state.player_hp <= 0 {
    _state.player_hp = _state.player_max_hp
  }
}

// ── 存档 ──────────────────────────────────────────────────────────────────

/// 导出存档数据。格式：每行一个条目，前两行为头信息。
/// 行0: 版本号 "1"
/// 行1: 校验和（所有数据行拼接后的字符码之和 mod 65536）
/// 行2+: "name" "emoji" 交替排列
pub fn export_save() -> String {
  let count = _state.captured.length()
  let lines = "1\n"
  let mut data = ""
  for i = 0; i < count; i = i + 1 {
    data = data + _state.captured[i].name + "\n"
    data = data + _state.captured[i].emoji + "\n"
  }
  let checksum = calc_checksum(data)
  lines + checksum.to_string() + "\n" + data
}

fn calc_checksum(s : String) -> Int {
  let mut sum = 0
  for i = 0; i < s.length(); i = i + 1 {
    sum = (sum + s[i].to_int()) % 65536
  }
  sum
}

// ── 状态 Getter ───────────────────────────────────────────────────────────

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

// ── 行动结果 Getter ───────────────────────────────────────────────────────

pub fn get_last_message()         -> String { _result.message }
pub fn get_last_damage_dealt()    -> Int    { _result.damage_dealt }
pub fn get_last_damage_taken()    -> Int    { _result.damage_taken }
pub fn get_last_catch_success()   -> Bool   { _result.catch_success }
pub fn get_last_catch_rate()      -> Double { _result.catch_rate }
pub fn get_last_player_defeated() -> Bool   { _result.player_defeated }
pub fn get_last_enemy_defeated()  -> Bool   { _result.enemy_defeated }
