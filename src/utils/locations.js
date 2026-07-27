import _ from "lodash";

import ADULT_TRADE_SEQUENCE from "../data/adult-trade-sequence.json";
import CHILD_TRADE_ITEMS from "../data/child-trade-items.json";
import DUNGEONS from "../data/dungeons.json";
import HINT_REGIONS_SHORT_NAMES from "../data/hint-regions-short-names.json";
import HINT_REGIONS from "../data/hint-regions.json";

const ADULT_TRADE_ITEMS = ADULT_TRADE_SEQUENCE.map((trade) => trade.displayName);

const HINT_REGION_NAMES = new Set(HINT_REGIONS.hintRegions);

// Hint area identifiers as they appear in the `hint` field of the randomizer's logic files.
const HINT_AREAS = _.reduce(
  HINT_REGIONS.hintRegions,
  (accumulator, hintRegionName) => {
    accumulator[hintRegionName.toUpperCase().replace(/[^A-Z0-9]+/g, "_")] = hintRegionName;
    return accumulator;
  },
  { CASTLE_GROUNDS: "Hyrule Castle" },
);

import { parseRule } from "./rule-parser";
import SettingsHelper from "./settings-helper";

class Locations {
  /**
   * Load a version's logic files into the lookup tables the rest of the tracker reads.
   * @param {object} dungeonFiles - Vanilla dungeon logic files, keyed by dungeon name.
   * @param {object} dungeonMQFiles - Master Quest dungeon logic files, keyed by dungeon name.
   * @param {Array} bossesFile - Boss room logic file.
   * @param {Array} overworldFile - Overworld logic file.
   * @param {object} locationTable - The version's own location table, from LocationList.py.
   */
  static initialize(dungeonFiles, dungeonMQFiles, bossesFile, overworldFile, locationTable) {
    this.locationTable = locationTable ?? {};
    this.locations = {
      dungeon: new Map(),
      dungeon_mq: new Map(),
      overworld: new Map(),
    };
    this.dropLocations = {
      dungeon: new Map(),
      dungeon_mq: new Map(),
      overworld: new Map(),
    };
    this.skullsLocations = {
      dungeon: new Map(),
      dungeon_mq: new Map(),
      overworld: new Map(),
    };
    this.keyLocations = {
      dungeon: new Map(),
      dungeon_mq: new Map(),
      overworld: new Map(),
    };
    this.events = {
      dungeon: new Map(),
      dungeon_mq: new Map(),
      overworld: new Map(),
    };
    this.exits = {
      dungeon: new Map(),
      dungeon_mq: new Map(),
      overworld: new Map(),
    };

    // Memo for getDropLocations/getEvent (see beginLookupCache).
    this._lookupCacheActive = false;
    this._lookupCacheDepth = 0;
    this._dropLookupCache = new Map();
    this._eventLookupCache = new Map();

    this.regionMap = { ...HINT_REGIONS.overrides };
    this._buildRegionMap([
      ..._.flatten(_.values(dungeonFiles)),
      ..._.flatten(_.values(dungeonMQFiles)),
      ...(bossesFile ?? []),
      ...(overworldFile ?? []),
    ]);

    _.forEach(dungeonFiles, file => {
      this._parseLogicFile(file, true, false);
    });
    _.forEach(dungeonMQFiles, file => {
      this._parseLogicFile(file, true, true);
    });

    // Run through the boss file twice, since MQ and non-MQ share the same boss file
    this._parseLogicFile(bossesFile, true, true);
    this._parseLogicFile(bossesFile, true, false);

    this._parseLogicFile(overworldFile, false, false);
  }

