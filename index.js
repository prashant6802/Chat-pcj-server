const express = require('express');
const app = express();
const http = require("http");
const cors = require("cors");
const {Server} = require("socket.io");
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET","POST"],
    },
});

let userRooms = {};
let idUser = {};

io.on("connection", (socket) => {

    socket.on("join_room", (data)=>{
        io.to(data.room).emit("recieve_message", {
            author: "Server",
            message: `${data.author} has joined the room`,
            timestamp: Date.now(),
            room: data.room
        });
        socket.join(data.room);
        // console.log(`User with ID: ${socket.id} joined room: ${data.room}`);
        if (!userRooms.hasOwnProperty(data.room)) {
            userRooms[data.room] = [];
        }
        userRooms[data.room].push({
            id: socket.id,
            username: data.author
        });
        idUser[socket.id] = data.author;
        /*console.log(authors);*/
        io.to(data.room).emit("recieve_users",userRooms[data.room].map(user => user.username));
        
    });

    socket.on("get_users", (data) => {
        io.to(data).emit("recieve_users", userRooms[data] ? userRooms[data].map(user => user.username) : []);
        // console.log(Object.keys(userRooms).length);
    });

    socket.on("send_message", (data) => {
        socket.to(data.room).emit("recieve_message",data);
    });

    socket.on("leaveRoom", (data) => {
        // console.log(`User ${socket.id} left room ${data.room}`);
        socket.leave(data.room);
        io.to(data.room).emit("recieve_message", {
            author: "Server",
            message: `${data.author} left the room`,
            timestamp: Date.now(),
            room: data.room
        });
        Object.keys(userRooms).forEach(room => {
            userRooms[room] = userRooms[room].filter(user => user.id !== socket.id);
            if (userRooms[room].length === 0) {
                delete userRooms[room]; // remove the key-value pair from the object
            }else{
                io.to(room).emit("recieve_users", userRooms[room].map(user => user.username));
            }
        });
        // console.log(Object.keys(userRooms).length);
    });

    socket.on("disconnect", () => {
        // console.log("User Disconnected", socket.id);

          // remove user from all rooms
         Object.keys(userRooms).forEach(room => {

            const userIndex = userRooms[room].findIndex(user => user.id === socket.id);
            if (userIndex !== -1) {
                // remove the user from the room
                userRooms[room].splice(userIndex, 1);

                if (userRooms[room].length === 0) {
                // delete the room if there are no users left
                delete userRooms[room];
                } else {
                // emit a message to the room that the user has left
                io.to(room).emit("recieve_message", {
                    author: "Server",
                    message: `${idUser[socket.id]} left the room`,
                    timestamp: Date.now(),
                    room: room
                });

                // emit an updated user list to the room
                io.to(room).emit("recieve_users", userRooms[room].map(user => user.username));
                }
            }
        });
        delete idUser[socket.id];
    });

});

server.listen(3001, () => {
    console.log("Server Runnning");
})