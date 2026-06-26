// battle.mbt — 战斗逻辑、五行克制、元素技能

///|
fn roll_damage(base : Int, variance : Int) -> Int {
  let mult = 0.85 + math_random() * 0.30
  let bonus = (math_random() * variance.to_double()).to_int()
  let dmg = (base.to_double() * mult).to_int() + bonus
  if dmg < 1 {
    1
  } else {
    dmg
  }
}

///|
fn calc_catch_rate() -> Double {
  let ratio = _state.enemy_hp.to_double() / _state.enemy_max_hp.to_double()
  if ratio > 0.60 {
    0.20
  } else if ratio > 0.30 {
    0.45
  } else {
    0.70
  }
}

///|
fn clamp_min(v : Int, min : Int) -> Int {
  if v < min {
    min
  } else {
    v
  }
}

///|
fn set_result(dealt : Int, taken : Int, caught : Bool, rate : Double, enemy_def : Bool, player_def : Bool) -> Unit {
  _result.damage_dealt = dealt
  _result.damage_taken = taken
  _result.catch_success = caught
  _result.catch_rate = rate
  _result.enemy_defeated = enemy_def
  _result.player_defeated = player_def
}

///|
fn roll_stat(base : Int) -> Int {
  let r = (math_random() - 0.5) * 0.4
  let v = (base.to_double() * (1.0 + r)).to_int()
  if v < 1 {
    1
  } else {
    v
  }
}

// ── DEF / AGI 系统 ─────────────────────────────────────────────────────────

///|
fn calc_def_reduce(raw : Int, def : Int) -> Int {
  let reduce = (def.to_double() * 0.5).to_int()
  let dmg = raw - reduce
  if dmg < 1 {
    1
  } else {
    dmg
  }
}

///|
fn roll_dodge(agi : Int) -> Bool {
  let rate = agi.to_double() * 0.005
  let clamped = if rate > 0.2 { 0.2 } else { rate }
  math_random() < clamped
}

///|
fn roll_crit(agi : Int) -> Bool {
  let rate = agi.to_double() * 0.005
  let clamped = if rate > 0.10 { 0.10 } else { rate }
  math_random() < clamped
}

///|
fn player_goes_first() -> Bool {
  let pet = _state.owned[_state.active]
  pet.agi >= _state.enemy_agi
}

// ── 敌人攻击（内部） ───────────────────────────────────────────────────────

///|
fn calc_enemy_raw() -> Int {
  roll_damage(_state.enemy_atk, 4)
}

///|
fn dec_cooldown() -> Unit {
  if _state.skill_cooldown > 0 {
    _state.skill_cooldown = _state.skill_cooldown - 1
  }
}

///|
fn enemy_attack_full() -> Int {
  let pet = _state.owned[_state.active]
  if roll_dodge(pet.agi) {
    _result.dodged = true
    return 0
  }
  _result.dodged = false
  let raw = calc_enemy_raw()
  if raw == 0 {
    return 0
  }
  let crit = roll_crit(_state.enemy_agi)
  let dmg_raw = if crit { (raw.to_double() * 1.5).to_int() } else { raw }
  let dmg = calc_def_reduce(dmg_raw, pet.def)
  _state.player_hp = clamp_min(_state.player_hp - dmg, 0)
  dmg
}

///|
fn enemy_elemental_skill() -> Int {
  let pet = _state.owned[_state.active]
  if roll_dodge(pet.agi) {
    _result.dodged = true
    return 0
  }
  _result.dodged = false
  let base = (_state.enemy_atk.to_double() * 1.3).to_int()
  let raw = roll_damage(base, 6)
  let eff = battle_effect(_state.enemy_element, pet.element)
  match eff {
    Generate => {
      let heal = (raw.to_double() * 0.5).to_int()
      _state.player_hp = if _state.player_hp + heal > pet.hp { pet.hp } else { _state.player_hp + heal }
      heal
    }
    _ => {
      let mult = effect_to_mult(eff)
      let crit = roll_crit(_state.enemy_agi)
      let dmg = (raw.to_double() * mult).to_int()
      let final_dmg = if crit { (dmg.to_double() * 1.5).to_int() } else { dmg }
      let d = if final_dmg < 1 { 1 } else { final_dmg }
      _state.player_hp = clamp_min(_state.player_hp - d, 0)
      d
    }
  }
}

