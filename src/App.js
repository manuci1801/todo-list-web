import React, { useEffect, useState } from "react";
import Web3 from "web3";
import { ethers } from "ethers";
import "./App.css";
import Bike from "./Bike";

import BikeConfig from "./Bike.json";

const App = () => {
  const [appWeb3, setAppWeb3] = useState(undefined);
  const [appContract, setAppContract] = useState(undefined);
  const [userAddress, setUserAddress] = useState("");
  const [provider, setProvider] = useState(null);

  const [bikeName, setBikeName] = useState("");
  const [bikes, setBikes] = useState([]);
  const [differentBikes, setDifferentBikes] = useState([]);
  const [bikesSold, setBikesSold] = useState([]);
  const [bikeAcceptedToBuy, setBikeAcceptedToBuy] = useState([]);
  const [loading, setLoading] = useState(true);

  const [bikesSelected, setBikesSelected] = useState([]);
  const [updateMergeSuccess, setUpdateMergeSuccess] = useState(false);

  useEffect(() => {
    const loadInitData = async () => {
      let web3, provider;
      const { web3: _web3, ethereum } = window;

      // load web3
      if (typeof ethereum !== "undefined") {
        await ethereum.enable();
        web3 = new Web3(ethereum);
        // provider = new ethers.providers.Web3Provider(ethereum);
      } else if (typeof _web3 !== "undefined") {
        web3 = new Web3(_web3.currentProvider);
        // provider = new ethers.providers.Web3Provider(_web3.currentProvider);
      } else {
        web3 = new Web3(
          new Web3.providers.HttpProvider("http://localhost:8545")
        );
        // provider = new ethers.providers.JsonRpcProvider();
      }

      // const signer = provider.getSigner(0);
      // const contract = new ethers.Contract(
      //   BikeConfig.address,
      //   BikeConfig.abi,
      //   signer
      // );
      // setAppContract(contract);

      if (web3) {
        web3.eth.handleRevert = true;
        setAppWeb3(web3);

        // load user's address
        web3.eth.getAccounts((err, accounts) => {
          setUserAddress(accounts[0]);
          setLoading(false);
        });

        // get network id to detect address from build json file
        const networkId = await web3.eth.net.getId();

        // load contract
        const contract = new web3.eth.Contract(
          BikeConfig.abi,
          BikeConfig.address
        );
        // console.log(contract);
        // set contract to state
        setAppContract(contract);

        // console.log("mount");
        getOwnerBikes(contract);
        //     // getDifferentOwnerBikes(contract);
        getBikesSelling(contract);
        getOwnerBikesSelling(contract);
        getBikeApprovals(contract);

        // listen events
        approveTransfer(contract);
      } else {
        alert("Cannot detect web3");
      }
    };
    loadInitData();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      // console.log(appWeb3);
      if (typeof appWeb3 !== "undefined") {
        appWeb3.eth.getAccounts((err, accounts) => {
          if (accounts[0] !== userAddress) {
            // console.log("mount");
            setUserAddress(accounts[0]);
          }
        });
      }
    }, 300);
    return () => clearInterval(interval);
  }, [appWeb3, userAddress, appContract]);

  // useEffect(() => {
  //   if (!loading) {
  //     if (typeof appContract !== "undefined" && !!userAddress) {
  //       // console.log("mount");
  //       getOwnerBikes(appContract);
  //       //     // getDifferentOwnerBikes(appContract);
  //       getBikesSelling(appContract);
  //       getOwnerBikesSelling(appContract);
  //       getBikeApprovals(appContract);

  //       // listen events
  //       approveTransfer(appContract);
  //     }
  //   }
  // }, [loading]);

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
    } catch (error) {
      console.log(error);
    }
  };

  // get list bikes sold of yourself
  const getOwnerBikesSelling = async (contract) => {
    try {
      const bikeArr = await contract.methods
        .getOwnerBikesSelling()
        .call({ from: userAddress });
      let bikes = [];
      // console.log(bikeArr);
      if (bikeArr && bikeArr.length > 0) {
        for (let id of bikeArr) {
          if (+id !== 0) {
            const _bike = await contract.methods.bikes(id).call();
            const _addresses = await contract.methods
              .getRequestBuyOwnerBike(id)
              .call();
            _bike.addressesBuy = _addresses;
            bikes = [...bikes, _bike];
          }
        }
      }
      await setBikesSold(bikes);
    } catch (error) {
      console.log(error);
    }
  };

  // get list bikes sold of different
  const getBikesSelling = async (contract) => {
    try {
      const bikeArr = await contract.methods
        .getBikesSelling()
        .call({ from: userAddress });
      let bikes = [];
      // console.log(bikeArr);
      if (bikeArr && bikeArr.length > 0) {
        for (let id of bikeArr) {
          if (+id !== 0) {
            const _bike = await contract.methods.bikes(id).call();
            // console.log(_bike);
            if (_bike.id !== "0") bikes = [...bikes, _bike];
          }
        }
      }
      await setDifferentBikes(bikes);
    } catch (error) {
      console.log(error);
    }
  };

  // get all approvals bikes and need confirm to buy
  const getBikeApprovals = async (contract) => {
    try {
      const bikeArr = await contract.methods
        .getBikeApprovals()
        .call({ from: userAddress });
      let addresses = [];
      for (let id of bikeArr) {
        const address = await contract.methods
          .bikeToOwner(id)
          .call({ from: userAddress });
        const bike = await contract.methods.bikes(id).call();
        console.log(bike);
        addresses = [...addresses, { bike, address }];
      }
      setBikeAcceptedToBuy([...addresses]);
    } catch (error) {
      console.log(error);
    }
  };

  // get different owner's bikes max 10
  const getDifferentOwnerBikes = async (contract) => {
    try {
      const bikeArr = await contract.methods
        .getDifferentOwnerBikes()
        .call({ from: userAddress });
      let bikes = [];
      // console.log(bikeArr);
      if (bikeArr && bikeArr.length > 0) {
        for (let id of bikeArr) {
          if (id != 0) {
            const _bike = await contract.methods.bikes(id).call();
            // console.log(_bike);
            if (_bike.id != "0") bikes = [...bikes, _bike];
          }
        }
      }
      await setDifferentBikes(bikes);
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
    // return appContract.events.CreatedBike();
  };

  // handle on click create new bike
  const createRandomBike = () => {
    if (bikeName) {
      // return appContract
      //   .createRandomBike(bikeName, { from: userAddress })
      //   .then((res) => eventsListen())
      //   .catch((err) => {
      //     if (err.data && err.data.message) return alert(err.data.message);
      //     console.log(err);
      //   });
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

  const eventsListen = (contract) => {
    contract.on("CreatedBike", (author, oldValue, newValue, event) => {
      // Called when anyone changes the value

      console.log(author.toString());
      // "0x14791697260E4c9A71f18484C9f997B308e59325"

      console.log(oldValue);
      // "Hello World"

      console.log(newValue.toString());
      // "Ilike turtles."

      // See Event Emitter below for all properties on Event
      console.log(event.blockNumber);
      // 4115004
    });
  };

  // handle on cick level up
  const levelUp = async (id, level) => {
    if (id && level) {
      // return appContract
      //   .levelUp(id, {
      //     from: userAddress,
      //     value: ethers.utils.parseEther(0.001 * level + ""),
      //   })
      //   .then((res) => console.log(res))
      //   .catch((err) => {
      //     if (err.data && err.data.message) return alert(err.data.message);
      //     console.log(err);
      //   });
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
          if (err && err.message) {
            const reason = getReasonString(err.message);
            return alert(reason);
          }
        });
    }
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
          getOwnerBikesSelling(appContract);
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

  // listen event Transfer from contract
  const transferSuccess = () => {
    return appContract.getPastEvents("Transfer", {}, (err, result) => {
      if (!err) {
        getOwnerBikes(appContract);
        getDifferentOwnerBikes(appContract);
      }
    });
  };

  // transfer bike to other people
  const transferBike = (id) => {
    const address = window.prompt(
      "Enter address which you want to transfer to"
    );
    if (appWeb3.utils.isAddress(address))
      return appContract.methods
        .transferFrom(userAddress, address, id)
        .send({ from: userAddress })
        .on("receipt", (result) => {
          transferSuccess();
          alert("Transfer success");
        })
        .on("error", (err) => {
          console.log(err);
        });
    else alert("Please enter a valid address");
  };

  // sell bike
  const sellBike = (id) => {
    return appContract.methods
      .sellBike(id)
      .send({ from: userAddress })
      .on("receipt", (result) => {
        // getBikesSelling(appContract);
        getOwnerBikesSelling(appContract);
        alert("Success, wait someone buy it");
      })
      .on("error", (err) => {
        console.log(err);
      });
  };

  const cancelSell = (id) => {
    return appContract.methods
      .cancelSellBike(id)
      .send({ from: userAddress })
      .on("receipt", (result) => {
        // getBikesSelling(appContract);
        getOwnerBikesSelling(appContract);
        alert("Cancel success");
      })
      .on("error", (err) => {
        console.log(err);
      });
  };

  const acceptCanBuyBike = (address, id) => {
    if (!address) return;
    if (appWeb3.utils.isAddress(address))
      return appContract.methods
        .approve(address, id)
        .send({ from: userAddress })
        .on("receipt", (result) => {
          console.log(result);
        })
        .on("error", (err) => {
          if (err && err.message) {
            const reason = getReasonString(err.message);
            return alert(reason);
          }
        });
    else return alert("invalid address");
  };

  const requestBuyBike = (id) => {
    return appContract.methods
      .requestBuyBike(id)
      .send({ from: userAddress })
      .on("receipt", (result) => {
        console.log(result);
      })
      .on("error", (err) => {
        if (err && err.message) {
          const reason = getReasonString(err.message);
          return alert(reason);
        }
      });
  };

  // get revert string from smart contract
  const getReasonString = (message) => {
    let idx = message.indexOf(`"reason":"`);
    return message.slice(idx + 10).split(`"}`)[0];
  };

  const approveTransfer = (contract) => {
    return contract.getPastEvents(
      "Approval",
      { filter: { _approve: userAddress }, fromBlock: 0, toBlock: "latest" },
      (err, result) => {
        if (!err) {
          console.log(result);
        }
      }
    );
  };

  const confirmBuyBike = (id, address) => {
    if (window.confirm(`Do you want to buy "${id}" from "${address}"`))
      if (appWeb3.utils.isAddress(address))
        return appContract.methods
          .transferFrom(address, userAddress, id)
          .send({ from: userAddress })
          .on("receipt", (result) => {
            // transferSuccess();
            getOwnerBikes(appContract);
            getBikeApprovals(appContract);
            getBikesSelling(appContract);
            alert("Transfer success");
          })
          .on("error", (err) => {
            console.log(err);
          });
      else return alert("Please enter a valid address");
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
          (bikes.length > 0 ||
            bikesSold.length > 0 ||
            bikeAcceptedToBuy.length > 0) && (
            <>
              <div>Bikes are approved to buy</div>
              <div className="list-bikes">
                {bikeAcceptedToBuy.map((bike) => (
                  <div key={bike.address}>
                    <div>
                      <Bike
                        bike={bike.bike}
                        isOwner={false}
                        isAcceptToBuy={true}
                      />
                    </div>
                    <div>{bike.address}</div>
                    <button
                      onClick={() => confirmBuyBike(bike.bike.id, bike.address)}
                    >
                      Confirm buy
                    </button>
                  </div>
                ))}
              </div>
              <hr />
              <div>Your bike</div>
              <div className="list-bikes">
                {bikes.map((bike, idx) => (
                  <Bike
                    key={idx}
                    bike={bike}
                    isOwner={true}
                    levelUp={levelUp}
                    sellBike={sellBike}
                    handleSelectBike={handleSelectBike}
                    bikesSelected={bikesSelected}
                    transferBike={transferBike}
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
              <hr />
              <div>Your bikes are selling</div>
              <div className="list-bikes">
                {bikesSold.map((bike, idx) => (
                  <Bike
                    key={idx}
                    bike={bike}
                    isOwner={true}
                    isSold={true}
                    cancelSell={cancelSell}
                    acceptCanBuyBike={acceptCanBuyBike}
                  />
                ))}
              </div>
              <hr />
              <div>Different bikes are selling are selling</div>
              <div className="list-bikes">
                {differentBikes.map((bike, idx) => (
                  <Bike key={idx} bike={bike} requestBuyBike={requestBuyBike} />
                ))}
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
};

export default App;
