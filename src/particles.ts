import "./main.css";
import * as THREE from "three";
import * as TSL from "three/tsl";
import { NodeMaterial } from "three/webgpu";
import { clampVector, isWithinInfluence, randomVec3 } from "./tsl_utils";

export async function createParticles(count: number) {
  const uniforms = {
    separationInfluence: TSL.uniform(0.1),
    separationStrength: TSL.uniform(0.01),
    alignmentInfluence: TSL.uniform(1),
    alignmentStrength: TSL.uniform(0.001),
    cohesionInfluence: TSL.uniform(5),
    cohesionStrength: TSL.uniform(0.01),
  };

  const positions = TSL.instancedArray(count, "vec3");
  const velocities = TSL.instancedArray(count, "vec3");
  const colors = TSL.instancedArray(count, "vec3");

  const material = new NodeMaterial();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), material);

  mesh.count = count;

  const init = TSL.Fn(() => {
    const position = positions.element(TSL.instanceIndex);
    const velocity = velocities.element(TSL.instanceIndex);
    const color = colors.element(TSL.instanceIndex);

    const randomPosition = randomVec3({ seed: TSL.instanceIndex.add(0 * 3) })
      .sub(0.5)
      .mul(5);
    const randomVelocity = randomVec3({ seed: TSL.instanceIndex.add(1 * 3) })
      .sub(0.5)
      .mul(1);
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

    const separation = TSL.vec3(0).toVar();
    const cohesion = TSL.vec3(0).toVar();
    const cohesionCount = TSL.uint(0).toVar();
    const alignment = TSL.vec3(0).toVar();
    const alignmentCount = TSL.uint(0).toVar();

    const {
      separationInfluence,
      separationStrength,
      alignmentInfluence,
      alignmentStrength,
      cohesionInfluence,
      cohesionStrength,
    } = uniforms;

    TSL.Loop(
      {
        start: TSL.uint(0),
        end: TSL.uint(count),
        type: "uint",
        condition: "<",
      },
      ({ i }: { i: TSLNode }) => {
        TSL.If(i.equal(TSL.instanceIndex), () => {
          TSL.Continue();
        });

        const birdPosition = positionStorage.element(i);
        const birdVelocity = velocityStorage.element(i);
        const dirAwayFromBird = position.sub(birdPosition);
        const distToBird = dirAwayFromBird.length();

        const isWithinSeparationInfluence = isWithinInfluence({
          self: position,
          other: birdPosition,
          influence: separationInfluence,
        });

        TSL.If(isWithinSeparationInfluence, () => {
          separation.addAssign(dirAwayFromBird.div(distToBird));
        });

        const isWithinAlignmentInfluence = isWithinInfluence({
          self: position,
          other: birdPosition,
          influence: alignmentInfluence,
        });

        TSL.If(isWithinAlignmentInfluence, () => {
          alignmentCount.addAssign(1);
          alignment.addAssign(birdVelocity);
        });

        const isWithinCohesionInfluence = isWithinInfluence({
          self: position,
          other: birdPosition,
          influence: cohesionInfluence,
        });

        TSL.If(isWithinCohesionInfluence, () => {
          cohesionCount.addAssign(1);
          cohesion.addAssign(birdPosition);
        });
      }
    );

    const separationDirection = separation.mul(separationStrength);
    const cohesionDirection = cohesion
      .div(cohesionCount)
      .sub(position)
      .mul(cohesionStrength);
    const alignmentDirection = alignment
      .div(alignmentCount)
      .mul(alignmentStrength);
    const total = separationDirection
      .add(cohesionDirection)
      .add(alignmentDirection);

    velocity.addAssign(total).mul(TSL.deltaTime);

    // Finally, update the velocity and position attributes.
    velocityStorage.assign(clampVector({ vector: velocity, max: 2 }));
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

  return { mesh, init, update, uniforms };
}
