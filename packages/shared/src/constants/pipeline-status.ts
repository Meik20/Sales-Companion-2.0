export const pipelineStatuses = ['prospection', 'negociation', 'conclue'] as const
export type PipelineStatus = (typeof pipelineStatuses)[number]
