import { useCallback, useEffect, useMemo, useState } from "react";
import Select from "react-select";

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

  const customStyles = useMemo(() => {
    return {
      control: provided => ({
        ...provided,
        borderRadius: "0.1rem",
        minHeight: "20px",
        borderColor: backgroundColor,
        color: color,
        filter: `hue-rotate(${hueRotate}deg)`
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
      setHueRotate(prev => (prev + 45 <= 360 ? prev + 45 : 0));
    }
  };

  useEffect(() => {
    onValueCallback(value);
  }, [onValueCallback, value]);

  return (
    <div
      onContextMenu={handleRightClick}
      onAuxClick={handleOnClick}
      style={{ flex: 1 }}
    >
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