  /**
   * Assign a hint region to every region in the loaded logic files.
   *
   * A hardcoded list of regions goes stale the moment a fork splits or renames one, and that is not
   * just cosmetic: the fork's checks end up grouped under an unnamed region, and buildRegionCache
   * walks `regionMap` to collect exits, so an unlisted region's edges drop out of the region graph
   * entirely and everything past them looks unreachable.
   *
   * The logic files already carry the answer. A region names its own area through `dungeon` or
   * `hint`; regions with neither (interiors, grottos, boss rooms) inherit from the closest region
   * that leads into them, which is how the randomizer resolves hint areas as well. The handful of
   * regions this cannot place are listed as overrides in hint-regions.json.
   * @param {Array} regions - Every region entry across the loaded logic files.
   */
  static _buildRegionMap(regions) {
    const exits = new Map();
    const unmapped = new Set();

    for (const region of regions) {
      const regionName = region.region_name;

      // Region names repeat across MQ/non-MQ variants; merge their exits into one graph
      const regionExits = exits.get(regionName) ?? new Set();
      _.forEach(_.keys(region.exits), exitName => regionExits.add(exitName));
      exits.set(regionName, regionExits);

      if (regionName in this.regionMap) { continue; }

      if (region.dungeon && HINT_REGION_NAMES.has(region.dungeon)) {
        this.regionMap[regionName] = region.dungeon;
      } else if (HINT_AREAS[region.hint]) {
        this.regionMap[regionName] = HINT_AREAS[region.hint];
      } else {
        unmapped.add(regionName);
      }
    }

    // Walk outward from the named regions a level at a time, so each remaining region inherits from
    // the nearest region that reaches it. Root goes in a second pass: it is a pseudo-region wired to
    // every spawn and warp, so propagating it first would swallow whatever those lead into.
    const [namedRegions, rootRegions] = _.partition(
      _.keys(this.regionMap),
      regionName => this.regionMap[regionName] !== "Root",
    );

    for (const seedRegions of [namedRegions, rootRegions]) {
      let frontier = seedRegions;

      while (frontier.length && unmapped.size) {
        const inherited = new Map();

        for (const regionName of frontier) {
          for (const exitName of exits.get(regionName) ?? []) {
            if (!unmapped.has(exitName) || inherited.has(exitName)) { continue; }
            inherited.set(exitName, this.regionMap[regionName]);
          }
        }

        if (!inherited.size) { break; }
        for (const [regionName, hintRegionName] of inherited) {
          this.regionMap[regionName] = hintRegionName;
          unmapped.delete(regionName);
        }
        frontier = [...inherited.keys()];
      }
    }

    if (unmapped.size) {
      console.warn(`${unmapped.size} regions could not be matched to a hint region: ${[...unmapped].join(", ")}`);
    }
  }

  static _parseLogicFile(logicFile, isDungeon, isMQ) {
    const locationKey = isDungeon ? (isMQ ? "dungeon_mq" : "dungeon") : "overworld";

    _.forEach(logicFile, region => {
      const parentRegion = region.region_name;
      const hintRegion = this.regionMap[parentRegion];

      if (_.includes(_.keys(region), "locations")) {
        const missingLocations = [];
        _.forEach(region.locations, (rule, locationName) => {
          try {
            const [type, vanillaItem] = this.locationTable[locationName];

            if (_.startsWith(type, "Hint")) {
              // Ignore hint locations
              return;
            } else if (type === "Drop") {
              // Accessibility of drops is important for logic, but are stored separately from locations
              const dropData = {
                parentRegion,
                rule: parseRule(rule),
              };
              if (hintRegion in this.dropLocations[locationKey]) {
                // Append new drop location
                _.set(
                  this.dropLocations,
                  [locationKey, hintRegion, vanillaItem],
                  _.union(this.dropLocations[locationKey][hintRegion][vanillaItem], [dropData]),
                );
              } else {
                // Initialize list of drops
                _.set(this.dropLocations, [locationKey, hintRegion, vanillaItem], [dropData]);
              }
            } else {
              // Record the location, along with pertinent information to that location
              const locationData = {
                isDungeon,
                locationName,
                parentRegion,
                rule: parseRule(rule),
                type,
                vanillaItem,
              };
              _.set(this.locations, [locationKey, hintRegion, locationName], locationData);

              // Additionally, if the location contains a skulltula token, record that seperately
              if (type === "GS Token") {
                _.set(
                  this.skullsLocations,
                  [locationKey, hintRegion],
                  _.union(this.skullsLocations[locationKey][hintRegion], [locationName]),
                );
              }

              // Additionally, if the location is assuredly a key or silver rupees, record that seperately
              if (
                _.startsWith(vanillaItem, "Small Key ") ||
                _.startsWith(vanillaItem, "Boss Key ") ||
                _.startsWith(vanillaItem, "Silver Rupee ")
              ) {
                const keyData = {
                  locationName,
                  parentRegion,
                  rule: parseRule(rule),
                  vanillaItem,
                };
                _.set(this.keyLocations, [locationKey, hintRegion, locationName], keyData);
              }
            }
          } catch (error) {
            missingLocations.push(locationName);
          }
        });

        // Alert when there are unknown locations
        if (missingLocations.length) {
          console.warn(`[${region.region_name}]: ${missingLocations.length} locations missing from locations table.`);
        }
      }

      // Record events as they are relevant to logic
      if (_.includes(_.keys(region), "events")) {
        _.forEach(region.events, (rule, eventName) => {
          const eventData = {
            parentRegion,
            rule: parseRule(rule),
          };
          if (hintRegion in this.events[locationKey]) {
            _.set(
              this.events,
              [locationKey, hintRegion, eventName],
              _.union(this.events[locationKey][hintRegion][eventName], [eventData]),
            );
          } else {
            _.set(this.events, [locationKey, hintRegion, eventName], [eventData]);
          }
        });
      }

      // Record exits as they are relevant to logic
      if (_.includes(_.keys(region), "exits")) {
        _.forEach(region.exits, (rule, exitName) => {
          _.set(this.exits, [locationKey, hintRegion, parentRegion, exitName], parseRule(rule));
        });
      }
    });
  }

