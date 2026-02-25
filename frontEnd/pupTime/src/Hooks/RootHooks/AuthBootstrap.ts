import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../../redux/store";
import { useEffect } from "react";
import { fetchUser, setUser } from "../../redux/userSlice";
import { AppMetaRepository } from "../../DB";

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
        const offlineData = (await AppMetaRepository.get('user'))?.value;
        if (offlineData) {
          const parsed = JSON.parse(offlineData);
          if(parsed?.user)
            dispatch(setUser(parsed.user));
        }
      }
    };
    loadOfflineUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, loading, networkLoading, isConnected, dispatch, AppMetaRepository]);
};

export default useAuthBootstrap;