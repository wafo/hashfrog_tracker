import { useContext, useReducer, createContext, useMemo } from "react";
import locationsJSON from "../data/locations.json";
import checksJSON from "../data/checks.json";
import itemsJSON from "../data/items.json";
import { useEffect } from "react";
import { cleanJSONString } from "../utils/utils";
import hash from "hash-it";
import lss from "localstorage-slim";

// This imitates the LogicHelpers.json from the OoT-Randomizer repo
// Will allow us to then consume the other logic files and make the assertions
// prettier-ignore
const logicHelper = (itemsArray, settings) => {
  const _ = itemsJSON;
  const s = settings;
  // TODO: Need to fix all the settings assertions since my version was different than what ootr returns.

  const items = itemsArray.reduce((accumulator, item_uuid) => {
    const [key, value] = Object.entries(itemsJSON).find(([key]) => itemsJSON[key] === item_uuid);
    accumulator[key] = value;
    return accumulator;
  }, {});

  // All the assertions for the helper. h = helper
  let h = {};

  h["is_child"] = true; // s.age === "child", // Override al age requirements for simplicity
  h["is_adult"] = true; // s.age == "adult", // Override al age requirements for simplicity

  function can_play(song) {
    if (
      (s.shuffle_ocarinas && (!!items.progressive_ocarina_1 || !!items.progressive_ocarina_2))
      || !s.shuffle_ocarinas
    ) {
      if (!!items[song] || song === _.song_scarecrow) return true;
    }
    return false;
  }

  function can_use(item) {
    const scarecrow = !!items.progressive_hookshot_1 && can_play(_.song_scarecrow);
    const distant_scarecrow = !!items.progressive_hookshot_2 && can_play(_.song_scarecrow);

    const is_magic_item = (item) => item === _.dins_fire || item === _.farores_wind || item === _.nayrus_love || item === _.lens;
    const is_adult_item = (item) => item === _.bow || item === _.megaton_hammer || item === _.boots_iron || item === _.boots_hover || item === _.progressive_hookshot_1 || item === _.progressive_hookshot_2 || item === _.progressive_strength_2 || item === _.progressive_strength_2 || item === _.tunic_goron || item === _.tunic_zora || item === scarecrow || item === distant_scarecrow || item === _.shield_mirror;
    const is_child_item = (item) => item === _.slingshot || item === _.boomerang || item === _.sword_kokiri || item === _.sticks || item === _.shield_deku;
    const is_magic_arrow = (item) => item === _.arrows_fire || item === _.arrows_light || (s.blue_fire_arrows && item === _.arrows_ice);

    return (
      (is_magic_item(item) && !!items[item] && (!!items.progressive_magic_1 || !!items.progressive_magic_2))
      || (is_adult_item(item) && h.is_adult && !!items[item])
      || (is_child_item(item) && h.is_child && !!items[item])
      || (is_magic_arrow(item) && h.is_adult && !!items[item] && !!items.bow && (!!items.progressive_magic_1 || !!items.progressive_magic_2))
    )
  }

  function has_projectile(for_age) {
    return (
      h.has_explosives
      || (for_age === "child" && (items.slingshot || items.boomerang))
      || (for_age === "adult" && (items.bow || (items.progressive_hookshot_1 || items.progressive_hookshot_2)))
      || (for_age === "both" && ((items.slingshot || items.boomerang) && (items.bow || (items.progressive_hookshot_1 || items.progressive_hookshot_2))))
      || (for_age === "either" && (items.slingshot || items.boomerang || items.bow || (items.progressive_hookshot_1 || items.progressive_hookshot_2)))
    );
  }

  function at(location, condition) {
    // No idea
    return false;
  }

  function has_stones(stones) {
    // No idea
    return false;
  }

  function has_medallions(medallions) {
    // No idea
    return false;
  }

  function has_dungeon_rewards(rewards) {
    // No idea
    return false;
  }

  function has_hearts(hearts) {
    // No idea
    return false;
  }

  function region_has_shortcuts(region) {
    // No idea
    return false;
  }

  const warp_songs = [_.song_minuet, _.song_bolero, _.song_serenade, _.song_nocturne, _.song_requiem, _.song_prelude];

  // Bridge Requirements
  h["has_all_stones"] = !!items.stone_kokiri && !!items.stone_goron && !!items.stone_zora;
  h["has_all_medallions"] = !!items.medallion_green && !!items.medallion_red && !!items.medallion_blue && !!items.medallion_purple && !!items.medallion_orange && !!items.medallion_yellow;
  h["can_build_rainbow_bridge"] = (
    (s.bridge === "open") ||
    (s.bridge === "vanilla" && !!items.medallion_purple && !!items.medallion_orange && !!items.arrows_light) ||
    (s.bridge === "stones" && has_stones(s.bridge_stones)) ||
    (s.bridge === "medallions" && has_medallions(s.bridge_medallions)) ||
    (s.bridge === "dungeons" && has_dungeon_rewards(s.bridge_rewards)) ||
    (s.bridge === "tokens" && h.Gold_Skulltula_Token === s.bridge_tokens) ||
    (s.bridge === "hearts" && has_hearts(s.bridge_hearts))
  );
  h["can_trigger_lacs"] = (
    (s.lacs_condition === "vanilla" && !!items.medallion_purple && !!items.medallion_orange) ||
    (s.lacs_condition === "stones" && has_stones(s.lacs_stones)) ||
    (s.lacs_condition === "medallions" && has_medallions(s.lacs_medallions)) ||
    (s.lacs_condition === "dungeons" && has_dungeon_rewards(s.lacs_rewards)) ||
    (s.lacs_condition === "tokens" && h.Gold_Skulltula_Token === s.lacs_tokens) ||
    (s.lacs_condition === "hearts" && has_hearts(s.lacs_hearts))
  )
  h["can_receive_ganon_bosskey"] = (
    (s.shuffle_ganon_bosskey === "stones" && has_stones(s.ganon_bosskey_stones)) ||
    (s.shuffle_ganon_bosskey === "medallions" && has_medallions(s.ganon_bosskey_medallions)) ||
    (s.shuffle_ganon_bosskey === "dungeons" && has_dungeon_rewards(s.ganon_bosskey_rewards)) ||
    (s.shuffle_ganon_bosskey === "tokens" && h.Gold_Skulltula_Token === s.ganon_bosskey_tokens) ||
    (s.shuffle_ganon_bosskey === "hearts" && has_hearts(s.ganon_bosskey_hearts))
  ) || (
    s.shuffle_ganon_bosskey !== "stones" && s.shuffle_ganon_bosskey !== "medallions" &&
    s.shuffle_ganon_bosskey !== "dungeons" && s.shuffle_ganon_bosskey !== "tokens" &&
    s.shuffle_ganon_bosskey !== "hearts"
  );
  // Abilities ??
  h["has_explosives"] = !!items.bombs || (s.bombchus_in_logic && h.has_bombchus);
  h["can_dive"] = !!items.progressive_scale_1 || !!items.progressive_scale_2;
  h["Epona"] = can_play(_.song_epona); // && no setting that messes this up ??
  // Could not find how the OoT-Randomizer repo defines some of these.
  // Added my own logic, tho they might break under specific rulesets
  h["Deliver_Letter"] = !!items.rutos_letter && ((h.has_explosives && (can_play(_.song_lullaby) || (h.is_child && s.logic_zora_with_cucco))) || (h.is_child && h.can_dive));
  h["Buy_Goron_Tunic"] = h.is_adult && (!!items.progressive_wallet_1 || !!items.progressive_wallet_2);
  h["Buy_Zora_Tunic"] = h.is_adult && !!items.progressive_wallet_2;
  h["Buy_Deku_Shield"] = true;
  h["Buy_Hylian_Shield"] = true;
  h["Buy_Deku_Nut_5"] = true;
  h["Buy_Deku_Nut_10"] = true;
  h["Deku_Nut_Drop"] = true;
  h["Buy_Deku_Stick_1"] = true;
  h["Deku_Stick_Drop"] = true;
  h["Buy_Bottle_Bug"] = !!items.bottle; // Asume normal shop logic ??
  h["Bugs"] = !!h.Buy_Bottle_Bug || !!items.bottle;
  h["Buy_Blue_Fire"] = !!items.bottle && !!items.progressive_wallet_2; // Asume normal shop logic ??
  h["Blue_Fire"] = h.Buy_Blue_Fire || (!!items.bottle && (
    ((can_play(_.song_lullaby) || (!!items.boots_hover && s.logic_zora_with_hovers)) && (h.Deliver_Letter || s.zora_fountain === "open" || (s.zora_fountain === "adult" && h.is_adult) || (s.logic_king_zora_skip && h.is_adult)))
    || h.can_build_rainbow_bridge
  ));
  h["Buy_Fish"] = !!items.bottle; // Asume normal shop logic ??
  h["Fish"] = !!h.Buy_Fish || !!items.bottle;
  h["Buy_Fairys_Spirit"] = !!items.bottle; // Asume normal shop logic ??
  h["Fairy"] = !!h.Buy_Fairys_Spirit || !!items.bottle;
  h["Big_Poe"] = h.is_adult && !!items.bottle && !!items.bow && h.Epona;
  // TODO: Fix bombchu buying
  h["Buy_Bombchu_5"] = h.is_child && (!!items.bombs || s.bombchus_in_logic);
  h["Buy_Bombchu_10"] = (h.is_child && (!!items.bombs || s.bombchus_in_logic)) || (h.is_adult && (!!items.progressive_wallet_1 || !!items.progressive_wallet_2));
  h["Buy_Bombchu_20"] = h.is_child && (!!items.bombs || s.bombchus_in_logic);
  h["Bombchu_Drop"] = true; // No idea what bombchu drop is. Is it a setting ??
  h["Bombchus_5"] = !!items.bombchus;
  h["Bombchus_10"] = !!items.bombchus;
  h["Bombchus_20"] = !!items.bombchus;
  h["Deku_Tree_Clear"] = true; // ?? Not sure how to track this one
  h["Stop_GC_Rolling_Goron_Adult"] = true; // ?? Not sure how to track this one
  h["not_warp_songs"] = !itemsArray.some(item => warp_songs.includes(item));
  // Counters
  h["Small_Key_Thieves_Hideout"] = 9;
  h["Gold_Skulltula_Token"] = 0;
  // items & Equipments
  h["Hookshot"] = !!items.progressive_hookshot_1 || !!items.progressive_hookshot_2;
  h["Longshot"] = !!items.progressive_hookshot_2;
  h["Silver_Gauntlets"] = !!items.progressive_strength_2 || !!items.progressive_strength_3;
  h["Golden_Gauntlets"] = !!items.progressive_strength_3;
  h["Scarecrow"] = !!items.progressive_hookshot_1 && can_play(_.song_scarecrow);
  h["Distant_Scarecrow"] = !!items.progressive_hookshot_2 && can_play(_.song_scarecrow);
  h["Goron_Tunic"] = !!items.tunic_goron || h.Buy_Goron_Tunic;
  h["Zora_Tunic"] = !!items.tunic_zora || h.Buy_Zora_Tunic;
  h["Ocarina"] = !!items.progressive_ocarina_1 || !!items.progressive_ocarina_2;
  h["Bow"] = !!items.bow;
  h["Slingshot"] = !!items.slingshot;
  h["Bombs"] = !!items.bombs;
  h["Deku_Shield"] = h.Buy_Deku_Shield;
  h["Hylian_Shield"] = h.Buy_Hylian_Shield;
  h["Nuts"] = h.Buy_Deku_Nut_5 || h.Buy_Deku_Nut_10 || h.Deku_Nut_Drop;
  h["Sticks"] = h.Buy_Deku_Stick_1 || h.Deku_Stick_Drop;
  // Abilities ?
  h["has_bombchus"] = (h.Buy_Bombchu_5 || h.Buy_Bombchu_10 || h.Buy_Bombchu_20 || h.Bombchu_Drop) && (s.bombchus_in_logic || !!items.bombs);
  h["found_bombchus"] = (s.bombchus_in_logic && (!!items.bombchus || h.Bombchus_5 || h.Bombchus_10 || h.Bombchus_20)) || (!s.bombchus_in_logic &&  !!items.bombs);
  h["is_starting_age"] = true; // s.age === s.starting_age, // Override al age requirements for simplicity
  h["is_glitched"] = s.logic_rules !== "glitchless";
  h["can_blast_or_smash"] = h.has_explosives || can_use(_.megaton_hammer);
  h["can_child_attack"] = h.is_child && (!!items.slingshot || !!items.boomerang || !!items.sticks || !!items.sword_kokiri || h.has_explosives || can_use(_.dins_fire));
  h["can_child_damage"] = h.is_child && (!!items.slingshot || !!items.sticks || !!items.sword_kokiri || h.has_explosives || can_use(_.dins_fire));
  h["can_cut_shrubs"] = h.is_adult || !!items.sticks || !!items.sword_kokiri || !!items.boomerang || h.has_explosives;
  h["can_leave_forest"] = s.open_forest !== "closed" || h.is_adult || h.is_glitched || h.Deku_Tree_Clear;
  h["can_plant_bugs"] = h.is_child && h.Bugs;
  h["can_ride_epona"] = h.is_adult && h.Epona && (can_play(_.song_epona) || (h.is_glitched && h.can_hover));
  h["can_stun_deku"] = h.is_adult || (!!items.slingshot || !!items.boomerang || !!items.sticks || !!items.sword_kokiri || h.has_explosives || can_use(_.dins_fire) ||  !!items.nuts ||  !!items.shield_deku);
  h["can_summon_gossip_fairy"] = h.Ocarina && (can_play(_.song_lullaby) || can_play(_.song_epona) || can_play(_.song_time) || can_play(_.song_suns));
  h["can_summon_gossip_fairy_without_suns"] = h.Ocarina && (can_play(_.song_lullaby) || can_play(_.song_epona) || can_play(_.song_time));
  h["can_take_damage"] = s.damage_multiplier !== "ohko" || h.Fairy || can_use(_.nayrus_love);
  h["can_plant_bean"] = s.plant_beans || (h.is_child && !!items.magic_beans);
  h["can_open_bomb_grotto"] = h.can_blast_or_smash && (!!items.stone_agony || s.logic_grottos_without_agony);
  h["can_open_storm_grotto"] = can_play(_.song_storms) && (!!items.stone_agony || s.logic_grottos_without_agony);
  h["can_use_projectile"] = h.has_explosives || (h.is_adult && (h.Bow || h.Hookshot)) || (h.is_child && (h.Slingshot || !!items.boomerang));
  h["can_bonk_tree"] = s.deadly_bonks !== "ohko" || h.Fairy || can_use(_.nayrus_love);
  h["can_bonk_crate"] = s.deadly_bonks !== "ohko" || h.Fairy || can_use(_.nayrus_love) || h.can_blast_or_smash;
  h["can_bonk_underwater_crate"] = s.deadly_bonks !== "ohko" || h.Fairy || can_use(_.nayrus_love);
  h["can_bonk_heated_crate"] = (s.deadly_bonks !== "ohko" || (h.Fairy && (can_use(_.tunic_goron) || s.damage_multiplier !== "ohko")) || can_use(_.nayrus_love) || h.can_blast_or_smash);
  // Biggoron trade path
  h["guarantee_trade_path"] = s.disable_trade_revert || h.can_blast_or_smash || h.Stop_GC_Rolling_Goron_Adult || (s.logic_dmt_climb_hovers && can_use(_.boots_hover)) || (s.logic_biggoron_bolero && h.not_warp_songs && can_play(_.song_bolero) && at('DMC Central Local', h.Hookshot || can_use(_.boots_hover) || h.can_plant_bean));
  h["guarantee_hint"] = (s.hints === "mask" && !!items.mask_truth) || (s.hints === "agony" && !!items.stone_agony) || (s.hints !== "mask" && s.hints !== "agony");
  h["has_fire_source"] = can_use(_.dins_fire) || can_use(_.arrows_fire);
  h["has_fire_source_with_torch"] = h.has_fire_source || (h.is_child && !!items.sticks);
  // Fortress
  h["can_finish_GerudoFortress"] = (s.gerudo_fortress === "normal" && h.Small_Key_Thieves_Hideout === 4 && (h.is_adult || !!items.sword_kokiri || s.is_glitched) && (h.is_adult && (h.Bow || h.Hookshot || !!items.boots_hover) || !!items.gerudo_card || s.logic_gerudo_kitchen || s.is_glitched)) || (s.gerudo_fortress === "fast" && h.Small_Key_Thieves_Hideout && (h.is_adult || !!items.sword_kokiri || s.is_glitched)) || (s.gerudo_fortress !== "normal" && s.gerudo_fortress !== "fast");
  h["has_shield"] = (h.is_adult && !!items.shield_hylian) || (h.is_child && !!items.shield_deku) // Mirror Shield does not reflect scrub attack.
  h["can_shield"] = (h.is_adult && (!!items.shield_hylian || !!items.shield_mirror)) || (h.is_child && !!items.shield_deku);
  h["can_mega"] = h.has_explosives && h.can_shield;
  h["can_isg"] = h.can_shield && (h.is_adult || !!items.sticks || !!items.sword_kokiri);
  h["can_hover"] = h.can_mega && h.can_isg;
  h["can_weirdshot"] = h.can_mega && (can_use(_.progressive_hookshot_1) || can_use(_.progressive_hookshot_2));
  h["can_jumpslash"] = h.is_adult || !!items.sticks || !!items.sword_kokiri;
  // Dungeon Shortcuts
  h["deku_tree_shortcuts"] = s.dungeon_shortcuts.includes("Deku Tree");
  h["dodongos_cavern_shortcuts"] = s.dungeon_shortcuts.includes("Dodongos Cavern");
  h["jabu_shortcuts"] = s.dungeon_shortcuts.includes("Jabu Jabus Belly");
  h["forest_temple_shortcuts"] = s.dungeon_shortcuts.includes("Forest Temple");
  h["fire_temple_shortcuts"] = s.dungeon_shortcuts.includes("Fire Temple");
  h["shadow_temple_shortcuts"] = s.dungeon_shortcuts.includes("Shadow Temple");
  h["spirit_temple_shortcuts"] = s.dungeon_shortcuts.includes("Spirit Temple");
  h["king_dodongo_shortcuts"] = region_has_shortcuts("King Dodongo Boss Room");

  return {
    ...h,
    can_play,
    can_use,
    has_projectile,
    at,
    has_stones,
    has_medallions,
    has_dungeon_rewards,
    has_hearts,
    region_has_shortcuts,
    warp_songs,
  }
}

