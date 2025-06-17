import * as THREE from 'three';
import { WebGLPathTracer, BlurredEnvMapGenerator, GradientEquirectTexture } from 'three-gpu-pathtracer';
import { PhysicalPathTracingMaterial } from 'three-gpu-pathtracer/src/materials/pathtracing/PhysicalPathTracingMaterial.js';

export class RaytracingWorld {
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private pathTracer: WebGLPathTracer;
  private clock: THREE.Clock; // Added for deltaTime

    // City Layout Parameters
    private readonly blockSize: number = 20;
    private readonly streetWidth: number = 6;
    private readonly citySize: number = 12; // Number of blocks in one dimension
    private cityOffset: number = 0;


    // Materials
    private buildingMaterials: PhysicalPathTracingMaterial[] = []; // Changed type
    private streetMaterial!: THREE.MeshStandardMaterial;
    private lanternPoleMaterial!: THREE.MeshStandardMaterial;
    private lanternLightMaterial!: THREE.MeshStandardMaterial;

    // Textures and environment
    private textureLoader!: THREE.TextureLoader;
    private cubeTextureLoader!: THREE.CubeTextureLoader;
    private groundTexture!: THREE.Texture;
    private buildingTextures: THREE.Texture[] = [];
    private streetTexture!: THREE.Texture;
    private dayEnvironmentMap!: THREE.CubeTexture;
    private nightEnvironmentMap!: THREE.CubeTexture;

    private sunLight!: THREE.DirectionalLight;
    private moonLight!: THREE.DirectionalLight;
    private ambientLight!: THREE.AmbientLight;
    private dayDuration: number = 120; // seconds
    private nightDuration: number = 120; // seconds
    private dayTimer: number = 0;

    // Collision and world chunks
    private buildingColliders: THREE.Box3[] = [];
    private chunkSize!: number;

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
    this.clock = new THREE.Clock(); // Initialize clock

    // Initialize properties
    this.textureLoader = new THREE.TextureLoader();
    this.cubeTextureLoader = new THREE.CubeTextureLoader();
    this.cityOffset = (this.citySize * (this.blockSize + this.streetWidth) - this.streetWidth) / 2;
    this.chunkSize = this.citySize * (this.blockSize + this.streetWidth);

    // Copied methods from BasicWorld
    // Note: Some methods might need adjustments for path tracing context

    private collides(pos: THREE.Vector3): boolean {
        for (const box of this.buildingColliders) {
            if (box.containsPoint(pos)) return true;
        }
        return false;
    }

    private loadTextures(): void {
        this.textureLoader.setCrossOrigin('anonymous');
        this.cubeTextureLoader.setCrossOrigin('anonymous');

        const groundUrl = 'https://raw.githubusercontent.com/mrdoob/three.js/r177/examples/textures/terrain/grasslight-big.jpg';
        this.groundTexture = this.textureLoader.load(groundUrl);
        this.groundTexture.wrapS = this.groundTexture.wrapT = THREE.RepeatWrapping;
        this.groundTexture.repeat.set(100, 100);

        const buildingUrls = [
            'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1024',
            'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1024',
            'https://images.unsplash.com/photo-1542773668-6bbc214305aa?w=1024',
            'https://images.unsplash.com/photo-1580584123243-4c3fdab9c2b0?w=1024'
        ];
        this.buildingTextures = buildingUrls.map(url => {
            const tex = this.textureLoader.load(url);
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            return tex;
        });

        const streetUrl = 'https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?w=1024';
        this.streetTexture = this.textureLoader.load(streetUrl);
        this.streetTexture.wrapS = this.streetTexture.wrapT = THREE.RepeatWrapping;
        this.streetTexture.repeat.set(2, 2);

        this.dayEnvironmentMap = this.cubeTextureLoader.load([
            'https://threejs.org/examples/textures/cube/Bridge2/posx.jpg',
            'https://threejs.org/examples/textures/cube/Bridge2/negx.jpg',
            'https://threejs.org/examples/textures/cube/Bridge2/posy.jpg',
            'https://threejs.org/examples/textures/cube/Bridge2/negy.jpg',
            'https://threejs.org/examples/textures/cube/Bridge2/posz.jpg',
            'https://threejs.org/examples/textures/cube/Bridge2/negz.jpg'
        ]);
        this.nightEnvironmentMap = this.cubeTextureLoader.load([
            'https://threejs.org/examples/textures/cube/Park2/posx.jpg',
            'https://threejs.org/examples/textures/cube/Park2/negx.jpg',
            'https://threejs.org/examples/textures/cube/Park2/posy.jpg',
            'https://threejs.org/examples/textures/cube/Park2/negy.jpg',
            'https://threejs.org/examples/textures/cube/Park2/posz.jpg',
            'https://threejs.org/examples/textures/cube/Park2/negz.jpg'
        ]);
        // this.scene.environment = this.dayEnvironmentMap; // PathTracer handles its own environment
        // this.scene.background = this.dayEnvironmentMap; // PathTracer handles its own background
    }

