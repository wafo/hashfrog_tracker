import { Fragment } from "react";

const Label = props => {
  const {
    id = "8add4c66f07249be91f7843906376542",
    text = "",
    fontSize = "12px",
    color = "#ffffff", // font color
    backgroundColor = "#000000", // background color for input
    padding = "0px",
    borderRadius = "0.1rem",
    hidden = false
  } = props;

  return (
    <Fragment>
      <span id={id} className="layout-label" style={{ fontSize, color, backgroundColor, padding, borderRadius }} hidden={hidden}>
        {text}
      </span>
    </Fragment>
  );
};

export default Label;
