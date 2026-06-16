// battle.mbt — 战斗逻辑、五行克制、元素技能

fn roll_damage(base : Int, variance : Int) -> Int {
  let mult  = 0.85 + math_random() * 0.30
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

fn roll_stat(base : Int) -> Int {
  let r = (math_random() - 0.5) * 0.4
  let v = (base.to_double() * (1.0 + r)).to_int()
  if v < 1 { 1 } else { v }
}

// 五行倍率: 克制 1.2 / 被克 0.8 / 相生 0.5 / 其他 1.0
fn type_multiplier(atk : Element, def : Element) -> Double {
  match (atk, def) {
    (Metal, Wood) => 1.2
    (Wood, Earth) => 1.2
    (Earth, Water) => 1.2
    (Water, Fire) => 1.2
    (Fire, Metal) => 1.2
    (Wood, Metal) => 0.8
    (Earth, Wood) => 0.8
    (Water, Earth) => 0.8
    (Fire, Water) => 0.8
    (Metal, Fire) => 0.8
    (Metal, Water) => 0.5
    (Water, Wood) => 0.5
    (Wood, Fire) => 0.5
    (Fire, Earth) => 0.5
    (Earth, Metal) => 0.5
    _ => 1.0
  }
}

fn enemy_attack_raw() -> Int {
  let raw  = roll_damage(_state.enemy_atk, 4)
  let mult = type_multiplier(_state.enemy_element, _state.owned[_state.active].element)
  if mult < 0.9 && mult > 0.4 {
    // 相生：治疗玩家
    let heal = (raw.to_double() * mult).to_int()
    let pet = _state.owned[_state.active]
    _state.player_hp = if _state.player_hp + heal > pet.hp { pet.hp } else { _state.player_hp + heal }
    0  // 无伤害
  } else {
    let d = (raw.to_double() * mult).to_int()
    if d < 1 { 1 } else { d }
  }
}

fn enemy_counter_attack() -> Int {
  let d = enemy_attack_raw()
  _state.player_hp = clamp_min(_state.player_hp - d, 0)
  d
}

// ── 公开行动 ──────────────────────────────────────────────────────────────

pub fn player_attack() -> Unit {
  let dealt = roll_damage(_state.player_atk, 6)
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
      "你造成了 \{dealt} 点伤害，但受到 \{taken} 点反击。\{_state.owned[_state.active].name} 倒下了…"
    } else {
      "你造成了 \{dealt} 点伤害，受到 \{taken} 点反击。敌人还剩 \{_state.enemy_hp} HP。"
    }
}

pub fn elemental_skill() -> Unit {
  let pet   = _state.owned[_state.active]
  let base  = (pet.atk.to_double() * 1.3).to_int()
  let raw   = roll_damage(base, 8)
  let mult  = type_multiplier(pet.element, _state.enemy_element)
  let is_heal = mult < 0.9 && mult > 0.4
  let dmg = if is_heal {
    0
  } else {
    let d = (raw.to_double() * mult).to_int()
    if d < 1 { 1 } else { d }
  }
  let heal = if is_heal { (raw.to_double() * mult).to_int() } else { 0 }
  if is_heal {
    _state.enemy_hp = if _state.enemy_hp + heal > _state.enemy_max_hp { _state.enemy_max_hp } else { _state.enemy_hp + heal }
  } else {
    _state.enemy_hp = clamp_min(_state.enemy_hp - dmg, 0)
  }
  let enemy_defeated = _state.enemy_hp <= 0
  let taken = if enemy_defeated { 0 } else { enemy_counter_attack() }
  let player_defeated = _state.player_hp <= 0
  _result.damage_dealt    = if is_heal { 0 } else { dmg }
  _result.damage_taken    = taken
  _result.catch_success   = false
  _result.catch_rate      = 0.0
  _result.enemy_defeated  = enemy_defeated
  _result.player_defeated = player_defeated
  _result.message =
    if is_heal {
      "元素技为 \{_state.enemy_name} 恢复了 \{heal} HP…受到 \{taken} 点反击。"
    } else if enemy_defeated {
      "元素技造成 \{dmg} 点伤害！\{_state.enemy_name} 被击败了！"
    } else if player_defeated {
      "元素技造成 \{dmg} 点伤害，但受到 \{taken} 点反击。\{pet.name} 倒下了…"
    } else {
      "元素技造成 \{dmg} 点伤害，受到 \{taken} 点反击。敌人还剩 \{_state.enemy_hp} HP。"
    }
}

pub fn try_catch() -> Unit {
  let rate    = calc_catch_rate()
  let pct     = (rate * 100.0).to_int()
  let success = math_random() < rate
  if success {
    let hp = roll_stat(_state.enemy_max_hp)
    _state.owned.push({
      name:    _state.enemy_name,
      emoji:   _state.enemy_emoji,
      hp:      hp,
      atk:     roll_stat(_state.enemy_atk),
      lv:      1,
      cur_hp:  hp,
      element: _state.enemy_element,
    })
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
      "捕捉失败（\{pct}% 概率）。\{_state.enemy_name} 反击，\{_state.owned[_state.active].name} 倒下了…"
    } else {
      "捕捉失败（\{pct}% 概率）。受到 \{taken} 点反击。"
    }
}

pub fn switch_pet(idx : Int) -> Bool {
  if idx < 0 || idx >= _state.owned.length() { return false }
  if _state.owned[idx].cur_hp <= 0 { return false }
  if idx == _state.active { return false }
  _state.owned[_state.active].cur_hp = _state.player_hp
  _state.active = idx
  _state.player_hp     = _state.owned[idx].cur_hp
  _state.player_max_hp = _state.owned[idx].hp
  _state.player_atk     = _state.owned[idx].atk
  let taken = enemy_counter_attack()
  let player_defeated = _state.player_hp <= 0
  _result.damage_dealt    = 0
  _result.damage_taken    = taken
  _result.catch_success   = false
  _result.catch_rate      = 0.0
  _result.enemy_defeated  = false
  _result.player_defeated = player_defeated
  _result.message         = "换上了 \{_state.owned[idx].name}！受到 \{taken} 点反击。"
  return true
}

pub fn run_away() -> Unit {
  _result.damage_dealt    = 0
  _result.damage_taken    = 0
  _result.catch_success   = false
  _result.catch_rate      = 0.0
  _result.enemy_defeated  = false
  _result.player_defeated = false
  _result.message         = "成功逃跑了！"
}

pub fn get_player_element() -> Int { element_to_int(_state.owned[_state.active].element) }
pub fn get_enemy_element()  -> Int { element_to_int(_state.enemy_element) }
