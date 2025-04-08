import * as THREE from "three";
import { TSL, NodeMaterial } from "three/webgpu";
import { noise2d } from "./tsl_utils";

type PlaneOptions = {
  size?: number;
  resolution?: number;
  color?: THREE.Color;
  frequency?: number;
  amplitude?: number;
};

const createPlane = (options: PlaneOptions = {}): THREE.Mesh => {
  const {
    size = 5,
    resolution = 20,
    color = new THREE.Color(1, 0, 0),
    frequency = 10,
    amplitude = 0.5,
  } = options;
  const planeGeometry = new THREE.PlaneGeometry(
    size,
    size,
    resolution,
    resolution
  );
  const planeMaterial = new NodeMaterial();
  planeMaterial.wireframe = true;
  planeMaterial.colorNode = TSL.color(color);
  planeMaterial.positionNode = TSL.Fn(() => {
    const offset = 0.5;
    const input = TSL.vec2(TSL.uv().mul(frequency)).add(offset);

    // @ts-ignore
    const noise = noise2d(input).mul(amplitude);

    return TSL.positionLocal.add(TSL.vec3(0, 0, noise));
  })();

  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  return plane;
};

export default createPlane;
