// storage.js — 存档读写

const SAVE_KEY = 'phantom_forest_v3'

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

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const lines = raw.split('\n')
    const ver = parseInt(lines[0])
    let uuid, active = 0, dataStart
    if (ver >= 3) {
      const data = lines.slice(2).join('\n')
      if (String(checksum(data)) !== lines[1]) { console.warn('存档校验失败'); return null }
      uuid = lines[2]; active = parseInt(lines[3]) || 0
      let inv = { herbs: 3, revives: 1, charms: 2 }
      if (ver >= 5) {
        inv = { herbs: parseInt(lines[4])||0, revives: parseInt(lines[5])||0, charms: parseInt(lines[6])||0 }
        dataStart = 7
      } else { dataStart = 4 }
      const n = ver >= 4 ? 7 : 6
      const r = []
      for (let i = dataStart; i + n - 1 < lines.length; i += n) {
        r.push({
          n: lines[i], e: lines[i+1],
          hp: parseInt(lines[i+2]), atk: parseInt(lines[i+3]),
          lv: parseInt(lines[i+4]), cur_hp: parseInt(lines[i+5]),
          el: ver >= 4 ? (parseInt(lines[i+6]) || 0) : 4
        })
      }
      return { uuid, active, inv, pets: r }
    }
  } catch { return null }
  return null
}

export function saveGame(pets, exports) {
  const h = exports.get_herbs ? exports.get_herbs() : 3
  const r = exports.get_revives ? exports.get_revives() : 1
  const c = exports.get_charms ? exports.get_charms() : 2
  const data = `${getUUID()}\n${exports.get_active()}\n${h}\n${r}\n${c}\n` +
    pets.map(p => `${p.n}\n${p.e}\n${p.hp}\n${p.atk}\n${p.lv}\n${p.cur_hp}\n${p.el ?? 4}`).join('\n') + '\n'
  localStorage.setItem(SAVE_KEY, `5\n${checksum(data)}\n${data}`)
}
