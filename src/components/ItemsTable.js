import { Fragment, useMemo } from "react";
import Item from "./Item";

function splitIntoChunk(arr, chunk) {
  let chunks = [];
  for (let i = 0; i < arr.length; i += chunk) {
    let tempArray;
    tempArray = arr.slice(i, i + chunk);
    chunks.push(tempArray);
  }
  return chunks;
}

const ItemsTable = (props) => {
  const {
    columns = 1,
    items = [], // array of items from items.json it will fill the table by rows
    padding = 1, // for the TD items
  } = props;

  const rows = useMemo(() => {
    const itemComponents = items.map((item) => (
      <td key={item.id} style={{ padding }}>
        <Item
          type={item.type}
          name={item.name}
          label={item.label}
          labelStartingIndex={item.labelStartingIndex}
          size={item.size}
          icons={item.icons}
          countConfig={item.countConfig}
          receiver={item.receiver}
          selectedStartingIndex={item.selectedStartingIndex}
        />
      </td>
    ));

    const splitArray = splitIntoChunk(itemComponents, columns);

    return splitArray.map((rows, index) => <tr key={index}>{rows}</tr>);
  }, [columns, items, padding]);

  return (
    <Fragment>
      <table>
        <tbody>{rows}</tbody>
      </table>
    </Fragment>
  );
};

export default ItemsTable;
