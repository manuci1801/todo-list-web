import React from "react";
import "./Bike.css";

import colors from "./colors";

const Bike = ({
  bike,
  isOwner = false,
  levelUp,
  transferBike,
  handleSelectBike = (id) => null,
  bikesSelected = [],
}) => {
  const { id, name, colors: _colors, level, ready } = bike;
  const wheel = (_colors.slice(0, 2) % 7) + 1;
  const axle = (_colors.slice(2, 4) % 4) + 1;
  const chair = (_colors.slice(4, 6) % 5) + 1;

  return (
    <div>
      <div
        className={!bikesSelected.includes(id) ? "bike" : "bike active"}
        onClick={() => handleSelectBike(id)}
      >
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
      <div className="bike_name">{name}</div>
      <div className="bike_level">Level: {level}</div>
      {isOwner && (
        <>
          <div>
            <button onClick={() => levelUp(id, level)}>Level up</button>
          </div>
          <div>
            <button onClick={() => transferBike(id)}>Transfer</button>
          </div>
        </>
      )}
      {!isOwner && (
        <>
          <div>
            <button onClick={() => console.log("buy")}>Buy</button>
          </div>
        </>
      )}
    </div>
  );
};

export default Bike;
