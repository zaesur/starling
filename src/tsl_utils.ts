import * as TSL from "three/tsl";

export const isWithinInfluence = TSL.Fn(
  ({
    self,
    other,
    influence,
  }: {
    self: TSLNode;
    other: TSLNode;
    influence: TSLNode;
  }) => {
    return self.distance(other).lessThan(influence);
  }
);

export const clampVector = TSL.Fn(
  ({ vector, max }: { vector: TSLNode; max: TSLNode }) => {
    return TSL.select(
      vector.length().lessThan(max),
      vector,
      vector.normalize().mul(max)
    );
  }
);

export const randomVec3 = TSL.Fn(({ seed }: { seed: TSLNode }) => {
  const randX = TSL.hash(seed.add(0));
  const randY = TSL.hash(seed.add(1));
  const randZ = TSL.hash(seed.add(2));

  return TSL.vec3(randX, randY, randZ);
});