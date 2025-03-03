import { SpriteNodeMaterial, WebGPURenderer } from "three/webgpu";
import * as THREE from "three";
import * as TSL from "three/tsl";

const particleCount = 3000;
const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const renderer = new WebGPURenderer({
  canvas,
  antialias: true,
});

const { scene, update } = await createScene(particleCount);
const camera = createCamera();
scene.add(camera);
start();

function render() {
  // Update the buffer attributes
  renderer.computeAsync(update().compute(particleCount));

  // Render the scene
  renderer.render(scene, camera);
}

function start() {
  window.addEventListener("resize", () => {
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });
  window.dispatchEvent(new Event("resize"));
  renderer.setAnimationLoop(render);
}

async function createScene(particleCount: number) {
  const scene = new THREE.Scene();

  const { mesh: particles, update } = await createParticles(particleCount);
  scene.add(particles);

  return { scene, update };
}

async function createParticles(count: number) {
  const material = new SpriteNodeMaterial({ color: "blue" });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), material);

  mesh.count = count;

  const positions = TSL.instancedArray(count, "vec3");
  const velocities = TSL.instancedArray(count, "vec3");
  const colors = TSL.instancedArray(count, "vec3");

  const randomVec3 = TSL.Fn(({ seed }: { seed: TSLNode }) => {
    const randX = TSL.hash(seed.add(0));
    const randY = TSL.hash(seed.add(1));
    const randZ = TSL.hash(seed.add(2));

    return TSL.vec3(randX, randY, randZ);
  });

  const init = TSL.Fn(() => {
    const position = positions.element(TSL.instanceIndex);
    const velocity = velocities.element(TSL.instanceIndex);
    const color = colors.element(TSL.instanceIndex);

    const randomPosition = randomVec3({ seed: TSL.instanceIndex.add(0 * 3) })
      .sub(0.5)
      .mul(5);
    const randomVelocity = randomVec3({ seed: TSL.instanceIndex.add(1 * 3) })
      .sub(0.5)
      .mul(TSL.vec3(2, 2, 0)); // Neutralize the Z axis;
    const randomColor = randomVec3({ seed: TSL.instanceIndex.add(2 * 3) });

    position.assign(randomPosition);
    velocity.assign(randomVelocity);
    color.assign(randomColor);
  });

  const update = TSL.Fn(() => {
    const acceleration = TSL.vec3(0, 0, 0);
    const position = positions.element(TSL.instanceIndex);
    const velocity = velocities.element(TSL.instanceIndex);

    velocity.addAssign(acceleration.mul(0.01));
    position.addAssign(velocity.mul(0.001));
  });

  material.positionNode = positions.element(TSL.instanceIndex); // positions.toAttribute();
  material.colorNode = TSL.vec4(colors.element(TSL.instanceIndex), 1);

  material.depthWrite = true;
  material.depthTest = true;
  material.transparent = true;

  const computeInit = init().compute(count);
  await renderer.computeAsync(computeInit);

  return { mesh, update };
}

function createCamera() {
  const camera = new THREE.PerspectiveCamera(
    50,
    canvas.width / canvas.height,
    0.1,
    100
  );
  camera.position.z = 5;

  return camera;
}
