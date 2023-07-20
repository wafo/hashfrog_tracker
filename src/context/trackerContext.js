import _ from "lodash";
import { createContext, useContext, useMemo, useReducer } from "react";

import DEFAULT_ITEMS from "../data/default-items.json";
import ITEMS_JSON from "../data/items.json";
import SettingStringsJSON from "../data/setting-strings.json";
import Locations from "../utils/locations";
import LogicHelper from "../utils/logic-helper";

const GENERATOR_VERSION = process.env.REACT_APP_GENERATOR_VERSION;

const TrackerContext = createContext();

function parseItems(items_list, counters, unchanged_starting_inventory) {
  const items = _.cloneDeep(DEFAULT_ITEMS);

  // Parse items
  _.forEach(_.union(_.values(items_list), unchanged_starting_inventory), item => {
    switch (item) {
      case "c50e8543ab0c4bdaa8a23e6a80ae6d1c":
        // ignore Master Sword
        break;
      case "bc6099ef9091404e9b45aea12d4b6b65":
        items.Boomerang = 1;
        break;
      case "2ac429aee9b5447e827a16e377fb6ce0":
        items.Lens_of_Truth = 1;
        break;
      case "0baa96ca7e344c86a7086dd11e2d8a74":
        items.Megaton_Hammer = 1;
        break;
      case "55f6bcc569c14f1293eb50fda76c812d":
        items.Bottle = 1;
        break;
      case "a391497285c34d56b762ca84b1450d5d":
        items.Rutos_Letter = 1;
        break;
      case "2e7752ec3fbc4c03b68c5621f853cad3":
        items.Magic_Bean = 10;
        break;
      case "a54955e5bcfd4fcd921062b5e298b137":
        items.Skull_Mask = 1;
        break;
      // Spooky_Mask: 0,
      // Keaton_Mask: 0,
      // Bunny_Hood: 0,
      // Mask_of_Truth: 0,
      // Pocket_Egg: 0,
      // Pocket_Cucco: 0,
      // Odd_Mushroom: 0,
      // Odd_Potion: 0,
      // Poachers_Saw: 0,
      // Broken_Sword: 0,
      // Prescription: 0,
      // Eyeball_Frog: 0,
      // Eyedrops: 0,
      case "3b07b8868e7a4e438b5c874a1f0ae677":
        items.Claim_Check = 1;
        break;
      case "b29ac88a18d646ce82b8b2e4752f8b30":
        items.Kokiri_Sword = 1;
        break;
      // Giants_Knife: 0,
      case "06c4c254730149bd93bdd297f1a3b309":
        items.Deku_Shield = 1;
        break;
      case "b4de2eabed4f40cea8661971a17d996e":
        items.Hylian_Shield = 1;
        break;
      case "e0079e25283148f9a20fd43bf34d1f97":
        items.Mirror_Shield = 1;
        break;
      case "cd6a55f0253f45159521efb2b3b515e8":
        items.Goron_Tunic = 1;
        break;
      case "c562c7418d7141ffb70101509a52873e":
        items.Zora_Tunic = 1;
        break;
      case "d9233a5054af4491924115b47e5730e4":
        items.Goron_Tunic = 1;
        items.Zora_Tunic = 1;
        break;
      case "bad09131f88a440093087e11efc1c8b0":
        items.Iron_Boots = 1;
        break;
      case "33f4bc4c632846bea5fb88573f2f95b2":
        items.Hover_Boots = 1;
        break;
      case "2c5c72812a6b49c68bb49773e6d3dd98":
        items.Iron_Boots = 1;
        items.Hover_Boots = 1;
        break;
      case "fd2404a34fb142eb9be49cee8f4d3a38":
        items.Stone_of_Agony = 1;
        break;
      case "7373656ec94f430f8fbf971e53930949":
        items.Gerudo_Membership_Card = 1;
        break;
      // Weird_Egg: 0,
      case "5196e02aafac4b39b12ff1dc7bd5cb1c":
        items.Biggoron_Sword = 1;
        break;
      case "7c3026558a6b49df97733d13ecc815c7":
        items.Fire_Arrows = 1;
        break;
      case "9bc4daf5728f4b158dc4c3d768df006e":
        items.Ice_Arrows = 1;
        break;
      case "4a3433d7792f408b80e2f07caae43da2":
        items.Fire_Arrows = 1;
        items.Ice_Arrows = 1;
        break;
      case "ff67e2e04ce04aa8add77658ee932802":
        items.Light_Arrows = 1;
        break;
      case "ea2dfcbb008248e790b785941d54027d":
        items.Fire_Arrows = 1;
        items.Light_Arrows = 1;
        break;
      case "591d582f479140759fd6501caa23c2f9":
        items.Dins_Fire = 1;
        break;
      case "aa4bc05fa49d4492bb8df02617ad1da4":
        items.Nayrus_Love = 1;
        break;
      case "0c3e8979165042f686357b4bcbaab8ec":
        items.Farores_Wind = 1;
        break;
      case "76d769ba496e49ebb39fbfd836ce1db6":
        items.Dins_Fire = 1;
        items.Farores_Wind = 1;
        break;
      case "29e0384c520a4e7dad505b48a2156097":
        items.Progressive_Hookshot = 1;
        break;
      case "1c9d61dc0b974a55a17120c81dcfb71b":
        items.Progressive_Hookshot = 2;
        break;
      case "5c3d12eba0814d87a362202d03ffcdeb":
        items.Progressive_Strength_Upgrade = 1;
        break;
      case "0ff0a90a20d54a42b4fa4721c63d357c":
        items.Progressive_Strength_Upgrade = 2;
        break;
      case "e965d22b67474d6a9072c75ddcc50aed":
        items.Progressive_Strength_Upgrade = 3;
        break;
      case "2fcfafe04ec24a9cb3c2d03c2aa047aa":
        items.Bomb_Bag = 1;
        break;
      case "8633e18f860e4eccb821800eeec01c29":
        items.Bow = 1;
        break;
      case "f6eff46730cf46098deddab9d99d7677":
        items.Slingshot = 1;
        break;
      case "8bfe80d648134ed9985c6f390bcd48ce":
        items.Progressive_Wallet = 1;
        break;
      case "5d029979a4ce402ba09042e0fda97c82":
        items.Progressive_Wallet = 2;
        break;
      case "cd8c1df30f28430aa622e6abfed3b527":
        items.Progressive_Scale = 1;
        break;
      case "5fe58641b313493ea21ffb20bca6cd66":
        items.Progressive_Scale = 2;
        break;
      case "73a0f3f5688745a8bb4a0973d9858960":
        items.Deku_Nut_Capacity = 1;
        break;
      case "34b2ad3657e94b75b281cec30e617f37":
        items.Deku_Stick_Capacity = 1;
        break;
      case "22512dafa587497f98cd7135903b09c9":
        {
          items.Bombchus_10 = 1;
          items.Bombchus_5 = 1;
          items.Bombchus_20 = 1;
          items.Bombchus = 1;
        }
        break;
      case "10498d96274048598706264078789899":
        items.Magic_Meter = 1;
        break;
      case "29cddaecf35a49dfb6f80682f69b5df9":
        items.Magic_Meter = 2;
        break;
      case "7d8f399f6ef848e0bfba61d7ba31d1ff":
      case "6240defb8f6044d984476dc0b0467f74":
        items.Ocarina = 1;
        break;
      case "28bfbeeeaaf54dc99e66244bd8ba4aa3":
        items.Bottle_with_Big_Poe = 1;
        break;
      case "7abace900d644493be25c03dddd9cb88":
        items.Boss_Key_Forest_Temple = 1;
        break;
      case "d588b4fb40ed4e7faf65bca60d1cb37c":
        items.Boss_Key_Fire_Temple = 1;
        break;
      case "b4f7b0ee98ac47eaa0b13318444ba072":
        items.Boss_Key_Water_Temple = 1;
        break;
      case "a99ecea2404a4337b829e88e0907d13f":
        items.Boss_Key_Spirit_Temple = 1;
        break;
      case "97b028f54e82473a9960f608a5789f18":
        items.Boss_Key_Shadow_Temple = 1;
        break;
      case "adbe6c6ffbd34a0f8eb3de9611edb8be":
        items.Boss_Key_Ganons_Castle = 1;
        break;
      // Double_Defense: 0,
      case "c085e07008924d9383453da94570846f":
        items.Zeldas_Letter = 1;
        break;

      case "6466793887f9475685558adbae2a4b3e":
        items.Ocarina_A_Button = 1;
        break;
      case "5598cc877c91426ab4ec083fccb7c22b":
        items.Ocarina_C_up_Button = 1;
        break;
      case "506b5e53591b430cbf45855088bfae1b":
        items.Ocarina_C_down_Button = 1;
        break;
      case "9ffc29578f514202a80fa5278a3bd281":
        items.Ocarina_C_left_Button = 1;
        break;
      case "2d85db579f3c4be49bf48d4853d112e7":
        items.Ocarina_C_right_Button = 1;
        break;

      case "ce1f2799ff1a433ba0bb40fee47e49a1":
        items.Minuet_of_Forest = 1;
        break;
      case "e4769601bde54324a97704d29ca7f9b3":
        items.Bolero_of_Fire = 1;
        break;
      case "daf9dc01414741aa9549f719abbabd54":
        items.Serenade_of_Water = 1;
        break;
      case "063dcc22e4f7422b80d7a4679be65db3":
        items.Requiem_of_Spirit = 1;
        break;
      case "8091c91b7f244e16a8f8a1bca80194b1":
        items.Nocturne_of_Shadow = 1;
        break;
      case "c7244845fa1642a8bd8dd2a4291ddad6":
        items.Prelude_of_Light = 1;
        break;
      case "2801c2b994864757a2363fbb053076db":
        items.Zeldas_Lullaby = 1;
        break;
      case "96ebae804a3143438c2cfbc7680c464f":
        items.Eponas_Song = 1;
        break;
      case "4fd7fcb8249744d9ba7f0d951df061bf":
        items.Sarias_Song = 1;
        break;
      case "4cc5a64c593c4e6b8b0ecc8d3dae3230":
        items.Suns_Song = 1;
        break;
      case "60671fe069e54ae38e763652bd7d9d97":
        items.Song_of_Time = 1;
        break;
      case "c2b35441c0604a9dbd0d63c9cd6755d9":
        items.Song_of_Storms = 1;
        break;

      case "cc6b276898a04ec7888e0887ca22db9c":
        items.Kokiri_Emerald = 1;
        break;
      case "a503af4ff2bb4198abe10d2843dab433":
        items.Goron_Ruby = 1;
        break;
      case "15d079b7d8714b79ab637d2b71418d54":
        items.Zora_Sapphire = 1;
        break;
      case "2c592d344777457f87c1507845864418":
        items.Forest_Medallion = 1;
        break;
      case "880f118d9f80482cb5e3a5091917d965":
        items.Fire_Medallion = 1;
        break;
      case "4e77495743cd44919d4c06061536b445":
        items.Water_Medallion = 1;
        break;
      case "099497c5610a43659bd2d31aee5d7250":
        items.Spirit_Medallion = 1;
        break;
      case "9e57725a38d344cfa2f5ebd41c953c71":
        items.Shadow_Medallion = 1;
        break;
      case "c18df5764dd54f82802986fd102e42d7":
        items.Light_Medallion = 1;
        break;

      default:
        console.warn(`Did not set unknown item: ${item}`);
    }
  });

  // Parse counters
  _.forEach(counters, (value, counter) => {
    switch (counter) {
      case "gold_skulls":
        items.Gold_Skulltula_Token = value;
        break;

      case "bottle_counter":
        items.Bottle = value;
        break;

      case "keys_tcg":
        items.Small_Key_Treasure_Chest_Game = value;
        break;
      case "keys_forest":
        items.Small_Key_Forest_Temple = value;
        break;
      case "keys_fire":
        items.Small_Key_Fire_Temple = value;
        break;
      case "keys_water":
        items.Small_Key_Water_Temple = value;
        break;
      case "keys_spirit":
        items.Small_Key_Spirit_Temple = value;
        break;
      case "keys_shadow":
        items.Small_Key_Shadow_Temple = value;
        break;
      case "keys_botw":
        items.Small_Key_Bottom_of_the_Well = value;
        break;
      case "keys_gtg":
        items.Small_Key_Gerudo_Training_Ground = value;
        break;
      case "keys_th":
        items.Small_Key_Thieves_Hideout = value;
        break;
      case "keys_ganons":
        items.Small_Key_Ganons_Castle = value;
        break;

      case "srup_dc":
        items.Silver_Rupee_Dodongos_Cavern_Staircase = value;
        break;
      case "srup_ice_scythe":
        items.Silver_Rupee_Ice_Cavern_Spinning_Scythe = value;
        break;
      case "srup_ice_block":
        items.Silver_Rupee_Ice_Cavern_Push_Block = value;
        break;
      case "srup_botw":
        items.Silver_Rupee_Bottom_of_the_Well_Basement = value;
        break;
      case "srup_shadow_scythe":
        items.Silver_Rupee_Shadow_Temple_Scythe_Shortcut = value;
        break;
      case "srup_shadow_blades":
        items.Silver_Rupee_Shadow_Temple_Invisible_Blades = value;
        break;
      case "srup_shadow_pit":
        items.Silver_Rupee_Shadow_Temple_Huge_Pit = value;
        break;
      case "srup_shadow_spikes":
        items.Silver_Rupee_Shadow_Temple_Invisible_Spikes = value;
        break;
      case "srup_gtg_slopes":
        items.Silver_Rupee_Gerudo_Training_Ground_Slopes = value;
        break;
      case "srup_gtg_lava":
        items.Silver_Rupee_Gerudo_Training_Ground_Lava = value;
        break;
      case "srup_gtg_water":
        items.Silver_Rupee_Gerudo_Training_Ground_Water = value;
        break;
      case "srup_spirit_child":
        items.Silver_Rupee_Spirit_Temple_Child_Early_Torches = value;
        break;
      case "srup_spirit_boulders":
        items.Silver_Rupee_Spirit_Temple_Adult_Boulders = value;
        break;
      case "srup_spirit_lobby":
        items.Silver_Rupee_Spirit_Temple_Lobby_and_Lower_Adult = value;
        break;
      case "srup_spirit_sun":
        items.Silver_Rupee_Spirit_Temple_Sun_Block = value;
        break;
      case "srup_spirit_climb":
        items.Silver_Rupee_Spirit_Temple_Adult_Climb = value;
        break;
      case "srup_ganons_spirit":
        items.Silver_Rupee_Ganons_Castle_Spirit_Trial = value;
        break;
      case "srup_ganons_light":
        items.Silver_Rupee_Ganons_Castle_Light_Trial = value;
        break;
      case "srup_ganons_fire":
        items.Silver_Rupee_Ganons_Castle_Fire_Trial = value;
        break;
      case "srup_ganons_shadow":
        items.Silver_Rupee_Ganons_Castle_Shadow_Trial = value;
        break;
      case "srup_ganons_water":
        items.Silver_Rupee_Ganons_Castle_Water_Trial = value;
        break;
      case "srup_ganons_forest":
        items.Silver_Rupee_Ganons_Castle_Forest_Trial = value;
        break;

      default:
        console.warn(`Did not set unknown counter with value ${value}: ${counter}`);
    }
  });

  return items;
}

