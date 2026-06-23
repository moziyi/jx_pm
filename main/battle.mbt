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
  let reduce = (def.to_double() * 0.4).to_int()
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
  let dmg = calc_def_reduce(raw, pet.def)
  _state.player_hp = clamp_min(_state.player_hp - dmg, 0)
  dmg
}

// ── 敌方回合判定 ───────────────────────────────────────────────────────────

///|
fn enemy_turn() -> Int {
  enemy_attack_full()
}

///|
fn enemy_counter_attack() -> Int {
  enemy_attack_full()
}

// ── 公开行动 ──────────────────────────────────────────────────────────────

///|
pub fn player_attack() -> Unit {
  if _state.player_hp <= 0 {
    return
  }
  _result.dodged = false
  let pet = _state.owned[_state.active]
  if player_goes_first() {
    let dealt = roll_damage(_state.player_atk, 6)
    _state.enemy_hp = clamp_min(_state.enemy_hp - dealt, 0)
    let enemy_defeated = _state.enemy_hp <= 0
    let taken = if enemy_defeated { 0 } else { enemy_counter_attack() }
    let player_defeated = _state.player_hp <= 0
    set_result(dealt, taken, false, 0.0, enemy_defeated, player_defeated)
    _result.message = if enemy_defeated {
      "你造成了 \{dealt} 点伤害。\{_state.enemy_name} 被击败了！"
    } else if _result.dodged {
      "你造成了 \{dealt} 点伤害。\{_state.enemy_name} 的攻击被闪避了！"
    } else if player_defeated {
      "你造成了 \{dealt} 点伤害，但受到 \{taken} 点反击。\{pet.name} 倒下了…"
    } else {
      "你造成了 \{dealt} 点伤害，受到 \{taken} 点反击。敌人还剩 \{_state.enemy_hp} HP。"
    }
    dec_cooldown()
  } else {
    let taken = enemy_turn()
    let player_defeated = _state.player_hp <= 0
    let dealt = if player_defeated {
      0
    } else {
      let d = roll_damage(_state.player_atk, 6)
      _state.enemy_hp = clamp_min(_state.enemy_hp - d, 0)
      d
    }
    let enemy_defeated = _state.enemy_hp <= 0
    set_result(dealt, taken, false, 0.0, enemy_defeated, player_defeated)
    _result.message = if _result.dodged {
      "闪避了\{_state.enemy_name} 的攻击！你造成 \{dealt} 点伤害。"
    } else if player_defeated {
      "\{_state.enemy_name} 先发制人造成 \{taken} 点伤害。\{pet.name} 倒下了…"
    } else if enemy_defeated {
      "\{_state.enemy_name} 先攻造成 \{taken} 点伤害。你反击 \{dealt} 点，击败了它！"
    } else {
      "\{_state.enemy_name} 先攻造成 \{taken} 点伤害。你反击 \{dealt} 点。敌人还剩 \{_state.enemy_hp} HP。"
    }
    dec_cooldown()
  }
}

