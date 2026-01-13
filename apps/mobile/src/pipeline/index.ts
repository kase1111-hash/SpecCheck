/**
 * Pipeline Module
 *
 * Orchestrates the complete analysis pipeline from camera to verdict.
 * This module ties together all stages of the data flow.
 */

export { Pipeline, getPipeline } from './Pipeline';
export type { PipelineState, PipelineStage } from './Pipeline';
