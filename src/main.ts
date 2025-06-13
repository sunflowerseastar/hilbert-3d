import { OrbitControls } from "./OrbitControls.js";

import { Path3 } from "./Path3";
import { genTurtle3dVectorPath } from "./utility";

enum Theme {
  Light = "light",
  Dark = "dark",
}

const THEMES = {
  [Theme.Light]: {
    tubing: 0x000000, // current black tube
    tubingGlow: 0x242424,
    background: 0xf4f4f4, // current light grey
    fog: 0xffffff, // current white fog
  },
  [Theme.Dark]: {
    tubing: 0xffffff, // white tube
    tubingGlow: 0x242424, // leave emissive as-is
    background: 0x000000, // black background
    fog: 0x000000, // black fog
  },
} as const;

/* --------------------------------------------------------------------------
 * URL parameters – allow optional  ?theme=<light|dark>&iterations=<1-4>
 * (alias “n” for iterations).  Defaults: theme=dark , iterations=3
 * -------------------------------------------------------------------------- */
const urlParams = new URLSearchParams(window.location.search);

const CURRENT_THEME: Theme =
  (urlParams.get("theme") ?? "").toLowerCase() === Theme.Light
    ? Theme.Light
    : Theme.Dark;

const iterationsParam = parseInt(
  urlParams.get("iterations") ?? urlParams.get("n") ?? "",
  10,
);
const NUM_ITERATIONS = !Number.isNaN(iterationsParam)
  ? Math.min(Math.max(iterationsParam, 1), 4)
  : 3;

const NO_ZOOM = (() => {
  const p = urlParams.get("noZoom"); // string | null
  // truthy when the param is present and NOT explicitly "false"
  return p !== null && p.toLowerCase() !== "false";
})();

const AUTO_ROTATE = (() => {
  const p = urlParams.get("autoRotate"); // string | null
  // default = true → rotate unless the param is explicitly "false"
  return p === null || p.toLowerCase() !== "false";
})();

export type Grammar = {
  variables: string;
  axiom: string;
  rules: {
    [key: string]: string;
  };
  actions: object;
};

function main() {
  /*
   * camera, scene, light, renderer
   */
  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    1,
    1000,
  );
  camera.position.set(76, 58, 90);

  const scene = new THREE.Scene();

  scene.background = new THREE.Color(THEMES[CURRENT_THEME].background);

  const ambientLight = new THREE.AmbientLight(0x000000);
  scene.add(ambientLight);

  const light1 = new THREE.PointLight(0xffffff, 1, 0);
  light1.position.set(0, 200, 0);
  scene.add(light1);

  const light2 = new THREE.PointLight(0xffffff, 1, 0);
  light2.position.set(100, 200, 100);
  scene.add(light2);

  const light3 = new THREE.PointLight(0xffffff, 1, 0);
  light3.position.set(-100, -200, -100);
  scene.add(light3);

  const fogColor = THEMES[CURRENT_THEME].fog;
  const near = 60;
  const far = 280;
  scene.fog = new THREE.Fog(fogColor, near, far);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  const container: HTMLDivElement = document.querySelector("#scene-container")!;
  container.append(renderer.domElement);

  /*
   * l-systems
   */
  // note that delta of 90 is assumed
  // const hilbert2dPath: Grammar = {
  //   variables: "LR",
  //   axiom: "L",
  //   rules: {
  //     L: "+RF-LFL-FR+",
  //     R: "-LF+RFR+FL-",
  //   },
  //   actions: {
  //     F: "forward",
  //     "+": "turn left",
  //     "-": "turn right",
  //   },
  // };
  const hilbert3dPath: Grammar = {
    variables: "X",
    axiom: "X",
    rules: { X: "^<XFF^<XFFX-FF^>>XFFX&FF+>>XFFX-FF>X->" },
    actions: {
      F: "forward",
      "+": "turn left",
      "-": "turn right",
      "&": "pitch down",
      "^": "pitch up",
      "<": "roll left",
      ">": "roll right",
    },
  };

  /*
   * high-level setup
   */
  const hilbertPath = genTurtle3dVectorPath(hilbert3dPath, NUM_ITERATIONS);
  const path = new Path3(hilbertPath);

  const base = 28 - NUM_ITERATIONS * 4;
  const pathSegments = Math.max(Math.pow(base, NUM_ITERATIONS), 1024);
  const tubeRadiusLookup = [2.4, 2.4, 2.4, 1.2, 0.92];
  const tubeRadius = tubeRadiusLookup[NUM_ITERATIONS];
  const radiusSegments = 32;
  const closed = false;

  var geometry = new THREE.TubeGeometry(
    path,
    pathSegments,
    tubeRadius,
    radiusSegments,
    closed,
  );

  const meshMaterial = new THREE.MeshPhongMaterial({
    color: THEMES[CURRENT_THEME].tubing,
    emissive: THEMES[CURRENT_THEME].tubingGlow,
    shininess: 100,
    side: THREE.DoubleSide,
    flatShading: false,
  });
  const mesh = new THREE.Mesh(geometry, meshMaterial);
  scene.add(mesh);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.3;
  controls.autoRotate = AUTO_ROTATE;
  controls.autoRotateSpeed = 0.2;
  controls.enableZoom = !NO_ZOOM;

  function render() {
    requestAnimationFrame(render);
    renderer.render(scene, camera);
    controls.update();
  }
  render();
}

main();
