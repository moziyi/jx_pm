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
pub fn get_herb50() -> Int {
  _inventory.herb50
}

///|
pub fn get_herb_half() -> Int {
  _inventory.herb_half
}

///|
pub fn get_herb_full() -> Int {
  _inventory.herb_full
}

///|
pub fn get_revive_full() -> Int {
  _inventory.revive_full
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
pub fn add_herb50(n : Int) -> Unit {
  _inventory.herb50 = _inventory.herb50 + n
}

///|
pub fn add_herb_half(n : Int) -> Unit {
  _inventory.herb_half = _inventory.herb_half + n
}

///|
pub fn add_herb_full(n : Int) -> Unit {
  _inventory.herb_full = _inventory.herb_full + n
}

///|
pub fn add_revive_full(n : Int) -> Unit {
  _inventory.revive_full = _inventory.revive_full + n
}

///|
pub fn use_herb() -> Bool {
  if _inventory.herbs <= 0 {
    return false
  }
  if _state.player_hp <= 0 {
    return false
  }
  _result.message1 = ""
  _result.message2 = ""
  _result.dodged = false
  _inventory.herbs = _inventory.herbs - 1
  let pet = _state.owned[_state.active]
  let current = _state.player_hp
  let max_hp = pet.hp
  let heal = if current + 20 > max_hp { max_hp - current } else { 20 }
  _state.player_hp = current + heal
  pet.cur_hp = _state.player_hp
  _result.message1 = "使用了药草，恢复了 \{heal} 点 HP。"
  if _state.enemy_hp > 0 {
    let taken = enemy_action()
    let player_defeated = _state.player_hp <= 0
    set_result(0, taken, false, 0.0, false, player_defeated)
    _result.message2 = if _result.dodged {
      "\{_state.enemy_name} 的攻击未命中！"
    } else if player_defeated {
      "\{_state.enemy_name} 造成 \{taken} 点伤害！\{pet.name} 倒下了…"
    } else {
      "\{_state.enemy_name} 造成 \{taken} 点伤害。"
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
  _result.message1 = ""
  _result.message2 = ""
  _result.dodged = false
  _inventory.revives = _inventory.revives - 1
  let half = _state.owned[idx].hp / 2
  _state.owned[idx].cur_hp = if half < 1 { 1 } else { half }
  _result.message1 = "使用了醒神草，\{_state.owned[idx].name} 恢复了 \{half} 点 HP。"
  if _state.enemy_hp > 0 {
    let taken = enemy_action()
  let player_defeated = _state.player_hp <= 0
  set_result(0, taken, false, 0.0, false, player_defeated)
  _result.message2 = if _result.dodged {
    "\{_state.enemy_name} 的攻击未命中！"
  } else if player_defeated {
    "\{_state.enemy_name} 造成 \{taken} 点伤害！\{_state.owned[_state.active].name} 倒下了…"
  } else {
      "\{_state.enemy_name} 造成 \{taken} 点伤害。"
    }
  }
  dec_cooldown()
  return true
}

///|
pub fn use_herb50() -> Bool {
  if _inventory.herb50 <= 0 {
    return false
  }
  if _state.player_hp <= 0 {
    return false
  }
  _result.message1 = ""
  _result.message2 = ""
  _result.dodged = false
  _inventory.herb50 = _inventory.herb50 - 1
  let pet = _state.owned[_state.active]
  let current = _state.player_hp
  let max_hp = pet.hp
  let heal = if current + 50 > max_hp { max_hp - current } else { 50 }
  _state.player_hp = current + heal
  pet.cur_hp = _state.player_hp
  _result.message1 = "使用了强效药草，恢复了 \{heal} 点 HP。"
  if _state.enemy_hp > 0 {
    let taken = enemy_action()
    let player_defeated = _state.player_hp <= 0
    set_result(0, taken, false, 0.0, false, player_defeated)
    _result.message2 = if _result.dodged {
      "\{_state.enemy_name} 的攻击未命中！"
    } else if player_defeated {
      "\{_state.enemy_name} 造成 \{taken} 点伤害！\{pet.name} 倒下了…"
    } else {
      "\{_state.enemy_name} 造成 \{taken} 点伤害。"
    }
  }
  dec_cooldown()
  return true
}

///|
pub fn use_herb_half() -> Bool {
  if _inventory.herb_half <= 0 {
    return false
  }
  if _state.player_hp <= 0 {
    return false
  }
  _result.message1 = ""
  _result.message2 = ""
  _result.dodged = false
  _inventory.herb_half = _inventory.herb_half - 1
  let pet = _state.owned[_state.active]
  let current = _state.player_hp
  let max_hp = pet.hp
  let half = max_hp / 2
  let heal = if current + half > max_hp { max_hp - current } else { half }
  _state.player_hp = current + heal
  pet.cur_hp = _state.player_hp
  _result.message1 = "使用了半恢复草，恢复了 \{heal} 点 HP。"
  if _state.enemy_hp > 0 {
    let taken = enemy_action()
    let player_defeated = _state.player_hp <= 0
    set_result(0, taken, false, 0.0, false, player_defeated)
    _result.message2 = if _result.dodged {
      "\{_state.enemy_name} 的攻击未命中！"
    } else if player_defeated {
      "\{_state.enemy_name} 造成 \{taken} 点伤害！\{pet.name} 倒下了…"
    } else {
      "\{_state.enemy_name} 造成 \{taken} 点伤害。"
    }
  }
  dec_cooldown()
  return true
}

///|
pub fn use_herb_full() -> Bool {
  if _inventory.herb_full <= 0 {
    return false
  }
  if _state.player_hp <= 0 {
    return false
  }
  _result.message1 = ""
  _result.message2 = ""
  _result.dodged = false
  _inventory.herb_full = _inventory.herb_full - 1
  let pet = _state.owned[_state.active]
  let current = _state.player_hp
  let max_hp = pet.hp
  let heal = max_hp - current
  _state.player_hp = max_hp
  pet.cur_hp = max_hp
  _result.message1 = "使用了全恢复草，恢复了 \{heal} 点 HP。"
  if _state.enemy_hp > 0 {
    let taken = enemy_action()
    let player_defeated = _state.player_hp <= 0
    set_result(0, taken, false, 0.0, false, player_defeated)
    _result.message2 = if _result.dodged {
      "\{_state.enemy_name} 的攻击未命中！"
    } else if player_defeated {
      "\{_state.enemy_name} 造成 \{taken} 点伤害！\{pet.name} 倒下了…"
    } else {
      "\{_state.enemy_name} 造成 \{taken} 点伤害。"
    }
  }
  dec_cooldown()
  return true
}

///|
pub fn use_revive_full(idx : Int) -> Bool {
  if _inventory.revive_full <= 0 {
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
  _result.message1 = ""
  _result.message2 = ""
  _result.dodged = false
  _inventory.revive_full = _inventory.revive_full - 1
  let full_hp = _state.owned[idx].hp
  _state.owned[idx].cur_hp = full_hp
  _result.message1 = "使用了满血醒神草，\{_state.owned[idx].name} 完全恢复了 \{full_hp} 点 HP。"
  if _state.enemy_hp > 0 {
    let taken = enemy_action()
    let player_defeated = _state.player_hp <= 0
    set_result(0, taken, false, 0.0, false, player_defeated)
    _result.message2 = if _result.dodged {
      "\{_state.enemy_name} 的攻击未命中！"
    } else if player_defeated {
      "\{_state.enemy_name} 造成 \{taken} 点伤害！\{_state.owned[_state.active].name} 倒下了…"
    } else {
      "\{_state.enemy_name} 造成 \{taken} 点伤害。"
    }
  }
  dec_cooldown()
  return true
}

fn use_charm_with_bonus(bonus : Double, is_great : Bool) -> Bool {
  if is_great {
    if _inventory.great_charms <= 0 { return false }
  } else {
    if _inventory.charms <= 0 { return false }
  }
  if _state.player_hp <= 0 {
    return false
  }
  _result.message1 = ""
  _result.message2 = ""
  _result.dodged = false
  if is_great {
    _inventory.great_charms = _inventory.great_charms - 1
  } else {
    _inventory.charms = _inventory.charms - 1
  }
  let base_rate = calc_catch_rate()
  let rate = if base_rate + bonus > 0.95 { 0.95 } else { base_rate + bonus }
  do_catch(rate) |> ignore
  return true
}

///|
pub fn use_charm() -> Bool {
  use_charm_with_bonus(0.15, false)
}

///|
pub fn use_great_charm() -> Bool {
  use_charm_with_bonus(0.30, true)
}

///|
pub fn get_max_pets() -> Int {
  max_pets
}

///|
pub fn get_max_stored() -> Int {
  max_stored
}