// ── 敌方行动决策 ──────────────────────────────────────────────────────────

///|
fn enemy_action() -> Int {
  _state.enemy_action_count = _state.enemy_action_count + 1
  let hp_ratio = _state.enemy_hp.to_double() / _state.enemy_max_hp.to_double()
  let interval = if hp_ratio > 0.50 { 3 } else { 2 }
  if _state.enemy_action_count % interval == 0 {
    enemy_elemental_skill()
  } else {
    enemy_attack_full()
  }
}

// ── 公开行动 ──────────────────────────────────────────────────────────────

///|
pub fn player_attack() -> Unit {
  if _state.player_hp <= 0 {
    return
  }
  _result.message1 = ""
  _result.message2 = ""
  _result.dodged = false
  let pet = _state.owned[_state.active]
  if player_goes_first() {
    let raw = roll_damage(_state.player_atk, 6)
    let crit = roll_crit(pet.agi)
    let dealt = if crit { (raw.to_double() * 1.5).to_int() } else { raw }
    _state.enemy_hp = clamp_min(_state.enemy_hp - dealt, 0)
    let enemy_defeated = _state.enemy_hp <= 0
    _result.message1 = if crit && enemy_defeated {
      "暴击！造成了 \{dealt} 点伤害，\{_state.enemy_name} 被击败了！"
    } else if crit {
      "暴击！造成了 \{dealt} 点伤害。"
    } else if enemy_defeated {
      "造成了 \{dealt} 点伤害，\{_state.enemy_name} 被击败了！"
    } else {
      "造成了 \{dealt} 点伤害。"
    }
    set_result(dealt, 0, false, 0.0, enemy_defeated, false)
    if !enemy_defeated {
      let taken = enemy_action()
      let player_defeated = _state.player_hp <= 0
      set_result(dealt, taken, false, 0.0, enemy_defeated, player_defeated)
      _result.message2 = if _result.dodged {
        "\{_state.enemy_name} 的攻击未命中！"
      } else {
        "\{_state.enemy_name} 造成 \{taken} 点伤害。"
      }
      if player_defeated { _result.message2 = _result.message2 + "\{pet.name} 倒下了…" }
    }
  } else {
    let taken = enemy_action()
    let player_defeated = _state.player_hp <= 0
    _result.message1 = if _result.dodged {
      "闪避了\{_state.enemy_name} 的攻击！"
    } else {
      "\{_state.enemy_name} 造成 \{taken} 点伤害。"
    }
    if player_defeated { _result.message1 = _result.message1 + "\{pet.name} 倒下了…" }
    if player_defeated {
      set_result(0, taken, false, 0.0, false, true)
    } else {
      let raw = roll_damage(_state.player_atk, 6)
      let crit = roll_crit(pet.agi)
      let d = if crit { (raw.to_double() * 1.5).to_int() } else { raw }
      _state.enemy_hp = clamp_min(_state.enemy_hp - d, 0)
      let ed = _state.enemy_hp <= 0
      set_result(d, taken, false, 0.0, ed, false)
      _result.message2 = if crit && ed {
        "暴击反杀！造成 \{d} 点伤害，\{_state.enemy_name} 被击败了！"
      } else if crit {
        "暴击！造成 \{d} 点伤害。"
      } else if ed {
        "反击 \{d} 点，\{_state.enemy_name} 被击败了！"
      } else {
        "反击 \{d} 点伤害。"
      }
    }
  }
  dec_cooldown()
}

