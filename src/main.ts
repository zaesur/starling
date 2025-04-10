import "./main.css";
import * as THREE from "three";
import { WebGPURenderer } from "three/webgpu";
import { createParticles } from "./particles";
import { GUI } from "lil-gui";
import createPlane from "./plane";

declare module "three/webgpu" {
  interface NodeMaterial {
    wireframe: boolean;
  }
}

const MAX_PARTICLES = 5000;
const pointer = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const renderer = new WebGPURenderer({
  canvas,
  antialias: true,
});

const { scene, init, updatePosition, updateVelocity, uniforms } =
  await createScene(MAX_PARTICLES);
const camera = createCamera();
// const controls = new OrbitControls(camera, renderer.domElement);
scene.add(camera);
start();

async function render() {
  // controls.update();

  raycaster.setFromCamera(pointer, camera);

  // Update the buffer attributes
  await renderer.computeAsync([
    updateVelocity.compute(MAX_PARTICLES),
    updatePosition.compute(MAX_PARTICLES),
  ]);

  uniforms.rayOrigin.value.copy(raycaster.ray.origin);
  uniforms.rayDirection.value.copy(raycaster.ray.direction);

  // Render the scene
  await renderer.renderAsync(scene, camera);

  // Move pointer away so we only affect birds when moving the mouse
  pointer.y = 10;
}

async function start() {
  setupGUI();

  window.addEventListener("resize", () => {
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  window.addEventListener("pointermove", (event) => {
    if (!event.isPrimary) return;

    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = 1 - (event.clientY / window.innerHeight) * 2;
  });


  window.dispatchEvent(new Event("resize"));

  await renderer.computeAsync(init.compute(MAX_PARTICLES));
  renderer.setAnimationLoop(render);

  // console.log( await renderer.debug.getShaderAsync( scene, camera, plane ) );
}

var particles: THREE.Mesh;
async function createScene(particleCount: number) {
  const scene = new THREE.Scene();

  const { mesh, ...rest } = await createParticles(particleCount);

  particles = mesh;
  scene.add(mesh);

  const plane = createPlane();
  plane.position.y = -2;
  plane.rotation.x = -Math.PI / 2;
  plane.rotation.z = Math.PI / 4;
  plane.rotation.x = -Math.PI / 2.2;
  scene.add(plane);

  scene.background = new THREE.Color("beige");

  return { scene, ...rest };
}

function createCamera() {
  const camera = new THREE.PerspectiveCamera(
    90,
    canvas.width / canvas.height,
    0.1,
    100,
  );
  camera.position.z = 6;

  return camera;
}

function setupGUI() {
  const gui = new GUI();
  const reset = {
    reset: () => renderer.computeAsync(init.compute(MAX_PARTICLES)),
  };

  gui.add(particles, "count").name("Particle Count").min(1).max(MAX_PARTICLES).step(1);

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
    .max(1)
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
