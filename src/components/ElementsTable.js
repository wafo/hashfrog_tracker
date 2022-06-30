import { Fragment, useMemo } from "react";
import Element from "./Element";

function splitIntoChunk(arr, chunk) {
  let chunks = [];
  for (let i = 0; i < arr.length; i += chunk) {
    let tempArray;
    tempArray = arr.slice(i, i + chunk);
    chunks.push(tempArray);
  }
  return chunks;
}

const ElementsTable = (props) => {
  const {
    columns = 1,
    elements = [], // array of elements from elements.json it will fill the table by rows
    padding = 1, // for the TD items
  } = props;

  const rows = useMemo(() => {
    const itemComponents = elements.map((element) => (
      <td key={element.id} style={{ padding }}>
        <Element
          element={element}
          type={element.type}
          name={element.name}
          label={element.label}
          labelStartingIndex={element.labelStartingIndex}
          size={element.size}
          icons={element.icons}
          countConfig={element.countConfig}
          receiver={element.receiver}
          selectedStartingIndex={element.selectedStartingIndex}
          items={element.items}
        />
      </td>
    ));

    const splitArray = splitIntoChunk(itemComponents, columns);

    return splitArray.map((rows, index) => <tr key={index}>{rows}</tr>);
  }, [columns, elements, padding]);

  return (
    <Fragment>
      <table>
        <tbody>{rows}</tbody>
      </table>
    </Fragment>
  );
};

export default ElementsTable;
