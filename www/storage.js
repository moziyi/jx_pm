// @ts-check
// storage.js — 存档读写

const SAVE_KEY = 'phantom_forest_v8'
const OLD_SAVE_KEY = 'phantom_forest_v3'

export function checksum(s) {
  let sum = 0
  for (let i = 0; i < s.length; i++) sum = (sum + s.charCodeAt(i)) % 65536
  return sum
}

export function getUUID() {
  let id = localStorage.getItem('phantom_uuid')
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('phantom_uuid', id) }
  return id
}

/// 解析 export_save() 输出（无 UUID，无 localStorage）
export function parseWasmState(raw) {
  if (!raw) return null
  const lines = raw.split('\n')
  const ver = parseInt(lines[0])
  if (ver < 9) return null
  // format: ver / checksum / active / 8 inv / owned_count / pets / stored_count / stored
  const active = parseInt(lines[2]) || 0
  const inv = {
    herbs: parseInt(lines[3])||0, revives: parseInt(lines[4])||0,
    charms: parseInt(lines[5])||0, great_charms: parseInt(lines[6])||0,
    herb50: parseInt(lines[7])||0, herb_half: parseInt(lines[8])||0,
    herb_full: parseInt(lines[9])||0, revive_full: parseInt(lines[10])||0,
  }
  const ownedCount = parseInt(lines[11]) || 0
  const petFields = 11
  let p = 12
  const pets = []
  for (let j = 0; j < ownedCount; j++) { pets.push(parsePet(lines, p, ver)); p += petFields }
  const storedCount = parseInt(lines[p]) || 0; p++
  const stored = []
  for (let j = 0; j < storedCount; j++) { stored.push(parsePet(lines, p, ver)); p += petFields }
  return { active, inv, pets, stored }
}

function parsePet(lines, i, ver) {
  if (ver >= 8) {
    return {
      id: parseInt(lines[i]) || 0,
      n: lines[i+1], e: lines[i+2],
      hp: parseInt(lines[i+3]), atk: parseInt(lines[i+4]),
      def: parseInt(lines[i+5]) || 0, agi: parseInt(lines[i+6]) || 0,
      lv: parseInt(lines[i+7]) || 1, exp: parseInt(lines[i+8]) || 0,
      cur_hp: parseInt(lines[i+9]), el: parseInt(lines[i+10]) || 0
    }
  }
  return {
    id: 0,
    n: lines[i], e: lines[i+1],
    hp: parseInt(lines[i+2]), atk: parseInt(lines[i+3]),
    def: parseInt(lines[i+4]) || 0, agi: parseInt(lines[i+5]) || 0,
    lv: parseInt(lines[i+6]) || 1, exp: parseInt(lines[i+7]) || 0,
    cur_hp: parseInt(lines[i+8]), el: parseInt(lines[i+9]) || 0
  }
}

