import _ from "lodash";

import CHILD_TRADE_ITEMS from "../data/child-trade-items.json";
import DUNGEONS from "../data/dungeons.json";
import HINT_REGIONS_SHORT_NAMES from "../data/hint-regions-short-names.json";
import HINT_REGIONS from "../data/hint-regions.json";
import LOCATION_TABLE from "../data/location-table.json";
import TRADE_ITEMS from "../data/trade-items.json";

import { parseRule } from "./rule-parser";
import { getRenamedAttribute, getSetting } from "./settings-helper";

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

    this.activeLocations = new Map();
    this.activeDropLocations = new Map();
    this.activeSkullsLocations = [];
    this.activeKeyLocations = new Map();
    this.activeEvents = new Map();
    this.activeExits = new Map();

    // TODO: Include this in the normal flow to always have a regions object up to date ?
    // Not really optimized, so leaving it out for now.
    // updateHintRegionsJSON(_.set(dungeonFiles, "Overworld", overworldFile));
  }

  static isAlwaysPlacedLocation(location) {
    return (
      _.includes(
        ["Triforce", "Scarecrow Song", "Deliver Letter", "Time Travel", "Bombchu Drop"],
        location.vanillaItem,
      ) || _.isEqual(location.type, "Drop")
    );
  }

  static isGuaranteedKey(location) {
    const itemName = location.vanillaItem;

    return (
      (_.isEqual(itemName, "Boss Key (Ganons Castle)") && _.isEqual(getSetting("shuffle_ganon_bosskey"), "vanilla")) ||
      (_.startsWith(itemName, "Boss Key ") && _.isEqual(getSetting("shuffle_bosskeys"), "vanilla")) ||
      (_.isEqual(itemName, "Small Key (Thieves Hideout)") && _.isEqual(getSetting("shuffle_hideoutkeys"), "vanilla")) ||
      (_.startsWith(itemName, "Silver Rupee ") && _.isEqual(getSetting("shuffle_silver_rupees"), "vanilla")) ||
      (_.startsWith(itemName, "Small Key ") && _.isEqual(getSetting("shuffle_smallkeys"), "vanilla")) ||
      (_.isEqual(itemName, "Small Key (Treasure Chest Game)") && _.isEqual(getSetting("shuffle_tcgkeys"), "vanilla"))
    );
  }

  static isProgressLocation(location) {
    // source: ItemPool.py get_pool_core()

    if (_.isEqual(location.vanillaItem, "None")) {
      return false;
    }

    // Song from Impa
    else if (_.isEqual(location.locationName, "Song from Impa")) {
      return !getRenamedAttribute("skip_child_zelda");
    }

    // Disabled Locations
    else if (_.includes(getSetting("disabled_locations"), location.locationName)) {
      return false;
    }

    // Always Placed Items
    else if (Locations.isAlwaysPlacedLocation(location)) {
      return false;
    }

    // Gold Skulltula Tokens
    else if (_.isEqual(location.vanillaItem, "Gold Skulltula Token")) {
      const tokensanity = getSetting("tokensanity");
      return (
        _.isEqual(tokensanity, "all") ||
        (_.isEqual(tokensanity, "dungeons") && location.isDungeon) ||
        (_.isEqual(tokensanity, "overworld") && !location.isDungeon)
      );
    }

    // Shops
    else if (_.isEqual(location.type, "Shop")) {
      const shopsanity = getSetting("shopsanity");
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
        return !_.isEqual(getSetting("shuffle_scrubs"), "off");
      }
    }

    // Kokiri Sword
    else if (_.isEqual(location.vanillaItem, "Kokiri Sword")) {
      return getSetting("shuffle_kokiri_sword");
    }

    // Ocarinas
    else if (_.isEqual(location.vanillaItem, "Ocarina")) {
      return getSetting("shuffle_ocarinas");
    }

    // Giant's Knife
    else if (_.isEqual(location.vanillaItem, "Giants Knife")) {
      return getSetting("shuffle_expensive_merchants");
    }

    // Bombchu Bowling 3rd and 4th prizes (must be checked before Bombchu vanilla items!)
    else if (_.includes(["Market Bombchu Bowling Bombchus", "Market Bombchu Bowling Bomb"], location.locationName)) {
      return false;
    }

    // Bombchus
    else if (_.includes(["Bombchus", "Bombchus (5)", "Bombchus (10)", "Bombchus (20)"], location.vanillaItem)) {
      return (
        !_.isEqual(location.locationName, "Wasteland Bombchu Salesman") || getSetting("shuffle_expensive_merchants")
      );
    }

    // Blue Potion from Granny's Potion Shop
    else if (_.isEqual(location.vanillaItem, "Blue Potion")) {
      return getSetting("shuffle_expensive_merchants");
    }

    // Cows
    else if (_.isEqual(location.vanillaItem, "Milk")) {
      return getSetting("shuffle_cows");
    }

    // Gerudo Card
    else if (_.isEqual(location.vanillaItem, "Gerudo Membership Card")) {
      return getSetting("shuffle_gerudo_card") && !_.isEqual(getSetting("gerudo_fortress"), "open");
    }

    // Magic Beans
    else if (_.isEqual(location.vanillaItem, "Buy Magic Bean")) {
      return getSetting("shuffle_beans");
    }

    // Frogs Purple Rupees
    else if (_.startsWith(location.locationName, "ZR Frogs ") && _.isEqual(location.vanillaItem, "Rupees (50)")) {
      return getSetting("shuffle_frog_song_rupees");
    }

    // 100 Gold Skulltula Reward
    else if (_.isEqual(location.locationName, "Kak 100 Gold Skulltula Reward")) {
      return getSetting("shuffle_100_skulltula_rupee");
    }

    // Hyrule Loach Reward
    else if (_.isEqual(location.locationName, "LH Loach Fishing")) {
      return !_.isEqual(getSetting("shuffle_loach_reward"), "off");
    }

    // Adult Trade Quest Items
    else if (_.includes(TRADE_ITEMS, location.vanillaItem)) {
      const adultTradeShuffle = getSetting("adult_trade_shuffle");
      const adultTradeStart = getSetting("adult_trade_start");
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
      const shuffleChildTrade = getSetting("shuffle_child_trade");
      if (_.isEqual(location.vanillaItem, "Weird Egg") && getRenamedAttribute("skip_child_zelda")) {
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
      return _.isEqual(getSetting("shuffle_gerudo_fortress_heart_piece"), "shuffle");
    }

    // Thieves' Hideout
    else if (_.isEqual(location.vanillaItem, "Small Key (Thieves Hideout)")) {
      const gerudoFortress = getSetting("gerudo_fortress");
      if (
        _.isEqual(gerudoFortress, "open") ||
        (_.isEqual(gerudoFortress, "fast") && !_.isEqual(location.locationName, "Hideout 1 Torch Jail Gerudo Key"))
      ) {
        return false;
      } else {
        return !_.isEqual(getSetting("shuffle_hideoutkeys"), "vanilla");
      }
    }

    // Treasure Chest Game Key Shuffle
    else if (
      _.startsWith(location.locationName, "Market Treasure Chest Game ") &&
      !_.isEqual(location.vanillaItem, "Piece of Heart (Treasure Chest Game)")
    ) {
      const shuffleTcgkeys = getSetting("shuffle_tcgkeys");
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
      const shuffleFreestanding = getSetting("shuffle_freestanding_items");
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
      const shufflePots = getSetting("shuffle_pots");
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
      const shuffleCrates = getSetting("shuffle_crates");
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
      return getSetting("shuffle_beehives");
    }

    // Wonderitems
    else if (_.isEqual(location.type, "Wonderitem")) {
      return getSetting("shuffle_wonderitems");
    }

    // Dungeon Rewards
    else if (_.isEqual(location.locationName, "ToT Reward from Rauru")) {
      return _.isEqual(getSetting("shuffle_dungeon_rewards"), "vanilla");
    } else if (_.isEqual(location.type, "Boss")) {
      return _.includes(["any_dungeon", "overworld", "regional", "anywhere"], getSetting("shuffle_dungeon_rewards"));
    }

    // Ganon boss key
    else if (_.isEqual(location.vanillaItem, "Boss Key (Ganons Castle)")) {
      const shuffleGanonBosskey = getSetting("shuffle_ganon_bosskey");
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
        const shuffleSilverRupees = getSetting("shuffle_silver_rupees");
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

  static mapLocationsToHintAreas() {
    const newLocations = new Map();

    _.forEach(this.activeLocations, (locationData, locationName) => {
      const hintRegionName = this.regionMap[locationData.parentRegion];
      _.set(newLocations, hintRegionName, _.union(newLocations[hintRegionName], [locationName]));
    });

    return newLocations;
  }

  static _getDungeonSource(sourceMap, dungeonName, dungeonsMQ) {
    return _.includes(dungeonsMQ, dungeonName)
      ? sourceMap.dungeon_mq[dungeonName]
      : sourceMap.dungeon[dungeonName];
  }

  static _buildActiveMap(sourceMap, dungeonsMQ, copyFn) {
    const activeMap = new Map();

    // Copy dungeon data (MQ or non-MQ based on settings)
    _.forEach(DUNGEONS, dungeonName => {
      const source = this._getDungeonSource(sourceMap, dungeonName, dungeonsMQ);
      _.forEach(source, (data, name) => copyFn(activeMap, name, data));
    });

    // Copy overworld data
    _.forEach(_.values(sourceMap.overworld), regionData => {
      _.forEach(regionData, (data, name) => copyFn(activeMap, name, data));
    });

    return activeMap;
  }

  static resetActiveLocations() {
    const dungeonsMQ = getSetting("mq_dungeons_specific");

    const simpleCopy = (activeMap, name, data) => _.set(activeMap, name, data);
    const unionCopy = (activeMap, name, data) => _.set(activeMap, name, _.union(activeMap[name], data));

    // Locations, Events, Exits
    this.activeLocations = this._buildActiveMap(this.locations, dungeonsMQ, simpleCopy);
    this.activeEvents = this._buildActiveMap(this.events, dungeonsMQ, simpleCopy);
    this.activeExits = this._buildActiveMap(this.exits, dungeonsMQ, simpleCopy);

    // Drop locations
    this.activeDropLocations = this._buildActiveMap(this.dropLocations, dungeonsMQ, unionCopy);

    // Skulls locations
    this.activeSkullsLocations = [];
    _.forEach(DUNGEONS, dungeonName => {
      const source = this._getDungeonSource(this.skullsLocations, dungeonName, dungeonsMQ);
      this.activeSkullsLocations = _.union(this.activeSkullsLocations, source);
    });
    _.forEach(_.values(this.skullsLocations.overworld), skullsLocation => {
      this.activeSkullsLocations = _.union(this.activeSkullsLocations, skullsLocation);
    });

    // Key locations
    this.activeKeyLocations = new Map();
    const addKeyLocation = data => {
      if (Locations.isGuaranteedKey(data)) {
        _.set(
          this.activeKeyLocations,
          data.parentRegion,
          _.union(this.activeKeyLocations[data.parentRegion], [data]),
        );
      }
    };

    _.forEach(DUNGEONS, dungeonName => {
      const source = this._getDungeonSource(this.keyLocations, dungeonName, dungeonsMQ);
      _.forEach(_.values(source), addKeyLocation);
    });
    _.forEach(_.values(this.keyLocations.overworld), keyLocation => {
      _.forEach(_.values(keyLocation), addKeyLocation);
    });
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
            return;
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
}

export default Locations;
