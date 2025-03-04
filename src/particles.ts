import "./main.css";
import * as THREE from "three";
import * as TSL from "three/tsl";
import { NodeMaterial } from "three/webgpu";

export async function createParticles(count: number) {
  const positions = TSL.instancedArray(count, "vec3");
  const velocities = TSL.instancedArray(count, "vec3");
  const colors = TSL.instancedArray(count, "vec3");

  const material = new NodeMaterial();
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
      .mul(TSL.vec3(5, 5, 0));
    const randomVelocity = randomVec3({ seed: TSL.instanceIndex.add(1 * 3) })
      .sub(0.5)
      .mul(TSL.vec3(1, 1, 0)); // Neutralize the Z axis;
    const randomColor = randomVec3({ seed: TSL.instanceIndex.add(2 * 3) });

    position.assign(randomPosition);
    velocity.assign(randomVelocity);
    color.assign(randomColor);
  });

  const update = TSL.Fn(() => {
    const positionStorage = positions.element(TSL.instanceIndex);
    const velocityStorage = velocities.element(TSL.instanceIndex);
    const position = positionStorage.toVar();
    const velocity = velocityStorage.toVar();

    // Pull all particles towards the center of the screen.
    const directionToCenter = position.normalize();
    velocity.subAssign(directionToCenter.mul(TSL.deltaTime));

    TSL.Loop(
      {
        start: TSL.uint(0),
        end: TSL.uint(count),
        type: "uint",
        condition: "<",
      },
      ({ i }: { i: TSLNode }) => {
        const birdPosition = positionStorage.element(i);
        const dirToBird = birdPosition.sub(position);
        const distToBird = dirToBird.length();
        const distToBirdSq = dirToBird.lengthSq();

        const minimumDistance = TSL.float(0.0001);
        const maximumDistance = TSL.float(0.5);

        // Skip particles that are too close or too far away.
        TSL.If(
          distToBirdSq.lessThan(minimumDistance).or(distToBirdSq.greaterThan(maximumDistance)),
          () => TSL.Continue()
        );

        // Repel particles from each other.
        const percent = distToBirdSq.div(maximumDistance);
        const finalVelocity = dirToBird.normalize().mul(TSL.deltaTime).mul(percent);
        velocity.subAssign(finalVelocity);
      }
    );

    // Finally, update the velocity and position attributes.
    velocityStorage.assign(velocity);
    positionStorage.addAssign(velocity.mul(TSL.deltaTime));
  });

  material.vertexNode = TSL.Fn(() => {
    const position = positions.element(TSL.instanceIndex);
    return TSL.cameraProjectionMatrix.mul(
      TSL.modelViewMatrix.mul(TSL.positionLocal).add(position)
    );
  })();
  material.colorNode = TSL.vec4(colors.element(TSL.instanceIndex), 1);

  material.depthWrite = true;
  material.depthTest = true;
  material.transparent = true;

  return { mesh, init, update };
}
