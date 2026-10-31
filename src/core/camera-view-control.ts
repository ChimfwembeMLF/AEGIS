import type {
  CameraDisplay,
  CameraViewCommands,
  CaptureControl,
  HandMarkers,
} from '../contracts';

/** Decides what the person sees of the camera, which is nothing unless it is on. */
export class CameraViewControl implements CameraViewCommands {
  private active = false;
  private hiddenByPerson = false;

  constructor(
    private readonly display: CameraDisplay,
    capture: CaptureControl,
  ) {
    capture.onStateChange((session) => {
      this.active = session.state === 'active';
      if (!this.active) this.display.showHands([]);
      this.publish();
    });
    this.publish();
  }

  toggle(): void {
    this.hiddenByPerson = !this.hiddenByPerson;
    this.publish();
  }

  showHands(hands: HandMarkers[]): void {
    if (this.active) this.display.showHands(hands);
  }

  private publish(): void {
    this.display.showCameraView({
      visible: this.active && !this.hiddenByPerson,
      hiddenByPerson: this.hiddenByPerson,
    });
  }
}