function validateLocations(locations, parsedItems) {
  const clonedLocations = _.cloneDeep(locations);

  if (!_.isEmpty(clonedLocations)) {
    LogicHelper.updateItems(parsedItems);

    _.forEach(_.values(clonedLocations), regionLocations => {
      _.forEach(regionLocations, (locationData, locationName) => {
        _.set(locationData, "isAvailable", LogicHelper.isLocationAvailable(locationName));
      });
    });
  }

  return clonedLocations;
}

function getSettingsStringCache() {
  let string = localStorage.getItem("settings_string");
  if (!string) {
    // Taking the Tournament S6 as default
    string = SettingStringsJSON.tournament_s6;
  }
  return string;
}

function setSettingsStringCache(string) {
  localStorage.setItem("settings_string", string);
}

function getGeneratorVersionCache() {
  let version = localStorage.getItem("generator_version");
  if (!version) {
    // Coming from .env and using it as default
    version = GENERATOR_VERSION;
  }
  return version;
}

function setGeneratorVersionCache(version) {
  localStorage.setItem("generator_version", version);
}

function reducer(state, action) {
  const { payload } = action;
  switch (action.type) {
    case "LOCATION_ADD": {
      const { locationName, regionName } = payload;

      // Adds location to location list
      const locations = _.cloneDeep(state.locations);

      if (_.isEmpty(locationName)) {
        _.set(locations, regionName, {});
      } else {
        _.set(locations, [regionName, locationName], {
          isAvailable: LogicHelper.isLocationAvailable(locationName),
          isChecked: false,
        });
      }

      return {
        ...state,
        locations,
      };
    }
    case "LOCATION_MARK": {
      const { locationName, regionName } = payload;

      // Toggles location in location list
      if (!_.includes(_.keys(state.locations), regionName)) {
        console.warn(`Unable to mark location "${locationName}": "${regionName}" is not in state.locations`);
        return state;
      } else if (!_.includes(_.keys(state.locations[regionName]), locationName)) {
        console.warn(`Unable to mark location "${locationName}": location is not in state.locations["${regionName}"]`);
        return state;
      } else {
        const locations = _.cloneDeep(state.locations);
        const isChecked = locations[regionName][locationName].isChecked;
        _.set(locations, [regionName, locationName, "isChecked"], !isChecked);

        return {
          ...state,
          locations,
        };
      }
    }
    case "MQ_TOGGLE": {
      // payload = regionName

      // Reset Locations to use new set of MQ dungeons for logic
      const dungeonsMQ = LogicHelper.settings["mq_dungeons_specific"];
      if (!_.includes(dungeonsMQ, payload)) {
        _.set(LogicHelper.settings, "mq_dungeons_specific", _.union(dungeonsMQ, [payload]));
      } else {
        _.remove(LogicHelper.settings.mq_dungeons_specific, dungeon => _.isEqual(dungeon, payload));
      }
      Locations.resetActiveLocations();

      // Modify toggled dungeon to use MQ/non-MQ locations
      const locations = _.cloneDeep(state.locations);
      const locationKey = _.includes(LogicHelper.settings.mq_dungeons_specific, payload) ? "dungeon_mq" : "dungeon";
      _.set(locations, payload, {});
      _.forEach(Locations.locations[locationKey][payload], (locationData, locationName) => {
        if (Locations.isProgressLocation(locationData)) {
          _.set(locations, [payload, locationName], {
            isAvailable: LogicHelper.isLocationAvailable(locationName),
            isChecked: false,
          });
        }
      });

      // Validating checks based on items collected
      const validatedLocations = validateLocations(
        locations,
        parseItems(state.items_list, state.counters, state.unchanged_starting_inventory),
      );

      return {
        ...state,
        locations: validatedLocations,
      };
    }
    case "SHORTCUT_TOGGLE": {
      // payload = regionName

      // Modify toggled dungeon to use/not use dungeon boss shortcuts
      if (!_.includes(LogicHelper.settings.dungeon_shortcuts, payload)) {
        _.set(LogicHelper.settings, "dungeon_shortcuts", _.union(LogicHelper.settings.dungeon_shortcuts, [payload]));
      } else {
        _.remove(LogicHelper.settings.dungeon_shortcuts, dungeon => _.isEqual(dungeon, payload));
      }

      // Revalidate checks based on items collected
      const validatedLocations = validateLocations(
        state.locations,
        parseItems(state.items_list, state.counters, state.unchanged_starting_inventory),
      );

      return {
        ...state,
        locations: validatedLocations,
      };
    }
    case "REGION_TOGGLE": {
      // payload = regionName

      // Toggles all locations in the region
      // If at least one location is checked, then checks all locations. Otherwise, unchecks all locations.
      const locations = _.cloneDeep(state.locations);
      const setTo = _.every(_.values(locations[payload]), value => value.isChecked);
      _.forEach(_.values(locations[payload]), locationData => {
        _.set(locationData, "isChecked", !setTo);
      });

      return {
        ...state,
        locations,
      };
    }
    case "ITEMS_UPDATE_FROM_LOGIC": {
      const settings = payload;
      const items = [...settings.starting_equipment, ...settings.starting_inventory, ...settings.starting_songs];

      const starting_inventory = items.map(item => {
        return ITEMS_JSON[item];
      });

      if (settings.start_with_consumables) {
        starting_inventory.push("34b2ad3657e94b75b281cec30e617f37");
        starting_inventory.push("73a0f3f5688745a8bb4a0973d9858960");
      }
      if (settings.open_door_of_time && settings.open_forest !== "closed") {
        starting_inventory.push("c50e8543ab0c4bdaa8a23e6a80ae6d1c");
      }

      // `starting_inventory` will be properly set through `useElement` hook
      const items_list = {};
      for (let i = 0; i < starting_inventory.length; i++) {
        _.set(items_list, i, starting_inventory[i]);
      }

      const parsedItems = parseItems(items_list, [], starting_inventory);

      // Validating checks based on items collected
      const locations = validateLocations(state.locations, parsedItems);

      return {
        ...state,
        locations,
        items: parsedItems,
        starting_inventory,
        unchanged_starting_inventory: _.cloneDeep(starting_inventory),
        items_list: {},
      };
    }
    case "COUNTER_MARK": {
      const { value, item } = payload;

      // Update changed counter value
      const counters = _.set(_.cloneDeep(state.counters), item, value);

      // Prepping collecting items with counters
      const parsedItems = parseItems(state.items_list, counters, state.unchanged_starting_inventory);

      // Validating checks based on items collected
      const locations = validateLocations(state.locations, parsedItems);

      return {
        ...state,
        locations,
        items: parsedItems,
        counters,
      };
    }
    case "ITEM_MARK": {
      const { item, parentID } = payload;

      // Prepping collecting items
      const items_list = _.cloneDeep(state.items_list);
      if (_.isNull(item)) {
        delete items_list[parentID];
      } else {
        _.set(items_list, parentID, item);
      }

      const parsedItems = parseItems(items_list, state.counters, state.unchanged_starting_inventory);

      // Validating checks based on items collected
      const locations = validateLocations(state.locations, parsedItems);

      return {
        ...state,
        locations,
        items: parsedItems,
        items_list,
      };
    }
    case "STRING_SET": {
      setSettingsStringCache(payload);
      return {
        ...state,
        settings_string: payload,
      };
    }
    case "VERSION_SET": {
      setGeneratorVersionCache(payload);
      return {
        ...state,
        generator_version: payload,
      };
    }
    default:
      throw new Error();
  }
}

