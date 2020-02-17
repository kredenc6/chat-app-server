import ConnectedUser from "../interfaces/ConnectedUser";

export default class Room {
  name: string;
  users: ConnectedUser[];
  
  constructor(name: string) {
    this.name = name;
    this.users = [];
  }

  addUser(user: ConnectedUser) {
    this.users.push(user);
  }
  
  findUser(socketID: string) {
    return this.users.findIndex(registeredUser => registeredUser.socketID === socketID);
  }

  hasUser(user: ConnectedUser) {
    return this.findUser(user.socketID) > -1 ? true : false;
  }  

  removeUser(socketID: string) {
    const userIndex = this.findUser(socketID);
    if(userIndex !== -1) {
      this.users.splice(userIndex, 1);
      return true;
    }
    else return false;
  }
};