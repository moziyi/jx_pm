// save.mbt — 存档导出

///|
pub fn export_save() -> String {
  let owned_count = _state.owned.length()
  let stored_count = _state.stored.length()
  let lines = "7\n"
  let mut data = _state.active.to_string() + "\n"
  data = data + _inventory.herbs.to_string() + "\n"
  data = data + _inventory.revives.to_string() + "\n"
  data = data + _inventory.charms.to_string() + "\n"
  data = data + _inventory.great_charms.to_string() + "\n"
  data = data + owned_count.to_string() + "\n"
  for i = 0; i < owned_count; i = i + 1 {
    data = data + _state.owned[i].name + "\n"
    data = data + _state.owned[i].emoji + "\n"
    data = data + _state.owned[i].hp.to_string() + "\n"
    data = data + _state.owned[i].atk.to_string() + "\n"
    data = data + _state.owned[i].def.to_string() + "\n"
    data = data + _state.owned[i].agi.to_string() + "\n"
    data = data + _state.owned[i].lv.to_string() + "\n"
    data = data + _state.owned[i].exp.to_string() + "\n"
    data = data + _state.owned[i].cur_hp.to_string() + "\n"
    data = data + element_to_int(_state.owned[i].element).to_string() + "\n"
  }
  data = data + stored_count.to_string() + "\n"
  for i = 0; i < stored_count; i = i + 1 {
    data = data + _state.stored[i].name + "\n"
    data = data + _state.stored[i].emoji + "\n"
    data = data + _state.stored[i].hp.to_string() + "\n"
    data = data + _state.stored[i].atk.to_string() + "\n"
    data = data + _state.stored[i].def.to_string() + "\n"
    data = data + _state.stored[i].agi.to_string() + "\n"
    data = data + _state.stored[i].lv.to_string() + "\n"
    data = data + _state.stored[i].exp.to_string() + "\n"
    data = data + _state.stored[i].cur_hp.to_string() + "\n"
    data = data + element_to_int(_state.stored[i].element).to_string() + "\n"
  }
  let checksum = calc_checksum(data)
  lines + checksum.to_string() + "\n" + data
}

///|
fn calc_checksum(s : String) -> Int {
  let mut sum = 0
  for i = 0; i < s.length(); i = i + 1 {
    sum = (sum + s[i].to_int()) % 65536
  }
  sum
}
