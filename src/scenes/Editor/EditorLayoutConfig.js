import styles from "./Editor.module.css";

const EditorLayoutConfig = ({ layoutConfig, setLayoutConfig }) => {
  const { name, width, height, backgroundColor } = layoutConfig;

  const handleChange = event => {
    let {
      target: { name, value },
    } = event;

    // Temp
    if (name === "width" || name === "height") {
      value = parseInt(value, 10);
    }

    setLayoutConfig({
      ...layoutConfig,
      [name]: value,
    });
  };

  return (
    <div className={styles.layoutConfig}>
      <input type="text" id="name" name="name" placeholder="Layout Name" value={name} onChange={handleChange} />
      <div style={{ display: "flex" }}>
        <input
          type="number"
          id="width"
          name="width"
          placeholder="Layout Width"
          value={width}
          onChange={handleChange}
          style={{ width: 100 }}
        />
        <span>x</span>
        <input
          type="number"
          id="height"
          name="height"
          placeholder="Layout Height"
          value={height}
          onChange={handleChange}
          style={{ width: 100 }}
        />
      </div>
      <input
        type="text"
        id="backgroundColor"
        name="backgroundColor"
        placeholder="Background Color"
        value={backgroundColor}
        onChange={handleChange}
      />
    </div>
  );
};

export default EditorLayoutConfig;
