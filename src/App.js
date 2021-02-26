import React, { useEffect, useState } from "react";
import Web3 from "web3";
import "./App.css";
import Bike from "./Bike";

import BikeConfig from "./Bike.json";

const App = () => {
  const [appWeb3, setAppWeb3] = useState(null);
  const [appContract, setAppContract] = useState(null);
  const [userAddress, setUserAddress] = useState("");

  const [bikeName, setBikeName] = useState("");
  const [bikes, setBikes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [bikesSelected, setBikesSelected] = useState([]);
  const [updateMergeSuccess, setUpdateMergeSuccess] = useState(false);

  useEffect(() => {
    const loadInitData = async () => {
      let web3;
      const { web3: _web3, ethereum } = window;

      // load web3
      if (typeof ethereum !== "undefined") {
        await ethereum.enable();
        web3 = new Web3(ethereum);
      } else if (typeof _web3 !== "undefined") {
        web3 = new Web3(_web3.currentProvider);
      } else {
        web3 = new Web3(
          new Web3.providers.HttpProvider("http://localhost:8545")
        );
      }

      if (web3) {
        setAppWeb3(web3);
        // load user's address
        web3.eth.getAccounts((err, accounts) => setUserAddress(accounts[0]));

        // get network id to detect address from build json file
        const networkId = await web3.eth.net.getId();

        // load contract
        const contract = new web3.eth.Contract(
          BikeConfig.abi,
          BikeConfig.address
        );
        // get tasks
        getOwnerBikes(contract);
        // set contract to state
        setAppContract(contract);
      } else {
        alert("Cannot detect web3");
      }
    };
    loadInitData();
  }, []);

  // get all owner's bikes
  const getOwnerBikes = async (contract) => {
    try {
      const bikeArr = await contract.methods
        .getOwnerBikes()
        .call({ from: userAddress });
      let bikes = [];
      // console.log(bikeArr);
      if (bikeArr && bikeArr.length > 0) {
        for (let id of bikeArr) {
          const _bike = await contract.methods.bikes(id).call();
          bikes = [...bikes, _bike];
        }
      }
      await setBikes(bikes);
      setLoading(false);
    } catch (error) {
      console.log(error);
    }
  };

  // listen event CreatedBike from contract
  const createdBike = () => {
    return appContract.getPastEvents("CreatedBike", {}, (err, result) => {
      if (!err) {
        // console.log(bikes);
        const { returnValues } = result[0];
        setBikes([...bikes, returnValues]);
        if (updateMergeSuccess) setUpdateMergeSuccess(false);
      }
    });
  };

  // handle on click create new bike
  const createRandomBike = () => {
    if (bikeName) {
      return appContract.methods
        .createRandomBike(bikeName)
        .send({ from: userAddress })
        .on("receipt", (data) => {
          setBikeName("");
          createdBike();
        })
        .on("error", (err) => console.log(err));
    }
  };

  // listen event LevelUpSuccess from contract
  const levelUpSuccess = () => {
    return appContract.getPastEvents("LevelUpSuccess", {}, (err, result) => {
      if (!err) {
        const { id } = result[0].returnValues;
        const _bike = bikes.find((bike) => bike.id === id);
        _bike.level = +_bike.level + 1;
        setBikes([...bikes]);
      }
    });
  };

  // handle on cick level up
  const levelUp = async (id, level) => {
    if (id && level)
      return appContract.methods
        .levelUp(id)
        .send({
          from: userAddress,
          value: appWeb3.utils.toWei(0.001 * level + "", "ether"),
        })
        .on("receipt", (result) => {
          levelUpSuccess();
        })
        .on("error", (err) => {
          console.log(JSON.parse(err.message));
        });
  };

  // handle on click select a bike
  const handleSelectBike = (id) => {
    const idx = bikesSelected.findIndex((e) => e == id);
    if (bikesSelected.length < 2) {
      if (idx === -1) {
        setBikesSelected([...bikesSelected, id]);
      } else {
        setBikesSelected([
          ...bikesSelected.slice(0, idx),
          ...bikesSelected.slice(idx + 1, bikesSelected.length),
        ]);
      }
    } else {
      if (idx === -1) {
        setBikesSelected([
          ...bikesSelected.slice(
            bikesSelected.length - 1,
            bikesSelected.length
          ),
          id,
        ]);
      } else {
        setBikesSelected([
          ...bikesSelected.slice(0, idx),
          ...bikesSelected.slice(idx + 1, bikesSelected.length),
        ]);
      }
    }
  };

  // delete bike from bikes
  const deleteBikeFromArray = (id, arr) => {
    const idx = arr.findIndex((e) => e.id == id);
    return [...arr.slice(0, idx), ...arr.slice(idx + 1, arr.length)];
  };

  // listen event MergedTwoBike from contract
  const mergedTwoBike = () => {
    return appContract.getPastEvents(
      "MergedTwoBike",
      {},
      async (err, result) => {
        if (!err) {
          const { from, to } = result[0].returnValues;
          // setBikes([...bikes, returnValues]);
          let arr;
          arr = deleteBikeFromArray(from, bikes);
          arr = deleteBikeFromArray(to, arr);
          setBikes([...arr]);
          setBikesSelected([]);
          setUpdateMergeSuccess(true);
        }
      }
    );
  };

  // effect after update merge two bike success to refetch new bike
  useEffect(() => {
    if (updateMergeSuccess) createdBike();
  }, [updateMergeSuccess]);

  // handle on click merge two bike
  const handleMergeTowBike = () => {
    if (bikesSelected.length == 2) {
      const name = window.prompt("Enter new name of bike");
      if (!name) {
        return alert("Please enter a name");
      }
      return appContract.methods
        .mergeTwoBike(name, bikesSelected[0], bikesSelected[1])
        .send({ from: userAddress })
        .on("receipt", (result) => {
          mergedTwoBike();
        })
        .on("error", (err) => {
          console.log(err);
        });
    }
  };

  return (
    <div>
      <div className="main">
        <div>
          <div>
            <input
              value={bikeName}
              onChange={(e) => setBikeName(e.target.value)}
              type="text"
              placeholder="Enter name of bike which you want"
            />
          </div>
          <button onClick={() => createRandomBike()}>Enter</button>
        </div>
        {loading ? (
          <h3>Loading data from contract...</h3>
        ) : (
          bikes.length > 0 && (
            <>
              <div className="list-bikes">
                {bikes.map((bike, idx) => (
                  <Bike
                    key={idx}
                    bike={bike}
                    levelUp={levelUp}
                    handleSelectBike={handleSelectBike}
                    bikesSelected={bikesSelected}
                  />
                ))}
              </div>
              <div>
                <button
                  style={{
                    margin: "16px",
                    fontSize: "20px",
                    cursor:
                      bikesSelected.length < 2 ? "not-allowed" : "pointer",
                    textDecoration:
                      bikesSelected.length < 2 ? "line-through" : "none",
                  }}
                  onClick={() => handleMergeTowBike()}
                >
                  Merge two bike
                </button>
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
};

export default App;
