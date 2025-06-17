/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GLTFLoader } from 'three-stdlib';

// Inform TypeScript about the global THREE object from the CDN
declare global {
  namespace THREE {
    // Core classes for 3D operations and scene graph
    class Vector3 {
        constructor(x?: number, y?: number, z?: number);
        x: number;
        y: number;
        z: number;
        set(x: number, y: number, z: number): this;
        add(v: Vector3): this;
        sub(v: Vector3): this;
        multiplyScalar(s: number): this;
        normalize(): this;
        applyQuaternion(q: Quaternion): this;
        copy(v: Vector3): this;
        distanceTo(v: Vector3): number;
    }

    class Quaternion {
        constructor(x?: number, y?: number, z?: number, w?: number);
        x: number;
        y: number;
        z: number;
        w: number;
        // Add methods like .setFromEuler, .multiply if explicitly used.
    }

    class Euler {
        constructor(x?: number, y?: number, z?: number, order?: string);
        x: number;
        y: number;
        z: number;
        order?: string;
        set(x: number, y: number, z: number, order?: string): this;
    }

    class Object3D {
      constructor();
      position: Vector3;
      rotation: Euler;
      quaternion: Quaternion;
      visible: boolean;
      castShadow: boolean;
      receiveShadow: boolean;
      add(...object: Object3D[]): this;
      lookAt(vector: Vector3 | number, y?: number, z?: number): void;
      // Other common Object3D properties: up, scale, parent, children, matrix, matrixWorld
    }

    class Group extends Object3D {
        constructor();
    }

    class Mesh extends Object3D {
        constructor(geometry?: any, material?: any | any[]);
        geometry: any; // Could be THREE.BufferGeometry
        material: any | any[]; // Could be THREE.Material or THREE.Material[]
    }

    // Scene, Camera, Renderer, Lights, Geometries, Materials
    class Scene {
      constructor();
      background: Color | any; // Allow 'any' for textures, null, etc.
      fog: Fog | any; // Allow 'any' for null
      add(...object: Object3D[]): void;
    }

    class PerspectiveCamera extends Object3D {
      constructor(fov?: number, aspect?: number, near?: number, far?: number);
      aspect: number;
      updateProjectionMatrix: () => void;
      // position, rotation, lookAt inherited from Object3D
    }

    class WebGLRenderer {
      constructor(parameters?: { canvas?: HTMLCanvasElement, antialias?: boolean });
      domElement: HTMLCanvasElement;
      shadowMap: { enabled: boolean, type: number };
      setSize(width: number, height: number): void;
      render(scene: Scene, camera: PerspectiveCamera): void;
    }

    class Clock {
      constructor(autoStart?: boolean);
      getDelta: () => number;
    }

    class Color {
      constructor(r?: number | string, g?: number, b?: number);
      // Add methods/properties if used: .setHex, .r, .g, .b
    }

    class Fog {
      constructor(color: number | string | Color, near?: number, far?: number);
    }

    class CylinderGeometry {
      constructor(radiusTop?: number, radiusBottom?: number, height?: number, radialSegments?: number, heightSegments?: number, openEnded?: boolean, thetaStart?: number, thetaLength?: number);
      parameters: { radiusTop: number, radiusBottom: number, height: number, radialSegments: number };
    }

    class SphereGeometry {
      constructor(radius?: number, widthSegments?: number, heightSegments?: number, phiStart?: number, phiLength?: number, thetaStart?: number, thetaLength?: number);
    }

    class BoxGeometry {
      constructor(width?: number, height?: number, depth?: number, widthSegments?: number, heightSegments?: number, depthSegments?: number);
    }

    class PlaneGeometry {
      constructor(width?: number, height?: number, widthSegments?: number, heightSegments?: number);
    }

    class MeshStandardMaterial {
      constructor(parameters?: {
        color?: number | string | Color,
        roughness?: number,
        metalness?: number,
        map?: any, // Texture
        emissive?: number | string | Color,
        emissiveIntensity?: number,
        side?: number,
        [key: string]: any; // Allow other standard material properties
      });
      clone: () => this;
      side?: number;
      emissive?: Color;
      emissiveIntensity?: number;
      color: Color;
      roughness: number;
      metalness: number;
    }

    // Lights hierarchy
    class Light extends Object3D {
        constructor(color?: number | string | Color, intensity?: number);
        color: Color;
        intensity: number;
    }

    class AmbientLight extends Light {
      constructor(color?: number | string | Color, intensity?: number);
    }

    class DirectionalLight extends Light {
        constructor(color?: number | string | Color, intensity?: number);
        shadow: any; // THREE.DirectionalLightShadow
    }
    class PointLight extends Light {
        constructor(color?: number | string | Color, intensity?: number, distance?: number, decay?: number);
        // distance and decay are specific to PointLight
    }

    // Constants accessed as properties of THREE
    const PCFSoftShadowMap: number;
    const DoubleSide: number;
    const RepeatWrapping: number;
    const ACESFilmicToneMapping: number;
    const sRGBEncoding: number;
    class Texture {
      wrapS: number; wrapT: number;
      repeat: { set(x:number, y:number): void };
    }
    class CubeTexture extends Texture {}
    class TextureLoader {
      load(path: string): Texture;
      setPath(path: string): this;
      setCrossOrigin(origin: string): this;
    }
    class CubeTextureLoader {
      load(paths: string[]): CubeTexture;
      setPath(path: string): this;
      setCrossOrigin(origin: string): this;
    }
    class Box3 {
      min: Vector3; max: Vector3;
      constructor(min?: Vector3, max?: Vector3);
      set(min: Vector3, max: Vector3): this;
      containsPoint(point: Vector3): boolean;
    }
  }
}

