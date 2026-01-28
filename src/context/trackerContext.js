import _ from "lodash";
import { createContext, useContext, useEffect, useMemo, useReducer } from "react";

import COUNTER_TO_ITEM from "../data/counter-to-item.json";
import DEFAULT_ITEMS from "../data/default-items.json";
import ITEMS_JSON from "../data/items.json";
import SettingStringsJSON from "../data/setting-strings.json";
import UUID_TO_ITEM from "../data/uuid-to-item.json";
import Locations from "../utils/locations";
import LogicHelper from "../utils/logic-helper";
import { getRenamedAttribute, getSetting } from "../utils/settings-helper";

const GENERATOR_VERSION = process.env.REACT_APP_GENERATOR_VERSION;

const COMBO_DERIVATIONS = [
  {
    // Goron Tunic + Zora Tunic -> Both Tunics
    components: ["cd6a55f0253f45159521efb2b3b515e8", "c562c7418d7141ffb70101509a52873e"],
    combo: "d9233a5054af4491924115b47e5730e4",
  },
  {
    // Iron Boots + Hover Boots -> Both Boots
    components: ["bad09131f88a440093087e11efc1c8b0", "33f4bc4c632846bea5fb88573f2f95b2"],
    combo: "2c5c72812a6b49c68bb49773e6d3dd98",
  },
  {
    // Fire Arrows + Ice Arrows -> Fire-Ice Arrows
    components: ["7c3026558a6b49df97733d13ecc815c7", "9bc4daf5728f4b158dc4c3d768df006e"],
    combo: "4a3433d7792f408b80e2f07caae43da2",
  },
  {
    // Fire Arrows + Light Arrows -> Fire-Light Arrows
    components: ["7c3026558a6b49df97733d13ecc815c7", "ff67e2e04ce04aa8add77658ee932802"],
    combo: "ea2dfcbb008248e790b785941d54027d",
  },
  {
    // Din's Fire + Farore's Wind -> Dins-Farores
    components: ["591d582f479140759fd6501caa23c2f9", "0c3e8979165042f686357b4bcbaab8ec"],
    combo: "76d769ba496e49ebb39fbfd836ce1db6",
  },
];

const TrackerContext = createContext();

