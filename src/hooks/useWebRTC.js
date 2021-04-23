import React, {useCallback, useEffect, useRef, useState} from 'react';
import useStateWithCallback from "./useStateWithCallback";
import freeice from 'freeice'
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

    useEffect(() =>{
        const handleNewPeer = async ({peerID, createOffer}) => {
            if (peerID in peerConnection.current) {
                return console.warn(`Already connected to peer ${peerID}`)
            }

            peerConnection.current[peerID] = new RTCPeerConnection({
                iceServers: freeice(),
            });

            peerConnection.current[peerID].onicecandidate = event => {
                if(event.candidate){
                    socket.emit(ACTIONS.RELAY_ICE, {
                        peerID,
                        iceCandidate: event.candidate
                    });
                }
            }
            let tracksNumber = 0;
            peerConnection.current[peerID].ontrack = ({streams: [remoteStream]}) => {
                tracksNumber++;
                if (tracksNumber === 2){
                    addNewClient(peerID, () => {
                        peerMediaElements.current[peerID].srcObject = remoteStream;
                    });
                }
            }
            localMediaStream.current.getTracks().forEach(track => {
               peerConnection.current[peerID].addTrack(track, localMediaStream.current)
            });

            if (createOffer ){
                const offer = await peerConnection.current[peerID].createOffer();

                await peerConnection.current[peerID].setLocalDescription(offer);

                socket.emit(ACTIONS.RELAY_SDP, {
                    peerID,
                    sessionDescription: offer,
                })
            }
        }
        socket.on(ACTIONS.ADD_PEER, handleNewPeer)
    }, []);

    useEffect(() => {
        const setRemoteMedia = async ({peerID, sessionDescription: remoteDescription}) => {
            await peerConnection.current[peerID].setRemoteDescription(
                new RTCSessionDescription(remoteDescription)
            );
            if (remoteDescription.type === 'offer'){
                const answer = await peerConnection.current[peerID].createAnswer();
                 await peerConnection.current[peerID].setLocalDescription(answer);
                 socket.emit(ACTIONS.RELAY_SDP, {
                     peerID,
                     sessionDescription: answer,
                 });
            };
        };
        socket.on(ACTIONS.SESSION_DESCRIPTION, setRemoteMedia)
    }, []);

    useEffect(() => {
        socket.on(ACTIONS.ICE_CANDIDATE, ({peerID, iceCandidate}) => {
            peerConnection.current[peerID].addIceCandidate(
                new RTCIceCandidate(iceCandidate)
            )
        });
    }, []);

    useEffect(() => {
        socket.on(ACTIONS.REMOVE_PEER, ({peerID}) => {
            if (peerConnection.current[peerID]){
                peerConnection.current[peerID].close();
            }
            delete peerConnection.current[peerID];
            delete peerMediaElements.current[peerID];

            updateClients(list => list.filter(c => c !== peerID));
        });
    }, []);

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
            .catch(err => console.log('Error getting userMedia', err));

            return () => {
              localMediaStream.current.getTracks().forEach(track => track.stop());
              socket.emit(ACTIONS.LEAVE)
            };
    }, [roomID])

    const provideMediaRef = useCallback((id, node) => {
        peerMediaElements.current[id] = node;
    }, [])

    return {
        clients,
        provideMediaRef
    };
};

export default useWebRTC;
