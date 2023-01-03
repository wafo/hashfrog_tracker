import _ from "lodash";
import { useEffect, useMemo, useState } from "react";

import { useChecks, useLocation } from "../context/trackerContext";
import Locations from "../utils/locations";
import LogicHelper from "../utils/logic-helper";

import DUNGEONS from "../data/dungeons.json";
import HINT_REGIONS_SHORT_NAMES from "../data/hint-regions-short-names.json";

const Checks = () => {
  const [actions] = useLocation();
  const { locations, items } = useChecks();
  const [type, setType] = useState("overworld");
  const [selectedRegion, setSelectedRegion] = useState(null);

  const [isInitialized, setIsInitialized] = useState(false);
  useEffect(() => {
    if (!isInitialized) {
      _.forEach(Locations.mapLocationsToHintAreas(), (regionLocations, regionName) => {
        _.forEach(regionLocations, locationName => {
          if (Locations.isProgressLocation(Locations.locations[locationName])) {
            actions.addLocation(locationName, regionName);
          }
        });
      });
      LogicHelper.updateItems(items);
      setIsInitialized(true);
    }
  }, [actions, isInitialized, items]);

  const countLocations = (locationsList, counter) => {
    _.forEach(_.values(locationsList), locationData => {
      if (locationData.isAvailable && !locationData.isChecked) counter.available += 1;
      if (!locationData.isAvailable) counter.locked += 1;
      if (locationData.isChecked) counter.checked += 1;
      if (!locationData.isChecked) counter.remaining += 1;
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

    _.forEach(_.values(locations), regionLocations => {
      countLocations(regionLocations, newCounter);
    });
    newCounter.skulls = LogicHelper.countSkullsInLogic();

    return newCounter;
  }, [locations]);

  const onRegionClicked = regionName => {
    setSelectedRegion(prev => (_.isEqual(prev, regionName) ? null : regionName));
  };

  useEffect(() => {
    setSelectedRegion(null);
  }, [type]);

  return (
    <div id="checks" className="check-tracker">
      <Buttons type={type} setType={setType} />
      <LocationsList
        actions={actions}
        countLocations={countLocations}
        locations={locations}
        onRegionClicked={onRegionClicked}
        selectedRegion={selectedRegion}
        setSelectedRegion={setSelectedRegion}
        type={type}
      />
      <Info locationsCounter={locationsCounter} />
    </div>
  );
};

const Buttons = ({ type, setType }) => {
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

const HintRegion = ({ actions, locations, selectedRegion, setSelectedRegion }) => {
  const locationsList = _.map(locations[selectedRegion], (locationData, locationName) => {
    const style = {};
    if (locationData.isChecked) style.textDecoration = "line-through";
    if (!locationData.isAvailable) style.opacity = "0.5";
    return (
      <li key={locationName} className="check">
        <button
          type="button"
          style={style}
          onClick={() => actions.markLocation(locationName, selectedRegion)}
          onContextMenu={e => {
            e.preventDefault();
            actions.markLocation(locationName, selectedRegion);
          }}
        >
          {Locations.removeRegionPrefix(locationName, selectedRegion)}
        </button>
      </li>
    );
  });

  const toggleRegion = () => {
    actions.toggleRegion(selectedRegion);
  };

  return (
    <div className="check-tracker-location">
      <button type="button" className="btn btn-dark btn-sm py-0 mb-2 me-1" onClick={() => setSelectedRegion(null)}>
        Back
      </button>
      <button type="button" className="btn btn-dark btn-sm py-0 mb-2" onClick={toggleRegion}>
        Toggle All
      </button>
      <ul className="check-list">{locationsList}</ul>
    </div>
  );
};

const LocationsList = ({
  actions,
  countLocations,
  locations,
  onRegionClicked,
  selectedRegion,
  setSelectedRegion,
  type,
}) => {
  if (selectedRegion) {
    return (
      <HintRegion
        actions={actions}
        locations={locations}
        selectedRegion={selectedRegion}
        setSelectedRegion={setSelectedRegion}
      />
    );
  } else {
    const filteredLocations = _.filter(_.keys(locations), regionName => {
      if (_.isEqual(type, "dungeon")) {
        return _.includes(DUNGEONS, regionName);
      } else {
        return !_.includes(DUNGEONS, regionName);
      }
    });

    const locationsList = _.map(locations, (locationData, regionName) => {
      if (!_.includes(filteredLocations, regionName)) {
        return;
      }

      const numLocations = _.size(locationData);
      const locationsCounter = {
        locked: 0,
        checked: 0,
        available: 0,
        remaining: 0,
        skulls: 0,
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
