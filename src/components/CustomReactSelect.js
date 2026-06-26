import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Select from "react-select";

import { useHintEntry } from "../context/trackerContext";

const CustomReactSelect = props => {
  const {
    id = "960b29a364ca444abb5969c97580d973",
    name = "CustomSelect",
    options = [], // { value: ?, label: "" }
    color = "#fff", // font color
    backgroundColor = "#333", // background color for input
    onValueCallback = f => f, // Callback for when the value changes,
  } = props;

  const [value, setValue] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [hueRotate, setHueRotate] = useState(0);

  const { setHintEntry, savedHintEntry } = useHintEntry(id);
  const hintRestoredRef = useRef(false);
  const isMountRef = useRef(true);

  const customStyles = useMemo(() => {
    return {
      control: provided => ({
        ...provided,
        borderRadius: "0.1rem",
        minHeight: "20px",
        borderColor: backgroundColor,
        color: color,
        filter: `hue-rotate(${hueRotate}deg)`,
      }),
      indicatorsContainer: () => ({
        display: "none",
      }),
      input: provided => ({
        ...provided,
        color: color,
      }),
      menu: provided => ({
        ...provided,
        color: "#333",
        borderRadius: "0.1rem",
        margin: "4px 0",
      }),
      menuList: provided => ({
        ...provided,
        maxHeight: "100px",
        overflowY: "hidden",
      }),
      option: provided => ({
        ...provided,
        padding: "0.25rem",
        fontSize: "0.75em",
      }),
      singleValue: provided => ({
        ...provided,
        color: color,
      }),
      valueContainer: provided => ({
        ...provided,
        height: "20px",
        padding: "0 0.25rem",
        fontSize: "0.75em",
        backgroundColor: backgroundColor,
      }),
    };
  }, [color, backgroundColor, hueRotate]);

  const handleRightClick = event => {
    event.preventDefault();
    setValue(null);
  };

  const handleKeyDown = useCallback(
    event => {
      if (event.code === "Enter") {
        setValue({
          label: inputValue,
          value: inputValue,
        });
        event.target.blur();
      }
    },
    [inputValue],
  );

  const handleOnBlur = useCallback(() => {
    if (!value && inputValue) {
      setValue({
        label: inputValue,
        value: inputValue,
      });
    }
  }, [value, inputValue]);

  const handleOnClick = event => {
    event.preventDefault();
    if (event.nativeEvent.which === 2) {
      // Wheel Click
      setHueRotate(prev => (prev + 45 < 360 ? prev + 45 : 0));
    }
  };

  useEffect(() => {
    onValueCallback(value);
  }, [onValueCallback, value]);

  // Persist hint changes. Skip the initial mount so an empty input doesn't
  // clobber a saved entry before the resume restore below can apply it.
  useEffect(() => {
    if (isMountRef.current) {
      isMountRef.current = false;
      return;
    }
    setHintEntry(value ? value.value : null);
  }, [value, setHintEntry]);

  // Restore a saved hint once, after a resumed session populates it.
  useEffect(() => {
    if (hintRestoredRef.current) { return; }
    if (savedHintEntry !== null) {
      setValue({ label: savedHintEntry, value: savedHintEntry });
      hintRestoredRef.current = true;
    }
  }, [savedHintEntry]);

  return (
    <div onContextMenu={handleRightClick} onAuxClick={handleOnClick} style={{ flex: 1, overflow: "hidden" }}>
      <Select
        id={id}
        name={name}
        className=""
        options={options}
        placeholder=""
        noOptionsMessage={() => null}
        onKeyDown={handleKeyDown}
        openMenuOnClick={false}
        isClearable
        captureMenuScroll
        styles={customStyles}
        onChange={setValue}
        value={value}
        onInputChange={setInputValue}
        onBlur={handleOnBlur}
        menuPlacement="auto"
      />
    </div>
  );
};

export default CustomReactSelect;