function TrackerProvider(props) {
  const initialState = {
    locations: {},
    items: _.cloneDeep(DEFAULT_ITEMS),
    counters: {},
    starting_inventory: [],
    unchanged_starting_inventory: [],
    items_list: {},
    layoutElements: [],
    settings_string: getSettingsStringCache(),
    generator_version: getGeneratorVersionCache(),
  };

  const [state, dispatch] = useReducer(reducer, initialState);

  // Implementar local storage?
  return <TrackerContext.Provider value={{ state, dispatch }} {...props} />;
}

const useTracker = () => useContext(TrackerContext);

const useChecks = () => {
  const {
    state: { locations, items },
  } = useTracker();

  return {
    locations,
    items,
  };
};

const useElement = (id, startingItem) => {
  const {
    state: { layoutElements, unchanged_starting_inventory, items_list },
  } = useTracker();

  if (!_.includes(layoutElements, id)) {
    layoutElements.push(id);

    if (!_.isNull(startingItem)) {
      _.set(items_list, id, startingItem);

      // Note that starting item appears on the tracker layout
      if (_.includes(unchanged_starting_inventory, startingItem)) {
        unchanged_starting_inventory.splice(unchanged_starting_inventory.indexOf(startingItem), 1);
      }
    }
  }
};

const useLocation = () => {
  const { dispatch } = useTracker();

  const actions = useMemo(
    () => ({
      addLocation: (locationName, regionName, items) =>
        dispatch({ type: "LOCATION_ADD", payload: { locationName, regionName, items } }),
      markLocation: (locationName, regionName) =>
        dispatch({ type: "LOCATION_MARK", payload: { locationName, regionName } }),
      toggleMQ: regionName => dispatch({ type: "MQ_TOGGLE", payload: regionName }),
      toggleShortcut: regionName => dispatch({ type: "SHORTCUT_TOGGLE", payload: regionName }),
      toggleRegion: regionName => dispatch({ type: "REGION_TOGGLE", payload: regionName }),
    }),
    [dispatch],
  );

  return [actions];
};