    private initMaterials(): void {
        // Materials will use PhysicalPathTracingMaterial or adapt BasicWorld's MeshStandardMaterial
        // For now, let's try to use MeshStandardMaterial and see how it behaves with the path tracer.
        // The 'envMap' property might need to point to the path tracer's environment.

        this.buildingMaterials = this.buildingTextures.map(tex =>
            new PhysicalPathTracingMaterial({ // Changed from MeshStandardMaterial
                map: tex,
                // envMap property is removed as PhysicalPathTracingMaterial uses scene.environment
                roughness: 0.4, // Kept existing value
                metalness: 0.5  // Kept existing value
                // Consider adding other PhysicalPathTracingMaterial specific properties if needed
            })
        );
        this.streetMaterial = new THREE.MeshStandardMaterial({ map: this.streetTexture, roughness: 0.9, metalness: 0.2, side: THREE.DoubleSide });
        this.lanternPoleMaterial = new THREE.MeshStandardMaterial({ color: 0x454545, roughness: 0.5, metalness: 0.8 });
        this.lanternLightMaterial = new THREE.MeshStandardMaterial({ color: 0xffffee, emissive: new THREE.Color(0xffffaa), emissiveIntensity: 1 });
        // carBodyMaterial and wheelMaterial are omitted
    }

    private createStreetLight(x: number, y: number, z: number): void {
        const lanternGroup = new THREE.Group();
        const poleGeometry = new THREE.CylinderGeometry(0.15, 0.2, 5, 8);
        const pole = new THREE.Mesh(poleGeometry, this.lanternPoleMaterial);
        pole.position.y = 2.5;
        pole.castShadow = true; // Path tracer might not use traditional shadows
        lanternGroup.add(pole);

        const fixtureGeometry = new THREE.SphereGeometry(0.4, 16, 8);
        const fixture = new THREE.Mesh(fixtureGeometry, this.lanternLightMaterial);
        fixture.position.y = 5;
        lanternGroup.add(fixture);

        // PointLight might not be the primary light source in path tracing
        const pointLight = new THREE.PointLight(0xffddaa, 2, 20, 1.5);
        pointLight.position.y = 4.8;
        // pointLight.castShadow = false; // Not relevant for path tracer in the same way
        lanternGroup.add(pointLight);

        lanternGroup.position.set(x, y, z);
        this.scene.add(lanternGroup);
    }

    private addWindows(building: THREE.Mesh, width: number, height: number, depth: number): void {
        const windowMat = new PhysicalPathTracingMaterial({
            color: new THREE.Color(0xffffff), // Using new THREE.Color() for consistency
            metalness: 0.9,
            roughness: 0.05
            // transparent: true, // Future consideration
            // ior: 1.5,          // Future consideration
            // transmission: 1.0  // Future consideration
        });
        const windowGeo = new THREE.PlaneGeometry(1.2, 1.2);
        const floors = Math.floor(height / 3);
        const colsW = Math.floor(width / 3);
        const colsD = Math.floor(depth / 3);
        for (let y = 0; y < floors; y++) {
            const yPos = -height / 2 + 1.5 + y * 3;
            for (let x = 0; x < colsW; x++) {
                const xPos = -width / 2 + 1.5 + x * 3;
                const front = new THREE.Mesh(windowGeo, windowMat.clone()); // Clone for safety with path tracer
                front.position.set(xPos, yPos, depth / 2 + 0.01);
                building.add(front);
                const back = new THREE.Mesh(windowGeo, windowMat.clone());
                back.position.set(xPos, yPos, -depth / 2 - 0.01);
                back.rotation.y = Math.PI;
                building.add(back);
            }
            for (let z = 0; z < colsD; z++) {
                const zPos = -depth / 2 + 1.5 + z * 3;
                const right = new THREE.Mesh(windowGeo, windowMat.clone());
                right.position.set(width / 2 + 0.01, yPos, zPos);
                right.rotation.y = -Math.PI / 2;
                building.add(right);
                const left = new THREE.Mesh(windowGeo, windowMat.clone());
                left.position.set(-width / 2 - 0.01, yPos, zPos);
                left.rotation.y = Math.PI / 2;
                building.add(left);
            }
        }
    }

