// items.mbt — 道具使用

///|
pub fn get_herbs() -> Int {
  _inventory.herbs
}

///|
pub fn get_revives() -> Int {
  _inventory.revives
}

///|
pub fn get_charms() -> Int {
  _inventory.charms
}

///|
pub fn get_great_charms() -> Int {
  _inventory.great_charms
}

///|
pub fn add_herbs(n : Int) -> Unit {
  _inventory.herbs = _inventory.herbs + n
}

///|
pub fn add_revives(n : Int) -> Unit {
  _inventory.revives = _inventory.revives + n
}

///|
pub fn add_charms(n : Int) -> Unit {
  _inventory.charms = _inventory.charms + n
}

///|
pub fn add_great_charms(n : Int) -> Unit {
  _inventory.great_charms = _inventory.great_charms + n
}

///|
pub fn use_herb() -> Bool {
  if _inventory.herbs <= 0 {
    return false
  }
  if _state.player_hp <= 0 {
    return false
  }
  _result.dodged = false
  _inventory.herbs = _inventory.herbs - 1
  let pet = _state.owned[_state.active]
  let current = _state.player_hp
  let max_hp = pet.hp
  let heal = if current + 20 > max_hp { max_hp - current } else { 20 }
  _state.player_hp = current + heal
  pet.cur_hp = _state.player_hp
  if player_goes_first() {
    let taken = enemy_counter_attack()
    let player_defeated = _state.player_hp <= 0
    set_result(0, taken, false, 0.0, false, player_defeated)
    _result.message = "使用了药草，恢复了 \{heal} 点 HP。受到 \{taken} 点反击。"
  } else {
    let taken = enemy_turn()
    let player_defeated = _state.player_hp <= 0
    set_result(0, taken, false, 0.0, false, player_defeated)
    _result.message = if player_defeated {
      "\{_state.enemy_name} 先手造成 \{taken} 点伤害！\{pet.name} 倒下了…"
    } else {
      "\{_state.enemy_name} 先手造成 \{taken} 点伤害。使用了药草，恢复了 \{heal} 点 HP。"
    }
  }
  dec_cooldown()
  return true
}

///|
pub fn use_revive(idx : Int) -> Bool {
  if _inventory.revives <= 0 {
    return false
  }
  if idx < 0 || idx >= _state.owned.length() {
    return false
  }
  if _state.owned[idx].cur_hp > 0 {
    return false
  }
  if _state.player_hp <= 0 {
    return false
  }
  _result.dodged = false
  _inventory.revives = _inventory.revives - 1
  let half = _state.owned[idx].hp / 2
  _state.owned[idx].cur_hp = if half < 1 { 1 } else { half }
  if player_goes_first() {
    let taken = enemy_counter_attack()
    let player_defeated = _state.player_hp <= 0
    set_result(0, taken, false, 0.0, false, player_defeated)
    _result.message = "使用了醒神草，\{_state.owned[idx].name} 恢复了 \{half} 点 HP。受到 \{taken} 点反击。"
  } else {
    let taken = enemy_turn()
    let player_defeated = _state.player_hp <= 0
    set_result(0, taken, false, 0.0, false, player_defeated)
    let pet = _state.owned[_state.active]
    _result.message = if player_defeated {
      "\{_state.enemy_name} 先手造成 \{taken} 点伤害！\{pet.name} 倒下了…"
    } else {
      "\{_state.enemy_name} 先手造成 \{taken} 点伤害。用醒神草复苏了 \{_state.owned[idx].name}。"
    }
  }
  dec_cooldown()
  return true
}

///|
pub fn use_charm() -> Bool {
  if _inventory.charms <= 0 {
    return false
  }
  if _state.player_hp <= 0 {
    return false
  }
  _result.dodged = false
  _inventory.charms = _inventory.charms - 1
  let rate = if calc_catch_rate() + 0.15 > 0.95 {
    0.95
  } else {
    calc_catch_rate() + 0.15
  }
  if player_goes_first() {
    let success = do_catch(rate)
    if success {
      _result.message = "幻兽符成功！\{_state.enemy_name} 加入了你的队伍！（\{((rate)*100.0).to_int()}%）"
    }
  } else {
    let taken = enemy_turn()
    let player_defeated = _state.player_hp <= 0
    if player_defeated {
      set_result(0, taken, false, rate, false, true)
      let pet = _state.owned[_state.active]
      _result.message = if _result.dodged {
        "闪避了攻击！但来不及使用幻兽符…"
      } else {
        "\{_state.enemy_name} 先手造成 \{taken} 点伤害！\{pet.name} 倒下了…"
      }
    } else {
      let success = resolve_catch(rate)
      set_result(0, taken, success, rate, success, false)
      _result.message = if success {
        "\{_state.enemy_name} 先攻造成 \{taken} 点伤害。幻兽符成功！\{_state.enemy_name} 加入了你的队伍！（\{((rate)*100.0).to_int()}%）"
      } else {
        "\{_state.enemy_name} 先攻造成 \{taken} 点伤害。幻兽符失败（\{((rate)*100.0).to_int()}%）。"
      }
    }
  }
  return true
}

///|
pub fn use_great_charm() -> Bool {
  if _inventory.great_charms <= 0 {
    return false
  }
  if _state.player_hp <= 0 {
    return false
  }
  _result.dodged = false
  _inventory.great_charms = _inventory.great_charms - 1
  let rate = if calc_catch_rate() + 0.30 > 0.95 {
    0.95
  } else {
    calc_catch_rate() + 0.30
  }
  if player_goes_first() {
    let success = do_catch(rate)
    if success {
      _result.message = "高级幻兽符成功！\{_state.enemy_name} 加入了你的队伍！（\{((rate)*100.0).to_int()}%）"
    }
  } else {
    let taken = enemy_turn()
    let player_defeated = _state.player_hp <= 0
    if player_defeated {
      set_result(0, taken, false, rate, false, true)
      let pet = _state.owned[_state.active]
      _result.message = if _result.dodged {
        "闪避了攻击！但来不及使用高级符…"
      } else {
        "\{_state.enemy_name} 先手造成 \{taken} 点伤害！\{pet.name} 倒下了…"
      }
    } else {
      let success = resolve_catch(rate)
      set_result(0, taken, success, rate, success, false)
      _result.message = if success {
        "\{_state.enemy_name} 先攻造成 \{taken} 点伤害。高级符成功！\{_state.enemy_name} 加入了你的队伍！（\{((rate)*100.0).to_int()}%）"
      } else {
        "\{_state.enemy_name} 先攻造成 \{taken} 点伤害。高级符失败（\{((rate)*100.0).to_int()}%）。"
      }
    }
  }
  return true
}

///|
pub fn get_max_pets() -> Int {
  max_pets
}

///|
pub fn get_max_stored() -> Int {
  max_stored
}