  /**
   * Start memoizing getDropLocations/getEvent.
   *
   * Both walk every hint region on every call, and both are hot during tooltip evaluation.
   * The memo is keyed by name alone, so it is only valid while the MQ selection is fixed.
   * Calls nest and only the outermost pair opens and clears it.
   */
  static beginLookupCache() {
    this._lookupCacheDepth += 1;
    if (this._lookupCacheDepth === 1) {
      this._lookupCacheActive = true;
      this._dropLookupCache.clear();
      this._eventLookupCache.clear();
    }
  }

  /** Close the innermost memo scope opened by beginLookupCache, releasing it once the outermost scope ends. */
  static endLookupCache() {
    this._lookupCacheDepth = Math.max(0, this._lookupCacheDepth - 1);
    if (this._lookupCacheDepth === 0) {
      this._lookupCacheActive = false;
      this._dropLookupCache.clear();
      this._eventLookupCache.clear();
    }
  }

  static getDropLocations(dropName) {
    if (this._lookupCacheActive && this._dropLookupCache.has(dropName)) {
      return this._dropLookupCache.get(dropName);
    }

    const results = [];

    // Check overworld
    for (const regionData of Object.values(this.dropLocations.overworld)) {
      if (dropName in regionData) {
        results.push(...regionData[dropName]);
      }
    }

    // Check dungeons based on MQ settings
    for (const dungeonName of DUNGEONS) {
      const source = SettingsHelper.isMQDungeon(dungeonName)
        ? this.dropLocations.dungeon_mq[dungeonName]
        : this.dropLocations.dungeon[dungeonName];

      if (source && dropName in source) {
        results.push(...source[dropName]);
      }
    }

    const value = results.length > 0 ? results : null;
    if (this._lookupCacheActive) {
      this._dropLookupCache.set(dropName, value);
    }
    return value;
  }

  static getEvent(eventName) {
    if (this._lookupCacheActive && this._eventLookupCache.has(eventName)) {
      return this._eventLookupCache.get(eventName);
    }

    const results = [];

    // Check overworld
    for (const regionData of Object.values(this.events.overworld)) {
      if (eventName in regionData) {
        results.push(...regionData[eventName]);
      }
    }

    // Check dungeons based on MQ settings
    for (const dungeonName of DUNGEONS) {
      const source = SettingsHelper.isMQDungeon(dungeonName)
        ? this.events.dungeon_mq[dungeonName]
        : this.events.dungeon[dungeonName];

      if (source && eventName in source) {
        results.push(...source[eventName]);
      }
    }

    const value = results.length > 0 ? results : null;
    if (this._lookupCacheActive) {
      this._eventLookupCache.set(eventName, value);
    }
    return value;
  }

