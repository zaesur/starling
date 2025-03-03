import { MeshBasicNodeMaterial, WebGPURenderer } from "three/webgpu";
import * as THREE from "three";
import * as TSL from "three/tsl";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const renderer = new WebGPURenderer({
  canvas,
  antialias: true,
});

const scene = await createScene();
const camera = createCamera();
scene.add(camera);
start();

function render() {
  renderer.render(scene, camera);
  
  for (const child of scene.children) {
    if (child instanceof THREE.Mesh) {
      child.rotation.y += 0.01;
    }
  }
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

async function createScene() {
  const scene = new THREE.Scene();

  const particles = await createParticles(30);
  scene.add(particles);

  return scene;
}

async function createParticles(count: number) {
  const positions = TSL.instancedArray(count, "vec3");
  const colors = TSL.instancedArray(count, "vec3");

  const init = TSL.Fn(() => {
    const position = positions.element(TSL.instanceIndex);
    const randX = TSL.hash(TSL.instanceIndex).sub(0.5);
    const randY = TSL.hash(TSL.instanceIndex.add(1)).sub(0.5);
    const randZ = TSL.hash(TSL.instanceIndex.add(2)).sub(0.5);
    position.assign(TSL.vec3(randX, randY, randZ));

    const color = colors.element(TSL.instanceIndex.add(4));
    color.assign(TSL.vec3(randX, randY, randZ));
  });

  const computeInit = init().compute(count);
  await renderer.computeAsync(computeInit);

  const material = new MeshBasicNodeMaterial({ color: "blue" });

  material.vertexNode = TSL.Fn(() => {
    const instancePosition = positions.element(TSL.instanceIndex);
    const positionWorld = TSL.modelWorldMatrix.mul(TSL.positionLocal);
    const positionView = TSL.modelViewMatrix.mul(positionWorld).add(instancePosition);
    const positionClip = TSL.cameraProjectionMatrix.mul(positionView);

    return positionClip;
  })();

  material.colorNode = colors.toAttribute();

  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), material);

  mesh.count = count;

  return mesh;
}

function createCamera() {
  const camera = new THREE.PerspectiveCamera(
    75,
    canvas.width / canvas.height,
    0.1,
    100
  );
  camera.position.z = 5;

  return camera;
}
