import React from "react";
import dateFormat from "dateformat";

interface Props {
  link: string;
}

const PrintSource = (props: Props) => {
  return (
    <div>
      <p>
        This map was created using{" "}
        <a href={window.location.origin}>{window.location.origin}</a> on{" "}
        {dateFormat()}
      </p>
      <p>
        An interactive version of this map can be found <a href={props.link}>here</a>
      </p>
    </div>
  );
};

export default PrintSource;
