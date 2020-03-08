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
        var userIndex, roomIndex;
        for (var i = 0; i < this.rooms.length; i++) {
            userIndex = this.rooms[i].users.findIndex(function (registeredUser) { return registeredUser.socketID === socketID; });
            if (userIndex > -1) {
                roomIndex = i;
                break;
            }
        }
        if (userIndex === -1)
            return null;
        return { userIndex: userIndex, roomIndex: roomIndex };
    };
    ConnectedUsers.prototype.hasUser = function (user) {
        var foundUser = this.findUser(user.socketID);
        return foundUser.userIndex > -1 ? true : false;
    };
    ConnectedUsers.prototype.addUser = function (socket, roomName, user) {
        var _this = this;
        if (!this.isUserNameFree(user.name))
            return false;
        var roomIndex = this.findRoom(roomName);
        if (roomIndex === -1) {
            roomIndex = this._addRoom(roomName);
        }
        this.rooms[roomIndex].addUser(user);
        this.namesInUse.push(user.name);
        setTimeout(function () {
            _this.rooms[roomIndex].emitRoomUsersActivity(socket, true);
        }, 200);
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
    ConnectedUsers.prototype.userLeaving = function (socket) {
        var removeInfo = this.removeUser(socket.id);
        if (removeInfo) {
            var user = removeInfo.user, roomIndex = removeInfo.roomIndex;
            var roomName = this.rooms[roomIndex].name;
            if (!this.rooms[roomIndex].users.length) { // if the room is empty...
                this.removeRoom(roomIndex); // ...delete it.
                console.log("User \"" + user.name + "\" has left the room \"" + roomName + "\", and the room was closed.");
            }
            else { // message the room about the user leaving
                this.rooms[roomIndex].emitRoomUsersActivity(socket);
                socket.to(roomName).emit("admin message", { fromUser: "admin", text: "User " + user.name + " has left the room." });
                console.log("User \"" + user.name + "\" has left the room \"" + roomName + "\".");
            }
            socket.emit("user logged out"); // logout the user on the client
        }
    };
    ConnectedUsers.prototype.removeRoom = function (roomId) {
        return this.rooms.splice(roomId, 1)[0];
    };
    return ConnectedUsers;
}());
exports["default"] = ConnectedUsers;
