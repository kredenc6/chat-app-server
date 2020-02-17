"use strict";
exports.__esModule = true;
var http = require("http");
var express = require("express");
var socketIo = require("socket.io");
var ConnectedUsers_1 = require("./classes/ConnectedUsers");
var app = express();
var server = http.createServer(app);
var PORT = 8889;
var io = socketIo(server);
var usersOnline = new ConnectedUsers_1["default"]();
var emitRoomUsers = function (socket, roomID, toSelf) {
    var roomIndex;
    var roomName;
    if (typeof roomID === "number") {
        roomIndex = roomID;
        roomName = usersOnline.rooms[roomID].name;
    }
    else {
        roomIndex = usersOnline.rooms.findIndex(function (room) { return room.name === roomID; });
        roomName = roomID;
    }
    if (roomIndex === -1) {
        console.warn("Could not find roomIndex by roomID " + roomID + ".");
        return;
    }
    var userData = usersOnline.rooms[roomIndex].users.map(function (_a) {
        var name = _a.name, isIdle = _a.isIdle;
        return { name: name, isIdle: isIdle };
    });
    if (toSelf)
        socket.emit("room users", userData);
    else
        socket.to(roomName).emit("room users", userData);
};
io.on("connection", function (socket) {
    console.log("Socket: " + socket.id + " connected.");
    socket.on("join room", function (_a) {
        var roomName = _a.roomName, userName = _a.userName;
        var userInfo = { socketID: socket.id, name: userName, isIdle: true };
        var isUserNameFree = !usersOnline.namesInUse.includes(userName);
        var announceUserJoining = function () {
            socket.emit("room joining confirmation", { yes: true, serverRoomName: roomName });
            socket.emit("admin message", { fromUser: "admin", text: userName + "! Welcome to the room " + roomName + "." });
            socket.to(roomName).emit("admin message", { fromUser: "admin", text: "User " + userName + " has joined the room." });
            socket.to(roomName).emit("user activity", { name: userName, isIdle: true });
            console.log("Socket: \"" + socket.id + "\" with userName: \"" + userName + "\" has joined room \"" + roomName + "\".");
        };
        if (isUserNameFree) {
            setTimeout(function () {
                emitRoomUsers(socket, roomName, true);
            }, 200);
            socket.join(roomName, function () {
                usersOnline.addUser(roomName, userInfo);
                announceUserJoining();
            });
        }
        else {
            socket.emit("room joining confirmation", { yes: false, serverRoomName: roomName });
        }
    });
    socket.on("check userName", function (userName) {
        var isUserNameFree = usersOnline.isUserNameFree(userName);
        socket.emit("checked userName", isUserNameFree);
    });
    socket.on("chat message", function (_a) {
        var fromUser = _a.fromUser, toRoom = _a.toRoom, text = _a.text;
        socket.to(toRoom).emit("chat message", { fromUser: fromUser, text: text });
    });
    socket.on("user activity", function (_a) {
        var name = _a.name, isIdle = _a.isIdle;
        var foundUser = usersOnline.findUser(socket.id);
        if (foundUser.userIndex === -1)
            return;
        var roomName = usersOnline.rooms[foundUser.roomIndex].name;
        usersOnline.changeUserActivity({ socketID: socket.id, name: name, isIdle: isIdle });
        socket.to(roomName).emit("user activity", { name: name, isIdle: isIdle });
        socket.emit("user activity", { name: name, isIdle: isIdle });
    });
    // TODO close the room whenever the last user leaves or DCs
    socket.on("leave room", function (roomName) {
        socket.leave(roomName, function (error) {
            if (error) {
                console.log(error);
                return;
            }
            var removeInfo = usersOnline.removeUser(socket.id);
            if (removeInfo) {
                socket.emit("user logged out");
                emitRoomUsers(socket, roomName);
                socket.to(roomName).emit("admin message", { fromUser: "admin", text: "User " + removeInfo.user.name + " has left the room." });
                console.log("User: \"" + removeInfo.user.name + "\" has left the room: \"" + roomName + "\".");
            }
        });
    });
    socket.on("disconnect", function () {
        var removeInfo = usersOnline.removeUser(socket.id);
        if (removeInfo) {
            emitRoomUsers(socket, removeInfo.roomIndex);
            console.log("User \"" + removeInfo.user.name + "\" has disconnected.");
        }
    });
});
app.get("/", function (req, res) {
    res.send("Hoya! Ho!");
});
server.listen(PORT, function () { return console.log("Server listening on port: " + PORT + "."); });