    private addNeonSign(building: THREE.Mesh, width: number, height: number, depth: number): void {
        if (Math.random() > 0.5) return;
        const signGeo = new THREE.PlaneGeometry(3, 1);
        const hue = Math.random() * 360;
        const color = new THREE.Color(`hsl(${hue},100%,60%)`);
        const signMat = new PhysicalPathTracingMaterial({
            color: color,             // The randomly generated HSL color
            emissive: color,          // Use the same color for emission
            emissiveIntensity: 5,     // Keep existing intensity
            roughness: 0.3,           // Keep existing roughness
            metalness: 0.8,           // Keep existing metalness
            side: THREE.DoubleSide    // Keep side property
        });
        const sign = new THREE.Mesh(signGeo, signMat);
        // Position it slightly away from the building face
        const faceIndex = Math.floor(Math.random() * 4); // 0: +Z, 1: -Z, 2: +X, 3: -X
        const offset = 0.05;
        switch(faceIndex) {
            case 0: sign.position.set(0, height * 0.3, depth / 2 + offset); break;
            case 1: sign.position.set(0, height * 0.3, -depth / 2 - offset); sign.rotation.y = Math.PI; break;
            case 2: sign.position.set(width / 2 + offset, height * 0.3, 0); sign.rotation.y = -Math.PI / 2; break;
            case 3: sign.position.set(-width / 2 - offset, height * 0.3, 0); sign.rotation.y = Math.PI / 2; break;
        }
        building.add(sign);
    }

