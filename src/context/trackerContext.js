import _ from "lodash";
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from "react";

import COMBO_ITEMS from "../data/combo-items.json";
import COUNTER_TO_ITEM from "../data/counter-to-item.json";
import DEFAULT_ITEMS from "../data/default-items.json";
import ITEMS_JSON from "../data/items.json";
import HINT_REGIONS_SHORT_NAMES from "../data/hint-regions-short-names.json";
import SETTING_STRINGS_JSON from "../data/setting-strings.json";
import UUID_TO_ITEM from "../data/uuid-to-item.json";
import Locations from "../utils/locations";
import LogicHelper from "../utils/logic-helper";
import SettingsHelper from "../utils/settings-helper";

const GENERATOR_VERSION = process.env.REACT_APP_GENERATOR_VERSION;

const COMBO_DERIVATIONS = COMBO_ITEMS;

const EFK_SETTINGS_STRING = SETTING_STRINGS_JSON.presets.find(p => p.value === "escape_from_kak")?.settingsString;

// Maps full dungeon hint-region names to the lobby region name used in the devTFBlitz_ Overworld graph.
// These are the unconditional (True) exits added from Kakariko Village in the EFK version.
const EFK_DUNGEON_LOBBY_REGIONS = {
  "Deku Tree": "Deku Tree Lobby",
  "Dodongos Cavern": "Dodongos Cavern Beginning",
  "Jabu Jabus Belly": "Jabu Jabus Belly Beginning",
  "Forest Temple": "Forest Temple Lobby",
  "Fire Temple": "Fire Temple Lower",
  "Water Temple": "Water Temple Lobby",
  "Shadow Temple": "Shadow Temple Entryway",
  "Spirit Temple": "Spirit Temple Lobby",
  "Bottom of the Well": "Bottom of the Well",
  "Ice Cavern": "Ice Cavern Beginning",
  "Gerudo Training Ground": "Gerudo Training Ground Lobby"
};

const TrackerContext = createContext();

/**
 * Converts UUID-based item lists and counters into a logic-compatible items object.
 * @param {object} items_list - Map of element IDs to item UUIDs.
 * @param {object} counters - Map of counter names to their values.
 * @param {Array} unchanged_starting_inventory - Starting inventory UUIDs.
 * @returns {object} Parsed items keyed by logic item name.
 */
