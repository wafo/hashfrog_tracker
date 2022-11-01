import _ from "lodash";

import HINT_REGIONS_SHORT_NAMES from "../data/hint-regions-short-names.json";
import HINT_REGIONS from "../data/hint-regions.json";
import LOCATION_TABLE from "../data/location-table.json";

import LogicHelper from "./logic-helper";

class Locations {
  static initialize(dungeonFiles, overworldFile) {
    this.locations = new Map();

    this.dropLocations = {};
    this.skullsLocations = [];
    this.events = {};
    this.exits = {};

    this.regionMap = new Map();
    _.forEach(HINT_REGIONS, (hintRegionData, hintRegionName) => {
      _.forEach(hintRegionData, regionName => {
        _.set(this.regionMap, regionName, hintRegionName);
      });
    });

    _.forEach(dungeonFiles, file => {
      this._parseLogicFile(file, true);
    });
    this._parseLogicFile(overworldFile, false);
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
    else if (_.isEqual(location.type, "Shop") && _.isEqual(LogicHelper.settings.shopsanity, "off")) {
      return false;
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
      if (LogicHelper.settings.skip_child_zelda) {
        return false;
      } else {
        return LogicHelper.settings.shuffle_weird_egg;
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
          return false;
        } else {
          return true;
        }
      }
      // Map or Compass
      else if (_.startsWith(location.vanillaItem, "Map") || _.startsWith(location.vanillaItem, "Compass")) {
        shuffleSetting = LogicHelper.settings.shuffle_mapcompass;
        if (_.isEqual(shuffleSetting, "vanilla")) {
          return false;
        } else {
          return true;
        }
      }
      // Small Key
      else if (_.startsWith(location.vanillaItem, "Small Key")) {
        shuffleSetting = LogicHelper.settings.shuffle_smallkeys;
        if (_.isEqual(shuffleSetting, "vanilla")) {
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

    _.forEach(this.locations, (locationData, locationName) => {
      const hintRegionName = this.regionMap[locationData.parentRegion];
      _.set(newLocations, hintRegionName, _.union(newLocations[hintRegionName], [locationName]));
    });

    return newLocations;
  }

  static removeRegionPrefix(locationName, regionName) {
    const regionShortName = HINT_REGIONS_SHORT_NAMES[regionName];

    if (_.startsWith(locationName, regionShortName)) {
      return _.slice(locationName, _.size(regionShortName) + 1);
    } else if (_.startsWith(locationName, regionName)) {
      return _.slice(locationName, _.size(regionName) + 1);
    } else if (_.isEqual(regionName, "Desert Colossus")) {
      if (_.startsWith(locationName, "Colossus ")) return _.slice(locationName, _.size("Colossus "));
    } else if (_.isEqual(regionName, "Inside Ganons Castle")) {
      if (_.startsWith(locationName, "Ganons Castle ")) return _.slice(locationName, _.size("Ganons Castle "));
      if (_.startsWith(locationName, "Ganons Tower ")) return _.slice(locationName, _.size("Ganons Tower "));
    }

    return locationName;
  }

  static _parseLogicFile(logicFile, isDungeon) {
    _.forEach(logicFile, region => {
      if (_.includes(_.keys(region), "locations")) {
        _.forEach(region.locations, (rule, locationName) => {
          try {
            const [type, vanillaItem] = LOCATION_TABLE[locationName];

            if (_.startsWith(type, "Hint")) {
              return;
            } else if (_.isEqual(type, "Drop")) {
              const dropData = {
                parentRegion: region.region_name,
                rule: LogicHelper.parseRule(rule),
              };
              _.set(this.dropLocations, vanillaItem, _.union(this.dropLocations[vanillaItem], [dropData]));
            } else {
              const locationData = {
                isDungeon: isDungeon,
                locationName: locationName,
                parentRegion: region.region_name,
                rule: LogicHelper.parseRule(rule),
                type: type,
                vanillaItem: vanillaItem,
              };
              _.set(this.locations, locationName, locationData);

              if (_.isEqual(type, "GS Token")) {
                this.skullsLocations.push(locationName);
              }
            }
          } catch (error) {
            console.warn(`Location [${locationName}] missing from location-table.json`); // Alert that a location is missing.
            return; // Don't stop if an unknown location pops up
          }
        });
      }

      if (_.includes(_.keys(region), "events")) {
        _.forEach(region.events, (rule, eventName) => {
          const eventData = {
            parentRegion: region.region_name,
            rule: LogicHelper.parseRule(rule),
          };
          _.set(this.events, eventName, _.union(this.events[eventName], [eventData]));
        });
      }

      if (_.includes(_.keys(region), "exits")) {
        _.forEach(region.exits, (rule, exitName) => {
          _.set(this.exits, [region.region_name, exitName], LogicHelper.parseRule(rule));
        });
      }
    });
  }
}

export default Locations;