    private createObjects(): void {
        // Ground plane from BasicWorld (large)
        const groundGeometry = new THREE.PlaneGeometry(600, 600);
        // Use PhysicalPathTracingMaterial for ground if possible, or adapt MeshStandardMaterial
        const groundMaterial = new THREE.MeshStandardMaterial({ map: this.groundTexture, side: THREE.DoubleSide });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.05; // Slightly below streets/RaytracingWorld's floor
        // ground.receiveShadow = true; // Path tracer handles this differently
        this.scene.add(ground);

        // Street and building generation
        for (let i = 0; i < this.citySize; i++) {
            for (let j = 0; j < this.citySize + 1; j++) {
                if (j < this.citySize) {
                    const streetHorzGeo = new THREE.PlaneGeometry(this.blockSize, this.streetWidth);
                    const streetHorz = new THREE.Mesh(streetHorzGeo, this.streetMaterial.clone());
                    streetHorz.rotation.x = -Math.PI / 2;
                    streetHorz.position.set(
                        i * (this.blockSize + this.streetWidth) - this.cityOffset + this.blockSize / 2,
                        0,
                        j * (this.blockSize + this.streetWidth) - this.cityOffset - this.streetWidth / 2
                    );
                    this.scene.add(streetHorz);
                    if (Math.random() < 0.8) this.createStreetLight(streetHorz.position.x - this.blockSize/2 + 1, 0, streetHorz.position.z - this.streetWidth/2 - 0.5);
                    if (Math.random() < 0.8) this.createStreetLight(streetHorz.position.x + this.blockSize/2 - 1, 0, streetHorz.position.z - this.streetWidth/2 - 0.5);
                }

                 if (i < this.citySize) {
                    const streetVertGeo = new THREE.PlaneGeometry(this.streetWidth, this.blockSize + (j === this.citySize ? this.streetWidth: 0) );
                    const streetVert = new THREE.Mesh(streetVertGeo, this.streetMaterial.clone());
                    streetVert.rotation.x = -Math.PI / 2;
                    streetVert.position.set(
                        j * (this.blockSize + this.streetWidth) - this.cityOffset - this.streetWidth/2,
                        0,
                        i * (this.blockSize + this.streetWidth) - this.cityOffset + this.blockSize / 2
                    );
                    this.scene.add(streetVert);
                    if(j < this.citySize && Math.random() < 0.8){
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
                    // Determine placement for the building/group first
                    const buildingPlotX = blockCenterX + (Math.random() - 0.5) * (this.blockSize * 0.3); // Place towards center of plot
                    const buildingPlotZ = blockCenterZ + (Math.random() - 0.5) * (this.blockSize * 0.3);

                    if (Math.random() < 0.4) { // 40% chance for a stacked building
                        const stackedBuildingGroup = new THREE.Group();
                        let currentStackHeight = 0;
                        const numSegments = Math.random() < 0.6 ? 2 : 3; // 2 or 3 segments
                        let maxSegmentWidth = 0;
                        let maxSegmentDepth = 0;
                        let baseWidth = (this.blockSize / 2.5 - buildingPadding) * (Math.random() * 0.2 + 0.8); // Base segment width
                        let baseDepth = (this.blockSize / 2.5 - buildingPadding) * (Math.random() * 0.2 + 0.8); // Base segment depth

                        for (let s = 0; s < numSegments; s++) {
                            let segmentWidth, segmentDepth, segmentHeight;

                            if (s === 0) { // Bottom segment
                                segmentWidth = baseWidth;
                                segmentDepth = baseDepth;
                                segmentHeight = Math.random() * 7 + 6; // Taller base
                            } else { // Upper segments - slightly smaller
                                segmentWidth = baseWidth * (Math.random() * 0.2 + 0.7); // 70-90% of segment below
                                segmentDepth = baseDepth * (Math.random() * 0.2 + 0.7);
                                segmentHeight = Math.random() * 6 + 4;
                                // Ensure upper segments are not wider/deeper than the one they are on
                                baseWidth = segmentWidth;
                                baseDepth = segmentDepth;
                            }

                            segmentWidth = Math.max(segmentWidth, 3); // Min width
                            segmentDepth = Math.max(segmentDepth, 3); // Min depth
                            maxSegmentWidth = Math.max(maxSegmentWidth, segmentWidth);
                            maxSegmentDepth = Math.max(maxSegmentDepth, segmentDepth);

                            const segmentGeo = new THREE.BoxGeometry(segmentWidth, segmentHeight, segmentDepth);
                            const baseSegMaterial = this.buildingMaterials[Math.floor(Math.random() * this.buildingMaterials.length)];
                            const segmentMaterialInstance = baseSegMaterial.clone();
                            segmentMaterialInstance.color.setHSL(Math.random(), 0.7, 0.5 + Math.random() * 0.2); // Vary lightness slightly

                            const segmentMesh = new THREE.Mesh(segmentGeo, segmentMaterialInstance);
                            segmentMesh.position.y = currentStackHeight + segmentHeight / 2;
                            // segmentMesh.castShadow = true; // Path tracer handles shadows
                            // segmentMesh.receiveShadow = true;

                            this.addWindows(segmentMesh, segmentWidth, segmentHeight, segmentDepth);
                            if (segmentWidth > 4 && segmentHeight > 4) { // Only add neon to larger segments
                                this.addNeonSign(segmentMesh, segmentWidth, segmentHeight, segmentDepth);
                            }

                            stackedBuildingGroup.add(segmentMesh);
                            currentStackHeight += segmentHeight;
                        }

                        stackedBuildingGroup.position.set(buildingPlotX, 0, buildingPlotZ);
                        this.scene.add(stackedBuildingGroup);

                        const collider = new THREE.Box3().set(
                            new THREE.Vector3(buildingPlotX - maxSegmentWidth / 2, 0, buildingPlotZ - maxSegmentDepth / 2),
                            new THREE.Vector3(buildingPlotX + maxSegmentWidth / 2, currentStackHeight, buildingPlotZ + maxSegmentDepth / 2)
                        );
                        this.buildingColliders.push(collider);

                    } else { // Single block building (existing logic)
                        const height = Math.random() * 15 + 8;
                        const width = Math.random() * (this.blockSize / 2.5 - buildingPadding) + 5;
                        const depth = Math.random() * (this.blockSize / 2.5 - buildingPadding) + 5;
                        const buildingGeo = new THREE.BoxGeometry(width, height, depth);

                        const baseMaterial = this.buildingMaterials[Math.floor(Math.random() * this.buildingMaterials.length)];
                        const buildingMaterialInstance = baseMaterial.clone();
                        buildingMaterialInstance.color.setHSL(Math.random(), 0.7, 0.6);

                        const building = new THREE.Mesh(buildingGeo, buildingMaterialInstance);
                        // Position the single building within the plot area
                        building.position.set(buildingPlotX, height / 2, buildingPlotZ);
                        // building.castShadow = true;
                        // building.receiveShadow = true;
                        this.addWindows(building, width, height, depth);
                        this.addNeonSign(building, width, height, depth);

                        const collider = new THREE.Box3().set(
                            new THREE.Vector3(buildingPlotX - width/2, 0, buildingPlotZ - depth/2),
                            new THREE.Vector3(buildingPlotX + width/2, height, buildingPlotZ + depth/2)
                        );
                        this.buildingColliders.push(collider);
                        this.scene.add(building);
                    }
                }
            }
        }
        // Remove reflective spheres for now, they might be too much for initial path tracing
    }

    private updateDayNight(deltaTime: number): void {
        this.dayTimer = (this.dayTimer + deltaTime) % (this.dayDuration + this.nightDuration);
        const isDay = this.dayTimer < this.dayDuration;

        // The path tracer uses its own environment map, typically set once.
        // Direct manipulation of scene.environment here might conflict.
        // For now, we will NOT update scene.environment or scene.background from this function.
        // We will manage sun/moon light intensities if they are used.

        if (isDay) {
            // this.scene.environment = this.dayEnvironmentMap; // DO NOT DO THIS with path tracer's own env map
            // this.scene.background = this.dayEnvironmentMap; // DO NOT DO THIS
            if (this.sunLight) this.sunLight.intensity = 1.0;
            if (this.moonLight) this.moonLight.intensity = 0.0;
            if (this.ambientLight) this.ambientLight.intensity = 0.8; // Ambient light might not be very effective
        } else {
            // this.scene.environment = this.nightEnvironmentMap; // DO NOT DO THIS
            // this.scene.background = this.nightEnvironmentMap; // DO NOT DO THIS
            if (this.sunLight) this.sunLight.intensity = 0.0;
            if (this.moonLight) this.moonLight.intensity = 0.6;
            if (this.ambientLight) this.ambientLight.intensity = 0.3;
        }
        // Materials using envMap might need to be updated if we were switching envMaps.
        // However, PhysicalPathTracingMaterial handles environment internally.
        // If using MeshStandardMaterial, their envMap would need manual update if scene.environment changed.
    }

    this.initScene();
    this.onResize();
    window.addEventListener('resize', () => this.onResize());
    requestAnimationFrame(() => this.animate());
  }

