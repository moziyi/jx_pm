// game.mbt — 初始化、存档、状态查询

// ── 初始化 ────────────────────────────────────────────────────────────────

///|
pub fn new_game() -> Unit {
  _state.player_hp = _starter.cur_hp
  _state.player_max_hp = _starter.hp
  _state.player_atk = _starter.atk
  _state.owned = [_starter]
  _state.active = 0
  _state.stored = []
  _inventory.herbs = _init_inventory.herbs
  _inventory.revives = _init_inventory.revives
  _inventory.charms = _init_inventory.charms
  _inventory.great_charms = _init_inventory.great_charms
  _result.exp_gained = 0
  _result.leveled_up = false
  _result.dodged = false
  _state.skill_cooldown = 0
}

///|
pub fn start_battle(location_id : Int) -> Bool {
  let cfg = get_random_enemy(location_id)
  // 若 active 宠物战斗不能，自动切换
  if _state.owned[_state.active].cur_hp <= 0 {
    for i = 0; i < _state.owned.length(); i = i + 1 {
      if _state.owned[i].cur_hp > 0 {
        _state.active = i
        break
      }
    }
  }
  let pet = _state.owned[_state.active]
  if pet.cur_hp <= 0 {
    return false
  }
  // 确定敌人等级：基于出战宠物等级 ± 随机偏移
  let lv_offset = (math_random() * 6.0).to_int() - 2
  let raw_lv = pet.lv + lv_offset
  let enemy_lv = if raw_lv < 1 {
    1
  } else if raw_lv > max_level {
    max_level
  } else {
    raw_lv
  }
  _state.enemy_lv = enemy_lv
  // 根据等级缩放敌人属性
  let growth_hp = (enemy_lv - 1) * 3
  let growth_atk = enemy_lv - 1
  let growth_def = enemy_lv - 1
  let growth_agi = enemy_lv - 1
  _state.enemy_name = cfg.name
  _state.enemy_emoji = cfg.emoji
  _state.enemy_hp = cfg.hp + growth_hp
  _state.enemy_max_hp = _state.enemy_hp
  _state.enemy_atk = cfg.atk + growth_atk
  _state.enemy_def = cfg.def + growth_def
  _state.enemy_agi = cfg.agi + growth_agi
  _state.enemy_element = cfg.element
  _enemy_base.hp = _state.enemy_hp
  _enemy_base.atk = _state.enemy_atk
  _state.player_hp = pet.cur_hp
  _state.player_max_hp = pet.hp
  _state.player_atk = pet.atk
  true
}

///|
/// 将 player_hp 同步回 active 宠物的 cur_hp
fn sync_active_hp() -> Unit {
  _state.owned[_state.active].cur_hp = _state.player_hp
}

///|
/// 战斗结束后提交状态（供 JS exitBattle 调用）

///|
fn level_up_pet(pet : CapturedEntry) -> Bool {
  let mut leveled = false
  while pet.lv < max_level && pet.exp >= exp_to_next(pet.lv) {
    pet.exp = pet.exp - exp_to_next(pet.lv)
    pet.lv = pet.lv + 1
    pet.hp = pet.hp + 4 + (math_random() * 3.0).to_int()
    pet.atk = pet.atk + 1 + (math_random() * 2.0).to_int()
    pet.def = pet.def + 1
    pet.agi = pet.agi + 1
    pet.cur_hp = pet.hp
    leveled = true
  }
  if pet.lv >= max_level {
    pet.exp = 0
  }
  leveled
}

///|
fn grant_exp(gained : Int) -> Unit {
  _result.exp_gained = gained
  _result.leveled_up = false
  let pet = _state.owned[_state.active]
  pet.exp = pet.exp + gained
  _result.leveled_up = level_up_pet(pet)
  _state.player_hp = pet.cur_hp
  _state.player_max_hp = pet.hp
  _state.player_atk = pet.atk
  let shared = gained * 70 / 100
  if shared > 0 {
    for i = 0; i < _state.owned.length(); i = i + 1 {
      if i != _state.active && _state.owned[i].cur_hp > 0 {
        _state.owned[i].exp = _state.owned[i].exp + shared
        level_up_pet(_state.owned[i]) |> ignore
      }
    }
  }
}

///|
pub fn commit_battle() -> Unit {
  sync_active_hp()
  if _result.enemy_defeated && !_result.player_defeated {
    let raw = calc_exp_reward(
      _state.enemy_max_hp,
      _state.enemy_atk,
      _state.enemy_def,
      _state.enemy_agi,
      _state.enemy_lv,
    )
    let gained = if _result.catch_success { raw / 2 } else { raw }
    grant_exp(if gained < 1 { 1 } else { gained })
  } else {
    _result.exp_gained = 0
    _result.leveled_up = false
  }
}

