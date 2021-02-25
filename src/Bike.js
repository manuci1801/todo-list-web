import React from "react";
import "./Bike.css";

import colors from "./colors";

const Bike = ({ wheel, axle, chair }) => {
  return (
    <div className="bike">
      <div className="bike_axle" style={{ background: colors.axle[axle] }}>
        <div
          className="bike_wheel"
          style={{ background: colors.wheel[wheel] }}
        ></div>
        <div
          className="bike_chair"
          style={{ background: colors.chair[chair] }}
        ></div>
      </div>
    </div>
  );
};

export default Bike;