  private initScene() {
    // Setup from BasicWorld
    this.scene.background = new THREE.Color(0x001029); // From BasicWorld init
    this.scene.fog = new THREE.Fog(this.scene.background as THREE.Color, 50, 200); // From BasicWorld init

    this.loadTextures();
    this.initMaterials(); // Initializes this.buildingMaterials etc. with MeshStandardMaterial

    // Lights from BasicWorld - their effect in path tracer needs to be evaluated
    this.ambientLight = new THREE.AmbientLight(0x404060, 0.8);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xfff1c1, 1.0);
    this.sunLight.position.set(30, 60, 20);
    // this.sunLight.castShadow = true; // Path tracer handles shadows differently
    this.scene.add(this.sunLight);

    this.moonLight = new THREE.DirectionalLight(0xa0a0c0, 0.6);
    this.moonLight.position.set(-30, 50, -20);
    // this.moonLight.castShadow = true; // Path tracer handles shadows differently
    this.scene.add(this.moonLight);

    this.updateDayNight(0); // Set initial day/night state (mainly for light intensities)

    this.createObjects(); // Creates city geometry using MeshStandardMaterial

    // Original RaytracingWorld scene objects (sphere and small floor) - REMOVED
    // These used PhysicalPathTracingMaterial. We might want to convert city objects later.
    // For now, let's keep them to ensure the path tracer still has something it understands well.
    // const floorGeo = new THREE.BoxGeometry(10, 0.1, 10);
    // const floorMat = new PhysicalPathTracingMaterial(); // Original PT material
    // floorMat.color.set(0x808080);
    // const floor = new THREE.Mesh(floorGeo, floorMat);
    // floor.position.y = -0.05; // Same level as city ground plane
    // this.scene.add(floor);

    // const sphereGeo = new THREE.SphereGeometry(1, 64, 32);
    // const sphereMat = new PhysicalPathTracingMaterial(); // Original PT material
    // sphereMat.metalness = 1.0;
    // sphereMat.roughness = 0.2;
    // sphereMat.color.set(0x999999);
    // const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    // sphere.position.set(0, 1, 0); // Adjust position if it clashes with city
    // this.scene.add(sphere);

    // Environment map for path tracing lighting (takes precedence over day/night env maps for scene.environment)
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
    const deltaTime = this.clock.getDelta();
    this.updateDayNight(deltaTime); // Update light intensities based on day/night cycle
    this.pathTracer.renderSample();
  }
}
