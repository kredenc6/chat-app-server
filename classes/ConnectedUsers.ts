import Room from "./Room";
import ConnectedUser from "../interfaces/ConnectedUser";

export default class ConnectedUsers {
  RESERVED_NAMES: string[];
  namesInUse: string[];
  rooms: Room[];

  constructor() {
    this.RESERVED_NAMES = ["admin"];
    this.namesInUse = [];
    this.rooms = [];
  }

  isUserNameFree(userName: string) {
    if(this.namesInUse.some(name => name === userName)) return false;
    if(this.RESERVED_NAMES.some(name => name === userName)) return false;
    return true;
  }

  findRoom(roomName: string) {
    return this.rooms.findIndex(room => room.name === roomName);
  }

  private _addRoom(roomName: string) { // to be public it needs to not to allow duplicate names
    return this.rooms.push(new Room(roomName)) - 1;
  }
  
  findUser(socketID: string) {
    let userIndex: number,
        roomIndex: number;
    for(let i=0; i<this.rooms.length; i++) {
      userIndex = this.rooms[i].users.findIndex(registeredUser => registeredUser.socketID === socketID);
      if(userIndex > -1) {
        roomIndex = i;
        break;
      }
    }
    if(userIndex === -1) return null;
    return { userIndex, roomIndex };
  }
  
  hasUser(user: ConnectedUser) {
    const foundUser = this.findUser(user.socketID);
    return foundUser.userIndex > -1 ? true : false;
  }  
  
  addUser(socket, roomName: string, user: ConnectedUser) {
    if(!this.isUserNameFree(user.name)) return false;
    let roomIndex = this.findRoom(roomName);
    if(roomIndex === -1) {
      roomIndex = this._addRoom(roomName);
    }
    this.rooms[roomIndex].addUser(user);
    this.namesInUse.push(user.name);
    setTimeout(() => {
      this.rooms[roomIndex].emitRoomUsersActivity(socket, true);
    }, 200);
    return true;
  }

  changeUserActivity(user: ConnectedUser) {
    const foundUser = this.findUser(user.socketID);
    if(foundUser) this.rooms[foundUser.roomIndex].users[foundUser.roomIndex].isIdle = user.isIdle;
  }

  removeUser(socketID: string) {
    const {userIndex, roomIndex} = this.findUser(socketID);
    if(userIndex !== -1) {
      const deletedUser = this.rooms[roomIndex].users.splice(userIndex, 1); // remove user
      // remove userName from namesInUse
      const deletedUserNameIndex = this.namesInUse.findIndex(name => name === deletedUser[0].name);
      this.namesInUse.splice(deletedUserNameIndex, 1);
      return { user: deletedUser[0], roomIndex };
    }
    return null;
  }

  userLeaving(socket) {
    const removeInfo = this.removeUser(socket.id);
    if(removeInfo) {
      const { user, roomIndex } = removeInfo;
      const roomName = this.rooms[roomIndex].name;
  
      if(!this.rooms[roomIndex].users.length) { // if the room is empty...
        this.removeRoom(roomIndex) // ...delete it.
        console.log(`User "${ user.name }" has left the room "${ roomName }", and the room was closed.`);
      }
      else { // message the room about the user leaving
        this.rooms[roomIndex].emitRoomUsersActivity(socket);
        socket.to(roomName).emit("admin message", { fromUser: "admin", text: `User ${ user.name } has left the room.` });
        console.log(`User "${ user.name }" has left the room "${ roomName }".`);
      }
      socket.emit("user logged out"); // logout the user on the client
    }
  }

  removeRoom(roomId: number) {
    return this.rooms.splice(roomId, 1)[0];
  }
}