  static getExitsForRegion(regionName) {
    // Check overworld
    for (const regionExits of Object.values(this.exits.overworld)) {
      if (regionName in regionExits) {
        return regionExits[regionName];
      }
    }

    // Check dungeons based on MQ settings
    for (const dungeonName of DUNGEONS) {
      const source = SettingsHelper.isMQDungeon(dungeonName)
        ? this.exits.dungeon_mq[dungeonName]
        : this.exits.dungeon[dungeonName];

      if (source && regionName in source) {
        return source[regionName];
      }
    }

    return null;
  }

  static _isGuaranteedKey(location) {
    const itemName = location.vanillaItem;

    return (
      (itemName === "Boss Key (Ganons Castle)" && SettingsHelper.getSetting("shuffle_ganon_bosskey") === "vanilla") ||
      (_.startsWith(itemName, "Boss Key ") && SettingsHelper.getSetting("shuffle_bosskeys") === "vanilla") ||
      (itemName === "Small Key (Thieves Hideout)" && SettingsHelper.getSetting("shuffle_hideoutkeys") === "vanilla") ||
      (_.startsWith(itemName, "Silver Rupee ") && SettingsHelper.getSetting("shuffle_silver_rupees") === "vanilla") ||
      (_.startsWith(itemName, "Small Key ") && SettingsHelper.getSetting("shuffle_smallkeys") === "vanilla") ||
      (itemName === "Small Key (Treasure Chest Game)" && SettingsHelper.getSetting("shuffle_tcgkeys") === "vanilla")
    );
  }

  static getKeyLocationsForRegion(regionName) {
    const results = [];

    const addIfGuaranteed = data => {
      if (this._isGuaranteedKey(data)) {
        results.push(data);
      }
    };

    // Check overworld
    for (const regionData of Object.values(this.keyLocations.overworld)) {
      for (const keyData of Object.values(regionData)) {
        if (keyData.parentRegion === regionName) {
          addIfGuaranteed(keyData);
        }
      }
    }

    // Check dungeons based on MQ settings
    for (const dungeonName of DUNGEONS) {
      const source = SettingsHelper.isMQDungeon(dungeonName)
        ? this.keyLocations.dungeon_mq[dungeonName]
        : this.keyLocations.dungeon[dungeonName];

      if (source) {
        for (const keyData of Object.values(source)) {
          if (keyData.parentRegion === regionName) {
            addIfGuaranteed(keyData);
          }
        }
      }
    }

    return results;
  }

  static getLocation(locationName) {
    // Check overworld first (most common case)
    for (const regionData of Object.values(this.locations.overworld)) {
      if (locationName in regionData) {
        return regionData[locationName];
      }
    }

    // Check dungeons based on MQ settings
    for (const dungeonName of DUNGEONS) {
      const source = SettingsHelper.isMQDungeon(dungeonName)
        ? this.locations.dungeon_mq[dungeonName]
        : this.locations.dungeon[dungeonName];

      if (source && locationName in source) {
        return source[locationName];
      }
    }

    return null;
  }

  static getLocationsByVanillaItem(vanillaItemName) {
    const results = [];

    // Check overworld
    for (const regionData of Object.values(this.locations.overworld)) {
      for (const location of Object.values(regionData)) {
        if (location.vanillaItem === vanillaItemName) {
          results.push(location);
        }
      }
    }

    // Check dungeons based on MQ settings
    for (const dungeonName of DUNGEONS) {
      const source = SettingsHelper.isMQDungeon(dungeonName)
        ? this.locations.dungeon_mq[dungeonName]
        : this.locations.dungeon[dungeonName];

      if (source) {
        for (const location of Object.values(source)) {
          if (location.vanillaItem === vanillaItemName) {
            results.push(location);
          }
        }
      }
    }

    return results;
  }

  static getSkullsLocations() {
    let results = [];

    // Add overworld skulls
    for (const skullsList of Object.values(this.skullsLocations.overworld)) {
      results = _.union(results, skullsList);
    }

    // Add dungeon skulls based on MQ settings
    for (const dungeonName of DUNGEONS) {
      const source = SettingsHelper.isMQDungeon(dungeonName)
        ? this.skullsLocations.dungeon_mq[dungeonName]
        : this.skullsLocations.dungeon[dungeonName];

      if (source) {
        results = _.union(results, source);
      }
    }

    return results;
  }

  static hasDrop(dropName) {
    return this.getDropLocations(dropName) !== null;
  }

  static hasEvent(eventName) {
    return this.getEvent(eventName) !== null;
  }

