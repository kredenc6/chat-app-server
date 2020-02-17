import * as http from "http";
import * as express from "express";
import * as socketIo from "socket.io";
import ConnectedUser from "./interfaces/ConnectedUser";
import ConnectedUsers from "./classes/ConnectedUsers";

const app = express();
const server = http.createServer(app);
const PORT: number = 8889;
const io = socketIo(server);
const usersOnline: ConnectedUsers = new ConnectedUsers();
const emitRoomUsers = (socket: socketIo.Socket, roomID: string | number, toSelf?: boolean) => { // roomID accepts roomName or roomIndex
  let roomIndex: number;
  let roomName: string;
  if(typeof roomID === "number") {
    roomIndex = roomID;
    roomName = usersOnline.rooms[roomID].name;
  }
  else {
    roomIndex = usersOnline.rooms.findIndex(room => room.name === roomID);
    roomName = roomID;
  }
  if(roomIndex === -1) {
    console.warn(`Could not find roomIndex by roomID ${roomID}.`);
    return;
  }
  const userData = usersOnline.rooms[roomIndex].users.map(({ name, isIdle }) => {
    return { name, isIdle };
  });
  if(toSelf) socket.emit("room users", userData);
  else socket.to(roomName).emit("room users", userData);
}

io.on("connection", (socket) => {
  console.log(`Socket: ${ socket.id } connected.`);

  socket.on("join room", ({ roomName, userName }: { roomName: string, userName: string }) => {
    const userInfo: ConnectedUser = { socketID: socket.id, name: userName, isIdle: true };
    const isUserNameFree = !usersOnline.namesInUse.includes(userName);
    const announceUserJoining = () => {
      socket.emit("room joining confirmation", { yes: true, serverRoomName: roomName });
      socket.emit("admin message", { fromUser: "admin", text: `${ userName }! Welcome to the room ${ roomName }.`});
      socket.to(roomName).emit("admin message", { fromUser: "admin", text: `User ${ userName } has joined the room.`});
      socket.to(roomName).emit("user activity", { name: userName, isIdle: true });
      console.log(`Socket: "${ socket.id }" with userName: "${ userName }" has joined room "${ roomName }".`);
    }
    if(isUserNameFree) {
      setTimeout(() => {
        emitRoomUsers(socket, roomName, true);
      }, 200);
      
      socket.join(roomName, () => {
        usersOnline.addUser(roomName, userInfo);
        announceUserJoining();
      });
    }
    else {
      socket.emit("room joining confirmation", { yes: false, serverRoomName: roomName });
    }

  });

  socket.on("check userName", (userName: string) => {
    const isUserNameFree = usersOnline.isUserNameFree(userName);
    socket.emit("checked userName", isUserNameFree);
  });

  socket.on("chat message", ({ fromUser, toRoom, text }) => {
    socket.to(toRoom).emit("chat message", { fromUser, text });
  });

  socket.on("user activity", ({ name, isIdle }: { name: string, isIdle: boolean }) => {
    const foundUser = usersOnline.findUser(socket.id);
    if(foundUser.userIndex === -1) return;

    const roomName = usersOnline.rooms[foundUser.roomIndex].name;
    usersOnline.changeUserActivity({ socketID: socket.id, name: name, isIdle });
    socket.to(roomName).emit("user activity", { name, isIdle });
    socket.emit("user activity", { name, isIdle });
  });

  // TODO close the room whenever the last user leaves or DCs
  socket.on("leave room", ( roomName: string ) => {
    socket.leave(roomName, (error) => {
      if(error) {
        console.log(error);
        return;
      }

      const removeInfo = usersOnline.removeUser(socket.id);
      if(removeInfo) {
        socket.emit("user logged out");
        emitRoomUsers(socket, roomName);
        socket.to(roomName).emit("admin message", { fromUser: "admin", text: `User ${ removeInfo.user.name } has left the room.` });
        console.log(`User: "${ removeInfo.user.name }" has left the room: "${ roomName }".`);
      }
    });
  });
  
  socket.on("disconnect", () => {
    const removeInfo = usersOnline.removeUser(socket.id);
    if(removeInfo) {
      emitRoomUsers(socket, removeInfo.roomIndex);
      console.log(`User "${ removeInfo.user.name }" has disconnected.`);
    }
  });
});

app.get("/", (req, res) => {
  res.send("Hoya! Ho!");
});

server.listen(PORT, () => console.log(`Server listening on port: ${ PORT }.`));