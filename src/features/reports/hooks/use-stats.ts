import { useQuery } from "@tanstack/react-query";
import api from "@/api";

export interface StatItem {
  key: string;
  count: number;
  term_id: string;
  uuid: string;
  name: string;
  internal_id: string;
}

export const fetchRequestStats = async (): Promise<StatItem[]> => {
  const { data } = await api.get<StatItem[]>("/api/peretantico/request-stats");
  return data;
};

export const useStatsQuery = () => {
  return useQuery({
    queryKey: ["request-stats"],
    queryFn: fetchRequestStats,
  });
};
