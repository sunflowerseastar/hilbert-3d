import { OrbitControls } from "./OrbitControls.js";

import { Path3 } from "./Path3";
import { genTurtle3dVectorPath } from "./utility";

enum Theme {
  Light = "light",
  Dark = "dark",
}

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

// --- random starting orientation ------------------------------------------
const RANDOMIZE_START = (() => {
  const p = urlParams.get("randomizeStartPosition"); // string | null
  // truthy when the key is present and NOT explicitly "false"
  return p !== null && p.toLowerCase() !== "false";
})();

// --- extra lighting option for dramatic colorful lighting ----------------
const EXTRA_LIGHTING = (() => {
  const p = urlParams.get("extraLighting"); // string | null
  // truthy when the param is present and NOT explicitly "false"
  return p !== null && p.toLowerCase() !== "false";
})();

const THEMES = {
  [Theme.Light]: {
    tubing: 0x000000, // current black tube
    tubingGlow: 0x242424,
    background: 0xf4f4f4, // current light grey
    fog: 0xffffff, // current white fog
  },
  [Theme.Dark]: {
    tubing: EXTRA_LIGHTING ? 0x030303 : 0xe8e8e8, // black tube for extraLighting, softer off-white otherwise
    tubingGlow: EXTRA_LIGHTING ? 0x000000 : 0x1a1a1a, // no emissive for extraLighting, subtle glow otherwise
    background: 0x000000, // black background
    fog: 0x000000, // black fog
  },
} as const;

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
  // Adjust camera zoom based on iterations - smaller curves need closer view
  const cameraDistance =
    NUM_ITERATIONS >= 4
      ? { x: 76, y: 15, z: 140 }
      : NUM_ITERATIONS === 3
        ? { x: 76, y: 15, z: 95 }
        : NUM_ITERATIONS === 2
          ? { x: 68, y: 13, z: 85 }
          : { x: 60, y: 11, z: 0 };

  camera.position.set(cameraDistance.x, cameraDistance.y, cameraDistance.z);

  const scene = new THREE.Scene();

  scene.background = new THREE.Color(THEMES[CURRENT_THEME].background);

  const ambientLight = new THREE.AmbientLight(
    EXTRA_LIGHTING
      ? 0xffffff
      : CURRENT_THEME === Theme.Dark
        ? 0x202020
        : 0x000000,
    EXTRA_LIGHTING ? 0.2 : 1,
  );
  scene.add(ambientLight);

  const light1 = new THREE.PointLight(
    0xffffff,
    EXTRA_LIGHTING ? 1.5 : CURRENT_THEME === Theme.Dark ? 0.4 : 1,
    0,
  );
  light1.position.set(0, 200, 0);
  scene.add(light1);

  const light2 = new THREE.PointLight(
    0xffffff,
    EXTRA_LIGHTING ? 1.5 : CURRENT_THEME === Theme.Dark ? 0.6 : 1,
    0,
  );
  light2.position.set(100, 200, 100);
  scene.add(light2);

  const light3 = new THREE.PointLight(
    0xffffff,
    EXTRA_LIGHTING ? 1.5 : CURRENT_THEME === Theme.Dark ? 0.5 : 1,
    0,
  );
  light3.position.set(-100, -200, -100);
  scene.add(light3);

  // ─── extra pastel point-lights for dark-mode with extraLighting ──────────
  if (CURRENT_THEME === Theme.Dark && EXTRA_LIGHTING) {
    const palette = [
      0xff8c94, 0xfaedb9, 0xb9e5a1, 0x91cdf2, 0xa8e5dc, 0xd0d0ff, 0x8abeb7,
    ] as const;

    const positions = [
      [100, 100, 100],
      [-100, -100, 100],
      [-100, 100, -100],
      [100, -100, -100],
      [0, 200, 0],
      [200, 0, 0],
      [-200, 0, 0],
    ] as const;

    palette.forEach((col, i) => {
      const light = new THREE.PointLight(col, 0.6, 600); // a bit stronger
      light.position.set(...positions[i]);
      scene.add(light);
    });
  }

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

  if (RANDOMIZE_START) {
    mesh.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
    );
  }

  scene.add(mesh);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.3;
  controls.autoRotate = AUTO_ROTATE;
  controls.autoRotateSpeed = 0.2;
  controls.enableZoom = !NO_ZOOM;

  // ─── pause auto-rotate while the user is interacting ──────────────────────
  if (AUTO_ROTATE) {
    let resumeTimeout: number | null = null;

    const pause = () => {
      controls.autoRotate = false;
      if (resumeTimeout !== null) {
        clearTimeout(resumeTimeout);
        resumeTimeout = null;
      }
    };

    const scheduleResume = () => {
      if (resumeTimeout !== null) clearTimeout(resumeTimeout);
      resumeTimeout = window.setTimeout(() => {
        controls.autoRotate = true;
        resumeTimeout = null;
      }, 5000); // 5 s after last interaction
    };

    controls.addEventListener("start", pause); // user began drag / pinch
    controls.addEventListener("end", scheduleResume); // interaction ended
  }

  function render() {
    requestAnimationFrame(render);
    renderer.render(scene, camera);
    controls.update();
  }
  render();
}

main();