export class BasicWorld {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private clock: THREE.Clock;

    // Player and Character
    private character: THREE.Group;
    private characterMixer?: THREE.AnimationMixer;
    private cameraTarget: THREE.Object3D;

    private moveSpeed: number = 4;
    private mouseSensitivity: number = 0.002;
    private keysPressed: { [key: string]: boolean } = {};
    private isPointerLockActive: boolean = false;

    // Third-person camera controls
    private cameraOrbitRadius: number = 7;
    private cameraElevationAngle: number = Math.PI / 7;
    private cameraAzimuthAngle: number = 0;
    private cameraTargetOffset: THREE.Vector3;

    // Character Jump mechanics
    private isJumping: boolean = false;
    private velocityY: number = 0;
    private readonly gravity: number = 20.0;
    private readonly jumpStrength: number = 8.0;
    private readonly characterFeetY: number = 0;
    private readonly characterHeight: number = 1.8;

    // Car properties
    private carModel: THREE.Group;
    private carBody: THREE.Mesh;
    private carWheels: THREE.Mesh[] = [];
    private isInCar: boolean = false;
    private carSpeed: number = 0;
    private readonly carAcceleration: number = 12.0;
    private readonly carDeceleration: number = 15.0; // Friction + braking
    private readonly carMaxSpeed: number = 25.0;
    private readonly carReverseMaxSpeed: number = -8.0;
    private carSteeringInput: number = 0; // -1 for right, 0 for straight, 1 for left
    private readonly carMaxSteeringAngleRad: number = Math.PI / 7;
    private readonly carWheelBase: number = 2.8; // Distance between front and rear axles
    private readonly wheelRotationSpeedFactor: number = 25; // Visual wheel spin rate
    private readonly enterCarDistance: number = 3.0; // Max distance to enter car

    // City Layout Parameters
    private readonly blockSize: number = 20;
    private readonly streetWidth: number = 6;
    private readonly citySize: number = 8; // Number of blocks in one dimension
    private cityOffset: number = 0;


    // Materials
    private buildingMaterials: THREE.MeshStandardMaterial[] = [];
    private streetMaterial: THREE.MeshStandardMaterial;
    private lanternPoleMaterial: THREE.MeshStandardMaterial;
    private lanternLightMaterial: THREE.MeshStandardMaterial;
    private characterMaterial: THREE.MeshStandardMaterial;
    private carBodyMaterial: THREE.MeshStandardMaterial;
    private wheelMaterial: THREE.MeshStandardMaterial;

    // Textures and environment
    private textureLoader: THREE.TextureLoader;
    private cubeTextureLoader: THREE.CubeTextureLoader;
    private groundTexture: THREE.Texture;
    private buildingTexture: THREE.Texture;
    private streetTexture: THREE.Texture;
    private environmentMap: THREE.CubeTexture;