function parseItems(items_list, counters, unchanged_starting_inventory) {
  const items = _.cloneDeep(DEFAULT_ITEMS);
  const tradeRevert = !getSetting("adult_trade_shuffle") && !getRenamedAttribute("disable_trade_revert");

  _.forEach(_.union(_.values(items_list), unchanged_starting_inventory), uuid => {
    const mapping = UUID_TO_ITEM[uuid];

    if (!mapping) {
      console.warn(`Did not set unknown item: ${uuid}`);
      return;
    }

    // Skip ignored items
    if (mapping.ignore) {
      return;
    }

    // Handle multi-items (combo items like tunics_both, boots_both)
    if (mapping.items) {
      mapping.items.forEach(itemConfig => {
        items[itemConfig.item] = itemConfig.value ?? 1;
      });
      return;
    }

    // Handle single item
    const value = mapping.value ?? 1;
    items[mapping.item] = value;

    // Handle trade revert special cases
    if (tradeRevert && mapping.tradeRevert) {
      items[mapping.tradeRevert] = 1;
    }
  });

  // Parse counters using mapping
  _.forEach(counters, (value, counter) => {
    const itemName = COUNTER_TO_ITEM[counter];

    if (itemName) {
      items[itemName] = value;
    } else {
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
    var preset = SettingStringsJSON.presets.find(preset => preset.value === "tournament_s9");

    // We should always find a preset. If not, just make it blank to be safe.
    if (preset) {
      string = preset.settingsString;
    } else {
      string = ""
    }

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
      if (!settings.shuffle_individual_ocarina_notes) {
        starting_inventory.push("6466793887f9475685558adbae2a4b3e");
        starting_inventory.push("5598cc877c91426ab4ec083fccb7c22b");
        starting_inventory.push("506b5e53591b430cbf45855088bfae1b");
        starting_inventory.push("9ffc29578f514202a80fa5278a3bd281");
        starting_inventory.push("2d85db579f3c4be49bf48d4853d112e7");
      }

      // Derive combo UUIDs when all component items are present to
      // allow combo elements to display the combined state
      COMBO_DERIVATIONS.forEach(({ components, combo }) => {
        const hasAllComponents = components.every(uuid => starting_inventory.includes(uuid));
        if (hasAllComponents && !starting_inventory.includes(combo)) {
          starting_inventory.push(combo);
        }
      });

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
        starting_item_claims: {},
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
    case "ELEMENT_REGISTER": {
      const { id, startingItem } = payload;

      // Skip if already registered
      if (state.layoutElements.includes(id)) {
        return state;
      }

      const newLayoutElements = [...state.layoutElements, id];
      let newItemsList = { ...state.items_list };
      let newUnchangedStartingInventory = [...state.unchanged_starting_inventory];
      let newStartingItemClaims = { ...state.starting_item_claims };

      if (startingItem !== null) {
        newItemsList[id] = startingItem;

        // Note that starting item appears on the tracker layout
        const idx = newUnchangedStartingInventory.indexOf(startingItem);
        if (idx !== -1) {
          newUnchangedStartingInventory = [
            ...newUnchangedStartingInventory.slice(0, idx),
            ...newUnchangedStartingInventory.slice(idx + 1),
          ];

          // Track that this element claimed this starting item
          newStartingItemClaims[id] = startingItem;
        }
      }

      return {
        ...state,
        layoutElements: newLayoutElements,
        items_list: newItemsList,
        unchanged_starting_inventory: newUnchangedStartingInventory,
        starting_item_claims: newStartingItemClaims,
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
    starting_item_claims: {}, // { elementId: uuid } - tracks which element claimed which starting item
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
    state: { layoutElements },
    dispatch,
  } = useTracker();

  useEffect(() => {
    if (!layoutElements.includes(id)) {
      dispatch({ type: "ELEMENT_REGISTER", payload: { id, startingItem } });
    }
  }, [id, startingItem, layoutElements, dispatch]);
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

const useItems = (items, elementId = null) => {
  const { state, dispatch } = useTracker();

  const actions = useMemo(
    () => ({
      markCounter: (value, item) => dispatch({ type: "COUNTER_MARK", payload: { value, item } }),
      markItem: (item, parentID) => dispatch({ type: "ITEM_MARK", payload: { item, parentID } }),
      updateItemsFromLogic: settings => dispatch({ type: "ITEMS_UPDATE_FROM_LOGIC", payload: settings }),
    }),
    [dispatch],
  );

  const startingIndex = useMemo(() => {
    // Loops through the items of the element,
    // searching for a match against the items in the tracker context.
    // Returns the highest matching index to prefer combo states.
    let itemIndex = 0;
    if (!items || !items.length) return 0;
    for (let i = 0; i < items.length; i++) {
      const itemUuid = items[i];
      if (!itemUuid) continue;

      // Check if this element already claimed this starting item
      const elementClaimedItem = elementId && state.starting_item_claims[elementId] === itemUuid;

      // Check if the item is still available to claim
      const itemAvailableToClaim = _.includes(state.unchanged_starting_inventory, itemUuid);

      if (elementClaimedItem || itemAvailableToClaim) {
        itemIndex = i;
      }
    }
    return itemIndex;
  }, [items, state.unchanged_starting_inventory, state.starting_item_claims, elementId]);

  const startingItem = useMemo(() => {
    let itemID = null;
    if (!items || !items.length) return null;
    for (let i = 0; i < items.length; i++) {
      const itemUuid = items[i];
      if (!itemUuid) continue;

      // Check if this element already claimed this starting item
      const elementClaimedItem = elementId && state.starting_item_claims[elementId] === itemUuid;

      // Check if the item is still available to claim
      const itemAvailableToClaim = _.includes(state.unchanged_starting_inventory, itemUuid);

      if (elementClaimedItem || itemAvailableToClaim) {
        itemID = itemUuid;
      }
    }
    return itemID;
  }, [items, state.unchanged_starting_inventory, state.starting_item_claims, elementId]);

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
  getGeneratorVersionCache, getSettingsStringCache, TrackerProvider, useChecks,
  useElement, useItems, useLocation, useSettingsString, useTracker
};

