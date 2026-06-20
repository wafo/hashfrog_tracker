import _ from "lodash";
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from "react";

import COMBO_ITEMS from "../data/combo-items.json";
import COUNTER_TO_ITEM from "../data/counter-to-item.json";
import DEFAULT_ITEMS from "../data/default-items.json";
import DUNGEONS from "../data/dungeons.json";
import ITEMS_JSON from "../data/items.json";
import UUID_TO_ITEM from "../data/uuid-to-item.json";
import { getEFKSkipRegions, getSelectedEFKDungeons, isEFK, isEFKLabel } from "../utils/efk";
import Locations from "../utils/locations";
import LogicHelper from "../utils/logic-helper";
import SettingsHelper from "../utils/settings-helper";

const GENERATOR_VERSION = process.env.REACT_APP_GENERATOR_VERSION;

const COMBO_DERIVATIONS = COMBO_ITEMS;

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

// localStorage key for a persisted tracker session (single slot).
const SESSION_KEY = "tracker_session";

/**
 * Builds a serializable snapshot of user progress from the tracker state.
 * @param {object} state - The current tracker state.
 * @returns {object} A snapshot suitable for JSON serialization.
 */
function buildSnapshot(state) {
  const checkedLocations = {};
  _.forEach(state.locations, (locations, regionName) => {
    const checkedNames = _.keys(_.pickBy(locations, location => location.isChecked));
    if (checkedNames.length) {
      checkedLocations[regionName] = checkedNames;
    }
  });

  return {
    // Whether this was a check-tracking session, so Resume opens the right route/size.
    checksEnabled: !_.isEmpty(state.locations),
    // The layout active at save time, used to detect layout changes before resuming.
    layout: localStorage.getItem("layout"),
    // MQ/shortcut toggles live in the settings singletons, not in reducer state.
    mq_dungeons_specific: SettingsHelper.settings?.mq_dungeons_specific || [],
    dungeon_shortcuts: SettingsHelper.settings?.dungeon_shortcuts || [],
    settings_string: state.settings_string,
    generator_version: state.generator_version,
    items_list: state.items_list,
    counters: state.counters,
    labelSelections: state.labelSelections,
    starting_item_claims: state.starting_item_claims,
    unchanged_starting_inventory: state.unchanged_starting_inventory,
    checkedLocations,
  };
}

/**
 * Persists a snapshot of the tracker state to localStorage.
 * @param {object} state - The current tracker state.
 */
function saveSession(state) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(buildSnapshot(state)));
  } catch (err) {
    console.warn("Failed to save tracker session:", err);
  }
}

/**
 * Loads the persisted session snapshot, if one exists and is parseable.
 * @returns {object|null} The snapshot, or null when absent/corrupt.
 */