const defaultItems = {
  // Songs
  zelda: false,
  epona: false,
  sarias: false,
  sunsong: false,
  storms: false,
  minuet: false,
  bolero: false,
  requiem: false,
  // Items
  sticks: false,
  bombs: false,
  bombchus: false,
  bow: false,
  fire_arrows: false,
  slingshot: false,
  hammer: false,
  hookshot: false,
  longshot: false,
  boomerang: false,
  lens: false,
  beans: false,
  dins: false,
  bottle: false,
  claim_check: false,
  rutos_letter: false,
  // Equipment
  magic: false,
  wallet_1: false,
  wallet_2: false,
  scale: false,
  gold_scale: false,
  gerudo_card: false,
  iron_boots: false,
  hover_boots: false,
  strength_1: false,
  strength_2: false,
  strength_3: false,
  // Medallions
  medallion_green: false,
  medallion_red: false,
  medallion_blue: false,
  medallion_purple: false,
  medallion_orange: false,
  // Extra
  scarecrow: true,
  fire_source: false,
  has_bottle: false,
  dmc_entrance: false,
  domain_child_access: false,
  domain_adult_access: false,
  fountain_child_access: false,
  fountain_adult_access: false,
  fortress_access: false,
  wasteland_access: false,
  colossus_access: false,
};

