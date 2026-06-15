// game.mbt — 初始化、存档、状态查询

// ── 初始化 ────────────────────────────────────────────────────────────────

pub fn new_game() -> Unit {
  _state.player_hp     = _starter.cur_hp
  _state.player_max_hp = _starter.hp
  _state.player_atk     = _starter.atk
  _state.owned         = [_starter]
  _state.active        = 0
}

pub fn start_battle(location_id : Int) -> Unit {
  let cfg = get_location(location_id)
  _state.enemy_name   = cfg.name
  _state.enemy_emoji  = cfg.emoji
  _state.enemy_hp     = cfg.hp
  _state.enemy_max_hp = cfg.hp
  _state.enemy_atk    = cfg.atk
  let pet = _state.owned[_state.active]
  _state.player_hp     = pet.cur_hp
  _state.player_max_hp = pet.hp
  _state.player_atk     = pet.atk
}

pub fn recover_after_defeat() -> Unit {
  if _state.player_hp <= 0 {
    _state.player_hp = _state.owned[_state.active].hp
    _state.owned[_state.active].cur_hp = _state.owned[_state.active].hp
  }
  // 战斗结束后保存当前 HP
  _state.owned[_state.active].cur_hp = _state.player_hp
}

// ── 宠物管理 ──────────────────────────────────────────────────────────────

pub fn clear_pets() -> Unit {
  _state.owned = []
}

pub fn add_pet(hp : Int, atk : Int, cur_hp : Int) -> Int {
  let idx = _state.owned.length()
  _state.owned.push({ name: "未知", emoji: "❓", hp: hp, atk: atk, lv: 1, cur_hp: cur_hp })
  idx
}

pub fn set_active(idx : Int) -> Unit {
  if idx >= 0 && idx < _state.owned.length() {
    _state.active = idx
  }
}

pub fn get_active() -> Int { _state.active }

// ── 宠物数据 getter ──────────────────────────────────────────────────────

pub fn get_owned_count() -> Int { _state.owned.length() }

pub fn get_owned_name(i : Int) -> String {
  if i >= 0 && i < _state.owned.length() { _state.owned[i].name } else { "" }
}
pub fn get_owned_emoji(i : Int) -> String {
  if i >= 0 && i < _state.owned.length() { _state.owned[i].emoji } else { "" }
}
pub fn get_owned_hp(i : Int) -> Int {
  if i >= 0 && i < _state.owned.length() { _state.owned[i].hp } else { 0 }
}
pub fn get_owned_atk(i : Int) -> Int {
  if i >= 0 && i < _state.owned.length() { _state.owned[i].atk } else { 0 }
}
pub fn get_owned_lv(i : Int) -> Int {
  if i >= 0 && i < _state.owned.length() { _state.owned[i].lv } else { 0 }
}
pub fn get_owned_cur_hp(i : Int) -> Int {
  if i >= 0 && i < _state.owned.length() { _state.owned[i].cur_hp } else { 0 }
}

// ── 存档导出 ──────────────────────────────────────────────────────────────

pub fn export_save() -> String {
  let count = _state.owned.length()
  let lines = "3\n"
  let mut data = _state.active.to_string() + "\n"
  for i = 0; i < count; i = i + 1 {
    data = data + _state.owned[i].name + "\n"
    data = data + _state.owned[i].emoji + "\n"
    data = data + _state.owned[i].hp.to_string() + "\n"
    data = data + _state.owned[i].atk.to_string() + "\n"
    data = data + _state.owned[i].lv.to_string() + "\n"
    data = data + _state.owned[i].cur_hp.to_string() + "\n"
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
pub fn get_player_atk()     -> Int    { _state.player_atk }
pub fn get_enemy_hp()       -> Int    { _state.enemy_hp }
pub fn get_enemy_max_hp()   -> Int    { _state.enemy_max_hp }
pub fn get_enemy_name()     -> String { _state.enemy_name }
pub fn get_enemy_emoji()    -> String { _state.enemy_emoji }

// ── 行动结果 Getter ───────────────────────────────────────────────────────

pub fn get_last_message()         -> String { _result.message }
pub fn get_last_damage_dealt()    -> Int    { _result.damage_dealt }
pub fn get_last_damage_taken()    -> Int    { _result.damage_taken }
pub fn get_last_catch_success()   -> Bool   { _result.catch_success }
pub fn get_last_catch_rate()      -> Double { _result.catch_rate }
pub fn get_last_player_defeated() -> Bool   { _result.player_defeated }
pub fn get_last_enemy_defeated()  -> Bool   { _result.enemy_defeated }
