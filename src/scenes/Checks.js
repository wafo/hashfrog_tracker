import _ from "lodash";
import { useEffect, useMemo, useState } from "react";
import { OverlayTrigger, Popover } from "react-bootstrap";

import RequirementsTooltip from "../components/RequirementsTooltip";
import { useLayout } from "../context/layoutContext";
import { useChecks, useLocation, useSelectedEFKDungeons, useSettingsString } from "../context/trackerContext";
import DUNGEON_CONFIG from "../data/dungeon-config.json";
import DUNGEONS from "../data/dungeons.json";
import HINT_REGIONS_SHORT_NAMES from "../data/hint-regions-short-names.json";
import SETTING_STRINGS_JSON from "../data/setting-strings.json";
import Locations from "../utils/locations";
import LogicHelper from "../utils/logic-helper";
import SettingsHelper from "../utils/settings-helper";

const EFK_SETTINGS_STRING = SETTING_STRINGS_JSON.presets.find(p => p.value === "escape_from_kak")?.settingsString;

const DUNGEON_SHORTCUTS = DUNGEON_CONFIG.dungeonShortcuts;

const Checks = () => {
  const { state: layoutContext } = useLayout();
  const [actions] = useLocation();
  const { locations, items } = useChecks();
  const { settings_string } = useSettingsString();
  const isEFK = settings_string === EFK_SETTINGS_STRING;
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

    const filteredRegions = isEFK
      ? _.pickBy(locations, (_k, regionName) =>
          regionName === "Kakariko Village" ||
          (selectedEFKDungeonNames.length === 4
            ? _.includes(selectedEFKDungeonNames, regionName)
            : _.includes(DUNGEONS, regionName) && regionName !== "Ganons Castle")
        )
      : locations;

    _.forEach(_.values(filteredRegions), regionLocations => {
      countLocations(regionLocations, newCounter);
    });
    newCounter.skulls = LogicHelper.countSkullsInLogic();

    return newCounter;
  }, [locations, isEFK, selectedEFKDungeonNames]);

  const onRegionClicked = regionName => {
    setSelectedRegion(prev => (prev === regionName ? null : regionName));
  };

  useEffect(() => {
    setSelectedRegion(null);
  }, [type]);

  return (
    <div id="checks" className="check-tracker" style={{ backgroundColor: layoutContext.layoutConfig.backgroundColor }}>
      <Buttons isEFK={isEFK} type={type} setType={setType} />
      <LocationsList
        actions={actions}
        countLocations={countLocations}
        isEFK={isEFK}
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

const Buttons = ({ isEFK, type, setType }) => {
  if (isEFK) {
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

const HintRegion = ({ actions, items, locations, selectedRegion, setSelectedRegion }) => {
  const locationsList = _.map(locations[selectedRegion], (locationData, locationName) => {
    const style = {};
    if (locationData.isChecked) { style.textDecoration = "line-through"; }
    if (!locationData.isAvailable) { style.opacity = "0.5"; }

    const displayName = Locations.removeRegionPrefix(locationName, selectedRegion);

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
            onClick={() => actions.markLocation(locationName, selectedRegion)}
            onContextMenu={e => {
              e.preventDefault();
              actions.markLocation(locationName, selectedRegion);
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
  isEFK,
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
    // EFK (Escape From Kak) shows only relevant regions in one combined list.
    // If dungeon selectors are set, show only those dungeons + Kak; otherwise fall back to all dungeons.
    // Otherwise, split regions into overworld or dungeon based on the active tab.
    const regionNames = isEFK
      ? _.keys(locations).filter(regionName =>
          regionName === "Kakariko Village" ||
          (selectedEFKDungeonNames.length === 4
            ? _.includes(selectedEFKDungeonNames, regionName)
            : (_.includes(DUNGEONS, regionName) && regionName !== "Ganons Castle"))
        )
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
