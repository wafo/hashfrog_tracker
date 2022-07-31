import _ from "lodash";
import { useEffect, useMemo, useState } from "react";
import { useChecks, useLocation } from "../context/trackerContext";

import Locations from "../utils/locations";

import DUNGEONS from "../data/dungeons.json";
import HINT_REGIONS_SHORT_NAMES from "../data/hint-regions-short-names.json";

const Checks = () => {
  const [actions] = useLocation();
  const { locations } = useChecks();
  const [type, setType] = useState("overworld");
  const [selectedRegion, setSelectedRegion] = useState(null);

  const [isInitialized, setIsInitialized] = useState(false);
  useEffect(() => {
    if (!isInitialized) {
      _.forEach(Locations.mapLocationsToHintAreas(), (regionLocations, regionName) => {
        _.forEach(regionLocations, locationName => {
          actions.addLocation(locationName, regionName);
        });
      });
      setIsInitialized(true);
    }
  }, [actions, isInitialized]);

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
    };

    _.forEach(_.values(locations), regionLocations => {
      countLocations(regionLocations, newCounter);
    });

    return newCounter;
  }, [locations]);

  const onRegionClicked = regionName => {
    setSelectedRegion(prev => (prev === regionName ? null : regionName));
  };

  useEffect(() => {
    setSelectedRegion(null);
  }, [type]);

  return (
    <div id="checks" className="check-tracker">
      <Buttons setType={setType} />
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

const Buttons = ({ setType }) => {
  return (
    <div className="buttons mb-2">
      <button type="button" className="btn btn-dark btn-sm me-1" onClick={() => setType("overworld")}>
        Overworld
      </button>
      <button type="button" className="btn btn-dark btn-sm" onClick={() => setType("dungeon")}>
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
  return (
    <div className="check-tracker-location">
      <button type="button" className="btn btn-dark btn-sm py-0 mb-2" onClick={() => setSelectedRegion(null)}>
        Back
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
      if (type === "dungeon") {
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
            <span>{HINT_REGIONS_SHORT_NAMES[regionName]}</span>
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
            <td>Checked</td>
          </tr>
          <tr>
            <td>{locationsCounter.available}</td>
            <td>Available</td>
          </tr>
          <tr>
            <td>{locationsCounter.remaining}</td>
            <td>Remaining</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default Checks;