export function loadGame() {
  try {
    let raw = localStorage.getItem(SAVE_KEY)
    if (!raw) {
      // 降级读取旧版本 key
      raw = localStorage.getItem(OLD_SAVE_KEY)
      if (!raw) return null
    }
    const lines = raw.split('\n')
    const ver = parseInt(lines[0])
    if (ver < 3) return null
    const data = lines.slice(2).join('\n')
    if (String(checksum(data)) !== lines[1]) { console.warn('存档校验失败'); return null }
    const uuid = lines[2]
    const active = parseInt(lines[3]) || 0
    let inv = { herbs: 3, revives: 1, charms: 2, great_charms: 1, herb50: 1, herb_half: 1, herb_full: 0, revive_full: 0 }
    let stored = []
    if (ver >= 9) {
      inv = { herbs: parseInt(lines[4])||0, revives: parseInt(lines[5])||0, charms: parseInt(lines[6])||0, great_charms: parseInt(lines[7])||0, herb50: parseInt(lines[8])||0, herb_half: parseInt(lines[9])||0, herb_full: parseInt(lines[10])||0, revive_full: parseInt(lines[11])||0 }
      const ownedCount = parseInt(lines[12]) || 0
      const petFields = ver >= 8 ? 11 : 10
      let p = 13
      const pets = []
      for (let j = 0; j < ownedCount; j++) {
        pets.push(parsePet(lines, p, ver))
        p += petFields
      }
      const storedCount = parseInt(lines[p]) || 0
      p++
      for (let j = 0; j < storedCount; j++) {
        stored.push(parsePet(lines, p, ver))
        p += petFields
      }
      return { uuid, active, inv, pets, stored }
    } else if (ver >= 7) {
      inv = { herbs: parseInt(lines[4])||0, revives: parseInt(lines[5])||0, charms: parseInt(lines[6])||0, great_charms: parseInt(lines[7])||0 }
      const ownedCount = parseInt(lines[8]) || 0
      const petFields = ver >= 8 ? 11 : 10
      let p = 9
      const pets = []
      for (let j = 0; j < ownedCount; j++) {
        pets.push(parsePet(lines, p, ver))
        p += petFields
      }
      const storedCount = parseInt(lines[p]) || 0
      p++
      for (let j = 0; j < storedCount; j++) {
        stored.push(parsePet(lines, p, ver))
        p += petFields
      }
      return { uuid, active, inv, pets, stored }
    } else if (ver >= 6) {
      inv = { herbs: parseInt(lines[4])||0, revives: parseInt(lines[5])||0, charms: parseInt(lines[6])||0, great_charms: parseInt(lines[7])||0 }
      let dataStart = 8
      const petFields = 10
      const r = []
      for (let i = dataStart; i + petFields - 1 < lines.length; i += petFields) {
        r.push(parsePet(lines, i))
      }
      return { uuid, active, inv, pets: r, stored: [] }
    } else if (ver >= 5) {
      inv = { herbs: parseInt(lines[4])||0, revives: parseInt(lines[5])||0, charms: parseInt(lines[6])||0, great_charms: 1 }
      let dataStart = 7
      const petFields = 7
      const r = []
      for (let i = dataStart; i + petFields - 1 < lines.length; i += petFields) {
        r.push({
          n: lines[i], e: lines[i+1],
          hp: parseInt(lines[i+2]), atk: parseInt(lines[i+3]),
          def: 0, agi: 0,
          lv: parseInt(lines[i+4]) || 1, exp: 0,
          cur_hp: parseInt(lines[i+5]), el: parseInt(lines[i+6]) || 0
        })
      }
      return { uuid, active, inv, pets: r, stored: [] }
    } else {
      const r = []
      const dataStart = 4
      const petFields = ver >= 4 ? 7 : 6
      for (let i = dataStart; i + petFields - 1 < lines.length; i += petFields) {
        if (ver >= 4) {
          r.push({
            n: lines[i], e: lines[i+1],
            hp: parseInt(lines[i+2]), atk: parseInt(lines[i+3]),
            def: 0, agi: 0,
            lv: parseInt(lines[i+4]) || 1, exp: 0,
            cur_hp: parseInt(lines[i+5]), el: parseInt(lines[i+6]) || 0
          })
        } else {
          r.push({
            n: lines[i], e: lines[i+1],
            hp: parseInt(lines[i+2]), atk: parseInt(lines[i+3]),
            def: 0, agi: 0,
            lv: parseInt(lines[i+4]) || 1, exp: 0,
            cur_hp: parseInt(lines[i+5]), el: 4
          })
        }
      }
      return { uuid, active, inv, pets: r, stored: [] }
    }
  } catch { return null }
  return null
}

export function saveGame(pets, storedPets, exports) {
  const h = exports.get_herbs ? exports.get_herbs() : 3
  const r = exports.get_revives ? exports.get_revives() : 1
  const c = exports.get_charms ? exports.get_charms() : 2
  const gc = exports.get_great_charms ? exports.get_great_charms() : 1
  const h50 = exports.get_herb50 ? exports.get_herb50() : 1
  const hh = exports.get_herb_half ? exports.get_herb_half() : 1
  const hf = exports.get_herb_full ? exports.get_herb_full() : 0
  const rf = exports.get_revive_full ? exports.get_revive_full() : 0
  const petStr = (p) => `${p.id ?? 0}\n${p.n}\n${p.e}\n${p.hp}\n${p.atk}\n${p.def ?? 0}\n${p.agi ?? 0}\n${p.lv ?? 1}\n${p.exp ?? 0}\n${p.cur_hp}\n${p.el ?? 4}`
  const data = `${getUUID()}\n${exports.get_active()}\n${h}\n${r}\n${c}\n${gc}\n${h50}\n${hh}\n${hf}\n${rf}\n` +
    `${pets.length}\n` +
    pets.map(petStr).join('\n') + (pets.length > 0 ? '\n' : '') +
    `${storedPets.length}\n` +
    storedPets.map(petStr).join('\n') + (storedPets.length > 0 ? '\n' : '')
  localStorage.setItem(SAVE_KEY, `9\n${checksum(data)}\n${data}`)
}
