import {useCallback, useEffect, useRef, useState} from "react";

const useStateWithCallback = initialState => {
    const [state, setState] = useState([]);
    const callbackRef = useRef();
    const updateState = useCallback((newState, callback) => {
        callbackRef.current = callback;
        setState(prev => typeof newState === 'function'? newState(prev): newState)
    }, []);

    useEffect(() => {
        if(callbackRef.current){
            callbackRef.current(state);
            callbackRef.current = null;
        }
    }, []);
    return [state, updateState];
};

export default useStateWithCallback;

