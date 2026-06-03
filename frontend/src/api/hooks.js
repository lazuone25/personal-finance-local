import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from './client'

export function useBanks() {
  return useQuery({
    queryKey: ['banks'],
    queryFn: () => api.get('/banks').then(r => r.data.banks),
  })
}

export function useConnections() {
  return useQuery({
    queryKey: ['connections'],
    queryFn: () => api.get('/connections').then(r => r.data.connections),
    refetchInterval: 3000,
  })
}

export function useConnectBank() {
  return useMutation({
    mutationFn: ({ bank_id, bank_name, country = 'RO', owner = 'andrei' }) =>
      api.post(`/auth/connect/${bank_id}`, { bank_id, bank_name, country, owner }).then(r => r.data),
  })
}

export function useDisconnectBank() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/connections/${id}`).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['connections'] }),
  })
}

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get('/accounts').then(r => r.data),
  })
}

export function useLiveBalance(accountId) {
  return useQuery({
    queryKey: ['balance', accountId],
    queryFn: () => api.get(`/accounts/${accountId}/balance`).then(r => r.data),
    enabled: !!accountId,
  })
}

export function useTransactions(filters = {}) {
  const params = new URLSearchParams()
  if (filters.bank_id) params.set('bank_id', filters.bank_id)
  if (filters.account_id) params.set('account_id', filters.account_id)
  if (filters.date_from) params.set('date_from', filters.date_from)
  if (filters.date_to) params.set('date_to', filters.date_to)
  if (filters.transaction_type) params.set('transaction_type', filters.transaction_type)

  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => api.get(`/transactions?${params}`).then(r => r.data.transactions),
  })
}

export function useSyncStatus() {
  return useQuery({
    queryKey: ['sync-status'],
    queryFn: () => api.get('/sync/status').then(r => r.data),
    refetchInterval: 30000,
  })
}

export function useManualSync() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/sync').then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['sync-status'] })
    },
  })
}

export function useDeposits() {
  return useQuery({ queryKey: ['deposits'], queryFn: () => api.get('/deposits').then(r => r.data) })
}

export function useCreateDeposit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/deposits', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deposits'] }),
  })
}

export function useUpdateDeposit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/deposits/${id}`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deposits'] }),
  })
}

export function useDeleteDeposit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/deposits/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deposits'] }),
  })
}

export function useRates() {
  return useQuery({
    queryKey: ['rates'],
    queryFn: () => api.get('/rates').then(r => r.data.rates),
    staleTime: 60 * 60 * 1000, // 1 hour — BNR rates change once daily
  })
}

export function useXtbPortfolio() {
  return useQuery({
    queryKey: ['xtb-portfolio'],
    queryFn: () => api.get('/xtb/portfolio').then(r => r.data),
    refetchInterval: 5 * 60 * 1000,
  })
}

export function useExtra() {
  return useQuery({
    queryKey: ['extra'],
    queryFn: () => api.get('/extra').then(r => r.data),
  })
}

export function useUpdateExtra() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/extra', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['extra'] }),
  })
}

export function useAddTransfer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (transfer) => api.post('/extra/transfer', transfer).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['extra'] }),
  })
}

export function useUpdateTransfer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/extra/transfer/${id}`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['extra'] }),
  })
}

export function useDeleteTransfer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/extra/transfer/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['extra'] }),
  })
}

export function useAddDePrimit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (entry) => api.post('/extra/de-primit', entry).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['extra'] }),
  })
}

export function useDeleteDePrimit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/extra/de-primit/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['extra'] }),
  })
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  })
}

export function useClassifyTransactions() {
  return useMutation({
    mutationFn: (transactions) =>
      api.post('/categories/classify', { transactions }).then(r => r.data),
  })
}

export function useSetTransactionCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ txId, categoryId }) =>
      api.put(`/categories/transaction/${txId}`, { category_id: categoryId }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export function useSetTransactionOwner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ txId, owner }) =>
      api.put(`/categories/owner/${txId}`, { owner }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export function useSettleTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ txId, settled }) =>
      settled
        ? api.post(`/categories/settle/${txId}`).then(r => r.data)
        : api.delete(`/categories/settle/${txId}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export function useAddCategoryRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ pattern, category_id }) =>
      api.post('/categories/rules', { pattern, category_id }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export function useDatorii() {
  return useQuery({
    queryKey: ['datorii'],
    queryFn: () => api.get('/datorii').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpdateDatorii() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ accountId, ...data }) => api.put(`/datorii/${accountId}`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['datorii'] }),
  })
}

export function useAddPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ accountId, ...data }) => api.post(`/datorii/${accountId}/payments`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['datorii'] }),
  })
}

export function useImportPdf() {
  return useMutation({
    mutationFn: (file) => {
      const form = new FormData()
      form.append('file', file)
      return api.post('/datorii/card_raiffeisen/import-pdf', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then(r => r.data)
    },
  })
}

export function useApplyImport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (installments) => api.post('/datorii/card_raiffeisen/import-pdf/apply', installments).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['datorii'] }),
  })
}

export function useUpdateInstallment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ accountId, installmentId, ...data }) =>
      api.put(`/datorii/${accountId}/installments/${installmentId}`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['datorii'] }),
  })
}

export function useDeletePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ accountId, paymentId }) => api.delete(`/datorii/${accountId}/payments/${paymentId}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['datorii'] }),
  })
}
