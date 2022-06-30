import { Fragment, useMemo, useState } from "react";
import CustomReactSelect from "./CustomReactSelect";
import labelsJSON from "../data/labels.json";
import Element from "./Element";

const LocationHint = (props) => {
  const {
    id = "5b69e6b1a19a45b2ad043b3851b202d8",
    name = "locations",
    options = null, // overrides the options directly
    labels = "locations", // uses labels from the json
    width = 250, // In px
    margin = "4px 0", // In px
    color = "#ffff00", // font color
    backgroundColor = "#333", // background color for input
    showBoss = true, // Show or not the left boss icon
    bossIcons = [
      "boss_na_25x25.png",
      "boss_go_25x25.png",
      "boss_do_25x25.png",
      "boss_ba_25x25.png",
      "boss_pg_25x25.png",
      "boss_vo_25x25.png",
      "boss_mo_25x25.png",
      "boss_bo_25x25.png",
      "boss_tw_25x25.png",
    ], // to override the boss icons
    showItems = true, // Show or not the right icons
    itemsIcons = ["hash_frog_bw_32x32.png"], //
  } = props;

  const [hasValue, setHasValue] = useState(false);

  const onValueCallback = (value) => {
    if (value) {
      setHasValue(true);
    } else {
      setHasValue(false);
    }
  };

  const memoizedOptions = useMemo(() => {
    if (options) return options;
    return labelsJSON[labels].map((label) => ({
      value: label,
      label: label,
    }));
  }, [options, labels]);

  return (
    <div style={{ width, display: "flex", margin }}>
      {showBoss && hasValue && (
        <Element
          id={`locations_boss_${id}`}
          name={`locations_boss_${name}`}
          type="simple"
          size={[20, 20]}
          icons={bossIcons}
          customStyle={{ marginRight: "0.25rem" }}
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
