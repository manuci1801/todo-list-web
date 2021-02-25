import React, { useEffect, useState } from "react";
import Web3 from "web3";
import "./App.css";
import Bike from "./Bike";

import TodoListConfig from "./TodoList.json";

const App = () => {
  const [appContract, setAppContract] = useState(null);
  const [userAddress, setUserAddress] = useState("");

  const [tasks, setTasks] = useState([]);
  const [content, setContent] = useState("");

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

      // load user's address
      web3.eth.getAccounts((err, accounts) => setUserAddress(accounts[0]));

      // load contract
      if (web3) {
        const contract = new web3.eth.Contract(
          TodoListConfig.abi,
          TodoListConfig.address
        );
        // get tasks
        getTasks(contract);
        // set contract to state
        setAppContract(contract);
      } else {
        alert("Cannot detect web3");
      }
    };
    loadInitData();
  }, []);

  const getTasks = async (contract) => {
    if (contract) {
      const taskCount = await contract.methods.taskCount().call();
      let tasks = [];
      for (let i = 1; i <= taskCount; i++) {
        const task = await contract.methods.tasks(i).call();
        tasks = [...tasks, task];
      }
      setTasks(tasks);
    }
  };

  const newTaskAdded = () => {
    // return appContract.events.NewTask((err, result) => {
    //   console.log(err);
    //   console.log(result);
    // });
    return appContract.getPastEvents("NewTask", {}, (err, result) => {
      // console.log(result);
      const { returnValues } = result[0];
      setTasks([...tasks, returnValues]);
    });
  };

  const addNewTask = async () => {
    return appContract.methods
      .createTask(content)
      .send({ from: userAddress })
      .on("receipt", function (receipt) {
        setContent("");
        newTaskAdded();
      })
      .on("error", function (error) {
        alert("Error");
      });
  };

  const taskDeleted = () => {
    return appContract.getPastEvents("DeletedTask", {}, (err, result) => {
      // console.log(result);
      const { id } = result[0].returnValues;
      setTasks([...tasks.filter((task) => task.id !== id)]);
    });
  };

  const deleteTask = async (id) => {
    return appContract.methods
      .deleteTask(id)
      .send({ from: userAddress })
      .on("receipt", function (receipt) {
        taskDeleted();
      })
      .on("error", function (error) {
        alert("Error");
      });
  };

  return (
    <div>
      {/* <div className="wrapper">
        <header>Todo App</header>
        <div className="inputField">
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            type="text"
            placeholder="Add your new todo"
          />
          <button onClick={() => addNewTask()}>
            <i className="fas fa-plus"></i>
          </button>
        </div>
        <ul className="todoList">
          {tasks
            .filter((task) => !task.isDeleted)
            .map((task) => (
              <li key={task.id} className={task.isCompleted ? "completed" : ""}>
                {task.content}
                <span className="icon" onClick={() => deleteTask(task.id)}>
                  <i className="fas fa-trash"></i>
                </span>
              </li>
            ))}
        </ul>
        <div className="footer">
          <button>Clear All</button>
        </div>
      </div> */}
      <div className="main">
        <Bike wheel="1" axle="2" chair="4" />
      </div>
    </div>
  );
};

export default App;
