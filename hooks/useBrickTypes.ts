import { useState, useEffect, useCallback } from "react";
import { brickTypesApi } from "@/lib/api/brick-types";
import type {
  BrickType,
  CreateBrickTypeDto,
  UpdateBrickTypeDto,
  GetStatisticsDto,
  GetTrendDto,
  CompareBrickTypesDto,
  BrickTypeStatistics,
  BrickTypeTrend,
  CompareBrickTypesResponse,
  ActivateBrickTypeDto,
  DeactivateBrickTypeDto,
} from "@/lib/types/brick-type";

// Hook state interface
interface UseQueryState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

interface UseMutationState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook lay danh sach tat ca loai gach
 */
export function useBrickTypes() {
  const [state, setState] = useState<UseQueryState<BrickType[]>>({
    data: null,
    loading: true,
    error: null,
  });

  const refetch = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await brickTypesApi.getAll();
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refetch();
  }, [refetch]);

  return { ...state, refetch };
}

/**
 * Hook lay chi tiet mot loai gach
 */
export function useBrickType(id: number | null) {
  const [state, setState] = useState<UseQueryState<BrickType>>({
    data: null,
    loading: false,
    error: null,
  });

  const refetch = useCallback(async () => {
    if (!id) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await brickTypesApi.getById(id);
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error });
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refetch();
  }, [id, refetch]);

  const derivedState = id ? state : { data: null, loading: false, error: null };
  return { ...derivedState, refetch };
}

/**
 * Hook lay danh sach loai gach dang hoat dong
 */
export function useActiveBrickTypes() {
  const [state, setState] = useState<UseQueryState<BrickType[]>>({
    data: null,
    loading: true,
    error: null,
  });

  const refetch = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await brickTypesApi.getActive();
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refetch();
  }, [refetch]);

  return { ...state, refetch };
}

/**
 * Hook lay loai gach theo day chuyen
 */
export function useBrickTypesByProductionLine(lineId: number | null) {
  const [state, setState] = useState<UseQueryState<BrickType[]>>({
    data: null,
    loading: false,
    error: null,
  });

  const refetch = useCallback(async () => {
    if (!lineId) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await brickTypesApi.getByProductionLine(lineId);
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error });
    }
  }, [lineId]);

  useEffect(() => {
    if (!lineId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refetch();
  }, [lineId, refetch]);

  const derivedState = lineId
    ? state
    : { data: null, loading: false, error: null };
  return { ...derivedState, refetch };
}

/**
 * Hook lay thong ke cho mot loai gach
 */
export function useBrickTypeStatistics(
  id: number | null,
  params?: GetStatisticsDto
) {
  const [state, setState] = useState<UseQueryState<BrickTypeStatistics>>({
    data: null,
    loading: false,
    error: null,
  });

  const refetch = useCallback(async () => {
    if (!id) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await brickTypesApi.getStatistics(id, params);
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error });
    }
  }, [id, params?.startDate, params?.endDate]);

  useEffect(() => {
    if (!id) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refetch();
  }, [id, refetch]);

  const derivedState = id ? state : { data: null, loading: false, error: null };
  return { ...derivedState, refetch };
}

/**
 * Hook lay xu huong san luong
 */
export function useBrickTypeTrend(id: number | null, params?: GetTrendDto) {
  const [state, setState] = useState<UseQueryState<BrickTypeTrend>>({
    data: null,
    loading: false,
    error: null,
  });

  const refetch = useCallback(async () => {
    if (!id) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await brickTypesApi.getTrend(id, params);
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error });
    }
  }, [id, params?.startDate, params?.endDate, params?.groupBy]);

  useEffect(() => {
    if (!id) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refetch();
  }, [id, refetch]);

  const derivedState = id ? state : { data: null, loading: false, error: null };
  return { ...derivedState, refetch };
}

/**
 * Hook tao moi loai gach
 */
export function useCreateBrickType() {
  const [state, setState] = useState<UseMutationState<BrickType>>({
    data: null,
    loading: false,
    error: null,
  });

  const mutate = useCallback(async (data: CreateBrickTypeDto) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await brickTypesApi.create(data);
      setState((prev) => ({
        ...prev,
        data: result,
        loading: false,
        error: null,
      }));
      return result;
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false, error: error as Error }));
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, mutate, reset };
}

/**
 * Hook cap nhat loai gach
 */
export function useUpdateBrickType() {
  const [state, setState] = useState<UseMutationState<BrickType>>({
    data: null,
    loading: false,
    error: null,
  });

  const mutate = useCallback(async (id: number, data: UpdateBrickTypeDto) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await brickTypesApi.update(id, data);
      setState((prev) => ({
        ...prev,
        data: result,
        loading: false,
        error: null,
      }));
      return result;
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false, error: error as Error }));
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, mutate, reset };
}

/**
 * Hook xoa loai gach
 */
export function useDeleteBrickType() {
  const [state, setState] = useState<UseMutationState<void>>({
    data: null,
    loading: false,
    error: null,
  });

  const mutate = useCallback(async (id: number) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await brickTypesApi.delete(id);
      setState((prev) => ({ ...prev, loading: false, error: null }));
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false, error: error as Error }));
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, mutate, reset };
}

/**
 * Hook kich hoat loai gach
 */
export function useActivateBrickType() {
  const [state, setState] = useState<UseMutationState<BrickType>>({
    data: null,
    loading: false,
    error: null,
  });

  const mutate = useCallback(async (id: number, data: ActivateBrickTypeDto) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await brickTypesApi.activate(id, data);
      setState((prev) => ({
        ...prev,
        data: result,
        loading: false,
        error: null,
      }));
      return result;
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false, error: error as Error }));
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, mutate, reset };
}

/**
 * Hook vo hieu hoa loai gach
 */
export function useDeactivateBrickType() {
  const [state, setState] = useState<UseMutationState<BrickType>>({
    data: null,
    loading: false,
    error: null,
  });

  const mutate = useCallback(
    async (id: number, data: DeactivateBrickTypeDto) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const result = await brickTypesApi.deactivate(id, data);
        setState((prev) => ({
          ...prev,
          data: result,
          loading: false,
          error: null,
        }));
        return result;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error as Error,
        }));
        throw error;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, mutate, reset };
}

/**
 * Hook so sanh nhieu loai gach
 */
export function useCompareBrickTypes() {
  const [state, setState] = useState<
    UseMutationState<CompareBrickTypesResponse>
  >({
    data: null,
    loading: false,
    error: null,
  });

  const mutate = useCallback(async (data: CompareBrickTypesDto) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await brickTypesApi.compare(data);
      setState((prev) => ({
        ...prev,
        data: result,
        loading: false,
        error: null,
      }));
      return result;
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false, error: error as Error }));
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, mutate, reset };
}
