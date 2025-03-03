import { WebGPURenderer } from "three/webgpu";
import * as THREE from "three";
import * as TSL from "three/tsl";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const renderer = new WebGPURenderer({
  canvas,
  antialias: true,
});

const scene = createScene();
const camera = createCamera();
scene.add(camera);
start();

function render() {
  requestAnimationFrame(render);
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
  render();
}

function createScene() {
  const scene = new THREE.Scene();

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const cube = new THREE.Mesh(geometry, material);
  scene.add(cube);

  return scene;
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