const useItems = items => {
  const { state, dispatch } = useTracker();

  const actions = useMemo(
    () => ({
      markCounter: (value, item) => dispatch({ type: "COUNTER_MARK", payload: { value, item } }),
      markItem: (item, parentID) => dispatch({ type: "ITEM_MARK", payload: { item, parentID } }),
      updateItemsFromLogic: settings => dispatch({ type: "ITEMS_UPDATE_FROM_LOGIC", payload: settings }),
    }),
    [dispatch],
  );

  // IMPORTANT: Intentionally ignoring state.starting_inventory on the dependency array.
  const startingIndex = useMemo(() => {
    // Loops through the items of the element,
    // searching for a match against the items in the tracker context.
    // Returns the index that matched, otherwise defaults to 0.
    let itemIndex = 0;
    if (!items || !items.length) return 0;
    for (let i = 0; i < items.length; i++) {
      if (_.includes(state.starting_inventory, items[i])) {
        itemIndex = i;
        break;
      }
    }
    return itemIndex;
    // eslint-disable-next-line
  }, [items]);

  const startingItem = useMemo(() => {
    let itemID = null;
    if (!items || !items.length) return null;
    for (let i = 0; i < items.length; i++) {
      if (_.includes(state.starting_inventory, items[i])) {
        itemID = items[i];
        break;
      }
    }
    return itemID;
    // eslint-disable-next-line
  }, [items]);

  return { ...actions, startingIndex, startingItem };
};

const useSettingsString = () => {
  const {
    state: { settings_string, generator_version },
    dispatch,
  } = useTracker();

  const actions = useMemo(
    () => ({
      setString: string => dispatch({ type: "STRING_SET", payload: string }),
      setVersion: version => dispatch({ type: "VERSION_SET", payload: version }),
    }),
    [dispatch],
  );

  return { ...actions, settings_string, generator_version };
};

export {
  TrackerProvider,
  useTracker,
  useChecks,
  useElement,
  useLocation,
  useItems,
  useSettingsString,
  getSettingsStringCache,
  getGeneratorVersionCache,
};
