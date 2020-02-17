"use strict";
exports.__esModule = true;
var Room_1 = require("./Room");
var ConnectedUsers = /** @class */ (function () {
    function ConnectedUsers() {
        this.RESERVED_NAMES = ["admin"];
        this.namesInUse = [];
        this.rooms = [];
    }
    ConnectedUsers.prototype.isUserNameFree = function (userName) {
        if (this.namesInUse.some(function (name) { return name === userName; }))
            return false;
        if (this.RESERVED_NAMES.some(function (name) { return name === userName; }))
            return false;
        return true;
    };
    ConnectedUsers.prototype.findRoom = function (roomName) {
        return this.rooms.findIndex(function (room) { return room.name === roomName; });
    };
    ConnectedUsers.prototype._addRoom = function (roomName) {
        return this.rooms.push(new Room_1["default"](roomName)) - 1;
    };
    ConnectedUsers.prototype.findUser = function (socketID) {
        var userIndex = -1;
        var roomIndex = -1;
        for (var i = 0; i < this.rooms.length; i++) {
            userIndex = this.rooms[i].users.findIndex(function (registeredUser) { return registeredUser.socketID === socketID; });
            if (userIndex > -1) {
                roomIndex = i;
                break;
            }
        }
        return { userIndex: userIndex, roomIndex: roomIndex };
    };
    ConnectedUsers.prototype.hasUser = function (user) {
        var foundUser = this.findUser(user.socketID);
        return foundUser.userIndex > -1 ? true : false;
    };
    ConnectedUsers.prototype.addUser = function (roomName, user) {
        if (!this.isUserNameFree(user.name))
            return false;
        var roomIndex = this.findRoom(roomName);
        if (roomIndex === -1) {
            roomIndex = this._addRoom(roomName);
        }
        this.rooms[roomIndex].addUser(user);
        this.namesInUse.push(user.name);
        return true;
    };
    ConnectedUsers.prototype.changeUserActivity = function (user) {
        var foundUser = this.findUser(user.socketID);
        if (foundUser)
            this.rooms[foundUser.roomIndex].users[foundUser.roomIndex].isIdle = user.isIdle;
    };
    ConnectedUsers.prototype.removeUser = function (socketID) {
        var _a = this.findUser(socketID), userIndex = _a.userIndex, roomIndex = _a.roomIndex;
        if (userIndex !== -1) {
            var deletedUser_1 = this.rooms[roomIndex].users.splice(userIndex, 1); // remove user
            // remove userName from namesInUse
            var deletedUserNameIndex = this.namesInUse.findIndex(function (name) { return name === deletedUser_1[0].name; });
            this.namesInUse.splice(deletedUserNameIndex, 1);
            return { user: deletedUser_1[0], roomIndex: roomIndex };
        }
        return null;
    };
    return ConnectedUsers;
}());
exports["default"] = ConnectedUsers;
