import { useState, useEffect, useCallback } from "react";
import { productionLinesApi } from "@/lib/api/production-lines";
import type { ProductionLine } from "@/lib/types/production-line";

interface UseQueryState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook lay danh sach tat ca production lines
 */
export function useProductionLines() {
  const [state, setState] = useState<UseQueryState<ProductionLine[]>>({
    data: null,
    loading: true,
    error: null,
  });

  const refetch = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await productionLinesApi.getAll();
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
 * Hook lay chi tiet mot production line
 */
export function useProductionLine(id: number | null) {
  const [state, setState] = useState<UseQueryState<ProductionLine>>({
    data: null,
    loading: false,
    error: null,
  });

  const refetch = useCallback(async () => {
    if (!id) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await productionLinesApi.getById(id);
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
