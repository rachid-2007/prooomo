"use client";

import { useState, useEffect } from "react";
import { OFFICES_DATA } from "@/lib/constants";

export function useOffices() {
  const [offices, setOffices] = useState<Record<string, string[]>>(OFFICES_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/offices")
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === "object" && !data.error) {
          setOffices(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { offices, loading };
}
