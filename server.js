import ACTIONS from "./src/socket/actions";


const path = require('path');
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const {version, validate} = require('uuid')

const PORT = process.env.PORT || 3001;

const getClientsRoom = () => {
    const {rooms} = io.sockets.adapter

    return Array.from(rooms.keys())
    .filter(roomID => validate(roomID) && version(roomID))
};

const shareRoomsInfo = () => {
    io.emit(ACTIONS.SHARE_ROOMS, {
        rooms: getClientsRoom()
    });
};

io.on('connection', socket => {
    shareRoomsInfo();
    socket.on(ACTIONS.JOIN, config => {
       const {room: roomID} = config;
       const {room: joinedRooms} = socket;
       if (Array.from(joinedRooms).includes(roomID)){
           return console.warn(`Already joined to ${roomID}`)
       }
       const clients = Array.from(io.sockets.adapter.rooms.get(roomID) || []);

       clients.forEach(clientID => {
           io.to(clientID).emit(ACTIONS.ADD_PEER, {
               peerID: socket.id,
               createOffer: false,
           });
           socket.emit(ACTIONS.ADD_PEER, {
               peerID: socket.id,
               createOffer: true,
           });
       });
       socket.join(roomID);
       shareRoomsInfo();
    });

    const leaveRoom = () => {
        const {rooms} = socket;
        Array.from(rooms)
        .forEach(roomID => {
            const clients = Array.from(io.sockets.adapter.rooms.get(roomID));

            clients.forEach(clientID => {
                io.to(clientID).emit(ACTIONS.REMOVE_PEER, {
                    peerID: socket.id,
                });
               socket.emit(ACTIONS.REMOVE_PEER, {
                   peerID: clientID,
               });
            });
            socket.leave(roomID);
        });
        shareRoomsInfo();
    };
    socket.on(ACTIONS.LEAVE, leaveRoom);
    socket.on('disconnected', leaveRoom);

    socket.on(ACTIONS.RELAY_SDP, ({peerID, sessionDescription}) => {
       io.to(peerID).emit(ACTIONS.SESSION_DESCRIPTION, {
         peerID: socket.id,
           sessionDescription
       })
    });

    socket.on(ACTIONS.RELAY_ICE, ({peerID, iceCandidate}) => {
        io.to(peerID).emit(ACTIONS.ICE_CANDIDATE, {
            peerID: socket.id,
            iceCandidate,
        })
    })
});


server.listen(PORT, () => {
    console.log('Server Started!')
})
