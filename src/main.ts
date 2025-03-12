import "./main.css";
import * as THREE from "three";
import { WebGPURenderer } from "three/webgpu";
import { createParticles } from "./particles";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GUI } from "lil-gui";

const particleCount = 3000;
const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const renderer = new WebGPURenderer({
  canvas,
  antialias: true,
});

const { scene, init, updatePosition, updateVelocity, uniforms } =
  await createScene(particleCount);
const camera = createCamera();
const controls = new OrbitControls(camera, renderer.domElement);
scene.add(camera);
start();

function render() {
  controls.update();

  // Update the buffer attributes
  renderer.computeAsync(updateVelocity.compute(particleCount));
  renderer.computeAsync(updatePosition.compute(particleCount));

  // Render the scene
  renderer.render(scene, camera);
}

function start() {
  setupGUI();
  window.addEventListener("resize", () => {
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });
  window.dispatchEvent(new Event("resize"));

  renderer.computeAsync(init.compute(particleCount));
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

function setupGUI() {
  const gui = new GUI();
  const reset = {
    reset: () => renderer.computeAsync(init.compute(particleCount)),
  };

  gui
    .add(uniforms.maxBound, "value")
    .name("Max Bound")
    .min(0)
    .max(10)
    .step(0.01);
  gui
    .add(uniforms.turnStrength, "value")
    .name("Turn Strength")
    .min(0)
    .max(0.01)
    .step(0.001);
  gui
    .add(uniforms.minSpeed, "value")
    .name("Min Speed")
    .min(1)
    .max(3)
    .step(0.01);
  gui
    .add(uniforms.maxSpeed, "value")
    .name("Max Speed")
    .min(3)
    .max(5)
    .step(0.01);
  gui.add(reset, "reset").name("Reset");

  const flocking = gui.addFolder("Flocking").close();
  flocking
    .add(uniforms.separationInfluence, "value")
    .name("Separation Influence")
    .min(0)
    .max(0.5)
    .step(0.001);
  flocking
    .add(uniforms.separationStrength, "value")
    .name("Separation Strength")
    .min(0)
    .max(2)
    .step(0.001);
  flocking
    .add(uniforms.alignmentInfluence, "value")
    .name("Alignment Influence")
    .min(0)
    .max(1)
    .step(0.001);
  flocking
    .add(uniforms.alignmentStrength, "value")
    .name("Alignment Strength")
    .min(0)
    .max(2)
    .step(0.001);
  flocking
    .add(uniforms.cohesionInfluence, "value")
    .name("Cohesion Influence")
    .min(0)
    .max(1)
    .step(0.001);
  flocking
    .add(uniforms.cohesionStrength, "value")
    .name("Cohesion Strength")
    .min(0)
    .max(2)
    .step(0.001);

  const lighting = gui.addFolder("Lighting").close();
  lighting.addColor(uniforms.baseColor, "value").name("Base Color");
  lighting.addColor(uniforms.ambientLightColor, "value").name("Ambient Light");
  lighting
    .add(uniforms.ambientLightIntensity, "value")
    .name("Ambient Intensity")
    .min(0)
    .max(1)
    .step(0.01);
  lighting.addColor(uniforms.skyColor, "value").name("Sky Color");
  lighting.addColor(uniforms.groundColor, "value").name("Ground Color");
  lighting
    .add(uniforms.hemisphereLightIntensity, "value")
    .name("Hemilight Intensity")
    .min(0)
    .max(1)
    .step(0.01);
}
