import * as TSL from "three/tsl";

export const isWithinInfluence = TSL.Fn(
  ({
    self,
    other,
    min,
    max,
  }: {
    self: TSLNode;
    other: TSLNode;
    min: TSLNode;
    max: TSLNode;
  }) => {
    const distance = self.distance(other);
    return distance.greaterThan(min).and(distance.lessThan(max));
  }
);

export const clampVector = TSL.Fn(
  ({ vector, min, max }: { vector: TSLNode; min: TSLNode; max: TSLNode }) => {
    const length = vector.length().min(max).max(min);
    return vector.normalize().mul(length);
  }
);

export const randomVec3 = TSL.Fn(({ seed }: { seed: TSLNode }) => {
  const randX = TSL.hash(seed.add(0));
  const randY = TSL.hash(seed.add(1));
  const randZ = TSL.hash(seed.add(2));

  return TSL.vec3(randX, randY, randZ);
});

export const calculateRotationMatrix = TSL.Fn(
  ({ direction, forward }: { direction: TSLNode; forward: TSLNode }) => {
    const axis = direction.cross(forward).normalize();
    const angle = TSL.acos(direction.dot(forward));

    const s = TSL.sin(angle);
    const c = TSL.cos(angle);
    const t = c.oneMinus();

    // prettier-ignore
    const rotationMatrix = TSL.mat3(
      t.mul(axis.x).mul(axis.x).add(c),
      t.mul(axis.x).mul(axis.y).sub(axis.z.mul(s)),
      t.mul(axis.x).mul(axis.z).add(axis.y.mul(s)),

      t.mul(axis.y).mul(axis.x).add(axis.z.mul(s)),
      t.mul(axis.y).mul(axis.y).add(c),
      t.mul(axis.y).mul(axis.z).sub(axis.x.mul(s)),

      t.mul(axis.z).mul(axis.x).sub(axis.y.mul(s)),
      t.mul(axis.z).mul(axis.y).add(axis.x.mul(s)),
      t.mul(axis.z).mul(axis.z).add(c)
    );

    return rotationMatrix;
  }
);