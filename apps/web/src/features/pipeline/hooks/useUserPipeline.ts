import type { PipelineDoc } from '@sales-companion/shared'

export const useUserPipeline = () => {
  return {
    data: [] as (PipelineDoc & { id: string })[],
    isLoading: false,
    error: null,
  }
}