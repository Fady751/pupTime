import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../../redux/store";
import { useEffect } from "react";
import { fetchUser, setUser } from "../../redux/userSlice";
import { getData } from "../../utils/storage/auth";

const useAuthBootstrap = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { data, loading } = useSelector((s: RootState) => s.user);
  const { isConnected, loading: networkLoading } = useSelector((s: RootState) => s.network);

  useEffect(() => {
    if (!networkLoading && isConnected) {
      dispatch(fetchUser());
    }
  }, [isConnected, networkLoading, dispatch]);

  useEffect(() => {
    const loadOfflineUser = async () => {
      if (!data && !loading && !networkLoading && !isConnected) {
        const offlineData = await getData();
        if (offlineData?.user) {
          dispatch(setUser(offlineData.user));
        }
      }
    };
    loadOfflineUser();
  }, [data, loading, networkLoading, isConnected, dispatch]);
};

export default useAuthBootstrap;