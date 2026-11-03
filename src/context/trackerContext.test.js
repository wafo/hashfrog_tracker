import SettingStrings from "../data/setting-strings.json";
import { getGeneratorVersionCache, loadSession } from "./trackerContext";

const SESSION_KEY = "tracker_session";

describe("loadSession", () => {
  let warnSpy;

  beforeEach(() => {
    localStorage.clear();
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => { });
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("returns null when no session is saved", () => {
    expect(loadSession()).toBeNull();
  });

  it("returns null for corrupt JSON", () => {
    localStorage.setItem(SESSION_KEY, "{corrupt");
    expect(loadSession()).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("returns null for non-object snapshots", () => {
    ["42", '"hello"', "[1,2,3]", "null", "true"].forEach(raw => {
      localStorage.setItem(SESSION_KEY, raw);
      expect(loadSession()).toBeNull();
    });
  });

  it("passes a well-formed snapshot through unchanged", () => {
    const snapshot = {
      checksEnabled: true,
      layout: '{"layoutConfig":{"width":100,"height":200},"components":[]}',
      mq_dungeons_specific: ["Deku Tree"],
      dungeon_shortcuts: [],
      starting_age_selection: "adult",
      settings_string: "AB12CD",
      generator_version: "9.0.0",
      items_list: { elem1: "uuid1" },
      counters: { skulls: 4 },
      labelSelections: {},
      hintEntries: {},
      draggedIcons: {},
      starting_item_claims: {},
      unchanged_starting_inventory: ["uuid2"],
      checkedLocations: { "Kokiri Forest": ["KF Midos Top Left Chest"] },
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(snapshot));
    expect(loadSession()).toEqual(snapshot);
  });

  it("drops fields with the wrong type but keeps the rest", () => {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        mq_dungeons_specific: 3,
        dungeon_shortcuts: { not: "an array" },
        counters: "many",
        items_list: { elem1: "uuid1" },
        settings_string: 5,
        generator_version: ["9.0.0"],
        starting_age_selection: "elderly",
        layout: { should: "be a string" },
        unchanged_starting_inventory: ["uuid2"],
      }),
    );

    const session = loadSession();
    expect(session.mq_dungeons_specific).toBeUndefined();
    expect(session.dungeon_shortcuts).toBeUndefined();
    expect(session.counters).toBeUndefined();
    expect(session.settings_string).toBeUndefined();
    expect(session.generator_version).toBeUndefined();
    expect(session.starting_age_selection).toBeUndefined();
    expect(session.layout).toBeUndefined();
    expect(session.items_list).toEqual({ elem1: "uuid1" });
    expect(session.unchanged_starting_inventory).toEqual(["uuid2"]);
    expect(warnSpy).toHaveBeenCalled();
  });

  it("accepts null and both ages for starting_age_selection", () => {
    ["child", "adult", null].forEach(value => {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ starting_age_selection: value }));
      expect(loadSession().starting_age_selection).toBe(value);
    });
  });

  it("cleans checkedLocations down to string arrays", () => {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        checkedLocations: {
          "Kokiri Forest": ["KF Midos Top Left Chest", 7, null, "KF Kokiri Sword Chest"],
          "Lost Woods": "not an array",
          "Hyrule Field": ["HF Ocarina of Time Item"],
        },
      }),
    );

    expect(loadSession().checkedLocations).toEqual({
      "Kokiri Forest": ["KF Midos Top Left Chest", "KF Kokiri Sword Chest"],
      "Hyrule Field": ["HF Ocarina of Time Item"],
    });
    expect(warnSpy).toHaveBeenCalled();
  });
});

describe("getGeneratorVersionCache", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults a fresh browser to the generator's current active version", () => {
    expect(getGeneratorVersionCache()).toBe(SettingStrings.currentActiveVersion);
  });

  it("keeps a version the player already chose", () => {
    localStorage.setItem("generator_version", "8.3.0");

    expect(getGeneratorVersionCache()).toBe("8.3.0");
  });
});
