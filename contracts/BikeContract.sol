pragma solidity ^0.5.0;

import "./Ownable.sol";
import "./ERC721.sol";

contract BikeFactory is Ownable, ERC721 {
    struct Bike {
        uint id;
        string name;
        uint32 colors;
        uint level;
        uint32 ready;
    }
    
    // list all bikes
    uint public count = 0;
    mapping(uint => Bike) public bikes;
    
    mapping(address => uint) ownerBikeCount;
    mapping(uint => address) public bikeToOwner;
    
    uint colorDigits = 16;
    uint colorModulus = 10 ** colorDigits;
    uint coolDownTime = 1 days;
    uint feeUint = 0.001 ether;
    
    // list all bikes are selling
    uint public bikeSoldCount = 0;
    mapping(uint => address) public bikesSold;
    mapping(address => uint) public ownerBikeSoldCount;
    
    
    // mapping bikeId => address approved to transfer
    mapping(uint => address) bikeApprovals;
    mapping(address=> uint) ownerBikeApprovalsCount;
    
    mapping(uint => address[]) requestBuys;
    
    // events of contract
    event CreatedBike(uint indexed id, string name, uint colors, uint level, uint32 ready);
    
    event LevelUpSuccess(uint indexed id);
    
    event MergedTwoBike(uint indexed from, uint indexed to);
    
    // change level up fee by owner of contract
    function changeFeeUint(uint _fee) public onlyOwner() {
        feeUint = _fee;
    }
    
    // private function to create new bike
    function _createBike(string memory _name, uint32 colors) internal {
        count++;
        uint32 _ready = uint32(now);
        Bike memory _bike = Bike(count, _name, colors, 1, _ready);
        bikes[count] = _bike;
        bikeToOwner[count] = msg.sender;
        ownerBikeCount[msg.sender]++;
        emit CreatedBike(count, _name, colors, 1, _ready);
    }
    
    function _createBikeWithLevel(string memory _name, uint32 colors, uint level) internal {
        count++;
        uint32 _ready = uint32(now + coolDownTime);
        Bike memory _bike = Bike(count, _name, colors, level, _ready);
        bikes[count] = _bike;
        bikeToOwner[count] = msg.sender;
        ownerBikeCount[msg.sender]++;
        emit CreatedBike(count, _name, colors, level, _ready);
    }
    
    function _randColors(string memory _name) internal view returns (uint32){
        uint rand = uint(keccak256(abi.encodePacked(_name)));
        return uint32(rand % colorModulus);
    }
    // crreate random bike
    function createRandomBike(string memory _name) public {
        uint32 colors = _randColors(_name);
        _createBike(_name, colors);
    }
    
    // get all owner bikes of user
    function getOwnerBikes() public view returns(uint [] memory) {
        uint[] memory _bikes = new uint[](ownerBikeCount[msg.sender]);
        uint counter = 0;
        for(uint i = 1; i <= count; i++) {
            if(bikeToOwner[i] == msg.sender) {
                _bikes[counter] = i;
                counter++;
            }
        }
        return _bikes;
    }
    
    // trigger check cool-down time to level up
    modifier _isCoolDown(uint _id) {
        Bike memory _bike = bikes[_id];
        require(_bike.ready < now, "must have to cool-down time");
        _;
    }
    // level up of bike
    function levelUp(uint _id) public payable onlyOwnerOf(_id) _isCoolDown(_id) {
        Bike storage _bike = bikes[_id];
        require(msg.value >= uint(_bike.level*feeUint), "Not enough wei to level up");
        bikes[_id].level++;
        bikes[_id].ready = bikes[_id].ready + uint32(now);
        emit LevelUpSuccess(_id);
    }
    
    function _deleteBike(uint _id) private onlyOwnerOf(_id) {
        delete bikes[_id];
        delete bikeToOwner[_id];
        ownerBikeCount[msg.sender]--;
    }
    
    // merge two bike to one new bike
    function mergeTwoBike(string memory _name, uint _from, uint _to) public onlyOwnerOf(_from) onlyOwnerOf(_to) {
        require(_from != _to, "bikeId can not to be same");
        Bike memory _fromBike = bikes[_from];
        Bike memory _toBike = bikes[_to];
        uint32 colors = (_fromBike.colors + _toBike.colors) / 2;
        colors = uint32(colors % colorModulus);
        uint _level = _fromBike.level + _toBike.level;
        _createBikeWithLevel(_name, colors, _level);
        _deleteBike(_from);
        _deleteBike(_to);
        delete bikesSold[_from];
        delete bikesSold[_to];
        emit MergedTwoBike(_from, _to);
    }
    
    // modifier function check is owner of bike
    modifier onlyOwnerOf(uint _id) {
        require(msg.sender == bikeToOwner[_id], "Must is owner of bike");
        _;
    }
    
    // check is not owner of bike
    modifier onlyNotOwnerOf(uint _id) {
        require(msg.sender != bikeToOwner[_id], "Must is not owner of bike");
        _;
    }
    
    // get bikes of different people
    function getDifferentOwnerBikes() public view returns(uint [] memory) {
        uint[] memory _bikes = new uint[](count - ownerBikeCount[msg.sender]);
        uint counter = 0;
        for(uint i = 1; i <= count; i++) {
            if(bikeToOwner[i] != msg.sender) {
                _bikes[counter] = i;
                counter++;
            }
        }
        return _bikes;
    }
    
    
    function balanceOf(address _owner) external view returns (uint256) {
        return ownerBikeCount[_owner];
    }

    function ownerOf(uint256 _tokenId) external view returns (address) {
        return bikeToOwner[_tokenId];
    }

    function _transfer(address _from, address _to, uint256 _tokenId) private {
        ownerBikeCount[_from]--;
        ownerBikeCount[_to]++;
        bikeToOwner[_tokenId] = _to;
        emit Transfer(_from, _to, _tokenId);
        
    }

    function transferFrom(address _from, address _to, uint256 _tokenId) external payable {
        require(bikeToOwner[_tokenId] == msg.sender || bikeApprovals[_tokenId] == msg.sender);
        if(bikeApprovals[_tokenId] == msg.sender) {
            ownerBikeApprovalsCount[msg.sender]--;
            delete bikesSold[_tokenId];
            bikeSoldCount--;
            ownerBikeSoldCount[_from]--;
        }
        _transfer(_from, _to, _tokenId);
        delete bikeApprovals[_tokenId];
    }

    function approve(address _approved, uint256 _tokenId) external payable onlyOwnerOf(_tokenId) {
        bikeApprovals[_tokenId] = _approved;
        ownerBikeApprovalsCount[_approved]++;
        emit Approval(msg.sender, _approved, _tokenId);
    }
    
    // sell a bike from different
    function sellBike(uint256 _id) public onlyOwnerOf(_id) {
        bikesSold[_id] = msg.sender;
        bikeSoldCount++;
        ownerBikeSoldCount[msg.sender]++;
    }
    
    function cancelSellBike(uint256 _id) public onlyOwnerOf(_id) {
        require(bikesSold[_id] != address(0));
        delete bikesSold[_id];
        bikeSoldCount--;
        ownerBikeSoldCount[msg.sender]--;
    }
    
    // get all list bikes are sold of yourself
    function getBikesSoldOfYourself() public view returns (uint[] memory) {
        uint[] memory _bikes = new uint[](ownerBikeSoldCount[msg.sender]);
        uint counter = 0;
        for(uint i = 1; i <= count; i++) {
            if(bikesSold[i] != address(0) && bikesSold[i] == msg.sender) {
                _bikes[counter] = i;
                counter++;
            }
        }
        return _bikes;
    }
    
    // get all list bikes are sold of different
    function getBikesSold() public view returns (uint[] memory) {
        uint[] memory _bikes = new uint[](count);
        uint counter = 0;
        for(uint i = 1; i <= count; i++) {
            if(bikesSold[i] != address(0) && bikesSold[i] != msg.sender) {
                _bikes[counter] = i;
                counter++;
            }
        }
        return _bikes;
    }
    
    // check is bike sold
     modifier onlyBikeSold(uint _id) {
        require(bikesSold[_id] != address(0), "bike is not sold");
        _;
    }
    
    // request buy bike from not owner of bike
    function requestBuyBike(uint _id) public onlyNotOwnerOf(_id) onlyBikeSold(_id) {
        address[] storage _addresses = requestBuys[_id];
        bool flag = false;
        for(uint i = 0; i < _addresses.length; i++) {
            if(_addresses[i] == msg.sender) {
                flag = true;
                break;
            }
        }
        if(flag) {
            revert("Already request buy this bike");
        } else {
            _addresses.push(msg.sender);
        }
    }
    
    // get request buy of a owner bike 
    function getRequestBuyOwnerBike(uint _id) public view onlyOwnerOf(_id) returns (address[] memory) {
        address[] memory _addresses = requestBuys[_id];
        return _addresses;
    }
    
    // get all bikes approve to transfer
    function getBikeApprovals() public view returns (uint[] memory) {
        uint[] memory _bikes = new uint[](ownerBikeApprovalsCount[msg.sender]);
        uint counter = 0;
        for(uint i = 1; i <= count; i++) {
           if(bikeApprovals[i] == msg.sender) {
               _bikes[counter] = i;
               counter++;
           }
        }
        return _bikes;
    }
    
}