import { computed, shallowRef, type ComputedRef, type ShallowRef } from 'vue'
import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/vue-query'
import { MessagePlugin, type TableChangeData, type TableSort } from 'tdesign-vue-next'
import { isEqual } from 'lodash-es'

/**
 * Mutation 配置项
 */
export interface IMutationConfig<TData = unknown, TVariables = unknown> {
  mutationFn: (variables: TVariables) => Promise<TData>
  onSuccess?: (data: TData, variables: TVariables) => void | Promise<void>
  onError?: (error: Error, variables: TVariables) => void
}

/**
 * usePagination Hook 配置
 */
export interface IUsePaginationConfig<
  TItem,
  TQuery extends IPaginationQuery,
  TCreateData = unknown,
  TUpdateData = unknown,
> {
  // 查询相关
  queryKey: string
  queryFn: (params: TQuery, signal?: AbortSignal) => Promise<IPaginationResponse<TItem>>
  initialQuery: TQuery

  // Mutation 配置（可选）
  createMutation?: IMutationConfig<unknown, TCreateData>
  updateMutation?: IMutationConfig<unknown, TUpdateData>
  deleteMutation?: IMutationConfig<unknown, { ids: number[] }>

  // 其他配置
  retry?: number
}

/**
 * usePagination Hook 返回值
 */
export interface IUsePaginationReturn<
  TItem,
  TQuery extends IPaginationQuery,
  TCreateData = unknown,
  TUpdateData = unknown,
> {
  // 查询状态
  loading: ComputedRef<boolean>
  dataSource: ComputedRef<TItem[]>
  total: ComputedRef<number>
  queryModel: ShallowRef<TQuery>

  // 查询方法
  setQueryModel: (params: TQuery) => void
  refresh: () => Promise<void>

  // Mutation 方法
  create?: (data: TCreateData) => Promise<unknown>
  update?: (data: TUpdateData) => Promise<unknown>
  deleteItems?: (ids: number[]) => Promise<unknown>

  // Mutation loading 状态
  createLoading: ComputedRef<boolean>
  updateLoading: ComputedRef<boolean>
  deleteLoading: ComputedRef<boolean>

  // 选择相关
  selectedRowKeys: ShallowRef<number[]>
  setSelectedRowKeys: (keys: number[]) => void

  // 表格事件处理
  handleTableChange: (data: TableChangeData) => void
  handleSearch: (params: Partial<TQuery>) => Promise<void>
  handleReset: () => Promise<void>
}

/**
 * 通用分页 Hook
 */
export function usePagination<
  TItem,
  TQuery extends IPaginationQuery,
  TCreateData = unknown,
  TUpdateData = unknown,
>(
  config: IUsePaginationConfig<TItem, TQuery, TCreateData, TUpdateData>,
): IUsePaginationReturn<TItem, TQuery, TCreateData, TUpdateData> {
  const queryClient = useQueryClient()
  const {
    queryKey,
    queryFn,
    initialQuery,
    createMutation,
    updateMutation,
    deleteMutation,
    retry = 0,
  } = config

  // Vue 对带索引签名的泛型会产生条件联合类型，这里保留明确的 ShallowRef<TQuery>。
  const queryModel = shallowRef({ ...initialQuery }) as ShallowRef<TQuery>
  const selectedRowKeys = shallowRef<number[]>([])
  const fullQueryKey = computed<QueryKey>(() => [queryKey, queryModel.value])

  // 查询数据；queryKey 中包含响应式查询参数，参数变化时会自动重新请求。
  const query = useQuery({
    queryKey: fullQueryKey,
    queryFn: ({ signal }) => queryFn(queryModel.value, signal),
    retry,
    initialData: (): IPaginationResponse<TItem> => ({
      list: [],
      total: 0,
    }),
  })

  const loading = computed(() => query.isFetching.value)
  const dataSource = computed(() => query.data.value.list)
  const total = computed(() => query.data.value.total)

  const setQueryModel = (params: TQuery) => {
    queryModel.value = params
  }

  const setSelectedRowKeys = (keys: number[]) => {
    selectedRowKeys.value = keys
  }

  // 取消旧请求后使当前列表缓存失效，并等待活跃查询刷新完成。
  const refresh = async () => {
    await queryClient.cancelQueries({ queryKey: [queryKey] })
    await queryClient.invalidateQueries({ queryKey: [queryKey] })
  }

  const createMutationInstance = useMutation<unknown, Error, TCreateData>({
    mutationFn: createMutation?.mutationFn ?? (async () => undefined),
    onSuccess: async (data, variables) => {
      await createMutation?.onSuccess?.(data, variables)
      await refresh()
    },
    onError: (error, variables) => createMutation?.onError?.(error, variables),
  })

  const updateMutationInstance = useMutation<unknown, Error, TUpdateData>({
    mutationFn: updateMutation?.mutationFn ?? (async () => undefined),
    onSuccess: async (data, variables) => {
      await updateMutation?.onSuccess?.(data, variables)
      await refresh()
    },
    onError: (error, variables) => updateMutation?.onError?.(error, variables),
  })

  const deleteMutationInstance = useMutation<unknown, Error, { ids: number[] }>({
    mutationFn: deleteMutation?.mutationFn ?? (async () => undefined),
    onSuccess: async (data, variables) => {
      MessagePlugin.success('删除成功')
      selectedRowKeys.value = []
      await deleteMutation?.onSuccess?.(data, variables)
      await refresh()
    },
    onError: (error, variables) => deleteMutation?.onError?.(error, variables),
  })

  const updateQuery = async (newParams: TQuery) => {
    await queryClient.cancelQueries({ queryKey: [queryKey] })

    if (isEqual(newParams, queryModel.value)) {
      await queryClient.invalidateQueries({ queryKey: [queryKey] })
      return
    }

    queryModel.value = newParams
  }

  // 搜索时回到第一页。
  const handleSearch = (params: Partial<TQuery>) =>
    updateQuery({
      ...queryModel.value,
      ...params,
      currentPage: 1,
    } as TQuery)

  const handleReset = () =>
    updateQuery({
      ...initialQuery,
      currentPage: 1,
    } as TQuery)

  // 对应 TDesign Table 的 change 事件，同时处理分页与单列排序。
  const handleTableChange = (data: TableChangeData) => {
    const sorter: TableSort | undefined = data.sorter
    const activeSorter = Array.isArray(sorter) ? sorter[0] : sorter

    queryModel.value = {
      ...queryModel.value,
      currentPage: data.pagination?.current ?? queryModel.value.currentPage,
      pageSize: data.pagination?.pageSize ?? queryModel.value.pageSize,
      sortField: activeSorter?.sortBy ?? '',
      sortValue: activeSorter ? (activeSorter.descending ? 'desc' : 'asc') : '',
    } as TQuery
  }

  return {
    loading,
    dataSource,
    total,
    queryModel,
    setQueryModel,
    refresh,
    create: createMutation
      ? (data: TCreateData) => createMutationInstance.mutateAsync(data)
      : undefined,
    update: updateMutation
      ? (data: TUpdateData) => updateMutationInstance.mutateAsync(data)
      : undefined,
    deleteItems: deleteMutation
      ? (ids: number[]) => deleteMutationInstance.mutateAsync({ ids })
      : undefined,
    createLoading: computed(() => createMutationInstance.isPending.value),
    updateLoading: computed(() => updateMutationInstance.isPending.value),
    deleteLoading: computed(() => deleteMutationInstance.isPending.value),
    selectedRowKeys,
    setSelectedRowKeys,
    handleTableChange,
    handleSearch,
    handleReset,
  }
}
