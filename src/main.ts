import * as THREE from "three";
import { WebGPURenderer } from "three/webgpu";
import { createParticles } from "./particles";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GUI } from "lil-gui";

const particleCount = 30;
const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const renderer = new WebGPURenderer({
  canvas,
  antialias: true,
});

const { scene, init, update, uniforms } = await createScene(particleCount);
const camera = createCamera();
const controls = new OrbitControls(camera, renderer.domElement);
scene.add(camera);
start();

function render() {
  controls.update();

  // Update the buffer attributes
  renderer.computeAsync(update().compute(particleCount));

  // Render the scene
  renderer.render(scene, camera);
}

function start() {
  const gui = new GUI();
  const reset = {
    reset: () => renderer.computeAsync(init().compute(particleCount)),
  };
  gui
    .add(uniforms.separationInfluence, "value")
    .name("Separation Influence")
    .min(0)
    .max(1)
    .step(0.01);
  gui
    .add(uniforms.alignmentInfluence, "value")
    .name("Alignment Influence")
    .min(0)
    .max(3)
    .step(0.01);
  gui
    .add(uniforms.cohesionInfluence, "value")
    .name("Cohesion Influence")
    .min(0)
    .max(5)
    .step(0.01);
  gui
    .add(uniforms.separationStrength, "value")
    .name("Separation Strength")
    .min(0)
    .max(1)
    .step(0.01);
  gui
    .add(uniforms.alignmentStrength, "value")
    .name("Alignment Strength")
    .min(0)
    .max(1)
    .step(0.01);
  gui
    .add(uniforms.cohesionStrength, "value")
    .name("Cohesion Strength")
    .min(0)
    .max(1)
    .step(0.01);
  gui.add(reset, "reset");

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
