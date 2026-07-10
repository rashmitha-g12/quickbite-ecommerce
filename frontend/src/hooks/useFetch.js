/**
 * hooks/useFetch.js
 * Reusable hook that wraps an async API call with loading/error state.
 *
 * Usage:
 *   const { data, loading, error, refetch } = useFetch(productAPI.getAll, { category: "food" });
 */

import { useState, useEffect, useCallback, useRef } from "react";

const useFetch = (apiFn, params, deps = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Keep a stable ref so the effect doesn't re-run on inline object params
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFn(paramsRef.current);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiFn, ...deps]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
};

export default useFetch;
