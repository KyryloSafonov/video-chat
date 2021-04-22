import React, {useCallback, useEffect, useRef, useState} from 'react';
import useStateWithCallback from "./useStateWithCallback";
import socket from "../socket";
import ACTIONS from "../socket/actions";


export const LOCAL_VIDEO = 'LOCAL_VIDEO';

const useWebRTC = roomID => {
    const [clients, updateClients] = useStateWithCallback([]);

    const addNewClient = useCallback((newClient, cb) => {
        if (!clients.includes(newClient)){
            updateClients(list => [...list,newClient], cb);
        }
    }, [clients, updateClients] )


    const peerConnection = useRef({});
    const localMediaStream = useRef(null);
    const peerMediaElements = useRef({
    [LOCAL_VIDEO]: null,
    });

    useEffect(() => {
        const  startCapture = async () => {
            localMediaStream.current = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: {
                    width:1280,
                    height: 720
                },
            });

            addNewClient(LOCAL_VIDEO, () => {
                const localVideoElement = peerMediaElements.current[LOCAL_VIDEO];

                if (localVideoElement){
                    localVideoElement.volume = 0;
                    localVideoElement.srcObject = localMediaStream.current;
                }
            });
        }


        startCapture()
            .then(() => socket.emit(ACTIONS.JOIN, {room: roomID}))
            .catch(err => console.log('Error getting userMedia', err))
    }, [addNewClient, roomID])

    const provideMediaRef = useCallback((id, node) => {
        peerMediaElements.current[id] = node;
    }, [])

    return {
        clients,
        provideMediaRef
    };
};

export default useWebRTC;
