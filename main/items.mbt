// items.mbt — 道具使用

pub fn get_herbs()  -> Int { _inventory.herbs }
pub fn get_revives() -> Int { _inventory.revives }
pub fn get_charms() -> Int { _inventory.charms }

pub fn add_herbs(n : Int)  -> Unit { _inventory.herbs  = _inventory.herbs  + n }
pub fn add_revives(n : Int) -> Unit { _inventory.revives = _inventory.revives + n }
pub fn add_charms(n : Int) -> Unit { _inventory.charms  = _inventory.charms  + n }

pub fn use_herb() -> Bool {
  if _inventory.herbs <= 0 { return false }
  _inventory.herbs = _inventory.herbs - 1
  let pet = _state.owned[_state.active]
  let heal = if pet.cur_hp + 20 > pet.hp { pet.hp - pet.cur_hp } else { 20 }
  _state.player_hp = pet.cur_hp + heal
  pet.cur_hp = _state.player_hp
  let taken = enemy_counter_attack()
  let player_defeated = _state.player_hp <= 0
  _result.damage_dealt    = 0
  _result.damage_taken    = taken
  _result.catch_success   = false
  _result.catch_rate      = 0.0
  _result.enemy_defeated  = false
  _result.player_defeated = player_defeated
  _result.message         = "使用了药草，恢复了 \{heal} 点 HP。受到 \{taken} 点反击。"
  return true
}

pub fn use_revive(idx : Int) -> Bool {
  if _inventory.revives <= 0 { return false }
  if idx < 0 || idx >= _state.owned.length() { return false }
  if _state.owned[idx].cur_hp > 0 { return false }
  _inventory.revives = _inventory.revives - 1
  let half = _state.owned[idx].hp / 2
  _state.owned[idx].cur_hp = if half < 1 { 1 } else { half }
  let taken = enemy_counter_attack()
  let player_defeated = _state.player_hp <= 0
  _result.damage_dealt    = 0
  _result.damage_taken    = taken
  _result.catch_success   = false
  _result.catch_rate      = 0.0
  _result.enemy_defeated  = false
  _result.player_defeated = player_defeated
  _result.message         = "使用了醒神草，\{_state.owned[idx].name} 恢复了 \{half} 点 HP。受到 \{taken} 点反击。"
  return true
}

pub fn use_charm() -> Bool {
  if _inventory.charms <= 0 { return false }
  _inventory.charms = _inventory.charms - 1
  let success = math_random() < 0.4
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
  _result.catch_rate      = 0.4
  _result.enemy_defeated  = success
  _result.player_defeated = player_defeated
  _result.message =
    if success {
      "幻兽符成功！\{_state.enemy_name} 加入了你的队伍！"
    } else if player_defeated {
      "幻兽符失败…\{_state.enemy_name} 反击，\{_state.owned[_state.active].name} 倒下了…"
    } else {
      "幻兽符失败…受到 \{taken} 点反击。"
    }
  return true
}

pub fn get_max_pets() -> Int { max_pets }
