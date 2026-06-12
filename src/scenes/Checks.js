import _ from "lodash";
import { useEffect, useMemo, useState } from "react";
import { OverlayTrigger, Popover } from "react-bootstrap";

import RequirementsTooltip from "../components/RequirementsTooltip";
import { useLayout } from "../context/layoutContext";
import { useChecks, useLocation, useSelectedEFKDungeons, useSettingsString } from "../context/trackerContext";
import DUNGEON_CONFIG from "../data/dungeon-config.json";
import DUNGEONS from "../data/dungeons.json";
import HINT_REGIONS_SHORT_NAMES from "../data/hint-regions-short-names.json";
import { getRequirementsStructure } from "../utils/expression-converter";
import { isEFK, isEFKRelevantRegion } from "../utils/efk";
import Locations from "../utils/locations";
import LogicHelper from "../utils/logic-helper";
import SettingsHelper from "../utils/settings-helper";

const DUNGEON_SHORTCUTS = DUNGEON_CONFIG.dungeonShortcuts;

const Checks = () => {
  const { state: layoutContext } = useLayout();
  const [actions] = useLocation();
  const { locations, items } = useChecks();
  const { settings_string } = useSettingsString();
  const efkActive = isEFK(settings_string);
  const selectedEFKDungeonNames = useSelectedEFKDungeons();
  const [type, setType] = useState("overworld");
  const [selectedRegion, setSelectedRegion] = useState(null);

  const [isInitialized, setIsInitialized] = useState(false);
  useEffect(() => {
    if (!isInitialized) {
      LogicHelper.updateItems(items);

      _.forEach(Locations.mapLocationsToHintAreas(), (regionLocations, regionName) => {
        let locationAddedForRegion = false;

        _.forEach(regionLocations, locationName => {
          const location = Locations.getLocation(locationName);
          if (location && Locations.isProgressLocation(location)) {
            actions.addLocation(locationName, regionName);
            locationAddedForRegion = true;
          }
        });

        // Even if regular dungeon has no checks, if the MQ variant does have checks, we need to still show the dungeon
        // so that the user can toggle to MQ.
        if (!locationAddedForRegion && _.includes(DUNGEONS, regionName)) {
          const showMQToggle =
            SettingsHelper.getSetting("mq_dungeons_mode") === "random" ||
            (SettingsHelper.getSetting("mq_dungeons_mode") === "count" && SettingsHelper.getSetting("mq_dungeons_count") > 0);

          const hasPossibleLocations =
            _.some(_.values(Locations.locations.dungeon[regionName]), locationData => {
              return Locations.isProgressLocation(locationData);
            }) ||
            _.some(_.values(Locations.locations.dungeon_mq[regionName]), locationData => {
              return Locations.isProgressLocation(locationData);
            });

          if (showMQToggle && hasPossibleLocations) {
            actions.addLocation("", regionName);
          }
        }
      });

      setIsInitialized(true);
    }
  }, [actions, isInitialized, items]);

  const countLocations = (locationsList, counter) => {
    _.forEach(_.values(locationsList), locationData => {
      const isAvailable = locationData.isAvailable;
      const isChecked = locationData.isChecked;

      if (isAvailable && !isChecked) { counter.available += 1; }
      if (!isAvailable) { counter.locked += 1; }
      if (isChecked) { counter.checked += 1; }
      if (!isChecked) { counter.remaining += 1; }
    });
  };

  const locationsCounter = useMemo(() => {
    const newCounter = {
      locked: 0,
      checked: 0,
      available: 0,
      remaining: 0,
      skulls: 0,
    };

    const filteredRegions = efkActive
      ? _.pickBy(locations, (_v, regionName) => isEFKRelevantRegion(regionName, selectedEFKDungeonNames))
      : locations;

    _.forEach(_.values(filteredRegions), regionLocations => {
      countLocations(regionLocations, newCounter);
    });
    newCounter.skulls = LogicHelper.countSkullsInLogic();

    return newCounter;
  }, [locations, efkActive, selectedEFKDungeonNames]);

  const onRegionClicked = regionName => {
    setSelectedRegion(prev => (prev === regionName ? null : regionName));
  };

  useEffect(() => {
    setSelectedRegion(null);
  }, [type]);

  return (
    <div id="checks" className="check-tracker" style={{ backgroundColor: layoutContext.layoutConfig.backgroundColor }}>
      <Buttons efkActive={efkActive} type={type} setType={setType} />
      <LocationsList
        actions={actions}
        countLocations={countLocations}
        efkActive={efkActive}
        items={items}
        locations={locations}
        onRegionClicked={onRegionClicked}
        selectedEFKDungeonNames={selectedEFKDungeonNames}
        selectedRegion={selectedRegion}
        setSelectedRegion={setSelectedRegion}
        type={type}
      />
      <Info locationsCounter={locationsCounter} />
    </div>
  );
};