///|
pub fn elemental_skill() -> Unit {
  if _state.player_hp <= 0 {
    return
  }
  if _state.skill_cooldown > 0 {
    return
  }
  _result.message1 = ""
  _result.message2 = ""
  _result.dodged = false
  let pet = _state.owned[_state.active]
  let eff = battle_effect(pet.element, _state.enemy_element)
  let eff_label = match eff {
    Restrain => " 效果拔群！"
    Restricted => " 效果不佳…"
    _ => ""
  }
  if player_goes_first() {
    let base = (pet.atk.to_double() * 1.3).to_int()
    let raw = roll_damage(base, 8)
    match eff {
      Generate => {
        let heal = (raw.to_double() * 0.5).to_int()
        _state.enemy_hp = if _state.enemy_hp + heal > _state.enemy_max_hp { _state.enemy_max_hp } else { _state.enemy_hp + heal }
        _result.message1 = "\{_state.enemy_name} 因为你的元素技恢复了 \{heal} 点体力。"
        let taken = enemy_action()
        set_result(0, taken, false, 0.0, false, _state.player_hp <= 0)
        _result.message2 = if _result.dodged { "\{_state.enemy_name} 的攻击未命中！" } else { "\{_state.enemy_name} 造成 \{taken} 点伤害。" }
      }
      _ => {
        let mult = effect_to_mult(eff)
        let dmg = (raw.to_double() * mult).to_int()
        let crit = roll_crit(pet.agi)
        let final_dmg = if crit { (dmg.to_double() * 1.5).to_int() } else { dmg }
        let d = if final_dmg < 1 { 1 } else { final_dmg }
        _state.enemy_hp = clamp_min(_state.enemy_hp - d, 0)
        let ed = _state.enemy_hp <= 0
        _result.message1 = (if crit { "暴击！" } else { "" }) + "元素技造成 \{d} 点伤害。" + (if ed { "\{_state.enemy_name} 被击败了！" } else { "" }) + eff_label
        if !ed {
          let taken = enemy_action()
          let player_defeated = _state.player_hp <= 0
          set_result(d, taken, false, 0.0, ed, player_defeated)
          _result.message2 = if _result.dodged { "\{_state.enemy_name} 的攻击未命中！" } else { "\{_state.enemy_name} 造成 \{taken} 点伤害。" }
          if player_defeated { _result.message2 = _result.message2 + "\{pet.name} 倒下了…" }
        } else {
          set_result(d, 0, false, 0.0, ed, false)
        }
      }
    }
  } else {
    let taken = enemy_action()
    let player_defeated = _state.player_hp <= 0
    _result.message1 = if _result.dodged { "闪避了\{_state.enemy_name} 的攻击！" } else { "\{_state.enemy_name} 造成 \{taken} 点伤害。" }
    if player_defeated { _result.message1 = _result.message1 + "\{pet.name} 倒下了…" }
    if player_defeated {
      set_result(0, taken, false, 0.0, false, true)
    } else {
      let base = (pet.atk.to_double() * 1.3).to_int()
      let raw = roll_damage(base, 8)
      match eff {
        Generate => {
          let heal = (raw.to_double() * 0.5).to_int()
          _state.enemy_hp = if _state.enemy_hp + heal > _state.enemy_max_hp { _state.enemy_max_hp } else { _state.enemy_hp + heal }
          set_result(0, taken, false, 0.0, false, false)
          _result.message2 = "\{_state.enemy_name} 因为你的元素技恢复了 \{heal} 点体力。"
        }
        _ => {
          let mult = effect_to_mult(eff)
          let dmg = (raw.to_double() * mult).to_int()
          let crit = roll_crit(pet.agi)
          let final_dmg = if crit { (dmg.to_double() * 1.5).to_int() } else { dmg }
          let d = if final_dmg < 1 { 1 } else { final_dmg }
          _state.enemy_hp = clamp_min(_state.enemy_hp - d, 0)
          let ed = _state.enemy_hp <= 0
          set_result(d, taken, false, 0.0, ed, false)
          _result.message2 = (if crit { "暴击！" } else { "" }) + "元素技造成 \{d} 点伤害。" + (if ed { "\{_state.enemy_name} 被击败了！" } else { "" }) + eff_label
        }
      }
    }
  }
  _state.skill_cooldown = 1
}

// ── 捕捉（内部） ────────────────────────────────────────────────────────────

