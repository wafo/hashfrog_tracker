import _ from "lodash";

import CHILD_TRADE_ITEMS from "../data/child-trade-items.json";
import DUNGEONS from "../data/dungeons.json";
import HINT_REGIONS_SHORT_NAMES from "../data/hint-regions-short-names.json";
import HINT_REGIONS from "../data/hint-regions.json";
import LOCATION_TABLE from "../data/location-table.json";
import TRADE_ITEMS from "../data/trade-items.json";

import { parseRule } from "./rule-parser";
import SettingsHelper from "./settings-helper";

class Locations {
  static initialize(dungeonFiles, dungeonMQFiles, bossesFile, overworldFile) {
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

    this.regionMap = new Map();
    _.forEach(HINT_REGIONS, (hintRegionData, hintRegionName) => {
      _.forEach(hintRegionData, regionName => {
        _.set(this.regionMap, regionName, hintRegionName);
      });
    });

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

    // TODO: Include this in the normal flow to always have a regions object up to date ?
    // Not really optimized, so leaving it out for now.
    // updateHintRegionsJSON(_.set(dungeonFiles, "Overworld", overworldFile));
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
            const [type, vanillaItem] = LOCATION_TABLE[locationName];

            if (_.startsWith(type, "Hint")) {
              // Ignore hint locations
              return;
            } else if (_.isEqual(type, "Drop")) {
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
              if (_.isEqual(type, "GS Token")) {
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
            // Don't stop if an unknown location pops up
            // console.warn(`Location [${locationName}] missing from location-table.json`); // Alert that a location is missing.
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

  static getDropLocations(dropName) {
    const dungeonsMQ = SettingsHelper.getSetting("mq_dungeons_specific") || [];
    const results = [];

    // Check overworld
    for (const regionData of Object.values(this.dropLocations.overworld)) {
      if (dropName in regionData) {
        results.push(...regionData[dropName]);
      }
    }

    // Check dungeons based on MQ settings
    for (const dungeonName of DUNGEONS) {
      const source = _.includes(dungeonsMQ, dungeonName)
        ? this.dropLocations.dungeon_mq[dungeonName]
        : this.dropLocations.dungeon[dungeonName];

      if (source && dropName in source) {
        results.push(...source[dropName]);
      }
    }

    return results.length > 0 ? results : null;
  }

  static getEvent(eventName) {
    const dungeonsMQ = SettingsHelper.getSetting("mq_dungeons_specific") || [];
    const results = [];

    // Check overworld
    for (const regionData of Object.values(this.events.overworld)) {
      if (eventName in regionData) {
        results.push(...regionData[eventName]);
      }
    }

    // Check dungeons based on MQ settings
    for (const dungeonName of DUNGEONS) {
      const source = _.includes(dungeonsMQ, dungeonName)
        ? this.events.dungeon_mq[dungeonName]
        : this.events.dungeon[dungeonName];

      if (source && eventName in source) {
        results.push(...source[eventName]);
      }
    }

    return results.length > 0 ? results : null;
  }

  static getExitsForRegion(regionName) {
    const dungeonsMQ = SettingsHelper.getSetting("mq_dungeons_specific") || [];

    // Check overworld
    for (const regionExits of Object.values(this.exits.overworld)) {
      if (regionName in regionExits) {
        return regionExits[regionName];
      }
    }

    // Check dungeons based on MQ settings
    for (const dungeonName of DUNGEONS) {
      const source = _.includes(dungeonsMQ, dungeonName)
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
      (_.isEqual(itemName, "Boss Key (Ganons Castle)") && _.isEqual(SettingsHelper.getSetting("shuffle_ganon_bosskey"), "vanilla")) ||
      (_.startsWith(itemName, "Boss Key ") && _.isEqual(SettingsHelper.getSetting("shuffle_bosskeys"), "vanilla")) ||
      (_.isEqual(itemName, "Small Key (Thieves Hideout)") && _.isEqual(SettingsHelper.getSetting("shuffle_hideoutkeys"), "vanilla")) ||
      (_.startsWith(itemName, "Silver Rupee ") && _.isEqual(SettingsHelper.getSetting("shuffle_silver_rupees"), "vanilla")) ||
      (_.startsWith(itemName, "Small Key ") && _.isEqual(SettingsHelper.getSetting("shuffle_smallkeys"), "vanilla")) ||
      (_.isEqual(itemName, "Small Key (Treasure Chest Game)") && _.isEqual(SettingsHelper.getSetting("shuffle_tcgkeys"), "vanilla"))
    );
  }

  static getKeyLocationsForRegion(regionName) {
    const dungeonsMQ = SettingsHelper.getSetting("mq_dungeons_specific") || [];
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
      const source = _.includes(dungeonsMQ, dungeonName)
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
    const dungeonsMQ = SettingsHelper.getSetting("mq_dungeons_specific") || [];

    // Check overworld first (most common case)
    for (const regionData of Object.values(this.locations.overworld)) {
      if (locationName in regionData) {
        return regionData[locationName];
      }
    }

    // Check dungeons based on MQ settings
    for (const dungeonName of DUNGEONS) {
      const source = _.includes(dungeonsMQ, dungeonName)
        ? this.locations.dungeon_mq[dungeonName]
        : this.locations.dungeon[dungeonName];

      if (source && locationName in source) {
        return source[locationName];
      }
    }

    return null;
  }

  static getSkullsLocations() {
    const dungeonsMQ = SettingsHelper.getSetting("mq_dungeons_specific") || [];
    let results = [];

    // Add overworld skulls
    for (const skullsList of Object.values(this.skullsLocations.overworld)) {
      results = _.union(results, skullsList);
    }

    // Add dungeon skulls based on MQ settings
    for (const dungeonName of DUNGEONS) {
      const source = _.includes(dungeonsMQ, dungeonName)
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
      ) || _.isEqual(location.type, "Drop")
    );
  }

  static isProgressLocation(location) {
    // source: ItemPool.py get_pool_core()

    if (_.isEqual(location.vanillaItem, "None")) {
      return false;
    }

    // Song from Impa
    else if (_.isEqual(location.locationName, "Song from Impa")) {
      return !SettingsHelper.getRenamedAttribute("skip_child_zelda");
    }

    // Disabled Locations
    else if (_.includes(SettingsHelper.getSetting("disabled_locations"), location.locationName)) {
      return false;
    }

    // Always Placed Items
    else if (this._isAlwaysPlacedLocation(location)) {
      return false;
    }

    // Gold Skulltula Tokens
    else if (_.isEqual(location.vanillaItem, "Gold Skulltula Token")) {
      const tokensanity = SettingsHelper.getSetting("tokensanity");
      return (
        _.isEqual(tokensanity, "all") ||
        (_.isEqual(tokensanity, "dungeons") && location.isDungeon) ||
        (_.isEqual(tokensanity, "overworld") && !location.isDungeon)
      );
    }

    // Shops
    else if (_.isEqual(location.type, "Shop")) {
      const shopsanity = SettingsHelper.getSetting("shopsanity");
      if (_.isEqual(shopsanity, "off")) {
        return false;
      } else if (_.isEqual(shopsanity, "random")) {
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
        return !_.isEqual(SettingsHelper.getSetting("shuffle_scrubs"), "off");
      }
    }

    // Kokiri Sword
    else if (_.isEqual(location.vanillaItem, "Kokiri Sword")) {
      return SettingsHelper.getSetting("shuffle_kokiri_sword");
    }

    // Ocarinas
    else if (_.isEqual(location.vanillaItem, "Ocarina")) {
      return SettingsHelper.getSetting("shuffle_ocarinas");
    }

    // Giant's Knife
    else if (_.isEqual(location.vanillaItem, "Giants Knife")) {
      return SettingsHelper.getSetting("shuffle_expensive_merchants");
    }

    // Bombchu Bowling 3rd and 4th prizes (must be checked before Bombchu vanilla items!)
    else if (_.includes(["Market Bombchu Bowling Bombchus", "Market Bombchu Bowling Bomb"], location.locationName)) {
      return false;
    }

    // Bombchus
    else if (_.includes(["Bombchus", "Bombchus (5)", "Bombchus (10)", "Bombchus (20)"], location.vanillaItem)) {
      return (
        !_.isEqual(location.locationName, "Wasteland Bombchu Salesman") || SettingsHelper.getSetting("shuffle_expensive_merchants")
      );
    }

    // Blue Potion from Granny's Potion Shop
    else if (_.isEqual(location.vanillaItem, "Blue Potion")) {
      return SettingsHelper.getSetting("shuffle_expensive_merchants");
    }

    // Cows
    else if (_.isEqual(location.vanillaItem, "Milk")) {
      return SettingsHelper.getSetting("shuffle_cows");
    }

    // Gerudo Card
    else if (_.isEqual(location.vanillaItem, "Gerudo Membership Card")) {
      return SettingsHelper.getSetting("shuffle_gerudo_card") && !_.isEqual(SettingsHelper.getSetting("gerudo_fortress"), "open");
    }

    // Magic Beans
    else if (_.isEqual(location.vanillaItem, "Buy Magic Bean")) {
      return SettingsHelper.getSetting("shuffle_beans");
    }

    // Frogs Purple Rupees
    else if (_.startsWith(location.locationName, "ZR Frogs ") && _.isEqual(location.vanillaItem, "Rupees (50)")) {
      return SettingsHelper.getSetting("shuffle_frog_song_rupees");
    }

    // 100 Gold Skulltula Reward
    else if (_.isEqual(location.locationName, "Kak 100 Gold Skulltula Reward")) {
      return SettingsHelper.getSetting("shuffle_100_skulltula_rupee");
    }

    // Hyrule Loach Reward
    else if (_.isEqual(location.locationName, "LH Loach Fishing")) {
      return !_.isEqual(SettingsHelper.getSetting("shuffle_loach_reward"), "off");
    }

    // Adult Trade Quest Items
    else if (_.includes(TRADE_ITEMS, location.vanillaItem)) {
      const adultTradeShuffle = SettingsHelper.getSetting("adult_trade_shuffle");
      const adultTradeStart = SettingsHelper.getSetting("adult_trade_start");
      if (!adultTradeShuffle) {
        return _.isEqual(location.vanillaItem, "Pocket Egg") && adultTradeStart;
      } else if (_.includes(adultTradeStart, location.vanillaItem)) {
        return true;
      } else {
        return _.isEqual(location.vanillaItem, "Pocket Egg") && _.includes(adultTradeStart, "Pocket Cucco");
      }
    }

    // Child Trade Quest Items
    else if (_.includes(CHILD_TRADE_ITEMS, location.vanillaItem)) {
      const shuffleChildTrade = SettingsHelper.getSetting("shuffle_child_trade");
      if (_.isEqual(location.vanillaItem, "Weird Egg") && SettingsHelper.getRenamedAttribute("skip_child_zelda")) {
        return false;
      } else if (!shuffleChildTrade) {
        return false;
      } else if (_.includes(shuffleChildTrade, location.vanillaItem)) {
        return true;
      } else {
        return _.isEqual(location.vanillaItem, "Weird Egg") && _.includes(shuffleChildTrade, "Chicken");
      }
    }

    // Gerudo Fortress Freestanding Heart Piece
    else if (_.isEqual(location.vanillaItem, "Piece of Heart (Out of Logic)")) {
      return _.isEqual(SettingsHelper.getSetting("shuffle_gerudo_fortress_heart_piece"), "shuffle");
    }

    // Thieves' Hideout
    else if (_.isEqual(location.vanillaItem, "Small Key (Thieves Hideout)")) {
      const gerudoFortress = SettingsHelper.getSetting("gerudo_fortress");
      if (
        _.isEqual(gerudoFortress, "open") ||
        (_.isEqual(gerudoFortress, "fast") && !_.isEqual(location.locationName, "Hideout 1 Torch Jail Gerudo Key"))
      ) {
        return false;
      } else {
        return !_.isEqual(SettingsHelper.getSetting("shuffle_hideoutkeys"), "vanilla");
      }
    }

    // Treasure Chest Game Key Shuffle
    else if (
      _.startsWith(location.locationName, "Market Treasure Chest Game ") &&
      !_.isEqual(location.vanillaItem, "Piece of Heart (Treasure Chest Game)")
    ) {
      const shuffleTcgkeys = SettingsHelper.getSetting("shuffle_tcgkeys");
      if (_.includes(["regional", "overworld", "any_dungeon", "keysanity"], shuffleTcgkeys)) {
        return true;
      } else if (_.isEqual(shuffleTcgkeys, "remove")) {
        return true;
      } else {
        return false;
      }
    }

    // Freestanding Rupees and Hearts
    else if (_.includes(["ActorOverride", "Freestanding", "RupeeTower"], location.type)) {
      const shuffleFreestanding = SettingsHelper.getSetting("shuffle_freestanding_items");
      if (_.isEqual(shuffleFreestanding, "all")) {
        return true;
      } else if (_.isEqual(shuffleFreestanding, "dungeons") && location.isDungeon) {
        return true;
      } else if (_.isEqual(shuffleFreestanding, "overworld") && !location.isDungeon) {
        return true;
      } else {
        return false;
      }
    }

    // Pots
    else if (_.includes(["Pot", "FlyingPot"], location.type)) {
      const shufflePots = SettingsHelper.getSetting("shuffle_pots");
      if (_.isEqual(shufflePots, "all")) {
        return true;
      } else if (_.isEqual(shufflePots, "dungeons") && location.isDungeon) {
        return true;
      } else if (_.isEqual(shufflePots, "overworld") && !location.isDungeon) {
        return true;
      } else {
        return false;
      }
    }

    // Crates
    else if (_.includes(["Crate", "SmallCrate"], location.type)) {
      const shuffleCrates = SettingsHelper.getSetting("shuffle_crates");
      if (_.isEqual(shuffleCrates, "all")) {
        return true;
      } else if (_.isEqual(shuffleCrates, "dungeons") && location.isDungeon) {
        return true;
      } else if (_.isEqual(shuffleCrates, "overworld") && !location.isDungeon) {
        return true;
      } else {
        return false;
      }
    }

    // Beehives
    else if (_.isEqual(location.type, "Beehive")) {
      return SettingsHelper.getSetting("shuffle_beehives");
    }

    // Wonderitems
    else if (_.isEqual(location.type, "Wonderitem")) {
      return SettingsHelper.getSetting("shuffle_wonderitems");
    }

    // Dungeon Rewards
    else if (_.isEqual(location.locationName, "ToT Reward from Rauru")) {
      return _.isEqual(SettingsHelper.getSetting("shuffle_dungeon_rewards"), "vanilla");
    } else if (_.isEqual(location.type, "Boss")) {
      return _.includes(["any_dungeon", "overworld", "regional", "anywhere"], SettingsHelper.getSetting("shuffle_dungeon_rewards"));
    }

    // Ganon boss key
    else if (_.isEqual(location.vanillaItem, "Boss Key (Ganons Castle)")) {
      const shuffleGanonBosskey = SettingsHelper.getSetting("shuffle_ganon_bosskey");
      if (_.isEqual(shuffleGanonBosskey, "vanilla")) {
        return false;
      }
      return _.includes(["remove", "any_dungeon", "overworld", "keysanity", "regional"], shuffleGanonBosskey);
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
      else if (_.isEqual(location.type, "SilverRupee")) {
        const shuffleSilverRupees = SettingsHelper.getSetting("shuffle_silver_rupees");
        if (_.isEqual(shuffleSilverRupees, "vanilla")) {
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
    const dungeonsMQ = SettingsHelper.getSetting("mq_dungeons_specific") || [];

    // Yield overworld locations
    for (const regionData of Object.values(this.locations.overworld)) {
      for (const [name, data] of Object.entries(regionData)) {
        yield [name, data];
      }
    }

    // Yield dungeon locations based on MQ settings
    for (const dungeonName of DUNGEONS) {
      const source = _.includes(dungeonsMQ, dungeonName)
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
      return _.slice(locationName, _.size(regionShortName) + 1);
    } else if (_.startsWith(locationName, regionName)) {
      // Trim the full name for the region from the location name
      return _.slice(locationName, _.size(regionName) + 1);
    } else if (_.isEqual(regionName, "Desert Colossus") && _.startsWith(locationName, "Colossus ")) {
      // Special case: locations in the "Desert Colossus" region start with just "Colossus", so trim that off
      return _.slice(locationName, _.size("Colossus "));
    }

    // Nothing to trim, return back the location name
    return locationName;
  }
}

export default Locations;
