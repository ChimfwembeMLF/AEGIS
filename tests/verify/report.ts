export interface Check {
  id: string;
  description: string;
  target: string;
  measured: number | null;
  unit: string;
  status: 'pass' | 'fail' | 'not-measured';
}

export interface VerificationReport {
  schemaVersion: 1;
  createdAt: string;
  datasetVersion: string;
  renderer?: string;
  result: 'pass' | 'fail' | 'incomplete';
  checks: Check[];
}

export interface ReportOptions {
  datasetVersion: string;
  createdAt: string;
  renderer?: string;
}

export function isSoftwareRenderer(renderer: string): boolean {
  return /swiftshader|llvmpipe|software/i.test(renderer);
}

function overallResult(checks: Check[]): VerificationReport['result'] {
  if (checks.some((check) => check.status === 'fail')) return 'fail';
  if (checks.length === 0 || checks.some((check) => check.status === 'not-measured')) {
    return 'incomplete';
  }
  return 'pass';
}

export interface Responsiveness {
  renderer?: string;
  delegate?: string;
  feedbackP95Ms?: number;
  framesPerSecond?: number;
  trackingP95Ms?: number;
  pointsP95Ms?: number;
  skipped?: string;
}

/** From the budget in specs/001-project-foundation/plan.md. */
const TRACKING_BUDGET_MS = 35;
const FEEDBACK_BUDGET_MS = 100;
/** From frame arrival to points on screen. Camera delay brings this to the 0.2 second target. */
const POINTS_BUDGET_MS = 100;
const MINIMUM_FRAME_RATE = 30;

export function responsivenessChecks(result: Responsiveness): { checks: Check[]; renderer?: string } {
  const usable =
    !result.skipped &&
    result.renderer !== undefined &&
    !isSoftwareRenderer(result.renderer) &&
    result.feedbackP95Ms !== undefined &&
    result.framesPerSecond !== undefined &&
    result.trackingP95Ms !== undefined &&
    result.pointsP95Ms !== undefined;
  const note = result.skipped ? ` (${result.skipped})` : '';
  const atMost = (value: number | undefined, limit: number): Check['status'] => {
    if (!usable) return 'not-measured';
    return (value as number) <= limit ? 'pass' : 'fail';
  };
  const measured = (value: number | undefined) => (usable ? (value as number) : null);

  return {
    ...(result.renderer ? { renderer: `${result.renderer}; delegate ${result.delegate}` } : {}),
    checks: [
      {
        id: 'SC-004',
        description: `Frame arrival to painted feedback, p95${note}`,
        target: `at most ${FEEDBACK_BUDGET_MS}`,
        measured: measured(result.feedbackP95Ms),
        unit: 'ms',
        status: atMost(result.feedbackP95Ms, FEEDBACK_BUDGET_MS),
      },
      {
        id: 'SC-005',
        description: `Frame rate with tracking and rendering together${note}`,
        target: `at least ${MINIMUM_FRAME_RATE}`,
        measured: measured(result.framesPerSecond),
        unit: 'frames per second',
        status: usable
          ? (result.framesPerSecond as number) >= MINIMUM_FRAME_RATE
            ? 'pass'
            : 'fail'
          : 'not-measured',
      },
      {
        id: 'SC-011',
        description: `Frame arrival to hand points on screen, p95${note}`,
        target: `at most ${POINTS_BUDGET_MS}`,
        measured: measured(result.pointsP95Ms),
        unit: 'ms',
        status: atMost(result.pointsP95Ms, POINTS_BUDGET_MS),
      },
      {
        id: 'PLAN-TRACKING',
        description: `Hand tracking while the scene renders, p95${note}`,
        target: `at most ${TRACKING_BUDGET_MS}`,
        measured: measured(result.trackingP95Ms),
        unit: 'ms',
        status: atMost(result.trackingP95Ms, TRACKING_BUDGET_MS),
      },
    ],
  };
}

export function buildReport(checks: Check[], options: ReportOptions): VerificationReport {
  const { datasetVersion, createdAt, renderer } = options;
  return {
    schemaVersion: 1,
    createdAt,
    datasetVersion,
    ...(renderer ? { renderer } : {}),
    result: overallResult(checks),
    checks,
  };
}
