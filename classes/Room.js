"use strict";
exports.__esModule = true;
var Room = /** @class */ (function () {
    function Room(name) {
        this.name = name;
        this.users = [];
    }
    Room.prototype.addUser = function (user) {
        this.users.push(user);
    };
    Room.prototype.findUser = function (socketID) {
        return this.users.findIndex(function (registeredUser) { return registeredUser.socketID === socketID; });
    };
    Room.prototype.hasUser = function (user) {
        return this.findUser(user.socketID) > -1 ? true : false;
    };
    Room.prototype.removeUser = function (socketID) {
        var userIndex = this.findUser(socketID);
        if (userIndex !== -1) {
            this.users.splice(userIndex, 1);
            return true;
        }
        else
            return false;
    };
    return Room;
}());
exports["default"] = Room;
;
