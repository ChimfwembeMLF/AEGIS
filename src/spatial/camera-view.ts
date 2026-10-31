import type { CameraFeed } from '../contracts';

const FALLBACK_SIZE = { width: 640, height: 480 };

/** Shows the camera element full-size behind the scene. Styling is in styles.css. */
export class CameraView {
  constructor(
    container: HTMLElement,
    private readonly feed: CameraFeed,
  ) {
    feed.element.classList.add('camera-hidden');
    container.prepend(feed.element);
  }

  show(visible: boolean): void {
    this.feed.element.classList.toggle('camera-hidden', !visible);
  }

  sourceSize(): { width: number; height: number } {
    const { videoWidth: width, videoHeight: height } = this.feed.element;
    return width > 0 && height > 0 ? { width, height } : FALLBACK_SIZE;
  }
}
