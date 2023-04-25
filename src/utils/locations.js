import _ from "lodash";

import DUNGEONS from "../data/dungeons.json";
import HINT_REGIONS_SHORT_NAMES from "../data/hint-regions-short-names.json";
import HINT_REGIONS from "../data/hint-regions.json";
import LOCATION_TABLE from "../data/location-table.json";

import LogicHelper from "./logic-helper";
// import { updateHintRegionsJSON } from "./utils";

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
    this.activeEvents = new Map();
    this.activeExits = new Map();

    // TODO: Include this in the normal flow to always have a regions object up to date ?
    // Not really optimized, so leaving it out for now.
    // updateHintRegionsJSON(_.set(dungeonFiles, "Overworld", overworldFile));
  }

  static isAlwaysPlacedLocation(location) {
    return (
      _.includes(
        ["Zeldas Letter", "Triforce", "Scarecrow Song", "Deliver Letter", "Time Travel", "Bombchu Drop"],
        location.vanillaItem,
      ) || _.isEqual(location.type, "Drop")
    );
  }

  static isProgressLocation(location) {
    if (_.isEqual(location.vanillaItem, "None")) {
      return false;
    }

    // Song from Impa
    else if (_.isEqual(location.locationName, "Song from Impa")) {
      return !_.isEqual(LogicHelper.settings.shuffle_child_trade, "skip_child_zelda");
    }

    // Disabled Locations
    else if (_.includes(LogicHelper.settings.disabled_locations, location.locationName)) {
      return false;
    }

    // Always Placed Items
    else if (Locations.isAlwaysPlacedLocation(location)) {
      return false;
    }

    // Gold Skulltula Tokens
    else if (_.isEqual(location.vanillaItem, "Gold Skulltula Token")) {
      return (
        _.isEqual(LogicHelper.settings.tokensanity, "all") ||
        (_.isEqual(LogicHelper.settings.tokensanity, "dungeons") && location.isDungeon) ||
        (_.isEqual(LogicHelper.settings.tokensanity, "overworld") && !location.isDungeon)
      );
    }

    // Shops
    else if (_.isEqual(location.type, "Shop")) {
      if (_.isEqual(LogicHelper.settings.shopsanity, "off")) {
        return false;
      } else {
        return _.toInteger(LogicHelper.settings.shopsanity) >= _.toInteger(_.slice(location.locationName, -1));
      }
    }

    // Business Scrubs
    else if (_.includes(["Scrub", "GrottoScrub"], location.type)) {
      if (_.includes(["Piece of Heart", "Deku Stick Capacity", "Deku Nut Capacity"], location.vanillaItem)) {
        return true;
      } else if (_.isEqual(LogicHelper.settings.shuffle_scrubs, "off")) {
        return false;
      } else {
        return true;
      }
    }

    // Kokiri Sword
    else if (_.isEqual(location.vanillaItem, "Kokiri Sword")) {
      return LogicHelper.settings.shuffle_kokiri_sword;
    }

    // Weird Egg
    else if (_.isEqual(location.vanillaItem, "Weird Egg")) {
      if (_.isEqual(LogicHelper.settings.shuffle_child_trade, "skip_child_zelda")) {
        return false;
      } else {
        return !_.isEqual(LogicHelper.settings.shuffle_child_trade, "vanilla");
      }
    }

    // Ocarinas
    else if (_.isEqual(location.vanillaItem, "Ocarina")) {
      return LogicHelper.settings.shuffle_ocarinas;
    }

    // Giant's Knife
    else if (_.isEqual(location.vanillaItem, "Giants Knife")) {
      return LogicHelper.settings.shuffle_medigoron_carpet_salesman;
    }

    // Bombchus
    else if (_.includes(["Bombchus", "Bombchus (5)", "Bombchus (10)", "Bombchus (20)"], location.vanillaItem)) {
      return (
        !_.isEqual(location.locationName, "Wasteland Bombchu Salesman") ||
        LogicHelper.settings.shuffle_medigoron_carpet_salesman
      );
    }

    // Cows
    else if (_.isEqual(location.vanillaItem, "Milk")) {
      return LogicHelper.settings.shuffle_cows;
    }

    // Gerudo Card
    else if (_.isEqual(location.vanillaItem, "Gerudo Membership Card")) {
      return LogicHelper.settings.shuffle_gerudo_card && !_.isEqual(LogicHelper.settings.gerudo_fortress, "open");
    }

    // Magic Beans
    else if (_.isEqual(location.vanillaItem, "Buy Magic Bean")) {
      return LogicHelper.settings.shuffle_beans;
    }

    // Frogs Purple Rupees
    else if (_.startsWith(location.locationName, "ZR Frogs ") && _.isEqual(location.vanillaItem, "Rupees (50)")) {
      return LogicHelper.settings.shuffle_frog_song_rupees;
    }

    // Thieves' Hideout
    else if (_.isEqual(location.vanillaItem, "Small Key (Thieves Hideout)")) {
      return _.includes(["any_dungeon", "overworld", "keysanity"], LogicHelper.settings.shuffle_hideoutkeys);
    }

    // Freestanding Rupees and Hearts
    else if (_.includes(["ActorOverride", "Freestanding", "RupeeTower"], location.type)) {
      if (_.isEqual(LogicHelper.settings.shuffle_freestanding_items, "all")) {
        return true;
      } else if (_.isEqual(LogicHelper.settings.shuffle_freestanding_items, "dungeons") && location.isDungeon) {
        return true;
      } else if (_.isEqual(LogicHelper.settings.shuffle_freestanding_items, "overworld") && !location.isDungeon) {
        return true;
      } else {
        return false;
      }
    }

    // Pots
    else if (_.includes(["Pot", "FlyingPot"], location.type)) {
      if (_.isEqual(LogicHelper.settings.shuffle_pots, "all")) {
        return true;
      } else if (_.isEqual(LogicHelper.settings.shuffle_pots, "dungeons") && location.isDungeon) {
        return true;
      } else if (_.isEqual(LogicHelper.settings.shuffle_pots, "overworld") && !location.isDungeon) {
        return true;
      } else {
        return false;
      }
    }

    // Crates
    else if (_.includes(["Crate", "SmallCrate"], location.type)) {
      if (_.isEqual(LogicHelper.settings.shuffle_crates, "all")) {
        return true;
      } else if (_.isEqual(LogicHelper.settings.shuffle_crates, "dungeons") && location.isDungeon) {
        return true;
      } else if (_.isEqual(LogicHelper.settings.shuffle_crates, "overworld") && !location.isDungeon) {
        return true;
      } else {
        return false;
      }
    }

    // Beehives
    else if (_.isEqual(location.type, "Beehive")) {
      return LogicHelper.settings.shuffle_beehives;
    }

    // Dungeon Items
    else if (location.isDungeon) {
      let shuffleSetting = null;

      // Boss Key
      if (_.startsWith(location.vanillaItem, "Boss Key")) {
        if (!_.startsWith(location, "Ganons Tower")) {
          shuffleSetting = LogicHelper.settings.shuffle_bosskeys;
        } else {
          shuffleSetting = LogicHelper.settings.shuffle_ganon_bosskey;
        }
        if (_.isEqual(shuffleSetting, "vanilla")) {
          // show boss key location even if map/compass is vanilla
          return true;
        } else {
          return true;
        }
      }
      // Map or Compass
      else if (_.startsWith(location.vanillaItem, "Map") || _.startsWith(location.vanillaItem, "Compass")) {
        shuffleSetting = LogicHelper.settings.shuffle_mapcompass;
        if (_.isEqual(shuffleSetting, "vanilla")) {
          // show dungeon location even if map/compass is vanilla
          return true;
        } else {
          return true;
        }
      }
      // Small Key
      else if (_.startsWith(location.vanillaItem, "Small Key")) {
        shuffleSetting = LogicHelper.settings.shuffle_smallkeys;
        if (_.isEqual(shuffleSetting, "vanilla")) {
          // show dungeon location even if small key is vanilla
          return true;
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

  static resetActiveLocations() {
    const dungeonsMQ = LogicHelper.settings.mq_dungeons_specific;

    this.activeLocations = new Map();
    _.forEach(DUNGEONS, dungeonName => {
      if (_.includes(dungeonsMQ, dungeonName)) {
        _.forEach(this.locations.dungeon_mq[dungeonName], (data, name) => {
          _.set(this.activeLocations, name, data);
        });
      } else {
        _.forEach(this.locations.dungeon[dungeonName], (data, name) => {
          _.set(this.activeLocations, name, data);
        });
      }
    });
    _.forEach(_.values(this.locations.overworld), location => {
      _.forEach(location, (data, name) => {
        _.set(this.activeLocations, name, data);
      });
    });

    this.activeDropLocations = new Map();
    _.forEach(DUNGEONS, dungeonName => {
      if (_.includes(dungeonsMQ, dungeonName)) {
        _.forEach(this.dropLocations.dungeon_mq[dungeonName], (data, name) => {
          _.set(this.activeDropLocations, name, _.union(this.activeDropLocations[name], data));
        });
      } else {
        _.forEach(this.dropLocations.dungeon[dungeonName], (data, name) => {
          _.set(this.activeDropLocations, name, _.union(this.activeDropLocations[name], data));
        });
      }
    });
    _.forEach(_.values(this.dropLocations.overworld), dropLocation => {
      _.forEach(dropLocation, (data, name) => {
        _.set(this.activeDropLocations, name, _.union(this.activeDropLocations[name], data));
      });
    });

    this.activeSkullsLocations = [];
    _.forEach(DUNGEONS, dungeonName => {
      if (_.includes(dungeonsMQ, dungeonName)) {
        this.activeSkullsLocations = _.union(this.activeSkullsLocations, this.skullsLocations.dungeon_mq[dungeonName]);
      } else {
        this.activeSkullsLocations = _.union(this.activeSkullsLocations, this.skullsLocations.dungeon[dungeonName]);
      }
    });
    _.forEach(_.values(this.skullsLocations.overworld), skullsLocation => {
      this.activeSkullsLocations = _.union(this.activeSkullsLocations, skullsLocation);
    });

    this.activeEvents = new Map();
    _.forEach(DUNGEONS, dungeonName => {
      if (_.includes(dungeonsMQ, dungeonName)) {
        _.forEach(this.events.dungeon_mq[dungeonName], (data, name) => {
          _.set(this.activeEvents, name, data);
        });
      } else {
        _.forEach(this.events.dungeon[dungeonName], (data, name) => {
          _.set(this.activeEvents, name, data);
        });
      }
    });
    _.forEach(_.values(this.events.overworld), event => {
      _.forEach(event, (data, name) => {
        _.set(this.activeEvents, name, data);
      });
    });

    this.activeExits = new Map();
    _.forEach(DUNGEONS, dungeonName => {
      if (_.includes(dungeonsMQ, dungeonName)) {
        _.forEach(this.exits.dungeon_mq[dungeonName], (data, name) => {
          _.set(this.activeExits, name, data);
        });
      } else {
        _.forEach(this.exits.dungeon[dungeonName], (data, name) => {
          _.set(this.activeExits, name, data);
        });
      }
    });
    _.forEach(_.values(this.exits.overworld), exit => {
      _.forEach(exit, (data, name) => {
        _.set(this.activeExits, name, data);
      });
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
                rule: LogicHelper.parseRule(rule),
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
                rule: LogicHelper.parseRule(rule),
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
            rule: LogicHelper.parseRule(rule),
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
          _.set(this.exits, [locationKey, hintRegion, parentRegion, exitName], LogicHelper.parseRule(rule));
        });
      }
    });
  }
}

export default Locations;
