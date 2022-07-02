const { useMemo } = require("react");
import Element from "../../components/Element";
import ElementsTable from "../../components/ElementsTable";
import Footer from "../../components/Footer";
import LocationHint from "../../components/LocationHint";
import SometimesHint from "../../components/SometimesHint";
import { useLayout } from "../../context/useLayout";
import elementsJSON from "../../data/elements.json";

const styles = {
  layout: {
    backgroundColor: "#333",
    position: "relative",
  },
  components: {
    position: "absolute",
  },
};

const Layout = () => {
  const {
    state: { layout },
  } = useLayout();
  const { layoutConfig, components } = layout;

  console.log(layout);

  const toRender = useMemo(() => {
    return components.map(component => {
      switch (component.type) {
        case "element": {
          const element = elementsJSON.find(x => x.id === component.elementId);
          const [top, left] = component.position;
          return (
            <div key={component.id} style={{ ...styles.components, top, left }}>
              <Element {...element} />
            </div>
          );
        }
        case "table": {
          const elements = component.elements.map(x => {
            return elementsJSON.find(element => element.name === x || element.id === x);
          });
          const [top, left] = component.position;
          return (
            <div key={component.id} style={{ ...styles.components, top, left }}>
              <ElementsTable
                elements={elements}
                elementsSize={component.elementsSize}
                columns={component.columns}
                padding={component.padding}
              />
            </div>
          );
        }
        case "sometimeshint": {
          const element = elementsJSON.find(x => x.id === component.elementId);
          const [top, left] = component.position;
          return (
            <div key={component.id} style={{ ...styles.components, top, left }}>
              <SometimesHint width={component.width} icons={element.icons} />
            </div>
          );
        }
        case "locationhint": {
          const [top, left] = component.position;
          return (
            <div key={component.id} style={{ ...styles.components, top, left }}>
              <LocationHint
                width={component.width}
                color={component.color}
                backgroundColor={component.backgroundColor}
                showBoss={component.showBoss}
                showItems={component.showItems}
              />
            </div>
          );
        }
        default:
          return null;
      }
    });
  }, [components]);

  return (
    <div>
      <div
        style={{
          ...styles.layout,
          width: layoutConfig.width,
          height: layoutConfig.height,
          backgroundColor: layoutConfig.backgroundColor,
        }}
      >
        {toRender}
      </div>
      <Footer showGitHub={false} opacity={0.5} />
    </div>
  );
};

export default Layout;
