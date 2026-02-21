import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../../redux/store";
import { useEffect } from "react";
import { fetchTasks } from "../../redux/tasksSlice";

const useFetchTasks = () => {
    const data = useSelector((s: RootState) => s.user.data);
    const dispatch = useDispatch<AppDispatch>();

    useEffect(() => {
      const fetchTasksAsync = async () => {
        dispatch(fetchTasks(data?.id || 0));
      };
      fetchTasksAsync();
    }, [data?.id, dispatch]);
};

export default useFetchTasks;