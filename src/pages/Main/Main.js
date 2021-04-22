import React, {useEffect, useState} from 'react'
import socket from "../../socket";
import ACTIONS from "../../socket/actions";
import {useHistory} from "react-router";
import {v4} from 'uuid'

const Main = () => {
    const history = useHistory()
    const [rooms, setRooms] = useState([]);

    useEffect(() => {
        socket.on(ACTIONS.SHARE_ROOMS, ({rooms = []} = {}) => {
            setRooms(rooms);
        })
    }, [])

    return (
        <div>
            <h1>Available Rooms</h1>
            <ul>
                {rooms.map(roomID => (
                    <li key={roomID}>
                        {roomID}
                        <button onClick={() => {
                            history.push(`/room/${roomID}`)
                        }}>
                            JOIN ROOM
                        </button>
                    </li>
                ))}
            </ul>
            <button onClick={() =>
                history.push(`/room/${v4()}`)
            }>
                Create New Room
            </button>
        </div>
    )
};

export default Main;
