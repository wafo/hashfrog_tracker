import { Fragment, useMemo, useState } from "react";

import labelsJSON from "../data/labels.json";
import CustomReactSelect from "./CustomReactSelect";
import Element from "./Element";

const LocationHint = props => {
  const {
    id = "5b69e6b1a19a45b2ad043b3851b202d8",
    name = "locations",
    options = null, // overrides the options directly
    labels = "locations", // uses labels from the json
    width = 250, // In px
    color = "#ffff00", // font color
    backgroundColor = "#333", // background color for input
    showBoss = true, // Show or not the left boss icon
    bossIcons = [], // to override the boss icons
    showItems = true, // Show or not the right icons
    itemsIcons = [], //
    bossReceiver = false, // Allow the boss name to be dragged on,
    bossElementsIcons = [], // Elements that the user has chosen to appear in the boss selection. Would overwrite the default bossElement.icons cache
    hidden = false
  } = props;

  const [hasValue, setHasValue] = useState(false);

  const onValueCallback = value => {
    if (value) {
      setHasValue(true);
    } else {
      setHasValue(false);
    }
  };

  const memoizedOptions = useMemo(() => {
    if (options) return options;
    return labelsJSON[labels].map(label => ({
      value: label,
      label: label,
    }));
  }, [options, labels]);

  return (
    <div style={{ width, display: "flex" }} hidden={hidden}>
      {showBoss && hasValue && (
        <Element
          id={`locations_boss_${id}`}
          name={`locations_boss_${name}`}
          type="simple"
          size={[20, 20]}
          icons={(bossElementsIcons.length && bossElementsIcons) || bossIcons}
          customStyle={{ marginRight: "0.25rem" }}
          receiver={bossReceiver}
        />
      )}
      <CustomReactSelect
        id={`locations_input_${id}`}
        name={`locations_input_${name}`}
        options={memoizedOptions}
        color={color}
        backgroundColor={backgroundColor}
        onValueCallback={onValueCallback}
      />
      {showItems && hasValue && (
        <Fragment>
          <Element
            id={`locations_item1_${id}`}
            name={`locations_item1_${name}`}
            type="simple"
            size={[20, 20]}
            icons={itemsIcons}
            customStyle={{ marginLeft: "0.25rem" }}
            receiver
          />
          <Element
            id={`locations_item1_${id}`}
            name={`locations_item1_${name}`}
            type="simple"
            size={[20, 20]}
            icons={itemsIcons}
            customStyle={{ marginLeft: "0.25rem" }}
            receiver
          />
          <Element
            id={`locations_item1_${id}`}
            name={`locations_item1_${name}`}
            type="simple"
            size={[20, 20]}
            icons={itemsIcons}
            customStyle={{ marginLeft: "0.25rem" }}
            receiver
          />
          <Element
            id={`locations_item1_${id}`}
            name={`locations_item1_${name}`}
            type="simple"
            size={[20, 20]}
            icons={itemsIcons}
            customStyle={{ marginLeft: "0.25rem" }}
            receiver
          />
        </Fragment>
      )}
    </div>
  );
};

export default LocationHint;
