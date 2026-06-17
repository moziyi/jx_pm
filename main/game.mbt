// game.mbt — 初始化、存档、状态查询

// ── 初始化 ────────────────────────────────────────────────────────────────

pub fn new_game() -> Unit {
  _state.player_hp     = _starter.cur_hp
  _state.player_max_hp = _starter.hp
  _state.player_atk     = _starter.atk
  _state.owned         = [_starter]
  _state.active        = 0
  _inventory.herbs     = _init_inventory.herbs
  _inventory.revives    = _init_inventory.revives
  _inventory.charms    = _init_inventory.charms
}

pub fn start_battle(location_id : Int) -> Bool {
  let cfg = get_location(location_id)
  _state.enemy_name    = cfg.name
  _state.enemy_emoji   = cfg.emoji
  _state.enemy_hp      = cfg.hp
  _state.enemy_max_hp  = cfg.hp
  _state.enemy_atk     = cfg.atk
  _state.enemy_element = cfg.element
  // 若 active 宠物战斗不能，自动切换
  if _state.owned[_state.active].cur_hp <= 0 {
    for i = 0; i < _state.owned.length(); i = i + 1 {
      if _state.owned[i].cur_hp > 0 { _state.active = i; break }
    }
  }
  let pet = _state.owned[_state.active]
  if pet.cur_hp <= 0 { return false }
  _state.player_hp     = pet.cur_hp
  _state.player_max_hp = pet.hp
  _state.player_atk     = pet.atk
  true
}

/// 战斗结束后将 player_hp 同步回 active 宠物的 cur_hp
pub fn commit_battle() -> Unit {
  _state.owned[_state.active].cur_hp = _state.player_hp
}

// ── 宠物管理 ──────────────────────────────────────────────────────────────

pub fn clear_pets() -> Unit {
  _state.owned = []
}

pub fn add_pet(hp : Int, atk : Int, cur_hp : Int, element : Int) -> Int {
  let idx = _state.owned.length()
  _state.owned.push({ name: "未知", emoji: "❓", hp: hp, atk: atk, lv: 1, cur_hp: cur_hp, element: int_to_element(element) })
  idx
}

pub fn set_active(idx : Int) -> Unit {
  if idx >= 0 && idx < _state.owned.length() {
    _state.active = idx
  }
}

/// 自动切换到第一只存活的宠物
pub fn auto_switch_active() -> Unit {
  for i = 0; i < _state.owned.length(); i = i + 1 {
    if _state.owned[i].cur_hp > 0 {
      _state.active = i
      _state.player_hp = _state.owned[i].cur_hp
      _state.player_max_hp = _state.owned[i].hp
      _state.player_atk = _state.owned[i].atk
      return
    }
  }
}

/// 放生宠物。保留至少 1 只，返回是否成功。
pub fn release_pet(idx : Int) -> Bool {
  if _state.owned.length() <= 1 { return false }
  if idx < 0 || idx >= _state.owned.length() { return false }
  // 从数组中移除
  let new_owned : Array[CapturedEntry] = []
  for i = 0; i < _state.owned.length(); i = i + 1 {
    if i != idx { new_owned.push(_state.owned[i]) }
  }
  _state.owned = new_owned
  // 调整 active
  if idx == _state.active {
    _state.active = 0
  } else if idx < _state.active {
    _state.active = _state.active - 1
  }
  true
}

pub fn get_active() -> Int { _state.active }

// ── HP 操作 ───────────────────────────────────────────────────────────────

pub fn heal_active(n : Int) -> Unit {
  let pet = _state.owned[_state.active]
  pet.cur_hp = if pet.cur_hp + n > pet.hp { pet.hp } else { pet.cur_hp + n }
}

pub fn heal_active_full() -> Unit {
  let pet = _state.owned[_state.active]
  pet.cur_hp = pet.hp
}

pub fn revive_one() -> Bool {
  for i = 0; i < _state.owned.length(); i = i + 1 {
    if _state.owned[i].cur_hp <= 0 {
      _state.owned[i].cur_hp = _state.owned[i].hp / 2
      return true
    }
  }
  false
}

pub fn hurt_active(n : Int) -> Unit {
  let pet = _state.owned[_state.active]
  pet.cur_hp = if pet.cur_hp - n < 1 { 1 } else { pet.cur_hp - n }
}

pub fn heal_all(n : Int) -> Unit {
  for i = 0; i < _state.owned.length(); i = i + 1 {
    let pet = _state.owned[i]
    pet.cur_hp = if pet.cur_hp + n > pet.hp { pet.hp } else { pet.cur_hp + n }
  }
}

pub fn hurt_all(n : Int) -> Unit {
  for i = 0; i < _state.owned.length(); i = i + 1 {
    let pet = _state.owned[i]
    pet.cur_hp = if pet.cur_hp - n < 1 { 1 } else { pet.cur_hp - n }
  }
}

// ── 特殊事件点位 ──────────────────────────────────────────────────────────

pub fn spawn_event() -> Int {
  if math_random() < 0.0 { return 0 }  // 由 JS 控制概率
  _special.etype  = 0
  _special.active = false
  0
}

/// 由 JS 指定类型和坐标生成特殊点位
pub fn place_event(etype : Int, x : Int, y : Int) -> Unit {
  _special.active = true
  _special.etype  = etype
  _special.x      = x
  _special.y      = y
}

pub fn clear_event() -> Unit {
  _special.active = false
  _special.etype  = 0
}

pub fn get_event_active() -> Bool { _special.active }
pub fn get_event_type()  -> Int  { _special.etype }
pub fn get_event_x()     -> Int  { _special.x }
pub fn get_event_y()     -> Int  { _special.y }

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
pub fn get_owned_element(i : Int) -> Int {
  if i >= 0 && i < _state.owned.length() { element_to_int(_state.owned[i].element) } else { 0 }
}

// ── 存档导出 ──────────────────────────────────────────────────────────────

pub fn export_save() -> String {
  let count = _state.owned.length()
  let lines = "5\n"
  let mut data = _state.active.to_string() + "\n"
  data = data + _inventory.herbs.to_string() + "\n"
  data = data + _inventory.revives.to_string() + "\n"
  data = data + _inventory.charms.to_string() + "\n"
  for i = 0; i < count; i = i + 1 {
    data = data + _state.owned[i].name + "\n"
    data = data + _state.owned[i].emoji + "\n"
    data = data + _state.owned[i].hp.to_string() + "\n"
    data = data + _state.owned[i].atk.to_string() + "\n"
    data = data + _state.owned[i].lv.to_string() + "\n"
    data = data + _state.owned[i].cur_hp.to_string() + "\n"
    data = data + element_to_int(_state.owned[i].element).to_string() + "\n"
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