const Buttons = ({ efkActive, type, setType }) => {
  if (efkActive) {
    return null;
  }
  return (
    <div className="buttons mb-2">
      <button
        type="button"
        className="btn btn-dark btn-sm me-1"
        onClick={() => setType("overworld")}
        style={{ opacity: type === "overworld" ? 1 : 0.5 }}
      >
        Overworld
      </button>
      <button
        type="button"
        className="btn btn-dark btn-sm"
        onClick={() => setType("dungeon")}
        style={{ opacity: type === "dungeon" ? 1 : 0.5 }}
      >
        Dungeons
      </button>
    </div>
  );
};

// Stable string describing a location's item requirements. Used to compare
// two checks for requirements equality.
const requirementsString = locationName => {
  const { clauses, satisfied } = getRequirementsStructure(locationName);
  if (satisfied || !clauses || clauses.length === 0) {
    return "NONE";
  }
  return clauses
    .map(clause => clause.items.map(item => item.name).sort().join("&"))
    .sort()
    .join("|");
};

// Collapse checks that share a name prefix and end in a number (e.g.
// "Guard House Child Pot 1".."44") into a single entry. Only checks with
// identical item requirements merge. Shop slots are kept individual since
// wallet requirements are unknown.
const groupRegionChecks = (regionLocations, regionName) => {
  const groups = {};
  _.forEach(regionLocations, (locationData, locationName) => {
    const displayName = Locations.removeRegionPrefix(locationName, regionName);
    // Match prefix, space, number.
    // Gives us match[1] -> "Child Pot", match[2] -> "1"
    const match = /^(.+?)\s+(\d+)$/.exec(displayName);
    const location = Locations.getLocation(locationName);
    const isShop = location && (location.type === "Shop" || location.type === "MaskShop");
    const groupable = match && !isShop;
    // Merge only same-prefix checks with identical requirements: "Prefix|Requirements".
    const groupKey = groupable ? `${match[1]}|${requirementsString(locationName)}` : locationName;
    if (!groups[groupKey]) {
      groups[groupKey] = { prefix: groupable ? match[1] : displayName, members: [] };
    }
    groups[groupKey].members.push({ locationName, locationData, displayName });
  });
  return _.values(groups);
};

const HintRegion = ({ actions, items, locations, selectedRegion, setSelectedRegion }) => {
  const groups = useMemo(
    () => groupRegionChecks(locations[selectedRegion], selectedRegion),
    [locations, selectedRegion],
  );

  const locationsList = _.map(groups, ({ prefix, members }) => {
    const isChecked = _.every(members, m => m.locationData.isChecked);
    const isAvailable = _.some(members, m => m.locationData.isAvailable);
    const count = members.length;
    // The first member is unique to this group, so it identifies the entry.
    const locationName = members[0].locationName;

    const style = {};
    if (!isAvailable) { style.opacity = "0.5"; }
    if (isChecked) { style.textDecoration = "line-through"; style.opacity = "0.2"; }

    // Collapsed groups show their size, e.g. "Child Pot (44)".
    const displayName = count > 1 ? `${prefix} (${count})` : members[0].displayName;

    // Toggle every member toward one target state.
    const mark = () => {
      const target = !isChecked;
      members.forEach(m => {
        if (m.locationData.isChecked !== target) { actions.markLocation(m.locationName, selectedRegion); }
      });
    };

    const popover = (
      <Popover id={`popover-${locationName}`} className="requirements-popover">
        <Popover.Body>
          <RequirementsTooltip locationName={locationName} items={items} />
        </Popover.Body>
      </Popover>
    );

    return (
      <li key={locationName} className="check">
        <OverlayTrigger
          trigger={["hover", "focus"]}
          placement="auto"
          delay={{ show: 300, hide: 0 }}
          overlay={popover}
        >
          <button
            type="button"
            style={style}
            onClick={mark}
            onContextMenu={e => {
              e.preventDefault();
              mark();
            }}
          >
            {displayName}
          </button>
        </OverlayTrigger>
      </li>
    );
  });

  const toggleMQ = () => {
    actions.toggleMQ(selectedRegion);
  };
  const showMQToggle =
    _.includes(DUNGEONS, selectedRegion) &&
    (SettingsHelper.getSetting("mq_dungeons_mode") === "random" ||
      (SettingsHelper.getSetting("mq_dungeons_mode") === "count" && SettingsHelper.getSetting("mq_dungeons_count") > 0));
  const isMQToggled = SettingsHelper.isMQDungeon(selectedRegion);

  const toggleShortcut = () => {
    actions.toggleShortcut(selectedRegion);
  };
  const showShortcutToggle =
    _.includes(DUNGEON_SHORTCUTS, selectedRegion) && SettingsHelper.getSetting("dungeon_shortcuts_choice") === "random";
  const isShortcutToggled = SettingsHelper.hasDungeonShortcut(selectedRegion);

  const toggleRegion = () => {
    actions.toggleRegion(selectedRegion);
  };

  return (
    <div className="check-tracker-location">
      <button type="button" className="btn btn-dark btn-sm py-0 mb-2 me-1" onClick={() => setSelectedRegion(null)}>
        Back
      </button>
      <button type="button" className="btn btn-dark btn-sm py-0 mb-2 me-1" onClick={toggleRegion}>
        Toggle All
      </button>
      {showMQToggle && (
        <button type="button" className="btn btn-dark btn-sm py-0 mb-2 me-1" onClick={toggleMQ}>
          {isMQToggled ? "MQ: On" : "MQ: Off"}
        </button>
      )}
      {showShortcutToggle && (
        <button type="button" className="btn btn-dark btn-sm py-0 mb-2 me-1" onClick={toggleShortcut}>
          {isShortcutToggled ? "Shortcut: On" : "Shortcut: Off"}
        </button>
      )}
      <ul className="check-list">{locationsList}</ul>
    </div>
  );
};