///|
fn resolve_catch(rate : Double) -> Bool {
  let success = math_random() < rate
  if success {
    let hp = roll_stat(_state.enemy_max_hp)
    _state.owned.push({
      id: next_id(),
      name: _state.enemy_name,
      emoji: _state.enemy_emoji,
      hp,
      atk: roll_stat(_state.enemy_atk),
      def: roll_stat(_state.enemy_def),
      agi: roll_stat(_state.enemy_agi),
      lv: _state.enemy_lv,
      exp: 0,
      cur_hp: hp,
      element: _state.enemy_element,
    })
  }
  success
}

// 内部：执行捕捉 + 失败时受反击（玩家先手用）

///|
fn do_catch(rate : Double) -> Bool {
  let success = resolve_catch(rate)
  let pct = (rate * 100.0).to_int()
  if success {
    _result.message1 = "捕捉成功！\{_state.enemy_name} 加入了你的队伍！（\{pct}%）"
    set_result(0, 0, true, rate, true, false)
  } else {
    _result.message1 = "捕捉失败（\{pct}% 概率）。"
    let taken = enemy_action()
    let player_defeated = _state.player_hp <= 0
    set_result(0, taken, false, rate, false, player_defeated)
    _result.message2 = if _result.dodged {
      "\{_state.enemy_name} 的攻击未命中！"
    } else if player_defeated {
      "\{_state.enemy_name} 造成 \{taken} 点伤害！\{_state.owned[_state.active].name} 倒下了…"
    } else {
      "\{_state.enemy_name} 造成 \{taken} 点伤害。"
    }
  }
  success
}

///|
pub fn try_catch() -> Unit {
  if _state.player_hp <= 0 {
    return
  }
  _result.message1 = ""
  _result.message2 = ""
  _result.dodged = false
  let rate = calc_catch_rate()
  do_catch(rate) |> ignore
  dec_cooldown()
}

///|
pub fn switch_pet(idx : Int) -> Bool {
  if idx < 0 || idx >= _state.owned.length() {
    return false
  }
  if _state.owned[idx].cur_hp <= 0 {
    return false
  }
  if idx == _state.active {
    return false
  }
  _result.message1 = ""
  _result.message2 = ""
  _result.dodged = false
  _state.owned[_state.active].cur_hp = _state.player_hp
  _state.active = idx
  _state.player_hp = _state.owned[idx].cur_hp
  _state.player_max_hp = _state.owned[idx].hp
  _state.player_atk = _state.owned[idx].atk
  _result.message1 = "换上了 \{_state.owned[idx].name}。"
  let taken = enemy_action()
  _state.owned[_state.active].cur_hp = _state.player_hp
  let player_defeated = _state.player_hp <= 0
  set_result(0, taken, false, 0.0, false, player_defeated)
  _result.message2 = if _result.dodged {
    "\{_state.enemy_name} 的攻击未命中！"
  } else if player_defeated {
    "\{_state.enemy_name} 造成 \{taken} 点伤害！\{_state.owned[_state.active].name} 倒下了…"
  } else {
    "\{_state.enemy_name} 造成 \{taken} 点伤害。"
  }
  dec_cooldown()
  true
}

///|
pub fn run_away() -> Unit {
  _result.message1 = "成功逃跑了！"
  _result.message2 = ""
  sync_active_hp()
  set_result(0, 0, false, 0.0, false, false)
}

///|
pub fn get_player_element() -> Int {
  element_to_int(_state.owned[_state.active].element)
}

///|
pub fn get_enemy_element() -> Int {
  element_to_int(_state.enemy_element)
}

///|
/// 除当前出战宠外是否还有其他可战斗的宠物
pub fn has_other_pet() -> Bool {
  for i = 0; i < _state.owned.length(); i = i + 1 {
    if i != _state.active && _state.owned[i].cur_hp > 0 {
      return true
    }
  }
  false
}

///|
/// 所有宠物是否都战斗不能
pub fn all_fainted() -> Bool {
  if _state.owned.length() == 0 {
    return true
  }
  for i = 0; i < _state.owned.length(); i = i + 1 {
    if _state.owned[i].cur_hp > 0 {
      return false
    }
  }
  true
}