///|
/// 强化敌人（百分比，100=不变，120=+20%）
pub fn boost_enemy(hp_pct : Int, atk_pct : Int) -> Unit {
  _state.enemy_max_hp = (_enemy_base.hp.to_double() * hp_pct.to_double() / 100.0).to_int()
  _state.enemy_hp = _state.enemy_max_hp
  _state.enemy_atk = (_enemy_base.atk.to_double() * atk_pct.to_double() / 100.0).to_int()
}

// ── 宠物管理 ──────────────────────────────────────────────────────────────

///|
pub fn clear_pets() -> Unit {
  _state.owned = []
}

///|
pub fn add_pet(
  hp : Int,
  atk : Int,
  def : Int,
  agi : Int,
  lv : Int,
  exp : Int,
  cur_hp : Int,
  element : Int,
) -> Int {
  let idx = _state.owned.length()
  _state.owned.push({
    name: "未知",
    emoji: "❓",
    hp,
    atk,
    def,
    agi,
    lv,
    exp,
    cur_hp,
    element: int_to_element(element),
  })
  idx
}

///|
pub fn set_active(idx : Int) -> Unit {
  if idx >= 0 && idx < _state.owned.length() {
    _state.active = idx
  }
}

///|
/// 自动切换到第一只存活的宠物

///|
pub fn recover_after_defeat() -> Unit {
  auto_switch_active()
}

