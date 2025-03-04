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

  const isUnderInfluence = TSL.Fn(({ distance }: { distance: TSLNode }) => {
    const minAreaOfInfluence = 0.01;
    const maxAreaOfInfluence = 5;
    return distance.greaterThan(minAreaOfInfluence).and(distance.lessThan(maxAreaOfInfluence));
  });

  const clampVector = TSL.Fn(({ vector, max }: { vector: TSLNode, max: TSLNode }) => {
    return TSL.select(vector.length().lessThan(max), vector, vector.normalize().mul(max));
  });

  const update = TSL.Fn(() => {
    const positionStorage = positions.element(TSL.instanceIndex);
    const velocityStorage = velocities.element(TSL.instanceIndex);
    const position = positionStorage.toVar();
    const velocity = velocityStorage.toVar();

    const separation = TSL.vec3(0).toVar();
    const cohesion = TSL.vec3(0).toVar();
    const alignment = TSL.vec3(0).toVar();
    const nearbyCount = TSL.uint(0).toVar();

    TSL.Loop(
      {
        start: TSL.uint(0),
        end: TSL.uint(count),
        type: "uint",
        condition: "<",
      },
      ({ i }: { i: TSLNode }) => {
        const birdPosition = positionStorage.element(i);
        const birdVelocity = velocityStorage.element(i);
        const dirAwayFromBird = position.sub(birdPosition);
        const distToBird = dirAwayFromBird.length();

        TSL.If(isUnderInfluence({ distance: distToBird }), () => {
          nearbyCount.addAssign(1);
          separation.addAssign(dirAwayFromBird.div(distToBird));
          cohesion.addAssign(birdPosition);
          alignment.addAssign(birdVelocity);
        });
      }
    );

    const separationDirection = separation.mul(0.0001);
    const cohesionDirection = cohesion.div(nearbyCount).sub(position).mul(0.01);
    const alignmentDirection = alignment.div(nearbyCount).mul(0.01);
    const total = separationDirection.add(cohesionDirection).add(alignmentDirection);
    
    velocity.assign(clampVector({ vector: velocity.add(total), max: 2 }));

    // Finally, update the velocity and position attributes.
    velocityStorage.assign(velocity);
    positionStorage.addAssign(velocity.mul(TSL.deltaTime));
  });

  material.vertexNode = TSL.Fn(() => {
    const position = positions.element(TSL.instanceIndex);
    return TSL.cameraProjectionMatrix.mul(
      TSL.modelViewMatrix.mul(TSL.positionLocal.add(position))
    );
  })();
  material.colorNode = TSL.vec4(colors.element(TSL.instanceIndex), 1);

  material.depthWrite = true;
  material.depthTest = true;
  material.transparent = true;

  return { mesh, init, update };
}
