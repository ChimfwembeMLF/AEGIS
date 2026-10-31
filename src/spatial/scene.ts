import * as THREE from 'three';
import type { Pose, SceneBounds, SceneInfo, Unsubscribe } from '../contracts';

const CAMERA_DISTANCE = 6;
const FIELD_OF_VIEW = 45;
/** Furthest any part of the object reaches from its centre, including the pointer. */
const OBJECT_RADIUS = 1;
/** How far the object's front face sits towards the camera, which makes it look larger. */
const OBJECT_FRONT_DEPTH = 0.6;
/** Inside the bounds at every supported window size. */
const TARGET_POSITION = { x: 0.9, y: 0.5 };

function createObject(): THREE.Group {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x2fe6ff, metalness: 0.2, roughness: 0.35 }),
  );
  // A pointer on one side makes rotation easy to see.
  const pointer = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 0.5, 24),
    new THREE.MeshStandardMaterial({ color: 0xc9d1dc, metalness: 0.5, roughness: 0.3 }),
  );
  pointer.position.y = 0.75;
  group.add(body, pointer);
  return group;
}

export class SpatialScene implements SceneInfo {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(FIELD_OF_VIEW, 1, 0.1, 100);
  private readonly object = createObject();
  private readonly boundsListeners = new Set<() => void>();
  private needsRender = true;

  constructor(private readonly container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      preserveDrawingBuffer: import.meta.env.MODE === 'e2e',
    });
    this.renderer.domElement.id = 'scene-canvas';
    // One pixel per CSS pixel: at Retina scale this GPU drops to 24 fps alongside hand tracking.
    this.renderer.setPixelRatio(1);
    container.append(this.renderer.domElement);

    this.camera.position.z = CAMERA_DISTANCE;

    const light = new THREE.DirectionalLight(0xffffff, 2.5);
    light.position.set(2, 3, 5);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.8), light, this.object);

    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
    this.renderer.setAnimationLoop(() => this.renderIfNeeded());
  }

  setPose(pose: Pose): void {
    this.object.position.set(pose.position.x, pose.position.y, 0);
    this.object.rotation.z = pose.rotation;
    this.container.dataset.pose = JSON.stringify(pose);
    this.needsRender = true;
  }

  /** Marks a spot to move the object to, for first-use testing. */
  showTarget(): void {
    const target = new THREE.Mesh(
      new THREE.TorusGeometry(0.9, 0.05, 16, 64),
      new THREE.MeshBasicMaterial({ color: 0xc9d1dc }),
    );
    target.position.set(TARGET_POSITION.x, TARGET_POSITION.y, -0.7);
    this.scene.add(target);
    this.needsRender = true;
  }

  onBoundsChange(listener: () => void): Unsubscribe {
    this.boundsListeners.add(listener);
    return () => this.boundsListeners.delete(listener);
  }

  bounds(): SceneBounds {
    const halfHeight = Math.tan(THREE.MathUtils.degToRad(FIELD_OF_VIEW / 2)) * CAMERA_DISTANCE;
    const halfWidth = halfHeight * this.camera.aspect;
    const perspective = (CAMERA_DISTANCE - OBJECT_FRONT_DEPTH) / CAMERA_DISTANCE;
    const maxX = Math.max(0, halfWidth * perspective - OBJECT_RADIUS);
    const maxY = Math.max(0, halfHeight * perspective - OBJECT_RADIUS);
    return { minX: -maxX, maxX, minY: -maxY, maxY };
  }

  private resize(): void {
    const { clientWidth, clientHeight } = this.container;
    if (clientWidth === 0 || clientHeight === 0) return;
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(clientWidth, clientHeight, false);
    this.needsRender = true;
    this.boundsListeners.forEach((listener) => listener());
  }

  private renderIfNeeded(): void {
    if (!this.needsRender) return;
    this.needsRender = false;
    this.renderer.render(this.scene, this.camera);
  }
}
