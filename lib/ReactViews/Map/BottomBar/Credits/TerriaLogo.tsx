import React, { FC } from "react";
import Box from "../../../../Styled/Box";

const logo = require("../../../../../wwwroot/images/terria-watermark.svg");

export const TerriaLogo: FC = () => {
  return (
    <Box
      as={"a"}
      target="_blank"
      rel="noopener noreferrer"
      href="https://github.com/TerriaJS/terriajs"
    >
      <img css={{ height: "24px" }} src={logo} title="Built with Terria" />
    </Box>
  );
};
