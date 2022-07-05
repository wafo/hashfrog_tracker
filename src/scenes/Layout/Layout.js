const { useMemo, useEffect } = require("react");
import Element from "../../components/Element";
import ElementsTable from "../../components/ElementsTable";
import Footer from "../../components/Footer";
import LocationHint from "../../components/LocationHint";
import SometimesHint from "../../components/SometimesHint";
import { useLayout } from "../../context/layoutcontext";
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

const Layout = props => {
  useEffect(() => {
    document.title = "HashFrog - Tracker";
  }, []);

  const { state: layoutContext } = useLayout();

  const renderLayout = useMemo(() => {
    if (props.layout) return props.layout;
    return layoutContext;
  }, [props.layout, layoutContext]);

  const layoutConfig = useMemo(() => {
    return renderLayout.layoutConfig;
  }, [renderLayout]);

  const toRender = useMemo(() => {
    return renderLayout.components.map(component => {
      switch (component.type) {
        case "element": {
          const element = elementsJSON.find(x => x.id === component.elementId);
          const [top, left] = component.position;
          return (
            <div key={component.id} style={{ ...styles.components, top, left }}>
              <Element {...element} size={component.size} />
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
              <SometimesHint width={component.width} icons={element.icons} labels={component.labels} />
            </div>
          );
        }
        case "locationhint": {
          const element = elementsJSON.find(x => x.id === component.elementId);
          const [top, left] = component.position;
          return (
            <div key={component.id} style={{ ...styles.components, top, left }}>
              <LocationHint
                width={component.width}
                color={component.color}
                backgroundColor={component.backgroundColor}
                showBoss={component.showBoss}
                showItems={component.showItems}
                itemsIcons={element.icons}
              />
            </div>
          );
        }
        default:
          return null;
      }
    });
  }, [renderLayout.components]);

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
      {!props.hideFooter && <Footer showGitHub={false} opacity={0.5} />}
    </div>
  );
};

export default Layout;
