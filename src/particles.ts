import "./main.css";
import * as THREE from "three";
import * as TSL from "three/tsl";
import { SpriteNodeMaterial } from "three/webgpu";

export async function createParticles(count: number) {
  const positions = TSL.instancedArray(count, "vec3");
  const velocities = TSL.instancedArray(count, "vec3");
  const colors = TSL.instancedArray(count, "vec3");

  const material = new SpriteNodeMaterial({ color: "blue" });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), material);

  mesh.count = count;

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

  return { mesh, init, update };
}
