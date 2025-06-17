import * as THREE from 'three';
import { WebGLPathTracer, PhysicalPathTracingMaterial, BlurredEnvMapGenerator, GradientEquirectTexture } from 'three-gpu-pathtracer';

export class RaytracingWorld {
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private pathTracer: WebGLPathTracer;

  constructor(canvasId = 'webglCanvas') {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 1.5, 4);

    this.pathTracer = new WebGLPathTracer(this.renderer);
    this.pathTracer.setScene(this.scene, this.camera);

    this.initScene();
    this.onResize();
    window.addEventListener('resize', () => this.onResize());
    requestAnimationFrame(() => this.animate());
  }

  private initScene() {
    const floorGeo = new THREE.BoxGeometry(10, 0.1, 10);
    const floorMat = new PhysicalPathTracingMaterial();
    floorMat.color.set(0x808080);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.05;
    this.scene.add(floor);

    const sphereGeo = new THREE.SphereGeometry(1, 64, 32);
    const sphereMat = new PhysicalPathTracingMaterial();
    sphereMat.metalness = 1.0;
    sphereMat.roughness = 0.2;
    sphereMat.color.set(0x999999);
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    sphere.position.set(0, 1, 0);
    this.scene.add(sphere);

    // Environment map for better lighting
    const generator = new BlurredEnvMapGenerator(this.renderer);
    const gradient = new GradientEquirectTexture();
    gradient.topColor = new THREE.Color(0xffffff);
    gradient.bottomColor = new THREE.Color(0x888888);
    gradient.update();
    const blurred = generator.generate(gradient, 0.35);
    this.scene.environment = blurred;
  }

  private onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate() {
    requestAnimationFrame(() => this.animate());
    this.pathTracer.renderSample();
  }
}