const TrackerContext = createContext();

function parseItems(items_list) {
  const items = { ...defaultItems };
  items_list.forEach(item => {
    // Songs
    if (item === "2801c2b994864757a2363fbb053076db") items.zelda = true;
    if (item === "96ebae804a3143438c2cfbc7680c464f") items.epona = true;
    if (item === "4fd7fcb8249744d9ba7f0d951df061bf") items.sarias = true;
    if (item === "4cc5a64c593c4e6b8b0ecc8d3dae3230") items.sunsong = true;
    if (item === "60671fe069e54ae38e763652bd7d9d97") items.time = true;
    if (item === "c2b35441c0604a9dbd0d63c9cd6755d9") items.storms = true;
    if (item === "ce1f2799ff1a433ba0bb40fee47e49a1") items.minuet = true;
    if (item === "e4769601bde54324a97704d29ca7f9b3") items.bolero = true;
    if (item === "063dcc22e4f7422b80d7a4679be65db3") items.requiem = true;
    // Items
    if (item === "34b2ad3657e94b75b281cec30e617f37") items.sticks = true;
    if (item === "2fcfafe04ec24a9cb3c2d03c2aa047aa") items.bombs = true;
    if (item === "22512dafa587497f98cd7135903b09c9") items.bombchus = true;
    if (item === "8633e18f860e4eccb821800eeec01c29") items.bow = true;
    if (item === "7c3026558a6b49df97733d13ecc815c7") items.fire_arrows = true;
    if (item === "f6eff46730cf46098deddab9d99d7677") items.slingshot = true;
    if (item === "0baa96ca7e344c86a7086dd11e2d8a74") items.hammer = true;
    if (item === "29e0384c520a4e7dad505b48a2156097") items.hookshot = true;
    if (item === "1c9d61dc0b974a55a17120c81dcfb71b") {
      items.hookshot = true;
      items.longshot = true;
    }
    if (item === "bc6099ef9091404e9b45aea12d4b6b65") items.boomerang = true;
    if (item === "2ac429aee9b5447e827a16e377fb6ce0") items.lens = true;
    if (item === "2e7752ec3fbc4c03b68c5621f853cad3") items.beans = true;
    if (item === "55f6bcc569c14f1293eb50fda76c812d") items.bottle = true;
    if (item === "3b07b8868e7a4e438b5c874a1f0ae677") items.claim_check = true;
    if (item === "a391497285c34d56b762ca84b1450d5d") items.rutos_letter = true;
    if (item === "591d582f479140759fd6501caa23c2f9") items.dins = true;
    // Equipment
    if (item === "cd8c1df30f28430aa622e6abfed3b527") items.scale = true;
    if (item === "5fe58641b313493ea21ffb20bca6cd66") {
      items.scale = true;
      items.gold_scale = true;
    }
    if (item === "7373656ec94f430f8fbf971e53930949") items.gerudo_card = true;
    if (item === "10498d96274048598706264078789899") items.magic = true;
    if (item === "29cddaecf35a49dfb6f80682f69b5df9") items.magic = true;
    if (item === "8bfe80d648134ed9985c6f390bcd48ce") items.wallet_1 = true;
    if (item === "5d029979a4ce402ba09042e0fda97c82") {
      items.wallet_1 = true;
      items.wallet_2 = true;
    }
    if (item === "bad09131f88a440093087e11efc1c8b0") items.iron_boots = true;
    if (item === "33f4bc4c632846bea5fb88573f2f95b2") items.hover_boots = true;
    if (item === "2c5c72812a6b49c68bb49773e6d3dd98") {
      items.iron_boots = true;
      items.hover_boots = true;
    }
    if (item === "5c3d12eba0814d87a362202d03ffcdeb") items.strength_1 = true;
    if (item === "0ff0a90a20d54a42b4fa4721c63d357c") {
      items.strength_1 = true;
      items.strength_2 = true;
    }
    if (item === "e965d22b67474d6a9072c75ddcc50aed") {
      items.strength_1 = true;
      items.strength_2 = true;
      items.strength_3 = true;
    }
    // Medallions
    if (item === "2c592d344777457f87c1507845864418") items.medallion_green = true;
    if (item === "880f118d9f80482cb5e3a5091917d965") items.medallion_red = true;
    if (item === "4e77495743cd44919d4c06061536b445") items.medallion_blue = true;
    if (item === "099497c5610a43659bd2d31aee5d7250") items.medallion_purple = true;
    if (item === "9e57725a38d344cfa2f5ebd41c953c71") items.medallion_orange = true;
  });

  // Extra
  if (items.bombs || items.bow || items.strength_1 || (items.bolero && (items.hover_boots || items.hookshot))) {
    items.dmc_entrance = true;
  }
  if (items.bombs || items.scale) {
    items.beans = true;
  }
  if ((items.zelda && items.bombs) || items.scale) {
    items.domain_child_access = true;
  }
  if (items.zelda) {
    items.domain_adult_access = true;
  }
  if (items.domain_child_access && items.rutos_letter) {
    items.fountain_child_access = true;
  }
  if (items.domain_child_access && items.rutos_letter && items.domain_adult_access) {
    items.fountain_adult_access = true;
  }
  if (items.epona || items.longshot) {
    items.fortress_access = true;
  }
  if (items.fortress_access && (items.hover_boots || items.longshot)) {
    items.wasteland_access = true;
  }
  if ((items.wasteland_access && items.magic && items.lens) || items.requiem) {
    items.colossus_access = true;
  }
  if (items.magic && (items.dins || (items.bow && items.fire_arrows))) {
    items.fire_source = true;
  }
  if (items.bottle || (items.rutos_letter && (items.zelda || items.scale))) {
    items.has_bottle = true;
  }

  return items;
}

