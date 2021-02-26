pragma solidity ^0.5.0;

contract BikeFactory {
    struct Bike {
        uint id;
        string name;
        uint colors;
        uint level;
        uint32 ready;
    }
    
 
    mapping (uint => Bike) public bikes;
    
    uint public count = 0;
    
    uint colorDigits = 10;
    uint colorModulus = 10 ** colorDigits;
    uint coolDownTime = 1 days;
    uint levelUpFeeUnit = 0.001 ether;
    
    mapping (uint => address) public bikeToOwner;
    mapping (address => uint) ownerBikeCount;
    
    event CreatedBike(uint id, string name, uint colors, uint level, uint32 ready);
    
    event LevelUpSuccess(uint id);
    
    event MergedTwoBike(uint from, uint to);
    
    function _createBike(string memory _name, uint colors) internal {
        count++;
        uint32 _ready = uint32(now + coolDownTime);
        Bike memory _bike = Bike(count, _name, colors, 1, _ready);
        bikes[count] = _bike;
        bikeToOwner[count] = msg.sender;
        ownerBikeCount[msg.sender]++;
        emit CreatedBike(count, _name, colors, 1, _ready);
    }
    
    function _createBikeWithLevel(string memory _name, uint colors, uint level) internal {
        count++;
        uint32 _ready = uint32(now + coolDownTime);
        Bike memory _bike = Bike(count, _name, colors, level, _ready);
        bikes[count] = _bike;
        bikeToOwner[count] = msg.sender;
        ownerBikeCount[msg.sender]++;
        emit CreatedBike(count, _name, colors, level, _ready);
    }
    
    function _randColors(string memory _name) internal view returns (uint){
        uint rand = uint(keccak256(abi.encodePacked(_name)));
        return rand % colorModulus;
    }
    // crreate random bike
    function createRandomBike(string memory _name) public {
        uint colors = _randColors(_name);
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
    
    // level up of bike
    function levelUp(uint _id) public payable onlyOwnerOf(_id) {
        Bike storage _bike = bikes[_id];
        require(msg.value >= uint(_bike.level*levelUpFeeUnit), "Not enough wei to level up");
        bikes[_id].level++;
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
        uint colors = (_fromBike.colors + _toBike.colors) / 2;
        colors = colors % colorModulus;
        uint _level = _fromBike.level + _toBike.level;
        _createBikeWithLevel(_name, colors, _level);
        _deleteBike(_from);
        _deleteBike(_to);
        emit MergedTwoBike(_from, _to);
    }
    
    // modifier function check is owner of bike
    modifier onlyOwnerOf(uint _id) {
        require(msg.sender == bikeToOwner[_id], "Must is owner of bike");
        _;
    }
}