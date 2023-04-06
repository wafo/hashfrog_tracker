import { Fragment } from "react";

const EditorLayoutConfig = ({ layoutConfig, setLayout }) => {
  const { name, width, height, backgroundColor } = layoutConfig;

  const handleChange = event => {
    let {
      target: { name, value },
    } = event;

    // Temp
    if (name === "width" || name === "height") {
      value = parseInt(value, 10);
    }

    setLayout(prev => ({
      ...prev,
      layoutConfig: {
        ...layoutConfig,
        [name]: value,
      },
    }));
  };

  return (
    <Fragment>
      <div className="row">
        <div className="col-8 mb-2">
          <label htmlFor="name" className="form-label">
            Layout Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            className="form-control form-control-sm"
            placeholder="Layout Name"
            value={name}
            onChange={handleChange}
          />
        </div>
        <div className="col-4 mb-2">
          <label htmlFor="backgroundColor" className="form-label">
            Background
          </label>
          <input
            type="color"
            className="form-control form-control-sm"
            id="backgroundColor"
            name="backgroundColor"
            value={backgroundColor}
            onChange={handleChange}
            title="Choose background color"
          />
        </div>
      </div>
      <div className="row">
        <div className="col mb-2">
          <label htmlFor="width" className="form-label">
            Layout Size
          </label>
          <div className="input-group input-group-sm ">
            <input
              type="number"
              id="width"
              name="width"
              className="form-control"
              placeholder="Layout Width"
              value={width}
              onChange={handleChange}
            />
            <span className="input-group-text">X</span>
            <input
              type="number"
              id="height"
              name="height"
              className="form-control"
              placeholder="Layout Height"
              value={height}
              onChange={handleChange}
            />
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col">
          <p className="uuid">The faint dashed border around the layout is only there when editing.</p>
        </div>
      </div>
    </Fragment>
  );
};

export default EditorLayoutConfig;
