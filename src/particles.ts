import * as THREE from "three";
import * as TSL from "three/tsl";
import { NodeMaterial } from "three/webgpu";
import {
  calculateRotationMatrix,
  clampVector,
  isWithinInfluence,
  offsetColor,
  randomVec3,
} from "./tsl_utils";

export async function createParticles(count: number) {
  /** GPU data */
  const uniforms = {
    maxBound: TSL.uniform(5),
    minSpeed: TSL.uniform(1),
    maxSpeed: TSL.uniform(3),
    turnStrength: TSL.uniform(0.1),
    separationInfluence: TSL.uniform(0),
    separationStrength: TSL.uniform(0),
    alignmentInfluence: TSL.uniform(0),
    alignmentStrength: TSL.uniform(0),
    cohesionInfluence: TSL.uniform(0),
    cohesionStrength: TSL.uniform(0),
    baseColor: TSL.uniform(new THREE.Color("grey")),
    ambientLightColor: TSL.uniform(new THREE.Color("white")),
    ambientLightIntensity: TSL.uniform(0.1),
    skyColor: TSL.uniform(new THREE.Color(0, 0.3, 0.6)),
    groundColor: TSL.uniform(new THREE.Color(0.6, 0.3, 0.1)),
    hemisphereLightIntensity: TSL.uniform(0.5),
  };

  const positions = TSL.instancedArray(count, "vec3");
  const velocities = TSL.instancedArray(count, "vec3");

  /** Material */
  const material = new NodeMaterial();
  const normal = TSL.varying(TSL.vec3(0));
  material.colorNode = uniforms.baseColor;
  material.vertexNode = TSL.Fn(() => {
    const position = positions.element(TSL.instanceIndex);
    const velocity = velocities.element(TSL.instanceIndex);

    const rotationMatrix = calculateRotationMatrix({
      direction: velocity.normalize(),
      forward: TSL.vec3(0, 1, 0),
    });
    const localPosition = rotationMatrix.mul(TSL.positionLocal);
    const worldPosition = TSL.modelWorldMatrix.mul(localPosition).add(position);

    const transformedNormal = rotationMatrix.mul(TSL.normalLocal);
    normal.assign(transformedNormal);

    return TSL.cameraProjectionMatrix
      .mul(TSL.cameraViewMatrix)
      .mul(worldPosition);
  })();
  material.fragmentNode = TSL.Fn(() => {
    const { baseColor } = uniforms;
    const normalizedNormal = normal.normalize().toVar();

    // Ambient
    const { ambientLightColor, ambientLightIntensity } = uniforms;
    const ambientLight = ambientLightColor.mul(ambientLightIntensity);

    // Hemisphere light
    const { skyColor, groundColor, hemisphereLightIntensity } = uniforms;
    const hemiMix = TSL.remap(normalizedNormal.y, -1, 1, 0, 1);
    const hemiLight = TSL.mix(groundColor, skyColor, hemiMix).mul(
      hemisphereLightIntensity,
    );

    const lighting = TSL.vec3(0).add(ambientLight).add(hemiLight);
    const variance = 0.2;
    const randomBaseColor = offsetColor([
      baseColor,
      TSL.hash(TSL.instanceIndex).remap(0, 1, -variance, variance),
    ]);
    const color = randomBaseColor.mul(lighting);
    const gamma = TSL.vec3(1.0 / 2.2);

    return TSL.vec4(color.pow(gamma), 1);
  })();
  material.depthWrite = true;
  material.depthTest = true;

  /** Mesh */
  const mesh = new THREE.Mesh(
    new THREE.ConeGeometry(0.1, 0.2, 10, 10),
    material,
  );
  mesh.count = count;

  /** Compute shaders */
  const init = TSL.Fn(() => {
    const position = positions.element(TSL.instanceIndex);
    const velocity = velocities.element(TSL.instanceIndex);

    const randomPosition = randomVec3({ seed: TSL.instanceIndex.add(0 * 3) })
      .sub(0.5)
      .mul(5);
    const randomVelocity = randomVec3({ seed: TSL.instanceIndex.add(1 * 3) })
      .sub(0.5)
      .mul(1);

    position.assign(randomPosition);
    velocity.assign(randomVelocity);
  })();

  const updateVelocity = TSL.Fn(() => {
    const {
      maxBound,
      minSpeed,
      maxSpeed,
      turnStrength,
      separationInfluence,
      separationStrength,
      alignmentInfluence,
      alignmentStrength,
      cohesionInfluence,
      cohesionStrength,
    } = uniforms;

    const position = positions.element(TSL.instanceIndex);
    const velocity = velocities.element(TSL.instanceIndex);

    const separationForce = TSL.vec3(0).toVar();
    const alignmentForce = TSL.vec3(0).toVar();
    const alignmentCount = TSL.float(0).toVar();
    const cohesionForce = TSL.vec3(0).toVar();
    const cohesionCount = TSL.float(0).toVar();

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
        const otherPosition = positions.element(i);
        const otherVelocity = velocities.element(i);

        const isUnderSeparationInfluence = isWithinInfluence({
          self: position,
          other: otherPosition,
          min: 0,
          max: separationInfluence,
        });

        // Move away from nearby particles
        const direction = position.sub(otherPosition);
        separationForce.addAssign(direction.mul(isUnderSeparationInfluence));

        const isUnderAlignmentInfluence = isWithinInfluence({
          self: position,
          other: otherPosition,
          min: separationInfluence,
          max: alignmentInfluence,
        });

        // Align with the group
        alignmentForce.addAssign(otherVelocity.mul(isUnderAlignmentInfluence));
        alignmentCount.addAssign(isUnderAlignmentInfluence);

        const isUnderCohesionInfluence = isWithinInfluence({
          self: position,
          other: otherPosition,
          min: separationInfluence,
          max: cohesionInfluence,
        });

        // Move towards the center of the group
        cohesionForce.addAssign(otherPosition.mul(isUnderCohesionInfluence));
        cohesionCount.addAssign(isUnderCohesionInfluence);
      },
    );

    // Bounds
    const isTooFar = position.abs().greaterThan(maxBound);
    const turnForce = position.sign().negate().mul(isTooFar);

    const totalForce = TSL.vec3(0, 0, 0)
      .add(turnForce.mul(turnStrength))
      .add(separationForce.mul(separationStrength))
      .add(alignmentForce.div(alignmentCount.max(1)).mul(alignmentStrength))
      .add(
        cohesionForce
          .div(cohesionCount.max(1))
          .sub(position.mul(cohesionCount.min(1)))
          .mul(cohesionStrength),
      );

    const totalVelocity = clampVector({
      vector: velocity.add(totalForce),
      min: minSpeed,
      max: maxSpeed,
    });

    velocity.assign(totalVelocity);
  })();

  const updatePosition = TSL.Fn(() => {
    const position = positions.element(TSL.instanceIndex);
    const velocity = velocities.element(TSL.instanceIndex);
    position.addAssign(velocity.mul(TSL.deltaTime));
  })();

  return { mesh, init, updateVelocity, updatePosition, uniforms };
}
