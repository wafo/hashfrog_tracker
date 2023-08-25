import { useMemo } from "react";

import labelsJSON from "../data/labels.json";
import CustomReactSelect from "./CustomReactSelect";
import Element from "./Element";

const SometimesHint = props => {
  const {
    id = "257f3d17e81243d8af03b0987c8beed3",
    name = "sometimes",
    options = null, // overrides the options directly
    labels = "sometimes", // uses labels from the json
    width = 150, // In px
    icons = [], // overrides the default hashfrog icon
    showIcon = true, // Hides the icon
    color = "#ffffff", // font color
    backgroundColor = "#333333", // background color for input
    inverted = false, // switch place of the icon/item
    dual = false, // show two items
    hidden = false
  } = props;

  const memoizedOptions = useMemo(() => {
    if (options) return options;
    return labelsJSON[labels || "sometimes"].map(label => ({
      value: label,
      label: label,
    }));
  }, [options, labels]);

  return (
    <div style={{ width, display: "flex", flexDirection: inverted ? "row-reverse" : "row" }} hidden={hidden}>
      <CustomReactSelect
        id={`sometimes_input_${id}`}
        name={`sometimes_input_${name}`}
        options={memoizedOptions}
        color={color}
        backgroundColor={backgroundColor}
      />
      {showIcon && (
        <Element
          id={`sometimes_item_${id}`}
          name={`sometimes_item_${name}`}
          type="simple"
          size={[20, 20]}
          icons={icons}
          customStyle={inverted ? { marginRight: "0.25rem" } : { marginLeft: "0.25rem" }}
          receiver
        />
      )}
      {showIcon && dual && (
        <Element
          id={`sometimes_item_${id}`}
          name={`sometimes_item_${name}`}
          type="simple"
          size={[20, 20]}
          icons={icons}
          customStyle={inverted ? { marginRight: "0.25rem" } : { marginLeft: "0.25rem" }}
          receiver
        />
      )}
    </div>
  );
};

export default SometimesHint;
