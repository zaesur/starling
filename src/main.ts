import * as THREE from "three";
import { WebGPURenderer } from "three/webgpu";
import { createParticles } from "./particles";

const particleCount = 30;
const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const renderer = new WebGPURenderer({
  canvas,
  antialias: true,
});

const { scene, init, update } = await createScene(particleCount);
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

  renderer.computeAsync(init().compute(particleCount));
  renderer.setAnimationLoop(render);
}

async function createScene(particleCount: number) {
  const scene = new THREE.Scene();

  const { mesh: particles, ...rest } = await createParticles(particleCount);
  scene.add(particles);

  return { scene, ...rest };
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