  static _isAlwaysPlacedLocation(location) {
    return (
      _.includes(
        ["Triforce", "Scarecrow Song", "Deliver Letter", "Time Travel", "Bombchu Drop"],
        location.vanillaItem,
      ) || location.type === "Drop"
    );
  }

  static isProgressLocation(location) {
    // source: ItemPool.py get_pool_core()

    if (location.vanillaItem === "None") {
      return false;
    }

    // Disabled Locations
    else if (SettingsHelper.isDisabledLocation(location.locationName)) {
      return false;
    }

    // Song from Impa
    else if (location.locationName === "Song from Impa") {
      return !SettingsHelper.getRenamedAttribute("skip_child_zelda");
    }

    // Always Placed Items
    else if (this._isAlwaysPlacedLocation(location)) {
      return false;
    }

    // Gold Skulltula Tokens
    else if (location.vanillaItem === "Gold Skulltula Token") {
      const tokensanity = SettingsHelper.getSetting("tokensanity");
      return (
        tokensanity === "all" ||
        (tokensanity === "dungeons" && location.isDungeon) ||
        (tokensanity === "overworld" && !location.isDungeon)
      );
    }

    // Shops
    else if (location.type === "Shop") {
      const shopsanity = SettingsHelper.getSetting("shopsanity");
      if (shopsanity === "off") {
        return false;
      } else if (shopsanity === "random") {
        return 4 >= _.toInteger(_.slice(location.locationName, -1));
      } else {
        return _.toInteger(shopsanity) >= _.toInteger(_.slice(location.locationName, -1));
      }
    }

    // Business Scrubs
    else if (_.includes(["Scrub", "GrottoScrub"], location.type)) {
      if (_.includes(["Piece of Heart", "Deku Stick Capacity", "Deku Nut Capacity"], location.vanillaItem)) {
        return true;
      } else {
        return SettingsHelper.getSetting("shuffle_scrubs") !== "off";
      }
    }

    // Kokiri Sword
    else if (location.vanillaItem === "Kokiri Sword") {
      return SettingsHelper.getSetting("shuffle_kokiri_sword");
    }

    // Ocarinas
    else if (location.vanillaItem === "Ocarina") {
      return SettingsHelper.getSetting("shuffle_ocarinas");
    }

    // Giant's Knife
    else if (location.vanillaItem === "Giants Knife") {
      return SettingsHelper.getSetting("shuffle_expensive_merchants");
    }

    // Bombchu Bowling 3rd and 4th prizes (must be checked before Bombchu vanilla items!)
    else if (_.includes(["Market Bombchu Bowling Bombchus", "Market Bombchu Bowling Bomb"], location.locationName)) {
      return false;
    }

    // Bombchus
    else if (_.includes(["Bombchus", "Bombchus (5)", "Bombchus (10)", "Bombchus (20)"], location.vanillaItem)) {
      return (
        location.locationName !== "Wasteland Bombchu Salesman" || SettingsHelper.getSetting("shuffle_expensive_merchants")
      );
    }

    // Blue Potion from Granny's Potion Shop
    else if (location.vanillaItem === "Blue Potion") {
      return SettingsHelper.getSetting("shuffle_expensive_merchants");
    }

    // Cows
    else if (location.vanillaItem === "Milk") {
      return SettingsHelper.getSetting("shuffle_cows");
    }

    // Gerudo Card
    else if (location.vanillaItem === "Gerudo Membership Card") {
      return SettingsHelper.getSetting("shuffle_gerudo_card") && SettingsHelper.getSetting("gerudo_fortress") !== "open";
    }

    // Magic Beans
    else if (location.vanillaItem === "Buy Magic Bean") {
      return SettingsHelper.getSetting("shuffle_beans");
    }

    // Frogs Purple Rupees
    else if (_.startsWith(location.locationName, "ZR Frogs ") && location.vanillaItem === "Rupees (50)") {
      return SettingsHelper.getSetting("shuffle_frog_song_rupees");
    }

    // 100 Gold Skulltula Reward
    else if (location.locationName === "Kak 100 Gold Skulltula Reward") {
      return SettingsHelper.getSetting("shuffle_100_skulltula_rupee");
    }

    // Hyrule Loach Reward
    else if (location.locationName === "LH Loach Fishing") {
      return SettingsHelper.getSetting("shuffle_loach_reward") !== "off";
    }

    // Adult Trade Quest Items
    else if (_.includes(ADULT_TRADE_ITEMS, location.vanillaItem)) {
      const adultTradeShuffle = SettingsHelper.getSetting("adult_trade_shuffle");
      const adultTradeStart = SettingsHelper.getSetting("adult_trade_start");
      if (!adultTradeShuffle) {
        return location.vanillaItem === "Pocket Egg" && adultTradeStart;
      } else if (_.includes(adultTradeStart, location.vanillaItem)) {
        return true;
      } else {
        return location.vanillaItem === "Pocket Egg" && _.includes(adultTradeStart, "Pocket Cucco");
      }
    }

    // Child Trade Quest Items
    else if (_.includes(CHILD_TRADE_ITEMS, location.vanillaItem)) {
      const shuffleChildTrade = SettingsHelper.getSetting("shuffle_child_trade");
      if (location.vanillaItem === "Weird Egg" && SettingsHelper.getRenamedAttribute("skip_child_zelda")) {
        return false;
      } else if (!shuffleChildTrade) {
        return false;
      } else if (_.includes(shuffleChildTrade, location.vanillaItem)) {
        return true;
      } else {
        return location.vanillaItem === "Weird Egg" && _.includes(shuffleChildTrade, "Chicken");
      }
    }

    // Gerudo Fortress Freestanding Heart Piece
    else if (location.vanillaItem === "Piece of Heart (Out of Logic)") {
      return SettingsHelper.getSetting("shuffle_gerudo_fortress_heart_piece") === "shuffle";
    }

    // Thieves' Hideout
    else if (location.vanillaItem === "Small Key (Thieves Hideout)") {
      const gerudoFortress = SettingsHelper.getSetting("gerudo_fortress");
      if (
        gerudoFortress === "open" ||
        (gerudoFortress === "fast" && location.locationName !== "Hideout 1 Torch Jail Gerudo Key")
      ) {
        return false;
      } else {
        return SettingsHelper.getSetting("shuffle_hideoutkeys") !== "vanilla";
      }
    }

    // Treasure Chest Game Key Shuffle
    else if (
      _.startsWith(location.locationName, "Market Treasure Chest Game ") &&
      location.vanillaItem !== "Piece of Heart (Treasure Chest Game)"
    ) {
      const shuffleTcgkeys = SettingsHelper.getSetting("shuffle_tcgkeys");
      if (_.includes(["regional", "overworld", "any_dungeon", "keysanity"], shuffleTcgkeys)) {
        return true;
      } else if (shuffleTcgkeys === "remove") {
        return true;
      } else {
        return false;
      }
    }

    // Freestanding Rupees and Hearts
    else if (_.includes(["ActorOverride", "Freestanding", "RupeeTower"], location.type)) {
      const shuffleFreestanding = SettingsHelper.getSetting("shuffle_freestanding_items");
      if (shuffleFreestanding === "all") {
        return true;
      } else if (shuffleFreestanding === "dungeons" && location.isDungeon) {
        return true;
      } else if (shuffleFreestanding === "overworld" && !location.isDungeon) {
        return true;
      } else {
        return false;
      }
    }

    // Pots
    else if (_.includes(["Pot", "FlyingPot"], location.type)) {
      if (location.vanillaItem === "Nothing" && !SettingsHelper.getSetting("shuffle_empty_pots")) {
        return false;
      }
      const shufflePots = SettingsHelper.getSetting("shuffle_pots");
      if (shufflePots === "all") {
        return true;
      } else if (shufflePots === "dungeons" && location.isDungeon) {
        return true;
      } else if (shufflePots === "overworld" && !location.isDungeon) {
        return true;
      } else {
        return false;
      }
    }

    // Crates
    else if (_.includes(["Crate", "SmallCrate"], location.type)) {
      if (location.vanillaItem === "Nothing" && !SettingsHelper.getSetting("shuffle_empty_crates")) {
        return false;
      }
      const shuffleCrates = SettingsHelper.getSetting("shuffle_crates");
      if (shuffleCrates === "all") {
        return true;
      } else if (shuffleCrates === "dungeons" && location.isDungeon) {
        return true;
      } else if (shuffleCrates === "overworld" && !location.isDungeon) {
        return true;
      } else {
        return false;
      }
    }

    // Beehives
    else if (location.type === "Beehive") {
      return SettingsHelper.getSetting("shuffle_beehives");
    }

    // Wonderitems
    else if (location.type === "Wonderitem") {
      return SettingsHelper.getSetting("shuffle_wonderitems");
    }

    // Dungeon Rewards
    else if (location.locationName === "ToT Reward from Rauru") {
      return SettingsHelper.getSetting("shuffle_dungeon_rewards") === "vanilla";
    } else if (location.type === "Boss") {
      return _.includes(["any_dungeon", "overworld", "regional", "anywhere"], SettingsHelper.getSetting("shuffle_dungeon_rewards"));
    }

    // Ganon boss key
    else if (location.vanillaItem === "Boss Key (Ganons Castle)") {
      const shuffleGanonBosskey = SettingsHelper.getSetting("shuffle_ganon_bosskey");
      return shuffleGanonBosskey !== "vanilla";
    }

    // Dungeon Items
    else if (location.isDungeon) {
      // Boss Key
      if (_.startsWith(location.vanillaItem, "Boss Key")) {
        // Boss Key chests always show as progress locations, even if vanilla
        return true;
      }
      // Map or Compass
      else if (_.startsWith(location.vanillaItem, "Map") || _.startsWith(location.vanillaItem, "Compass")) {
        // Map and Compass chests always show as progress locations, even if vanilla
        return true;
      }
      // Small Key
      else if (_.startsWith(location.vanillaItem, "Small Key")) {
        // Small Key chests always show as progress locations, even if vanilla
        return true;
      }
      // Silver Rupee
      else if (location.type === "SilverRupee") {
        const shuffleSilverRupees = SettingsHelper.getSetting("shuffle_silver_rupees");
        if (shuffleSilverRupees === "vanilla") {
          return false;
        } else {
          return true;
        }
      }
      // Any other item in a dungeon.
      else if (_.includes(["Chest", "NPC", "Song", "Collectable", "Cutscene", "BossHeart"], location.type)) {
        return true;
      }
      // Remaining locations default to false.
      else {
        return false;
      }
    }

    // The rest of the overworld items.
    else if (_.includes(["Chest", "NPC", "Song", "Collectable", "Cutscene", "BossHeart"], location.type)) {
      return true;
    }

    // Remaining locations default to false.
    else {
      return false;
    }
  }

