import LogicHelper from "./logic-helper";

const SETTING_DEFAULTS = {
  dungeon_shortcuts_choice: "off",
  dungeon_shortcuts: [],
  mq_dungeons_mode: "vanilla",
  mq_dungeons_specific: [],
  mq_dungeons_count: 0,
  shuffle_ganon_bosskey: "vanilla",
  gerudo_fortress: "fast",
  shuffle_gerudo_fortress_heart_piece: "remove",
  shopsanity: "off",
  tokensanity: "off",
  shuffle_scrubs: "off",
  shuffle_child_trade: [],
  adult_trade_shuffle: false,
  adult_trade_start: [],
  shuffle_freestanding_items: "off",
  shuffle_pots: "off",
  shuffle_crates: "off",
  shuffle_cows: false,
  shuffle_beehives: false,
  shuffle_wonderitems: false,
  shuffle_kokiri_sword: true,
  shuffle_ocarinas: false,
  shuffle_gerudo_card: false,
  shuffle_beans: false,
  shuffle_expensive_merchants: false,
  shuffle_frog_song_rupees: false,
  shuffle_100_skulltula_rupee: false,
  shuffle_loach_reward: "off",
  shuffle_dungeon_rewards: "reward",
  shuffle_smallkeys: "dungeon",
  shuffle_hideoutkeys: "vanilla",
  shuffle_tcgkeys: "vanilla",
  shuffle_bosskeys: "dungeon",
  shuffle_silver_rupees: "vanilla",
  disabled_locations: [],
};

function getSetting(name) {
  const value = LogicHelper.settings?.[name];
  if (value !== undefined && value !== null) {
    return value;
  }
  return SETTING_DEFAULTS[name];
}

function getRenamedAttribute(name, defaultValue = false) {
  return LogicHelper.renamedAttributes?.[name] ?? defaultValue;
}

export { getRenamedAttribute, getSetting, SETTING_DEFAULTS };
