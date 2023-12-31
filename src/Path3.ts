class Path3 extends THREE.CatmullRomCurve3 {
  getPoint(t: number) {
    const points = this.points;
    const l = points.length;

    const point = (l - 1) * t;
    let intPoint = Math.floor(point);
    let weight = point - intPoint;

    if (weight === 0 && intPoint === l - 1) {
      intPoint = l - 2;
      weight = 1;
    }
    const p1 = points[intPoint % l];
    const p2 = points[(intPoint + 1) % l];
    return p1.clone().lerp(p2, weight);
  }
}

export { Path3 };