const initialState = {
  checks: [...checksJSON],
  locations: [...locationsJSON],
  items: { ...defaultItems },
  items_list: [],
  settings: {}, // TODO: Maybe have some default settings ?
};

function reducer(state, action) {
  const { payload } = action;
  switch (action.type) {
    case "CHECK_MARK": {
      // Finding check
      const checkIndex = state.checks.findIndex(x => x.id === payload);
      if (checkIndex === -1) return state;
      // Manipulating check
      const check = { ...state.checks[checkIndex] };
      check.checked = !check.checked;
      // Manipulating state
      const checks = [...state.checks];
      checks[checkIndex] = { ...check };

      return {
        ...state,
        checks,
      };
    }
    case "ITEM_MARK": {
      const { items, item } = payload;
      // Preping collecting items
      const items_list = [...state.items_list.filter(x => !items.includes(x))];
      if (item) items_list.push(item);
      const parsedItems = parseItems(items_list);
      // Validating checks based on items collected
      let checks = [...state.checks];
      checks = checks.map(check => {
        if (check.condition) {
          check.available = new Function("return " + check.condition)()(parsedItems);
        }
        return check;
      });

      const test = logicHelper(items_list, state.settings);
      console.log(test);

      return {
        ...state,
        items_list,
        items: parsedItems,
        checks,
      };
    }
    case "SETTINGS_SET": {
      return {
        ...state,
        settings: payload,
      };
    }
    default:
      throw new Error();
  }
}