const LocationsList = ({
  actions,
  countLocations,
  efkActive,
  items,
  locations,
  onRegionClicked,
  selectedEFKDungeonNames,
  selectedRegion,
  setSelectedRegion,
  type,
}) => {
  if (selectedRegion) {
    return (
      <HintRegion
        actions={actions}
        items={items}
        locations={locations}
        selectedRegion={selectedRegion}
        setSelectedRegion={setSelectedRegion}
      />
    );
  } else {
    const regionNames = efkActive
      ? _.keys(locations).filter(regionName => isEFKRelevantRegion(regionName, selectedEFKDungeonNames))
      : _.keys(locations).filter(regionName =>
          type === "dungeon" ? _.includes(DUNGEONS, regionName) : !_.includes(DUNGEONS, regionName)
        );

    const locationsList = regionNames.map(regionName => {
      const locationData = locations[regionName];
      const numLocations = _.size(locationData);
      const locationsCounter = {
        locked: 0,
        checked: 0,
        available: 0,
        remaining: 0,
      };
      countLocations(locationData, locationsCounter);

      const style = {};
      if (
        (locationsCounter.available === 0 && locationsCounter.locked === 0) ||
        locationsCounter.checked >= numLocations
      ) {
        style.opacity = "0.75";
      } else {
        if (
          (locationsCounter.locked < 1 && locationsCounter.available > 0) ||
          locationsCounter.available + locationsCounter.checked >= numLocations
        ) {
          style.borderLeftColor = "#198754";
        } else if (locationsCounter.locked > 0 && locationsCounter.available > 0) {
          style.borderLeftColor = "#ffc107";
        } else if (locationsCounter.locked > 0 && locationsCounter.available < 1) {
          style.borderLeftColor = "#dc3545";
        }
      }
      return (
        <div key={regionName} className="item">
          <button
            type="button"
            className="btn btn-dark btn-sm"
            onClick={() => onRegionClicked(regionName)}
            onContextMenu={e => e.preventDefault()}
            style={style}
          >
            <span>{_.toUpper(HINT_REGIONS_SHORT_NAMES[regionName])}</span>
            <span style={{
              fontSize: "0.7em",
              display: "block",
              color: locationsCounter.checked >= numLocations
                ? undefined
                : locationsCounter.available === 0
                  ? "#dc3545"
                  : locationsCounter.available + locationsCounter.checked >= numLocations
                    ? "#198754"
                    : "#ffc107",
              opacity: locationsCounter.checked >= numLocations ? 0.75 : 1,
            }}>
              {locationsCounter.available}/{numLocations - locationsCounter.checked}
            </span>
          </button>
        </div>
      );
    });

    return <div className="check-tracker-locations">{locationsList}</div>;
  }
};

const Info = ({ locationsCounter }) => {
  return (
    <div className="info">
      <table>
        <tbody>
          <tr>
            <td>{locationsCounter.checked}</td>
            <td className="ps-2">Checked</td>
          </tr>
          <tr>
            <td>{locationsCounter.available}</td>
            <td className="ps-2">Available</td>
          </tr>
          <tr>
            <td>{locationsCounter.remaining}</td>
            <td className="ps-2">Remaining</td>
          </tr>
          <tr>
            <td>{locationsCounter.skulls}</td>
            <td className="ps-2">Skulls available</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default Checks;
