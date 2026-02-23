import { useDispatch } from "react-redux";
import { AppDispatch } from "../../redux/store";
import { useEffect } from "react";
import NetInfo from '@react-native-community/netinfo';
import { checkInternetConnectivity } from "../../redux/networkSlice";

const useNetworkListener = () => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      dispatch(checkInternetConnectivity(!!state.isConnected));
    });

    NetInfo.fetch().then(state => {
      dispatch(checkInternetConnectivity(!!state.isConnected));
    });

    return unsubscribe;
  }, [dispatch]);
};

export default useNetworkListener;