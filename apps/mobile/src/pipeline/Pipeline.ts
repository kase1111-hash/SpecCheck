/**
 * Pipeline
 *
 * Orchestrates the complete analysis flow:
 * Camera → Detection → OCR → Matching → Specs → Analysis → Verdict
 */

import type {
  CameraFrame,
  DetectedRegion,
  ExtractedText,
  MatchedComponent,
  ComponentWithSpecs,
  Claim,
  ConstraintChain,
  Verdict,
} from '@speccheck/shared-types';

import { getComponentDetector } from '../recognition/ComponentDetector';
import { getOCREngine } from '../recognition/OCREngine';
import { getComponentMatcher } from '../recognition/ComponentMatcher';
import { getSpecRetriever } from '../datasheet/SpecRetriever';
import { buildConstraintChain } from '../analysis/ConstraintChainBuilder';
import { generateVerdict } from '../analysis/VerdictGenerator';

/**
 * Pipeline processing stages
 */
export type PipelineStage =
  | 'idle'
  | 'capturing'
  | 'detecting'
  | 'extracting'
  | 'matching'
  | 'retrieving'
  | 'analyzing'
  | 'complete'
  | 'error';

/**
 * Pipeline state at any point in processing
 */
export interface PipelineState {
  stage: PipelineStage;
  frame: CameraFrame | null;
  detections: DetectedRegion[];
  extractions: ExtractedText[];
  matches: MatchedComponent[];
  components: ComponentWithSpecs[];
  claim: Claim | null;
  chain: ConstraintChain | null;
  verdict: Verdict | null;
  error: string | null;
  timings: Record<string, number>;
}

/**
 * Callback for state updates
 */
type StateCallback = (state: PipelineState) => void;

/**
 * Initial empty state
 */
function createInitialState(): PipelineState {
  return {
    stage: 'idle',
    frame: null,
    detections: [],
    extractions: [],
    matches: [],
    components: [],
    claim: null,
    chain: null,
    verdict: null,
    error: null,
    timings: {},
  };
}

/**
 * Main pipeline orchestrator
 */
export class Pipeline {
  private state: PipelineState = createInitialState();
  private onStateChange: StateCallback | null = null;

  private detector = getComponentDetector();
  private ocrEngine = getOCREngine();
  private matcher = getComponentMatcher();
  private specRetriever = getSpecRetriever();

  /**
   * Initialize the pipeline
   */
  async initialize(): Promise<void> {
    await this.detector.loadModel();
    console.log('[Pipeline] Initialized');
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: StateCallback): () => void {
    this.onStateChange = callback;
    return () => {
      this.onStateChange = null;
    };
  }

  /**
   * Get current state
   */
  getState(): PipelineState {
    return { ...this.state };
  }

  /**
   * Update state and notify subscribers
   */
  private setState(partial: Partial<PipelineState>): void {
    this.state = { ...this.state, ...partial };
    this.onStateChange?.(this.state);
  }

  /**
   * Reset pipeline to initial state
   */
  reset(): void {
    this.state = createInitialState();
    this.onStateChange?.(this.state);
  }

  /**
   * Process a frame through the pipeline (without claim)
   * Returns components with specs, ready for claim evaluation
   */
  async processFrame(frame: CameraFrame): Promise<ComponentWithSpecs[]> {
    const startTime = Date.now();
    const timings: Record<string, number> = {};

    try {
      this.setState({
        stage: 'capturing',
        frame,
        error: null,
      });

      // Stage 2: Detection
      this.setState({ stage: 'detecting' });
      let stageStart = Date.now();

      const detectionResult = await this.detector.detect(frame);
      timings.detection = Date.now() - stageStart;

      this.setState({ detections: detectionResult.regions });

      if (detectionResult.regions.length === 0) {
        this.setState({
          stage: 'complete',
          components: [],
          timings,
        });
        return [];
      }

      // Stage 3: OCR
      this.setState({ stage: 'extracting' });
      stageStart = Date.now();

      const ocrResult = await this.ocrEngine.extractFromRegions(
        frame.imageBase64,
        detectionResult.regions
      );
      timings.ocr = Date.now() - stageStart;

      this.setState({ extractions: ocrResult.extractions });

      // Stage 4: Matching
      this.setState({ stage: 'matching' });
      stageStart = Date.now();

      const matchResult = await this.matcher.matchAll(ocrResult.extractions);
      timings.matching = Date.now() - stageStart;

      this.setState({ matches: matchResult.components });

      // Stage 5: Spec Retrieval
      this.setState({ stage: 'retrieving' });
      stageStart = Date.now();

      const specResult = await this.specRetriever.retrieveAll(matchResult.components);
      timings.retrieval = Date.now() - stageStart;

      timings.total = Date.now() - startTime;

      this.setState({
        stage: 'complete',
        components: specResult.components,
        timings,
      });

      return specResult.components;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.setState({
        stage: 'error',
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Analyze a claim against detected components
   */
  async analyzeClaim(claim: Claim): Promise<Verdict> {
    if (this.state.components.length === 0) {
      throw new Error('No components detected. Process a frame first.');
    }

    try {
      this.setState({
        stage: 'analyzing',
        claim,
      });

      // Build constraint chain
      const chain = buildConstraintChain(claim, this.state.components);
      this.setState({ chain });

      // Generate verdict
      const verdict = generateVerdict(chain);
      this.setState({
        stage: 'complete',
        verdict,
      });

      return verdict;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.setState({
        stage: 'error',
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Full pipeline: process frame and analyze claim
   */
  async run(frame: CameraFrame, claim: Claim): Promise<Verdict> {
    await this.processFrame(frame);
    return this.analyzeClaim(claim);
  }
}

/**
 * Singleton instance
 */
let pipelineInstance: Pipeline | null = null;

/**
 * Get the pipeline instance
 */
export function getPipeline(): Pipeline {
  if (!pipelineInstance) {
    pipelineInstance = new Pipeline();
  }
  return pipelineInstance;
}
