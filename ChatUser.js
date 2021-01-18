/** Functionality related to chatting. */

// Room is an abstraction of a chat channel
const Room = require('./Room');

const jokes = require("./jokes");

/** ChatUser is a individual connection from client -> server to chat. */

class ChatUser {
  /** make chat: store connection-device, rooom */

  constructor(send, roomName) {
    this._send = send; // "send" function for this user
    this.room = Room.get(roomName); // room user will be in
    this.name = null; // becomes the username of the visitor

    console.log(`created chat in ${this.room.name}`);
  }

  /** send msgs to this client using underlying connection-send-function */

  send(data) {
    try {
      this._send(data);
    } catch {
      // If trying to send to a user fails, ignore it
    }
  }

  /** handle joining: add to room members, announce join */

  handleJoin(name) {
    this.name = name;
    this.room.join(this);
    this.room.broadcast({
      type: 'note',
      text: `${this.name} joined "${this.room.name}".`
    });
  }

  /** handle a chat: broadcast to room. */

  handleChat(text) {
    this.room.broadcast({
      name: this.name,
      type: 'chat',
      text: text
    });
  }

  /** handle a joke: broadcast to user. */

  handleJoke() {
    const joke = {
      type: "joke",
      text: jokes[Math.floor(Math.random()*jokes.length)]
    }
    this.room.directMessage(this, joke);
  }

  /** handle listing users: list all users to specific user. */

  handleListingUsers() {
    const membersArr = Array.from(this.room.members);
    for (const member of membersArr) {
      const message = {
        type: "list",
        text: member.name
      }
      this.room.directMessage(this, message);
    }
  }

  handlePrivateMessage(message) {
    const toUsername = message.split(" ")[1];
    const userMsgText = message.split(" ").slice(2).join(" ");
    const membersArr = Array.from(this.room.members);

    const toUser = membersArr.find(m => m.name.toUpperCase() === toUsername.toUpperCase());
    if (!toUser) throw new Error(`user does not exist: ${toUsername}`);

    const messageObj = {
      from: this.name,
      type: "pm",
      text: userMsgText
    }

    this.room.directMessage(toUser, messageObj)
  }

  handleNameChange(message) {
    const newUsernameText = message.split(" ")[1];
    const oldName = this.name;
    this.name = newUsernameText;
    this.room.broadcast({
      type: 'note',
      text: `${oldName} has changed username to: "${this.name}".`
    });
  }

  /** Handle messages from client:
   *
   * - {type: "join", name: username} : join
   * - {type: "chat", text: msg }     : chat
   */

  handleMessage(jsonData) {
    let msg = JSON.parse(jsonData);

    if (msg.type === 'join') this.handleJoin(msg.name);
    else if (msg.type === 'chat') this.handleChat(msg.text);
    else if (msg.type === 'joke') this.handleJoke();
    else if (msg.type === 'list') this.handleListingUsers();
    else if (msg.type === 'pm') this.handlePrivateMessage(msg.text);
    else if (msg.type === 'namechange') this.handleNameChange(msg.text);
    else throw new Error(`bad message: ${msg.type}`);
  }

  /** Connection was closed: leave room, announce exit to others */

  handleClose() {
    this.room.leave(this);
    this.room.broadcast({
      type: 'note',
      text: `${this.name} left ${this.room.name}.`
    });
  }
}

module.exports = ChatUser;
