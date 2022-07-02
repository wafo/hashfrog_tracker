import { useMemo } from "react";
import labelsJSON from "../data/labels.json";
import CustomReactSelect from "./CustomReactSelect";
import Element from "./Element";

const SometimesHint = (props) => {
  const {
    id = "257f3d17e81243d8af03b0987c8beed3",
    name = "sometimes",
    options = null, // overrides the options directly
    labels = "sometimes", // uses labels from the json
    width = 150, // In px
    icons = null, // overrides the default hashfrog icon
  } = props;

  const memoizedOptions = useMemo(() => {
    if (options) return options;
    return labelsJSON[labels].map((label) => ({
      value: label,
      label: label,
    }));
  }, [options, labels]);

  return (
    <div style={{ width, display: "flex" }}>
      <CustomReactSelect
        id={`sometimes_input_${id}`}
        name={`sometimes_input_${name}`}
        options={memoizedOptions}
      />
      <Element
        id={`sometimes_item_${id}`}
        name={`sometimes_item_${name}`}
        type="simple"
        size={[20, 20]}
        icons={icons || ["hash_frog_bw_32x32.png"]}
        customStyle={{ marginLeft: "0.25rem" }}
        receiver
      />
    </div>
  );
};

export default SometimesHint;
