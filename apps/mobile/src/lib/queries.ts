import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/http';
import type { Branch, Provider, ServiceItem } from '@/types/domain';

export function useProviders() {
  return useQuery({
    queryKey: ['public', 'providers'],
    queryFn: () => apiFetch<Provider[]>('/providers'),
    staleTime: 60000,
    select: (rows: Provider[]) => rows.filter(p => !p.isDemo),
  });
}
export function useServices() {
  return useQuery({
    queryKey: ['public', 'services'],
    queryFn: () => apiFetch<ServiceItem[]>('/services'),
    staleTime: 60000,
    select: (rows: ServiceItem[]) => rows.filter(s => s.service.isPublished && !s.isDemo),
  });
}
export function useBranches() {
  return useQuery({
    queryKey: ['public', 'branches'],
    queryFn: () => apiFetch<Branch[]>('/branches'),
    staleTime: 60000,
    select: (rows: Branch[]) => rows.filter(b => b.isActive),
  });
}