function TrackerProvider(props) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    // TODO: this should come from user input somehow
    const version = "dev_6.2.135";
    const settingsString =
    "BAAKMFQNALH2EAAJARUCSDEAAACAECABLTDDSJFQNACAAUAASAJAESBSAHNCWAG4FMCV4EJD4TCAYEBAAGAXXASHWAJCA";
    // use hash
    const settingsHash = hash({ version, settingsString });

    // check for cache first
    const settings = lss.get(settingsHash);
    if (settings) {
      dispatch({ type: "SETTINGS_SET", payload: settings });
    } else {
      // If not already in cache, check the backend.
      const fetchURL =
        `${process.env.REACT_APP_API_URL}/settings/string?` +
        new URLSearchParams({
          version,
          settingsString,
        });
      fetch(fetchURL)
        .then(response => response.json())
        .then(response => {
          // 86400 seconds == 1 day | the server caches for 1 week from ootr
          lss.set(settingsHash, response.settings, { ttl: 86400 });
          dispatch({ type: "SETTINGS_SET", payload: response.settings });
        })
        .catch(err => console.error(err));
    }
  }, []);

  useEffect(() => {
    fetch("https://raw.githubusercontent.com/TestRunnerSRL/OoT-Randomizer/master/data/LogicHelpers.json")
      .then(response => {
        return response.text();
      })
      .then(response => {
        const jsonString = cleanJSONString(response);
        const parsedJSON = JSON.parse(jsonString);
        console.log(parsedJSON);
        return parsedJSON;
      })
      .catch(err => {
        console.error(err);
      });
  }, []);

  // Implementar local storage?
  return <TrackerContext.Provider value={{ state, dispatch }} {...props} />;
}

const useTracker = () => useContext(TrackerContext);

const useChecks = () => {
  const {
    state: { checks, locations, items },
  } = useTracker();

  return {
    checks,
    locations,
    items,
  };
};

const useCheck = () => {
  const { dispatch } = useTracker();

  const actions = useMemo(
    () => ({
      markCheck: id => dispatch({ type: "CHECK_MARK", payload: id }),
    }),
    [dispatch],
  );

  return [actions];
};

const useItem = () => {
  const { dispatch } = useTracker();

  const actions = useMemo(
    () => ({
      markItem: (items, item) => dispatch({ type: "ITEM_MARK", payload: { items, item } }),
    }),
    [dispatch],
  );

  return actions;
};

export { TrackerProvider, useTracker, useChecks, useCheck, useItem };
