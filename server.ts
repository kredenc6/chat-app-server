import * as http from "http";
import * as express from "express";
import * as socketIo from "socket.io";
import ConnectedUser from "./interfaces/ConnectedUser";
import ConnectedUsers from "./classes/ConnectedUsers";

const app = express();
const server = http.createServer(app);
const PORT: number = 8889;
let port: string | number = process.env.PORT
if(!port) port = PORT;
const io = socketIo(server);
const usersOnline: ConnectedUsers = new ConnectedUsers();


io.on("connection", (socket) => {
  console.log(`Socket "${ socket.id }" connected.`);

  socket.on("join room", ({ roomName, userName }: { roomName: string, userName: string }) => {
    const userInfo: ConnectedUser = { socketID: socket.id, name: userName, isIdle: true };
    const isUserNameFree = !usersOnline.namesInUse.includes(userName);
    const announceUserJoining = () => {
      socket.emit("room joining confirmation", { yes: true, serverRoomName: roomName });
      socket.emit("admin message", { fromUser: "admin", text: `${ userName }! Welcome to the room ${ roomName }.`});
      socket.to(roomName).emit("admin message", { fromUser: "admin", text: `User ${ userName } has joined the room.`});
      socket.to(roomName).emit("user activity", { name: userName, isIdle: true });
      console.log(`Socket "${ socket.id }" with userName "${ userName }" has joined room "${ roomName }".`);
    }
    if(isUserNameFree) {
      socket.join(roomName, (err) => {
        if(err) {
          console.dir(err);
          return;
        }
        usersOnline.addUser(socket, roomName, userInfo);
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
    usersOnline.changeUserActivity({ socketID: socket.id, name, isIdle });
    socket.to(roomName).emit("user activity", { name, isIdle });
    socket.emit("user activity", { name, isIdle });
  });

  socket.on("leave room", ( roomName: string ) => {
    socket.leave(roomName, (error) => {
      if(error) {
        console.log(error);
        return;
      }
      usersOnline.userLeaving(socket);
    });
  });
  
  socket.on("disconnect", () => {
    usersOnline.userLeaving(socket);
    console.log(`   - the user has disconnected.`);
  });
});

app.get("/", (req, res) => {
  res.send("Hoya! Ho!");
});

server.listen(port, () => console.log(`Server listening on port: ${ port }.`));