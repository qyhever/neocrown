export interface BatchDeleteUsersResult {
  deletedIds: number[]
  skipped: Array<{
    id: number
    reason: string
  }>
}
