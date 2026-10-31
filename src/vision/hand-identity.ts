export interface Point {
  x: number;
  y: number;
}

export interface KnownHand {
  id: string;
  wrist: Point;
}

/** The tracker has no stable hand ids, so each hand keeps the id of its nearest previous position. */
export function assignHandIds(
  wrists: Point[],
  previous: KnownHand[],
  createId: () => string,
): KnownHand[] {
  const unclaimed = [...previous];
  return wrists.map((wrist) => {
    let nearestIndex = -1;
    let nearestDistance = Number.POSITIVE_INFINITY;
    unclaimed.forEach((known, index) => {
      const distance = Math.hypot(known.wrist.x - wrist.x, known.wrist.y - wrist.y);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    const [match] = nearestIndex >= 0 ? unclaimed.splice(nearestIndex, 1) : [];
    return { id: match?.id ?? createId(), wrist };
  });
}
