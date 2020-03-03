"use strict";
exports.__esModule = true;
var http = require("http");
var express = require("express");
var socketIo = require("socket.io");
var ConnectedUsers_1 = require("./classes/ConnectedUsers");
var app = express();
var server = http.createServer(app);
var PORT = 8889;
var port = process.env.PORT;
if (port === null || port === "")
    port = PORT;
var io = socketIo(server);
var usersOnline = new ConnectedUsers_1["default"]();
io.on("connection", function (socket) {
    console.log("Socket \"" + socket.id + "\" connected.");
    socket.on("join room", function (_a) {
        var roomName = _a.roomName, userName = _a.userName;
        var userInfo = { socketID: socket.id, name: userName, isIdle: true };
        var isUserNameFree = !usersOnline.namesInUse.includes(userName);
        var announceUserJoining = function () {
            socket.emit("room joining confirmation", { yes: true, serverRoomName: roomName });
            socket.emit("admin message", { fromUser: "admin", text: userName + "! Welcome to the room " + roomName + "." });
            socket.to(roomName).emit("admin message", { fromUser: "admin", text: "User " + userName + " has joined the room." });
            socket.to(roomName).emit("user activity", { name: userName, isIdle: true });
            console.log("Socket \"" + socket.id + "\" with userName \"" + userName + "\" has joined room \"" + roomName + "\".");
        };
        if (isUserNameFree) {
            socket.join(roomName, function () {
                usersOnline.addUser(socket, roomName, userInfo);
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
    socket.on("leave room", function (roomName) {
        socket.leave(roomName, function (error) {
            if (error) {
                console.log(error);
                return;
            }
            usersOnline.userLeaving(socket);
        });
    });
    socket.on("disconnect", function () {
        usersOnline.userLeaving(socket);
        console.log("   - the user has disconnected.");
    });
});
app.get("/", function (req, res) {
    res.send("Hoya! Ho!");
});
server.listen(port, function () { return console.log("Server listening on port: " + port + "."); });
