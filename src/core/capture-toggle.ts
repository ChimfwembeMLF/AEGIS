import type { CaptureCommands, CaptureControl, CaptureState } from '../contracts';

export class CaptureToggle implements CaptureCommands {
  private state: CaptureState = 'stopped';

  constructor(private readonly control: CaptureControl) {
    control.onStateChange((session) => {
      this.state = session.state;
    });
  }

  /** A person can stop the camera at any moment, including while it is starting. */
  toggle(): void {
    if (this.state === 'active' || this.state === 'starting') this.control.stop();
    else void this.control.start();
  }
}
