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

export const offsetColor = TSL.Fn(([color, angle]: TSLNode[]) => {
  const c = TSL.cos(angle);
  const s = TSL.sin(angle);
  const weights = TSL.vec3(0.213, 0.715, 0.072); // Luminance weights

  const matrix = TSL.mat3(
    TSL.vec3(
      weights.x.mul(c.oneMinus()).add(c),
      weights.x.mul(c.oneMinus()).sub(weights.z.mul(s)),
      weights.x.mul(c.oneMinus()).add(weights.y.mul(s))
    ),
    TSL.vec3(
      weights.y.mul(c.oneMinus()).add(weights.z.mul(s)),
      weights.y.mul(c.oneMinus()).add(c),
      weights.y.mul(c.oneMinus()).sub(weights.x.mul(s))
    ),
    TSL.vec3(
      weights.z.mul(c.oneMinus()).sub(weights.y.mul(s)),
      weights.z.mul(c.oneMinus()).add(weights.x.mul(s)),
      weights.z.mul(c.oneMinus()).add(c)
    )
  );

  return matrix.mul(color);
});

export const noise1d = TSL.Fn(([input]: [ReturnType<typeof TSL.float>]) => {
  const floor = input.floor();
  const ceil = input.ceil();

  const n0 = TSL.hash(floor);
  const n1 = TSL.hash(ceil);

  const t = input.fract();

  return TSL.mix(n0, n1, t);
});

// Makes use of szudik pairs
const hash2d = (input: ReturnType<typeof TSL.vec2>) =>
  TSL.hash(
    TSL.select(
      input.x.greaterThanEqual(input.y),
      input.x.mul(input.x).add(input.x).add(input.y),
      input.x.add(input.y.mul(input.y))
    )
  );

export const noise2d = TSL.Fn(([input]: [ReturnType<typeof TSL.vec2>]) => {
  const floor = input.floor().toVar();
  const ceil = input.ceil().toVar();

  const n00 = hash2d(TSL.vec2(floor.x, floor.y));
  const n10 = hash2d(TSL.vec2(ceil.x, floor.y));
  const n01 = hash2d(TSL.vec2(floor.x, ceil.y));
  const n11 = hash2d(TSL.vec2(ceil.x, ceil.y));

  const t = input.fract();

  // Bilinear interpolation
  return TSL.mix(TSL.mix(n00, n10, t.x), TSL.mix(n01, n11, t.x), t.y);
});
