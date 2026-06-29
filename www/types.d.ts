// types.d.ts — 游戏数据类型定义

/** 宠物数据 */
interface Pet {
  id: number;
  n: string;       // 名字
  e: string;       // emoji
  hp: number;      // 最大HP
  atk: number;     // 攻击
  def: number;     // 防御
  agi: number;     // 敏捷
  lv: number;      // 等级
  exp: number;     // 经验
  cur_hp: number;  // 当前HP
  el: number;      // 元素 (0=金 1=木 2=土 3=水 4=火)
}

/** 道具库存 */
interface Inventory {
  herbs: number;
  revives: number;
  charms: number;
  great_charms: number;
  herb50: number;
  herb_half: number;
  herb_full: number;
  revive_full: number;
}

/** 存档数据 */
interface SaveData {
  uuid: string;
  active: number;
  inv: Inventory;
  pets: Pet[];
  stored: Pet[];
}

/** WASM 导出接口 */
interface WasmExports {
  // 初始化
  new_game(): void;
  start_battle(loc: number): boolean;
  commit_battle(): void;
  // 战斗
  player_attack(): void;
  elemental_skill(): void;
  run_away(): void;
  switch_pet(idx: number): boolean;
  // 道具
  use_herb(): boolean;
  use_herb_on(idx: number): boolean;
  use_herb50(): boolean;
  use_herb50_on(idx: number): boolean;
  use_herb_half(): boolean;
  use_herb_half_on(idx: number): boolean;
  use_herb_full(): boolean;
  use_herb_full_on(idx: number): boolean;
  use_revive(idx: number): boolean;
  use_revive_full(idx: number): boolean;
  use_charm(): boolean;
  use_great_charm(): boolean;
  // 道具 getter
  get_herbs(): number;
  get_revives(): number;
  get_charms(): number;
  get_great_charms(): number;
  get_herb50(): number;
  get_herb_half(): number;
  get_herb_full(): number;
  get_revive_full(): number;
  // 道具 adder
  add_herbs(n: number): void;
  add_revives(n: number): void;
  add_charms(n: number): void;
  add_great_charms(n: number): void;
  add_herb50(n: number): void;
  add_herb_half(n: number): void;
  add_herb_full(n: number): void;
  add_revive_full(n: number): void;
  // HP 操作
  heal_active(n: number): void;
  heal_active_full(): void;
  revive_one(): boolean;
  hurt_active(n: number): void;
  heal_all(n: number): void;
  hurt_all(n: number): void;
  // 宠物管理
  clear_pets(): void;
  reset_next_id(v: number): void;
  add_pet(hp: number, atk: number, def: number, agi: number, lv: number, exp: number, cur_hp: number, el: number): number;
  add_pet_with_id(id: number, hp: number, atk: number, def: number, agi: number, lv: number, exp: number, cur_hp: number, el: number): number;
  set_active(idx: number): void;
  get_active(): number;
  release_pet(idx: number): boolean;
  release_stored_pet(idx: number): boolean;
  reorder_owned(from: number, to: number): boolean;
  reorder_stored(from: number, to: number): boolean;
  store_pet(idx: number): boolean;
  withdraw_pet(idx: number): boolean;
  auto_switch_active(): void;
  recover_after_defeat(): void;
  // 玩家 getter
  get_player_hp(): number;
  get_player_max_hp(): number;
  get_player_atk(): number;
  get_player_element(): number;
  get_skill_cooldown(): number;
  has_other_pet(): boolean;
  all_fainted(): boolean;
  // 敌人 getter
  get_enemy_hp(): number;
  get_enemy_max_hp(): number;
  get_enemy_lv(): number;
  get_enemy_def(): number;
  get_enemy_agi(): number;
  get_enemy_name(): number;
  get_enemy_emoji(): number;
  get_enemy_element(): number;
  // 拥有宠物 getter
  get_owned_count(): number;
  get_owned_name(i: number): number;
  get_owned_emoji(i: number): number;
  get_owned_hp(i: number): number;
  get_owned_atk(i: number): number;
  get_owned_def(i: number): number;
  get_owned_agi(i: number): number;
  get_owned_lv(i: number): number;
  get_owned_exp(i: number): number;
  get_owned_id(i: number): number;
  get_owned_cur_hp(i: number): number;
  get_owned_element(i: number): number;
  // 寄存宠物 getter
  get_stored_count(): number;
  get_stored_name(i: number): number;
  get_stored_emoji(i: number): number;
  get_stored_hp(i: number): number;
  get_stored_atk(i: number): number;
  get_stored_def(i: number): number;
  get_stored_agi(i: number): number;
  get_stored_lv(i: number): number;
  get_stored_exp(i: number): number;
  get_stored_id(i: number): number;
  get_stored_cur_hp(i: number): number;
  get_stored_element(i: number): number;
  // 结果 getter
  get_last_message(): number;
  get_last_message2(): number;
  get_last_damage_dealt(): number;
  get_last_damage_taken(): number;
  get_last_catch_success(): boolean;
  get_last_catch_rate(): number;
  get_last_player_defeated(): boolean;
  get_last_enemy_defeated(): boolean;
  get_last_exp_gained(): number;
  get_last_leveled_up(): boolean;
  get_last_dodged(): boolean;
  // 其他
  exp_to_next(lv: number): number;
  get_max_level(): number;
  get_max_pets(): number;
  get_max_stored(): number;
  export_save(): number;
  place_event(etype: number, x: number, y: number): void;
  clear_event(): void;
  get_event_active(): boolean;
  get_event_type(): number;
  get_event_x(): number;
  get_event_y(): number;
  boost_enemy(hp_pct: number, atk_pct: number): void;
  memory: WebAssembly.Memory;
}

/** 游戏上下文 */
interface GameContext {
  exports: WasmExports;
  ds: (ptr: number) => string;
  $: (id: string) => HTMLElement | null;
  pets: ReturnType<typeof import("./pets.js").createPets>;
  pokedex: ReturnType<typeof import("./pokedex.js").createPokedex>;
  ui: ReturnType<typeof import("./ui.js").createUI>;
  syncFromMoonBit: () => void;
  syncBattleUI: () => void;
  exitBattle: () => void;
  trySpawnSpecial: () => void;
  saveGame: (pets: Pet[], stored: Pet[]) => void;
}