  static *_iterateLocations() {
    // Yield overworld locations
    for (const regionData of Object.values(this.locations.overworld)) {
      for (const [name, data] of Object.entries(regionData)) {
        yield [name, data];
      }
    }

    // Yield dungeon locations based on MQ settings
    for (const dungeonName of DUNGEONS) {
      const source = SettingsHelper.isMQDungeon(dungeonName)
        ? this.locations.dungeon_mq[dungeonName]
        : this.locations.dungeon[dungeonName];

      if (source) {
        for (const [name, data] of Object.entries(source)) {
          yield [name, data];
        }
      }
    }
  }

  static mapLocationsToHintAreas() {
    const newLocations = new Map();

    for (const [locationName, locationData] of this._iterateLocations()) {
      const hintRegionName = this.regionMap[locationData.parentRegion];
      _.set(newLocations, hintRegionName, _.union(newLocations[hintRegionName], [locationName]));
    }

    return newLocations;
  }

  static removeRegionPrefix(locationName, regionName) {
    const regionShortName = HINT_REGIONS_SHORT_NAMES[regionName];

    if (_.startsWith(locationName, regionShortName)) {
      // Trim the short name for the region from the location name
      return locationName.slice(_.size(regionShortName) + 1);
    } else if (_.startsWith(locationName, regionName)) {
      // Trim the full name for the region from the location name
      return locationName.slice(_.size(regionName) + 1);
    } else if (regionName === "Desert Colossus" && _.startsWith(locationName, "Colossus ")) {
      // Special case: locations in the "Desert Colossus" region start with just "Colossus", so trim that off
      return locationName.slice(_.size("Colossus "));
    }

    // Nothing to trim, return back the location name
    return locationName;
  }
}

export default Locations;