    // Collision and world chunks
    private buildingColliders: THREE.Box3[] = [];
    private generatedChunks: Set<string> = new Set();
    private activeChunks: Map<string, THREE.Group> = new Map();
    private chunkSize: number;

    private collides(pos: THREE.Vector3): boolean {
        for (const box of this.buildingColliders) {
            if (box.containsPoint(pos)) return true;
        }
        return false;
    }


    constructor() {
        this.cameraTargetOffset = new THREE.Vector3(0, this.characterHeight * 0.8, 0);
        this.cityOffset = (this.citySize * (this.blockSize + this.streetWidth) - this.streetWidth) / 2;
        this.chunkSize = this.citySize * (this.blockSize + this.streetWidth);

        this.textureLoader = new THREE.TextureLoader();
        this.cubeTextureLoader = new THREE.CubeTextureLoader();

        this.init();
        this.loadTextures();
        this.initMaterials();
        this.createCar();       // Car will be placed on a calculated street position
        this.cameraTarget = this.character; // Set initial target
        this.createObjects();
        this.setupControls();
        this.updateCameraOrbit(); // Initial camera position
        this.animate();
    }

    private init(): void {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x001029);
        this.scene.fog = new THREE.Fog(this.scene.background as THREE.Color, 50, 200);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 300);

        const canvas = document.getElementById('webglCanvas') as HTMLCanvasElement;
        this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.physicallyCorrectLights = true;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        (this.renderer as any).outputEncoding = THREE.sRGBEncoding;

        this.clock = new THREE.Clock();

        const ambientLight = new THREE.AmbientLight(0x404060, 0.8);
        this.scene.add(ambientLight); 

        const moonLight = new THREE.DirectionalLight(0xa0a0c0, 0.6);
        moonLight.position.set(30, 50, 20);
        moonLight.castShadow = true;
        moonLight.shadow.mapSize.width = 2048;
        moonLight.shadow.mapSize.height = 2048;
        this.scene.add(moonLight);

        window.addEventListener('resize', this.onWindowResize.bind(this), false);
    }

    private loadTextures(): void {
        this.textureLoader.setCrossOrigin('anonymous');
        this.cubeTextureLoader.setCrossOrigin('anonymous');

        const groundUrl = 'https://raw.githubusercontent.com/mrdoob/three.js/r177/examples/textures/terrain/grasslight-big.jpg';
        this.groundTexture = this.textureLoader.load(groundUrl);
        this.groundTexture.wrapS = this.groundTexture.wrapT = THREE.RepeatWrapping;
        this.groundTexture.repeat.set(50, 50);

        const brickUrl = 'https://raw.githubusercontent.com/mrdoob/three.js/r177/examples/textures/brick_diffuse.jpg';
        this.buildingTexture = this.textureLoader.load(brickUrl);
        this.buildingTexture.wrapS = this.buildingTexture.wrapT = THREE.RepeatWrapping;

        const streetUrl = 'https://raw.githubusercontent.com/mrdoob/three.js/r177/examples/textures/floors/FloorsCheckerboard_S_Diffuse.jpg';
        this.streetTexture = this.textureLoader.load(streetUrl);
        this.streetTexture.wrapS = this.streetTexture.wrapT = THREE.RepeatWrapping;
        this.streetTexture.repeat.set(2, 2);

        this.environmentMap = this.cubeTextureLoader.load([
            'https://threejs.org/examples/textures/cube/Bridge2/posx.jpg',
            'https://threejs.org/examples/textures/cube/Bridge2/negx.jpg',
            'https://threejs.org/examples/textures/cube/Bridge2/posy.jpg',
            'https://threejs.org/examples/textures/cube/Bridge2/negy.jpg',
            'https://threejs.org/examples/textures/cube/Bridge2/posz.jpg',
            'https://threejs.org/examples/textures/cube/Bridge2/negz.jpg'
        ]);
        this.scene.environment = this.environmentMap;
        this.scene.background = this.environmentMap;
    }

    private initMaterials(): void {
        this.buildingMaterials = [
            new THREE.MeshStandardMaterial({ map: this.buildingTexture, envMap: this.environmentMap, color: 0x8c8c8c, roughness: 0.5, metalness: 0.4 }),
            new THREE.MeshStandardMaterial({ map: this.buildingTexture, envMap: this.environmentMap, color: 0x5c5c5c, roughness: 0.4, metalness: 0.6 }),
            new THREE.MeshStandardMaterial({ map: this.buildingTexture, envMap: this.environmentMap, color: 0xcc6666, roughness: 0.7, metalness: 0.3 }),
            new THREE.MeshStandardMaterial({ map: this.buildingTexture, envMap: this.environmentMap, color: 0xa08d77, roughness: 0.6, metalness: 0.4 }),
            new THREE.MeshStandardMaterial({ map: this.buildingTexture, envMap: this.environmentMap, color: 0x778899, roughness: 0.3, metalness: 0.8 }),
        ];
        this.streetMaterial = new THREE.MeshStandardMaterial({ map: this.streetTexture, roughness: 0.9, metalness: 0.2, side: THREE.DoubleSide });
        this.lanternPoleMaterial = new THREE.MeshStandardMaterial({ color: 0x454545, roughness: 0.5, metalness: 0.8 });
        this.lanternLightMaterial = new THREE.MeshStandardMaterial({ color: 0xffffee, emissive: new THREE.Color(0xffffaa), emissiveIntensity: 1 });
        this.characterMaterial = new THREE.MeshStandardMaterial({ color: 0x0077ff, roughness: 0.5, metalness: 0.1 });
        this.carBodyMaterial = new THREE.MeshStandardMaterial({ map: this.buildingTexture, color: 0xff0000, roughness: 0.1, metalness: 1.0, envMap: this.environmentMap });
        this.wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7, metalness: 0.3, envMap: this.environmentMap });
    }

    private loadAnimatedCharacter(x: number, z: number): void {
        this.character = new THREE.Group();
        this.scene.add(this.character);

        const loader = new GLTFLoader();
        const url = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/RobotExpressive/RobotExpressive.glb';
        loader.load(url, (gltf) => {
            gltf.scene.traverse(obj => {
                if ((obj as any).isMesh) {
                    const mesh = obj as THREE.Mesh;
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                }
            });
            gltf.scene.scale.set(0.8, 0.8, 0.8);
            this.character.add(gltf.scene);
            this.character.position.set(x, this.characterFeetY, z);
            this.characterMixer = new THREE.AnimationMixer(gltf.scene);
            gltf.animations.forEach(clip => {
                this.characterMixer!.clipAction(clip).play();
            });
        });
    }

    private createCar(): void {
        this.carModel = new THREE.Group();
        const bodyWidth = 2;
        const bodyHeight = 1;
        const bodyDepth = 4;

        const carBodyGeo = new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyDepth);
        this.carBody = new THREE.Mesh(carBodyGeo, this.carBodyMaterial);
        this.carBody.position.y = bodyHeight / 2 + 0.3; // Wheels lift the body a bit
        this.carBody.castShadow = true;
        this.carBody.receiveShadow = true;
        this.carModel.add(this.carBody);

        const wheelRadius = 0.4;
        const wheelWidth = 0.3;
        const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 20);

        const wheelPositions = [
            // Front Right, Front Left, Rear Right, Rear Left (from car's perspective, right = positive X)
            new THREE.Vector3(bodyWidth / 2 + wheelWidth / 2 - 0.1, wheelRadius, this.carWheelBase / 2), // Front Right
            new THREE.Vector3(-bodyWidth / 2 - wheelWidth / 2 + 0.1, wheelRadius, this.carWheelBase / 2), // Front Left
            new THREE.Vector3(bodyWidth / 2 + wheelWidth / 2 - 0.1, wheelRadius, -this.carWheelBase / 2), // Rear Right
            new THREE.Vector3(-bodyWidth / 2 - wheelWidth / 2 + 0.1, wheelRadius, -this.carWheelBase / 2), // Rear Left
        ];

        wheelPositions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeo, this.wheelMaterial);
            wheel.position.copy(pos);
            wheel.rotation.z = Math.PI / 2; // Orient cylinder to roll
            wheel.castShadow = true;
            this.carModel.add(wheel);
            this.carWheels.push(wheel);
        });

        // Spawn car on a central street
        const midStreetIndex = Math.floor(this.citySize / 2);
        // Centerline X of the middle vertical street
        const carSpawnX = midStreetIndex * (this.blockSize + this.streetWidth) - this.cityOffset - this.streetWidth / 2;
        // Slightly offset Z on this street
        const carSpawnZ = this.blockSize * 0.1;

        this.carModel.position.set(carSpawnX, 0, carSpawnZ); // Y=0, car physics handles height
        this.scene.add(this.carModel);

        // Load the character near the car
        this.loadAnimatedCharacter(carSpawnX + 3, carSpawnZ);
    }

    private createStreetLight(x: number, y: number, z: number): void {
        const lanternGroup = new THREE.Group();
        const poleGeometry = new THREE.CylinderGeometry(0.15, 0.2, 5, 8);
        const pole = new THREE.Mesh(poleGeometry, this.lanternPoleMaterial);
        pole.position.y = 2.5;
        pole.castShadow = true;
        lanternGroup.add(pole);

        const fixtureGeometry = new THREE.SphereGeometry(0.4, 16, 8);
        const fixture = new THREE.Mesh(fixtureGeometry, this.lanternLightMaterial);
        fixture.position.y = 5;
        lanternGroup.add(fixture);

        const pointLight = new THREE.PointLight(0xffddaa, 2, 20, 1.5);
        pointLight.position.y = 4.8;
        pointLight.castShadow = false; // Keep false to avoid too many shadow casters
        lanternGroup.add(pointLight);

        lanternGroup.position.set(x, y, z);
        this.scene.add(lanternGroup);
    }

    private createObjects(): void {
        const groundGeometry = new THREE.PlaneGeometry(300, 300);
        const groundMaterial = new THREE.MeshStandardMaterial({ map: this.groundTexture, side: THREE.DoubleSide });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.05; // Slightly below streets
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Street and building generation using class members for city layout
        for (let i = 0; i < this.citySize; i++) { // Iterates through columns of blocks
            for (let j = 0; j < this.citySize + 1; j++) { // Iterates for horizontal streets and one past for vertical edges

                // Horizontal streets (between rows of blocks)
                if (j < this.citySize) {
                    const streetHorzGeo = new THREE.PlaneGeometry(this.blockSize, this.streetWidth);
                    const streetHorz = new THREE.Mesh(streetHorzGeo, this.streetMaterial);
                    streetHorz.rotation.x = -Math.PI / 2;
                    streetHorz.position.set(
                        i * (this.blockSize + this.streetWidth) - this.cityOffset + this.blockSize / 2,
                        0,
                        j * (this.blockSize + this.streetWidth) - this.cityOffset - this.streetWidth / 2
                    );
                    streetHorz.receiveShadow = true;
                    this.scene.add(streetHorz);
                    if (Math.random() < 0.8) this.createStreetLight(streetHorz.position.x - this.blockSize/2 + 1, 0, streetHorz.position.z - this.streetWidth/2 - 0.5);
                    if (Math.random() < 0.8) this.createStreetLight(streetHorz.position.x + this.blockSize/2 - 1, 0, streetHorz.position.z - this.streetWidth/2 - 0.5);
                }

                // Vertical streets (between columns of blocks)
                 if (i < this.citySize) { // Only up to citySize for vertical streets
                    const streetVertGeo = new THREE.PlaneGeometry(this.streetWidth, this.blockSize + (j === this.citySize ? this.streetWidth: 0) );
                    const streetVert = new THREE.Mesh(streetVertGeo, this.streetMaterial);
                    streetVert.rotation.x = -Math.PI / 2;
                    streetVert.position.set(
                        j * (this.blockSize + this.streetWidth) - this.cityOffset - this.streetWidth/2, // X based on j for vertical streets
                        0,
                        i * (this.blockSize + this.streetWidth) - this.cityOffset + this.blockSize / 2  // Z based on i
                    );
                    streetVert.receiveShadow = true;
                    this.scene.add(streetVert);
                    if(j < this.citySize && Math.random() < 0.8){ // Ensure lanterns are within block grid
                        this.createStreetLight(streetVert.position.x - this.streetWidth/2 - 0.5, 0, streetVert.position.z - this.blockSize/2 + 1);
                    }
                     if(j < this.citySize && Math.random() < 0.8){
                        this.createStreetLight(streetVert.position.x - this.streetWidth/2 - 0.5, 0, streetVert.position.z + this.blockSize/2 - 1);
                    }
                }
            }
        }
        const buildingPadding = 2;
        for (let i = 0; i < this.citySize; i++) {
            for (let j = 0; j < this.citySize; j++) {
                const blockCenterX = i * (this.blockSize + this.streetWidth) - this.cityOffset + this.blockSize / 2;
                const blockCenterZ = j * (this.blockSize + this.streetWidth) - this.cityOffset + this.blockSize / 2;
                const numBuildingsInBlock = Math.floor(Math.random() * 2) + 1;

                for (let k = 0; k < numBuildingsInBlock; k++) {
                    const height = Math.random() * 15 + 8;
                    const width = Math.random() * (this.blockSize / 2.5 - buildingPadding) + 5;
                    const depth = Math.random() * (this.blockSize / 2.5 - buildingPadding) + 5;
                    const buildingGeo = new THREE.BoxGeometry(width, height, depth);
                    const randomMaterial = this.buildingMaterials[Math.floor(Math.random() * this.buildingMaterials.length)];
                    const building = new THREE.Mesh(buildingGeo, randomMaterial.clone());
                    const buildingX = blockCenterX + (Math.random() - 0.5) * (this.blockSize - width - buildingPadding * 2);
                    const buildingZ = blockCenterZ + (Math.random() - 0.5) * (this.blockSize - depth - buildingPadding * 2);
                    building.position.set(buildingX, height / 2, buildingZ);
                    building.castShadow = true;
                    building.receiveShadow = true;
                    const collider = new THREE.Box3().set(
                        new THREE.Vector3(buildingX - width/2, 0, buildingZ - depth/2),
                        new THREE.Vector3(buildingX + width/2, height, buildingZ + depth/2)
                    );
                    this.buildingColliders.push(collider);
                    this.scene.add(building);
                }
            }
        }

        // Reflective spheres add more reflective surfaces
        const sphereGeo = new THREE.SphereGeometry(1, 32, 16);
        const sphereMat = new THREE.MeshStandardMaterial({ envMap: this.environmentMap, metalness: 1, roughness: 0 });
        for (let i = 0; i < this.citySize; i++) {
            for (let j = 0; j < this.citySize; j++) {
                if (Math.random() < 0.3) {
                    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
                    sphere.position.set(
                        i * (this.blockSize + this.streetWidth) - this.cityOffset + this.blockSize / 2,
                        1,
                        j * (this.blockSize + this.streetWidth) - this.cityOffset + this.blockSize / 2
                    );
                    sphere.castShadow = true;
                    sphere.receiveShadow = true;
                    this.scene.add(sphere);
                }
            }
        }
    }

    private setupControls(): void {
        document.addEventListener('keydown', (event) => {
            this.keysPressed[event.key.toLowerCase()] = true;
            if (!this.isInCar && event.key === ' ' && !this.isJumping) {
                this.isJumping = true;
                this.velocityY = this.jumpStrength;
            }
            if (event.key.toLowerCase() === 'f') {
                this.enterOrExitCar();
            }
        });

        document.addEventListener('keyup', (event) => {
            this.keysPressed[event.key.toLowerCase()] = false;
        });

        const canvas = this.renderer.domElement;
        canvas.addEventListener('click', () => canvas.requestPointerLock());
        document.addEventListener('pointerlockchange', () => { this.isPointerLockActive = document.pointerLockElement === canvas;}, false);
        document.addEventListener('pointerlockerror', (e) => console.error('Pointer lock error:', e), false);
        document.addEventListener('mousemove', this.onMouseMove.bind(this), false);
    }

    private enterOrExitCar(): void {
        if (!this.carModel) return;

        if (this.isInCar) {
            this.isInCar = false;
            this.character.visible = true;
            const carExitOffset = new THREE.Vector3(1.5, 0, 0).applyQuaternion(this.carModel.quaternion);
            this.character.position.copy(this.carModel.position).add(carExitOffset);
            this.character.position.y = this.characterFeetY;
            this.cameraTarget = this.character;
            this.cameraTargetOffset = new THREE.Vector3(0, this.characterHeight * 0.8, 0);
            this.carSpeed = 0; // Stop car immediately when exiting
        } else {
            const distanceToCar = this.character.position.distanceTo(this.carModel.position);
            if (distanceToCar < this.enterCarDistance) {
                this.isInCar = true;
                this.character.visible = false;
                this.cameraTarget = this.carModel;
                this.cameraTargetOffset = new THREE.Vector3(0, 1.5, 0); // Camera offset for car
                this.carSpeed = 0; // Ensure car is stationary on entry
                this.carSteeringInput = 0; // Reset steering
            }
        }
    }

    private onMouseMove(event: MouseEvent): void {
        if (!this.isPointerLockActive) return;
        const movementX = event.movementX || 0;
        const movementY = event.movementY || 0;

        this.cameraAzimuthAngle -= movementX * this.mouseSensitivity;
        this.cameraElevationAngle -= movementY * this.mouseSensitivity;
        this.cameraElevationAngle = Math.max(Math.PI / 36, Math.min(Math.PI / 2.2, this.cameraElevationAngle));
    }

    private updateGameLogic(deltaTime: number): void {
        if (this.isInCar) {
            this.updateCarMovement(deltaTime);
        } else {
            this.updateCharacterMovement(deltaTime);
        }
        this.updateCameraOrbit();
        this.wrapWorld();
    }

    private updateCharacterMovement(deltaTime: number): void {
        const moveDistance = this.moveSpeed * deltaTime;
        let didMove = false;
        const movementDirection = new THREE.Vector3();
        const forward = new THREE.Vector3(Math.sin(this.cameraAzimuthAngle), 0, Math.cos(this.cameraAzimuthAngle));
        const right = new THREE.Vector3(Math.sin(this.cameraAzimuthAngle + Math.PI / 2), 0, Math.cos(this.cameraAzimuthAngle + Math.PI / 2));

        if (this.keysPressed['w'] || this.keysPressed['arrowup']) { movementDirection.add(forward); didMove = true; }
        if (this.keysPressed['s'] || this.keysPressed['arrowdown']) { movementDirection.sub(forward); didMove = true; }
        if (this.keysPressed['a'] || this.keysPressed['arrowleft']) { movementDirection.add(right); didMove = true; }
        if (this.keysPressed['d'] || this.keysPressed['arrowright']) { movementDirection.sub(right); didMove = true; }

        if (didMove) {
            movementDirection.normalize().multiplyScalar(moveDistance);
            const candidate = this.character.position.clone().add(movementDirection);
            if (!this.collides(candidate)) {
                this.character.position.copy(candidate);
            }
            // Character rotation
            const targetAngle = Math.atan2(movementDirection.x, movementDirection.z);
            let angleDiff = targetAngle - this.character.rotation.y;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            this.character.rotation.y += angleDiff * 10 * deltaTime; // Smoothed rotation
        }

        // Jump physics
        if (this.isJumping) {
            this.character.position.y += this.velocityY * deltaTime;
            this.velocityY -= this.gravity * deltaTime;
            if (this.character.position.y <= this.characterFeetY) {
                this.character.position.y = this.characterFeetY;
                this.isJumping = false; this.velocityY = 0;
            }
        } else {
             // Ensure player is on ground, or fall respawn
            if (this.character.position.y < this.characterFeetY && this.character.position.y > -5) this.character.position.y = this.characterFeetY;
            if (this.character.position.y < -50) { // Fall respawn
                this.character.position.set(this.carModel.position.x + 3, this.characterFeetY + 5, this.carModel.position.z);
                this.velocityY = 0; this.isJumping = false;
            }
        }
    }

    private updateCarMovement(deltaTime: number): void {
        if (!this.carModel || !this.carBody) return;

        let accelerationInput = 0;
        if (this.keysPressed['w'] || this.keysPressed['arrowup']) accelerationInput = 1;
        if (this.keysPressed['s'] || this.keysPressed['arrowdown']) accelerationInput = -1;

        // Steering: A for left, D for right
        if (this.keysPressed['a'] || this.keysPressed['arrowleft']) this.carSteeringInput = 1;
        else if (this.keysPressed['d'] || this.keysPressed['arrowright']) this.carSteeringInput = -1;
        else this.carSteeringInput = 0;


        // Apply acceleration/deceleration
        if (accelerationInput !== 0) {
            this.carSpeed += this.carAcceleration * accelerationInput * deltaTime;
        } else { // Apply friction/natural deceleration
            if (this.carSpeed > 0) this.carSpeed -= this.carDeceleration * deltaTime;
            else if (this.carSpeed < 0) this.carSpeed += this.carDeceleration * deltaTime;
            // Stop if speed is very low
            if (Math.abs(this.carSpeed) < 0.1) this.carSpeed = 0;
        }
        this.carSpeed = Math.max(this.carReverseMaxSpeed, Math.min(this.carMaxSpeed, this.carSpeed));

        // Steering and car rotation
        if (this.carSpeed !== 0 && this.carSteeringInput !== 0) {
            const actualSteeringRadians = this.carSteeringInput * this.carMaxSteeringAngleRad;
            // Simplified Ackerman steering approximation
            const turnRadius = this.carWheelBase / Math.sin(actualSteeringRadians);
            const angularVelocityOfCar = this.carSpeed / turnRadius;
            this.carModel.rotation.y += angularVelocityOfCar * deltaTime;
        }

        // Move car forward/backward
        const forwardVector = new THREE.Vector3(0, 0, 1).applyQuaternion(this.carModel.quaternion);
        const candidate = this.carModel.position.clone().add(forwardVector.clone().multiplyScalar(this.carSpeed * deltaTime));
        if (!this.collides(candidate)) {
            this.carModel.position.copy(candidate);
        } else {
            this.carSpeed = 0;
        }

        // Keep car on ground (simple approach)
        this.carModel.position.y = 0; // Assuming ground is at Y=0 for the car's base

        // Rotate wheels
        const wheelGeo = this.carWheels[0].geometry as THREE.CylinderGeometry; // Type assertion
        const wheelCircumference = 2 * Math.PI * wheelGeo.parameters.radiusTop;
        const wheelRotationDelta = (this.carSpeed * deltaTime) / wheelCircumference * (2 * Math.PI);

        this.carWheels.forEach((wheel, index) => {
            wheel.rotation.x += wheelRotationDelta; // Rolling rotation, ensure it's relative
            if (index < 2) { // Front wheels (0 and 1)
                 // Visual steering for front wheels
                 wheel.rotation.y = this.carSteeringInput * this.carMaxSteeringAngleRad;
            }
        });
    }

    private updateCameraOrbit(): void {
        if (!this.cameraTarget) return;

        const targetPos = this.cameraTarget.position;
        const effectiveOffset = (this.cameraTarget === this.carModel) ?
                                new THREE.Vector3(0, 1.0, 0) : // Car target offset
                                this.cameraTargetOffset;          // Character target offset

        const cameraX = targetPos.x - this.cameraOrbitRadius * Math.sin(this.cameraAzimuthAngle) * Math.cos(this.cameraElevationAngle);
        const cameraY = targetPos.y + this.cameraOrbitRadius * Math.sin(this.cameraElevationAngle) + effectiveOffset.y;
        const cameraZ = targetPos.z - this.cameraOrbitRadius * Math.cos(this.cameraAzimuthAngle) * Math.cos(this.cameraElevationAngle);

        this.camera.position.set(cameraX, cameraY, cameraZ);
        const lookAtPosition = new THREE.Vector3().copy(targetPos).add(effectiveOffset);
        this.camera.lookAt(lookAtPosition);
    }

    private onWindowResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    private wrapWorld(): void {
        const target = this.cameraTarget || this.character;
        const max = this.chunkSize / 2;
        let offsetX = 0;
        let offsetZ = 0;
        if (target.position.x > max) offsetX = -this.chunkSize;
        if (target.position.x < -max) offsetX = this.chunkSize;
        if (target.position.z > max) offsetZ = -this.chunkSize;
        if (target.position.z < -max) offsetZ = this.chunkSize;
        if (offsetX !== 0 || offsetZ !== 0) {
            this.character.position.x += offsetX;
            this.character.position.z += offsetZ;
            this.carModel.position.x += offsetX;
            this.carModel.position.z += offsetZ;
            this.scene.children.forEach(obj => {
                if (obj !== this.camera && obj !== this.character && obj !== this.carModel) {
                    obj.position.x += offsetX;
                    obj.position.z += offsetZ;
                }
            });
            this.buildingColliders.forEach(b => {
                b.min.x += offsetX; b.max.x += offsetX;
                b.min.z += offsetZ; b.max.z += offsetZ;
            });
        }
    }

    private animate(): void {
        requestAnimationFrame(this.animate.bind(this));
        const deltaTime = this.clock.getDelta();
        if (this.characterMixer) this.characterMixer.update(deltaTime);
        this.updateGameLogic(deltaTime);
        this.renderer.render(this.scene, this.camera);
    }
}