///|
pub fn elemental_skill() -> Unit {
  if _state.player_hp <= 0 {
    return
  }
  if _state.skill_cooldown > 0 {
    return
  }
  _result.dodged = false
  let pet = _state.owned[_state.active]
  if player_goes_first() {
    let base = (pet.atk.to_double() * 1.3).to_int()
    let raw = roll_damage(base, 8)
    let eff = battle_effect(pet.element, _state.enemy_element)
    match eff {
      Generate => {
        let heal = (raw.to_double() * 0.5).to_int()
        _state.enemy_hp = if _state.enemy_hp + heal > _state.enemy_max_hp {
          _state.enemy_max_hp
        } else {
          _state.enemy_hp + heal
        }
        let taken = enemy_counter_attack()
        set_result(0, taken, false, 0.0, false, _state.player_hp <= 0)
        _result.message = if _result.dodged {
          "元素技为 \{_state.enemy_name} 恢复了 \{heal} HP…\{_state.enemy_name} 的攻击被闪避了！"
        } else {
          "元素技为 \{_state.enemy_name} 恢复了 \{heal} HP…受到 \{taken} 点反击。"
        }
      }
      _ => {
        let mult = effect_to_mult(eff)
        let dmg = (raw.to_double() * mult).to_int()
        let d = if dmg < 1 { 1 } else { dmg }
        _state.enemy_hp = clamp_min(_state.enemy_hp - d, 0)
        let ed = _state.enemy_hp <= 0
        let taken = if ed { 0 } else { enemy_counter_attack() }
        set_result(d, taken, false, 0.0, ed, _state.player_hp <= 0)
        _result.message = if ed {
          "元素技造成 \{d} 点伤害！\{_state.enemy_name} 被击败了！"
        } else if _result.player_defeated {
          "元素技造成 \{d} 点伤害，但受到 \{taken} 点反击。\{pet.name} 倒下了…"
        } else {
          "元素技造成 \{d} 点伤害，受到 \{taken} 点反击。敌人还剩 \{_state.enemy_hp} HP。"
        }
      }
    }
  } else {
    let taken = enemy_turn()
    let player_defeated = _state.player_hp <= 0
    if player_defeated {
      set_result(0, taken, false, 0.0, false, true)
      _result.message = if _result.dodged {
        "闪避了\{_state.enemy_name} 的攻击！但随后无法行动…"
      } else {
        "\{_state.enemy_name} 先手造成 \{taken} 点伤害！\{pet.name} 倒下了…"
      }
    } else {
      let base = (pet.atk.to_double() * 1.3).to_int()
      let raw = roll_damage(base, 8)
      let eff = battle_effect(pet.element, _state.enemy_element)
      match eff {
        Generate => {
          let heal = (raw.to_double() * 0.5).to_int()
          _state.enemy_hp = if _state.enemy_hp + heal > _state.enemy_max_hp {
            _state.enemy_max_hp
          } else {
            _state.enemy_hp + heal
          }
          set_result(0, taken, false, 0.0, false, false)
          _result.message = "\{_state.enemy_name} 先攻造成 \{taken} 点伤害。元素技为 \{_state.enemy_name} 恢复了 \{heal} HP…"
        }
        _ => {
          let mult = effect_to_mult(eff)
          let dmg = (raw.to_double() * mult).to_int()
          let d = if dmg < 1 { 1 } else { dmg }
          _state.enemy_hp = clamp_min(_state.enemy_hp - d, 0)
          let ed = _state.enemy_hp <= 0
          set_result(d, taken, false, 0.0, ed, false)
          _result.message = if ed {
            "\{_state.enemy_name} 先攻造成 \{taken} 点伤害。元素技反击 \{d} 点，击败了它！"
          } else {
            "\{_state.enemy_name} 先攻造成 \{taken} 点伤害。元素技反击 \{d} 点。敌人还剩 \{_state.enemy_hp} HP。"
          }
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
  let taken = if success { 0 } else { enemy_counter_attack() }
  let player_defeated = _state.player_hp <= 0
  set_result(0, taken, success, rate, success, player_defeated)
  let pct = (rate * 100.0).to_int()
  _result.message = if success {
    "捕捉成功！\{_state.enemy_name} 加入了你的队伍！"
  } else if player_defeated {
    "捕捉失败（\{pct}% 概率）。\{_state.enemy_name} 反击，\{_state.owned[_state.active].name} 倒下了…"
  } else {
    "捕捉失败（\{pct}% 概率）。受到 \{taken} 点反击。"
  }
  success
}

///|
pub fn try_catch() -> Unit {
  if _state.player_hp <= 0 {
    return
  }
  _result.dodged = false
  let rate = calc_catch_rate()
  if player_goes_first() {
    do_catch(rate) |> ignore
  } else {
    let taken = enemy_turn()
    let player_defeated = _state.player_hp <= 0
    if player_defeated {
      set_result(0, taken, false, rate, false, true)
      let pet = _state.owned[_state.active]
      _result.message = if _result.dodged {
        "闪避了攻击！但来不及捕捉…"
      } else {
        "\{_state.enemy_name} 先手造成 \{taken} 点伤害！\{pet.name} 倒下了…"
      }
    } else {
      let success = resolve_catch(rate)
      set_result(0, taken, success, rate, success, false)
      let pct = (rate * 100.0).to_int()
      _result.message = if success {
        "\{_state.enemy_name} 先攻造成 \{taken} 点伤害。捕捉成功！\{_state.enemy_name} 加入了你的队伍！"
      } else {
        "\{_state.enemy_name} 先攻造成 \{taken} 点伤害。捕捉失败（\{pct}% 概率）。"
      }
    }
  }
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
  _result.dodged = false
  if player_goes_first() {
    _state.owned[_state.active].cur_hp = _state.player_hp
    _state.active = idx
    _state.player_hp = _state.owned[idx].cur_hp
    _state.player_max_hp = _state.owned[idx].hp
    _state.player_atk = _state.owned[idx].atk
    let taken = enemy_counter_attack()
    let player_defeated = _state.player_hp <= 0
    set_result(0, taken, false, 0.0, false, player_defeated)
    _result.message = "换上了 \{_state.owned[idx].name}！受到 \{taken} 点反击。"
  } else {
    let taken = enemy_turn()
    let old_pet = _state.owned[_state.active]
    _state.owned[_state.active].cur_hp = _state.player_hp
    let player_defeated = _state.player_hp <= 0
    if player_defeated {
      set_result(0, taken, false, 0.0, false, true)
      _result.message = if _result.dodged {
        "闪避了\{_state.enemy_name} 的攻击！但切换被打断了…"
      } else {
        "\{_state.enemy_name} 先手造成 \{taken} 点伤害！\{old_pet.name} 倒下了…"
      }
      return true
    }
    _state.active = idx
    _state.player_hp = _state.owned[idx].cur_hp
    _state.player_max_hp = _state.owned[idx].hp
    _state.player_atk = _state.owned[idx].atk
    set_result(0, taken, false, 0.0, false, false)
    _result.message = if _result.dodged {
      "闪避了\{_state.enemy_name} 的攻击！换上了 \{_state.owned[idx].name}。"
    } else {
      "\{_state.enemy_name} 先手攻击 \{old_pet.name} 造成 \{taken} 点伤害。换上了 \{_state.owned[idx].name}。"
    }
  }
  dec_cooldown()
  true
}

///|
pub fn run_away() -> Unit {
  sync_active_hp()
  set_result(0, 0, false, 0.0, false, false)
  _result.message = "成功逃跑了！"
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
