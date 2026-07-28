import DEFAULT_ITEMS from "../data/default-items.json";
import BUNDLE from "../versions/bundles/9.0.0";
import Locations from "./locations";
import LogicHelper from "./logic-helper";
import SettingsHelper from "./settings-helper";


/**
 * Initialize all logic systems with optional settings overrides.
 * @param {object} settingsOverrides - Settings to override bundle defaults.
 */
function initializeLogic(settingsOverrides = {}) {
  const { logicHelpersFile, locationTable, boulderTable, dungeonFiles, dungeonMQFiles, bossesFile, overworldFile } =
    BUNDLE;
  SettingsHelper.initialize(BUNDLE);
  Locations.initialize(dungeonFiles, dungeonMQFiles, bossesFile, overworldFile, locationTable);
  SettingsHelper.setSettings(settingsOverrides);
  LogicHelper.initialize(logicHelpersFile, SettingsHelper.settings, boulderTable);
}

/**
 * Collect the given items on top of an empty inventory.
 * @param {object} owned - Item names mapped to their counts.
 */
function updateItems(owned) {
  LogicHelper.updateItems({ ...DEFAULT_ITEMS, ...owned });
}

const TIME_TRAVEL_ITEMS = { Ocarina: 1, Song_of_Time: 1 };


describe("Door of Time", () => {
  describe("open", () => {
    beforeEach(() => initializeLogic({ open_door_of_time: "open", starting_age: "child", open_forest: "open" }));

    test("both ages are reachable with no items", () => {
      updateItems({});
      expect(LogicHelper.isLocationAvailable("KF Kokiri Sword Chest")).toBe(true);
      expect(LogicHelper.isLocationAvailable("Sheik at Temple")).toBe(false);

      updateItems({ Forest_Medallion: 1 });
      expect(LogicHelper.isLocationAvailable("Sheik at Temple")).toBe(true);
    });
  });

  describe("closed with a known starting age", () => {
    beforeEach(() => initializeLogic({ open_door_of_time: "sot", starting_age: "child", open_forest: "open" }));

    test("the starting age is reachable", () => {
      updateItems({});
      expect(LogicHelper.isLocationAvailable("KF Kokiri Sword Chest")).toBe(true);
    });

    test("the other age needs time travel", () => {
      updateItems({ Forest_Medallion: 1 });
      expect(LogicHelper.isLocationAvailable("Sheik at Temple")).toBe(false);

      updateItems({ Forest_Medallion: 1, ...TIME_TRAVEL_ITEMS });
      expect(LogicHelper.isLocationAvailable("Sheik at Temple")).toBe(true);
    });

    test("a starting age of adult locks the child side", () => {
      initializeLogic({ open_door_of_time: "sot", starting_age: "adult", open_forest: "open" });
      updateItems({});
      expect(LogicHelper.isLocationAvailable("KF Kokiri Sword Chest")).toBe(false);

      updateItems(TIME_TRAVEL_ITEMS);
      expect(LogicHelper.isLocationAvailable("KF Kokiri Sword Chest")).toBe(true);
    });
  });

  describe("closed with a random starting age", () => {
    beforeEach(() => initializeLogic({ open_door_of_time: "sot", starting_age: "random", open_forest: "open" }));

    test("nothing is reachable until an age is picked", () => {
      updateItems(TIME_TRAVEL_ITEMS);
      expect(LogicHelper.isLocationAvailable("KF Kokiri Sword Chest")).toBe(false);

      SettingsHelper.setStartingAgeSelection("child");
      updateItems(TIME_TRAVEL_ITEMS);
      expect(LogicHelper.isLocationAvailable("KF Kokiri Sword Chest")).toBe(true);
    });

    test("picking adult still gates the child side behind time travel", () => {
      SettingsHelper.setStartingAgeSelection("adult");
      updateItems({});
      expect(LogicHelper.isLocationAvailable("KF Kokiri Sword Chest")).toBe(false);

      updateItems(TIME_TRAVEL_ITEMS);
      expect(LogicHelper.isLocationAvailable("KF Kokiri Sword Chest")).toBe(true);
    });
  });
});