function parseItems(items_list, counters, unchanged_starting_inventory) {
  const items = _.cloneDeep(DEFAULT_ITEMS);
  const tradeRevert = !SettingsHelper.getSetting("adult_trade_shuffle") && !SettingsHelper.getRenamedAttribute("disable_trade_revert");

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
    items[mapping.item] = Math.max(items[mapping.item] || 0, value);

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

/**
 * Returns a set of dungeon lobby region names to skip during region traversal.
 * Only applies when the EFK preset is active and all 4 dungeons are selected —
 * in that case we can skip traversing the 6 unselected dungeon regions.
 * @param {object} state - Current tracker state.
 * @returns {Set<string>} Region names to skip.
 */
function getEFKSkipRegions(state) {
  if (state.settings_string !== EFK_SETTINGS_STRING) {
    return new Set();
  }

  const shortToFull = _.invert(HINT_REGIONS_SHORT_NAMES);
  const selectedDungeons = new Set(
    Object.values(state.labelSelections)
      .filter(s => s.name === "efk_dungeon" && s.value !== "???")
      .map(s => shortToFull[s.value])
      .filter(Boolean),
  );

  const skipRegions = new Set();
  Object.entries(EFK_DUNGEON_LOBBY_REGIONS).forEach(([dungeonName, lobbyRegion]) => {
    if (!selectedDungeons.has(dungeonName)) {
      skipRegions.add(lobbyRegion);
    }
  });
  return skipRegions;
}

/**
 * Revalidates location availability based on current items.
 * @param {object} locations - Map of region names to location data.
 * @param {object} parsedItems - Parsed items from parseItems.
 * @param {Set<string>} [skipRegions] - Lobby region names to exclude from traversal.
 * @returns {object} Cloned locations with updated isAvailable flags.
 */
function validateLocations(locations, parsedItems, skipRegions = new Set()) {
  const clonedLocations = _.cloneDeep(locations);

  if (!_.isEmpty(clonedLocations)) {
    LogicHelper.updateItems(parsedItems, skipRegions);

    _.forEach(_.values(clonedLocations), regionLocations => {
      _.forEach(regionLocations, (locationData, locationName) => {
        _.set(locationData, "isAvailable", LogicHelper.isLocationAvailable(locationName));
      });
    });
  }

  return clonedLocations;
}

/**
 * Retrieves the cached settings string from localStorage.
 * @returns {string} The cached settings string, or empty string.
 */
function getSettingsStringCache() {
  // Return empty string if no cached value
  return localStorage.getItem("settings_string") || "";
}

/**
 * Persists the settings string to localStorage.
 * @param {string} string - The settings string to cache.
 */
function setSettingsStringCache(string) {
  localStorage.setItem("settings_string", string);
}

/**
 * Retrieves the cached generator version from localStorage.
 * @returns {string} The cached version, or the default from env.
 */
function getGeneratorVersionCache() {
  let version = localStorage.getItem("generator_version");
  if (!version) {
    // Coming from .env and using it as default
    version = GENERATOR_VERSION;
  }
  return version;
}

/**
 * Persists the generator version to localStorage.
 * @param {string} version - The generator version string.
 */
function setGeneratorVersionCache(version) {
  localStorage.setItem("generator_version", version);
}

/**
 * Tracker context reducer handling all state mutations.
 * @param {object} state - The current tracker state.
 * @param {object} action - The dispatched action with type and payload.
 * @returns {object} The new tracker state.
 */
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

      // Update MQ dungeons setting in both LogicHelper and SettingsHelper
      const dungeonsMQ = LogicHelper.settings["mq_dungeons_specific"];
      let newDungeonsMQ;
      if (!_.includes(dungeonsMQ, payload)) {
        newDungeonsMQ = _.union(dungeonsMQ, [payload]);
      } else {
        newDungeonsMQ = _.filter(dungeonsMQ, dungeon => dungeon !== payload);
      }
      _.set(LogicHelper.settings, "mq_dungeons_specific", newDungeonsMQ);
      SettingsHelper.settings["mq_dungeons_specific"] = newDungeonsMQ;
      SettingsHelper.invalidateCachedSets();

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

      // Update dungeon shortcuts setting in both LogicHelper and SettingsHelper
      const shortcuts = LogicHelper.settings.dungeon_shortcuts;
      let newShortcuts;
      if (!_.includes(shortcuts, payload)) {
        newShortcuts = _.union(shortcuts, [payload]);
      } else {
        newShortcuts = _.filter(shortcuts, dungeon => dungeon !== payload);
      }
      _.set(LogicHelper.settings, "dungeon_shortcuts", newShortcuts);
      SettingsHelper.settings["dungeon_shortcuts"] = newShortcuts;
      SettingsHelper.invalidateCachedSets();

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

      // Skip expensive location validation if items didn't actually change
      const locations = _.isEqual(parsedItems, state.items)
        ? state.locations
        : validateLocations(state.locations, parsedItems, getEFKSkipRegions(state));

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

      // Skip expensive location validation if items didn't actually change
      const locations = _.isEqual(parsedItems, state.items)
        ? state.locations
        : validateLocations(state.locations, parsedItems, getEFKSkipRegions(state));

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
    case "LABEL_SELECT": {
      const { elementId, name, value } = payload;
      const newLabelSelections = { ...state.labelSelections, [elementId]: { name, value } };

      if (name === "efk_dungeon") {
        // When an EFK dungeon label changes, the accessible dungeons change, so we get the updated 
        // skip regions and revalidate locations to update the checks.
        const newState = { ...state, labelSelections: newLabelSelections };
        const locations = validateLocations(state.locations, state.items, getEFKSkipRegions(newState));
        return { ...newState, locations };
      }

      return { ...state, labelSelections: newLabelSelections };
    }
    case "ELEMENT_REGISTER": {
      const { id, startingItem } = payload;

      // Skip if already registered
      if (state.layoutElements.includes(id)) {
        return state;
      }

      const newLayoutElements = [...state.layoutElements, id];
      const newItemsList = { ...state.items_list };
      let newUnchangedStartingInventory = [...state.unchanged_starting_inventory];
      const newStartingItemClaims = { ...state.starting_item_claims };

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

/**
 * Provides tracker state and dispatch to child components.
 * @param {object} props - React component props.
 * @returns {object} The context provider.
 */
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
    labelSelections: {}, // { elementId: { name, value } } - e.g. { 1: {"efk_dungeon", "DEK"} }
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
    if (!items || !items.length) { return 0; }
    for (let i = 0; i < items.length; i++) {
      const itemUuid = items[i];
      if (!itemUuid) { continue; }

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
    if (!items || !items.length) { return null; }
    for (let i = 0; i < items.length; i++) {
      const itemUuid = items[i];
      if (!itemUuid) { continue; }

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

const useLabelSelect = () => {
  const { dispatch } = useTracker();
  return useCallback(
    (elementId, name, value) =>
      dispatch({ type: "LABEL_SELECT", payload: { elementId, name, value } }),
    [dispatch],
  );
};

const useSelectedEFKDungeons = () => {
  const { state: { labelSelections } } = useTracker();
  return useMemo(() => {
    const shortToFull = _.invert(HINT_REGIONS_SHORT_NAMES);
    return Object.values(labelSelections)
      .filter(s => s.name === "efk_dungeon" && s.value !== "???")
      .map(s => shortToFull[s.value])
      .filter(Boolean);
  }, [labelSelections]);
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
  useElement, useItems, useLabelSelect, useLocation, useSelectedEFKDungeons,
  useSettingsString, useTracker
};

