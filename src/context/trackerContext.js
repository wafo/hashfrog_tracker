import _ from "lodash";
import { createContext, useContext, useMemo, useReducer } from "react";

import COUNTER_TO_ITEM from "../data/counter-to-item.json";
import DEFAULT_ITEMS from "../data/default-items.json";
import ITEMS_JSON from "../data/items.json";
import SettingStringsJSON from "../data/setting-strings.json";
import UUID_TO_ITEM from "../data/uuid-to-item.json";
import Locations from "../utils/locations";
import LogicHelper from "../utils/logic-helper";

const GENERATOR_VERSION = process.env.REACT_APP_GENERATOR_VERSION;

const TrackerContext = createContext();

function parseItems(items_list, counters, unchanged_starting_inventory) {
  const items = _.cloneDeep(DEFAULT_ITEMS);
  const tradeRevert =
    LogicHelper.settings &&
    !LogicHelper.settings.adult_trade_shuffle &&
    !LogicHelper.renamedAttributes.disable_trade_revert;

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