///|
pub fn auto_switch_active() -> Unit {
  _state.owned[_state.active].cur_hp = _state.player_hp
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

///|
/// 放生宠物。保留至少 1 只，返回是否成功。
pub fn release_pet(idx : Int) -> Bool {
  if _state.owned.length() <= 1 {
    return false
  }
  if idx < 0 || idx >= _state.owned.length() {
    return false
  }
  // 从数组中移除
  let new_owned : Array[CapturedEntry] = []
  for i = 0; i < _state.owned.length(); i = i + 1 {
    if i != idx {
      new_owned.push(_state.owned[i])
    }
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

///|
pub fn get_active() -> Int {
  _state.active
}

/// 队伍内拖拽排序
pub fn reorder_owned(from : Int, to : Int) -> Bool {
  let len = _state.owned.length()
  if from < 0 || from >= len || to < 0 || to >= len || from == to {
    return false
  }
  let pet = _state.owned[from]
  let new_arr : Array[CapturedEntry] = []
  for i = 0; i < len; i = i + 1 {
    if i != from {
      new_arr.push(_state.owned[i])
    }
  }
  let result : Array[CapturedEntry] = []
  for i = 0; i < to; i = i + 1 {
    result.push(new_arr[i])
  }
  result.push(pet)
  for i = to; i < new_arr.length(); i = i + 1 {
    result.push(new_arr[i])
  }
  _state.owned = result
  // 调整 active 索引
  if _state.active == from {
    _state.active = to
  } else if from < _state.active && _state.active <= to {
    _state.active = _state.active - 1
  } else if to <= _state.active && _state.active < from {
    _state.active = _state.active + 1
  }
  true
}

/// 寄存箱内拖拽排序
pub fn reorder_stored(from : Int, to : Int) -> Bool {
  let len = _state.stored.length()
  if from < 0 || from >= len || to < 0 || to >= len || from == to {
    return false
  }
  let pet = _state.stored[from]
  let new_arr : Array[CapturedEntry] = []
  for i = 0; i < len; i = i + 1 {
    if i != from {
      new_arr.push(_state.stored[i])
    }
  }
  let result : Array[CapturedEntry] = []
  for i = 0; i < to; i = i + 1 {
    result.push(new_arr[i])
  }
  result.push(pet)
  for i = to; i < new_arr.length(); i = i + 1 {
    result.push(new_arr[i])
  }
  _state.stored = result
  true
}

///|
pub fn store_pet(idx : Int) -> Bool {
  if _state.owned.length() <= 1 {
    return false
  }
  if idx < 0 || idx >= _state.owned.length() {
    return false
  }
  if _state.stored.length() >= max_stored {
    return false
  }
  let pet = _state.owned[idx]
  _state.stored.push(pet)
  let new_owned : Array[CapturedEntry] = []
  for i = 0; i < _state.owned.length(); i = i + 1 {
    if i != idx {
      new_owned.push(_state.owned[i])
    }
  }
  _state.owned = new_owned
  if idx == _state.active {
    _state.active = 0
    let p = _state.owned[0]
    _state.player_hp = p.cur_hp
    _state.player_max_hp = p.hp
    _state.player_atk = p.atk
  } else if idx < _state.active {
    _state.active = _state.active - 1
  }
  true
}

///|
pub fn withdraw_pet(idx : Int) -> Bool {
  if idx < 0 || idx >= _state.stored.length() {
    return false
  }
  if _state.owned.length() >= max_pets {
    return false
  }
  let pet = _state.stored[idx]
  _state.owned.push(pet)
  let new_stored : Array[CapturedEntry] = []
  for i = 0; i < _state.stored.length(); i = i + 1 {
    if i != idx {
      new_stored.push(_state.stored[i])
    }
  }
  _state.stored = new_stored
  true
}

/// 放生寄存宠物
pub fn release_stored_pet(idx : Int) -> Bool {
  if idx < 0 || idx >= _state.stored.length() {
    return false
  }
  let new_stored : Array[CapturedEntry] = []
  for i = 0; i < _state.stored.length(); i = i + 1 {
    if i != idx {
      new_stored.push(_state.stored[i])
    }
  }
  _state.stored = new_stored
  true
}

// ── HP 操作 ───────────────────────────────────────────────────────────────

///|
pub fn heal_active(n : Int) -> Unit {
  let pet = _state.owned[_state.active]
  pet.cur_hp = if pet.cur_hp + n > pet.hp { pet.hp } else { pet.cur_hp + n }
}

///|
pub fn heal_active_full() -> Unit {
  let pet = _state.owned[_state.active]
  pet.cur_hp = pet.hp
}

///|
pub fn revive_one() -> Bool {
  for i = 0; i < _state.owned.length(); i = i + 1 {
    if _state.owned[i].cur_hp <= 0 {
      _state.owned[i].cur_hp = _state.owned[i].hp / 2
      return true
    }
  }
  false
}

///|
pub fn hurt_active(n : Int) -> Unit {
  let pet = _state.owned[_state.active]
  pet.cur_hp = if pet.cur_hp - n < 1 { 1 } else { pet.cur_hp - n }
}

///|
pub fn heal_all(n : Int) -> Unit {
  for i = 0; i < _state.owned.length(); i = i + 1 {
    let pet = _state.owned[i]
    pet.cur_hp = if pet.cur_hp + n > pet.hp { pet.hp } else { pet.cur_hp + n }
  }
}

///|
pub fn hurt_all(n : Int) -> Unit {
  for i = 0; i < _state.owned.length(); i = i + 1 {
    let pet = _state.owned[i]
    pet.cur_hp = if pet.cur_hp - n < 1 { 1 } else { pet.cur_hp - n }
  }
}

// ── 特殊事件点位 ──────────────────────────────────────────────────────────

///|
pub fn spawn_event() -> Int {
  if math_random() < 0.0 {
    return 0
  }
  _special.active = false
  0
}

///|
/// 由 JS 指定类型和坐标生成特殊点位
pub fn place_event(etype : Int, x : Int, y : Int) -> Unit {
  _special.active = true
  _special.etype = int_to_event_type(etype)
  _special.x = x
  _special.y = y
}

///|
pub fn clear_event() -> Unit {
  _special.active = false
}

///|
pub fn get_event_active() -> Bool {
  _special.active
}

///|
pub fn get_event_type() -> Int {
  event_type_to_int(_special.etype)
}

///|
pub fn get_event_x() -> Int {
  _special.x
}

///|
pub fn get_event_y() -> Int {
  _special.y
}

// ── 宠物数据 getter ──────────────────────────────────────────────────────

///|
pub fn get_owned_count() -> Int {
  _state.owned.length()
}

///|
pub fn get_owned_name(i : Int) -> String {
  if i >= 0 && i < _state.owned.length() {
    _state.owned[i].name
  } else {
    ""
  }
}

///|
pub fn get_owned_emoji(i : Int) -> String {
  if i >= 0 && i < _state.owned.length() {
    _state.owned[i].emoji
  } else {
    ""
  }
}

///|
pub fn get_owned_hp(i : Int) -> Int {
  if i >= 0 && i < _state.owned.length() {
    _state.owned[i].hp
  } else {
    0
  }
}

///|
pub fn get_owned_atk(i : Int) -> Int {
  if i >= 0 && i < _state.owned.length() {
    _state.owned[i].atk
  } else {
    0
  }
}

///|
pub fn get_owned_lv(i : Int) -> Int {
  if i >= 0 && i < _state.owned.length() {
    _state.owned[i].lv
  } else {
    0
  }
}

///|
pub fn get_owned_cur_hp(i : Int) -> Int {
  if i >= 0 && i < _state.owned.length() {
    _state.owned[i].cur_hp
  } else {
    0
  }
}

///|
pub fn get_owned_element(i : Int) -> Int {
  if i >= 0 && i < _state.owned.length() {
    element_to_int(_state.owned[i].element)
  } else {
    0
  }
}

///|
pub fn get_owned_def(i : Int) -> Int {
  if i >= 0 && i < _state.owned.length() {
    _state.owned[i].def
  } else {
    0
  }
}

///|
pub fn get_owned_agi(i : Int) -> Int {
  if i >= 0 && i < _state.owned.length() {
    _state.owned[i].agi
  } else {
    0
  }
}

///|
pub fn get_owned_exp(i : Int) -> Int {
  if i >= 0 && i < _state.owned.length() {
    _state.owned[i].exp
  } else {
    0
  }
}

// ── 寄存宠物 getter ───────────────────────────────────────────────────────

///|
pub fn get_stored_count() -> Int {
  _state.stored.length()
}

///|
pub fn get_stored_name(i : Int) -> String {
  if i >= 0 && i < _state.stored.length() {
    _state.stored[i].name
  } else {
    ""
  }
}

///|
pub fn get_stored_emoji(i : Int) -> String {
  if i >= 0 && i < _state.stored.length() {
    _state.stored[i].emoji
  } else {
    ""
  }
}

///|
pub fn get_stored_hp(i : Int) -> Int {
  if i >= 0 && i < _state.stored.length() {
    _state.stored[i].hp
  } else {
    0
  }
}

///|
pub fn get_stored_atk(i : Int) -> Int {
  if i >= 0 && i < _state.stored.length() {
    _state.stored[i].atk
  } else {
    0
  }
}

///|
pub fn get_stored_def(i : Int) -> Int {
  if i >= 0 && i < _state.stored.length() {
    _state.stored[i].def
  } else {
    0
  }
}

///|
pub fn get_stored_agi(i : Int) -> Int {
  if i >= 0 && i < _state.stored.length() {
    _state.stored[i].agi
  } else {
    0
  }
}

///|
pub fn get_stored_lv(i : Int) -> Int {
  if i >= 0 && i < _state.stored.length() {
    _state.stored[i].lv
  } else {
    0
  }
}

///|
pub fn get_stored_exp(i : Int) -> Int {
  if i >= 0 && i < _state.stored.length() {
    _state.stored[i].exp
  } else {
    0
  }
}

///|
pub fn get_stored_cur_hp(i : Int) -> Int {
  if i >= 0 && i < _state.stored.length() {
    _state.stored[i].cur_hp
  } else {
    0
  }
}

///|
pub fn get_stored_element(i : Int) -> Int {
  if i >= 0 && i < _state.stored.length() {
    element_to_int(_state.stored[i].element)
  } else {
    0
  }
}

// ── 状态 Getter ───────────────────────────────────────────────────────────

///|
pub fn get_player_hp() -> Int {
  _state.player_hp
}

///|
pub fn get_player_max_hp() -> Int {
  _state.player_max_hp
}

///|
pub fn get_player_atk() -> Int {
  _state.player_atk
}

///|
pub fn get_skill_cooldown() -> Int {
  _state.skill_cooldown
}

///|
pub fn get_enemy_hp() -> Int {
  _state.enemy_hp
}

///|
pub fn get_enemy_max_hp() -> Int {
  _state.enemy_max_hp
}

///|
pub fn get_enemy_name() -> String {
  _state.enemy_name
}

///|
pub fn get_enemy_emoji() -> String {
  _state.enemy_emoji
}

///|
pub fn get_enemy_lv() -> Int {
  _state.enemy_lv
}

///|
pub fn get_enemy_def() -> Int {
  _state.enemy_def
}

///|
pub fn get_enemy_agi() -> Int {
  _state.enemy_agi
}

// ── 行动结果 Getter ───────────────────────────────────────────────────────

///|
pub fn get_last_message() -> String {
  _result.message
}

///|
pub fn get_last_damage_dealt() -> Int {
  _result.damage_dealt
}

///|
pub fn get_last_damage_taken() -> Int {
  _result.damage_taken
}

///|
pub fn get_last_catch_success() -> Bool {
  _result.catch_success
}

///|
pub fn get_last_catch_rate() -> Double {
  _result.catch_rate
}

///|
pub fn get_last_player_defeated() -> Bool {
  _result.player_defeated
}

///|
pub fn get_last_enemy_defeated() -> Bool {
  _result.enemy_defeated
}

///|
pub fn get_last_exp_gained() -> Int {
  _result.exp_gained
}

///|
pub fn get_last_leveled_up() -> Bool {
  _result.leveled_up
}

///|
pub fn get_last_dodged() -> Bool {
  _result.dodged
}