function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) { return null; }
    const snapshot = JSON.parse(raw);
    if (!snapshot || typeof snapshot !== "object") { return null; }
    return snapshot;
  } catch (err) {
    console.warn("Failed to load tracker session:", err);
    return null;
  }
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

        const newState = {
          ...state,
          locations,
        };
        saveSession(newState);
        return newState;
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

      const newState = {
        ...state,
        locations: validatedLocations,
      };
      saveSession(newState);
      return newState;
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

      const newState = {
        ...state,
        locations: validatedLocations,
      };
      saveSession(newState);
      return newState;
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

      const newState = {
        ...state,
        locations,
      };
      saveSession(newState);
      return newState;
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
        : validateLocations(state.locations, parsedItems, getEFKSkipRegions(state.settings_string, state.labelSelections));

      const newState = {
        ...state,
        locations,
        items: parsedItems,
        counters,
      };
      saveSession(newState);
      return newState;
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
        : validateLocations(state.locations, parsedItems, getEFKSkipRegions(state.settings_string, state.labelSelections));

      const newState = {
        ...state,
        locations,
        items: parsedItems,
        items_list,
      };
      saveSession(newState);
      return newState;
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

      let newState = { ...state, labelSelections: newLabelSelections };
      if (isEFKLabel(name) && isEFK(state.settings_string)) {
        // Accessible dungeons changed; revalidate locations against the updated skip regions.
        const locations = validateLocations(
          state.locations,
          state.items,
          getEFKSkipRegions(state.settings_string, newLabelSelections),
        );
        newState = { ...newState, locations };
      }

      saveSession(newState);
      return newState;
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

      if (startingItem !== null && newItemsList[id] === undefined) {
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
    case "SESSION_RESTORE": {
      const snapshot = payload;
      if (!snapshot) { return state; }

      const items_list = snapshot.items_list || {};
      const counters = snapshot.counters || {};
      const labelSelections = snapshot.labelSelections || {};
      const starting_item_claims = snapshot.starting_item_claims || {};
      const unchanged_starting_inventory = snapshot.unchanged_starting_inventory || [];

      if (snapshot.mq_dungeons_specific) {
        _.set(LogicHelper.settings, "mq_dungeons_specific", snapshot.mq_dungeons_specific);
        SettingsHelper.settings["mq_dungeons_specific"] = snapshot.mq_dungeons_specific;
      }
      if (snapshot.dungeon_shortcuts) {
        _.set(LogicHelper.settings, "dungeon_shortcuts", snapshot.dungeon_shortcuts);
        SettingsHelper.settings["dungeon_shortcuts"] = snapshot.dungeon_shortcuts;
      }
      SettingsHelper.invalidateCachedSets();

      const locations = _.cloneDeep(state.locations);

      // Rebuild each dungeon's location list to match the restored MQ setting.
      _.forEach(_.keys(locations), regionName => {
        if (!_.includes(DUNGEONS, regionName)) { return; }
        const locationKey = SettingsHelper.isMQDungeon(regionName) ? "dungeon_mq" : "dungeon";
        _.set(locations, regionName, {});
        _.forEach(Locations.locations[locationKey][regionName], (locationData, locationName) => {
          if (Locations.isProgressLocation(locationData)) {
            _.set(locations, [regionName, locationName], { isAvailable: false, isChecked: false });
          }
        });
      });

      _.forEach(snapshot.checkedLocations || {}, (locationNames, regionName) => {
        if (!locations[regionName]) { return; }
        locationNames.forEach(locationName => {
          if (locations[regionName][locationName]) {
            _.set(locations, [regionName, locationName, "isChecked"], true);
          }
        });
      });

      const settingsString = snapshot.settings_string || state.settings_string;
      const skipRegions = isEFK(settingsString) ? getEFKSkipRegions(settingsString, labelSelections) : new Set();

      const parsedItems = parseItems(items_list, counters, unchanged_starting_inventory);
      const validatedLocations = validateLocations(locations, parsedItems, skipRegions);

      return {
        ...state,
        locations: validatedLocations,
        items: parsedItems,
        items_list,
        counters,
        labelSelections,
        starting_item_claims,
        unchanged_starting_inventory,
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

const useItems = (items, elementId = null, name = null) => {
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

  const savedIndex = useMemo(() => {
    if (elementId === null || !items || !items.length) { return null; }
    const savedItem = state.items_list[elementId];
    if (!savedItem) { return null; }
    const idx = items.indexOf(savedItem);
    return idx >= 0 ? idx : null;
  }, [items, elementId, state.items_list]);

  const savedCounter = useMemo(() => {
    if (name === null) { return null; }
    const value = state.counters[name];
    return value === undefined ? null : value;
  }, [name, state.counters]);

  const savedLabelValue = useMemo(() => {
    if (elementId === null) { return null; }
    const selection = state.labelSelections[elementId];
    return selection ? selection.value : null;
  }, [elementId, state.labelSelections]);

  return { ...actions, startingIndex, startingItem, savedIndex, savedCounter, savedLabelValue };
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
  return useMemo(() => getSelectedEFKDungeons(labelSelections), [labelSelections]);
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

/**
 * Restores a saved session once the tracker structure is ready, when the
 * window was opened with `?resume=1`. Runs at most once.
 * @param {boolean} isReady - True when locations/items have finished building.
 */
const useSessionRestore = isReady => {
  const { dispatch } = useTracker();
  const restoredRef = useRef(false);

  useEffect(() => {
    if (!isReady || restoredRef.current) { return; }

    const params = new URLSearchParams(window.location.search);
    if (params.get("resume") !== "1") { return; }

    const snapshot = loadSession();
    if (snapshot) {
      dispatch({ type: "SESSION_RESTORE", payload: snapshot });
    }
    restoredRef.current = true;
  }, [isReady, dispatch]);
};

export {
  getGeneratorVersionCache, getSettingsStringCache, loadSession, TrackerProvider,
  useChecks, useElement, useItems, useLabelSelect, useLocation,
  useSelectedEFKDungeons, useSessionRestore, useSettingsString, useTracker
};

