import { OrbitControls } from "./OrbitControls.js";

import { Path3 } from "./Path3";
import { genTurtle3dVectorPath } from "./utility";

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

  scene.background = new THREE.Color(0xf4f4f4);

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

  const color = 0xffffff;
  const near = 60;
  const far = 280;
  scene.fog = new THREE.Fog(color, near, far);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  const container: HTMLDivElement = document.querySelector("#scene-container")!;
  container.append(renderer.domElement);

  /*
   * use URL hash to set numIterations
   */
  const hashIterations = Math.min(
    Math.max(1, parseInt(document.location.hash.slice(1))),
    4,
  );
  const numIterations = !isNaN(hashIterations) ? hashIterations : 3;

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
  const hilbertPath = genTurtle3dVectorPath(hilbert3dPath, numIterations);
  const path = new Path3(hilbertPath);

  const base = 28 - numIterations * 4;
  const pathSegments = Math.max(Math.pow(base, numIterations), 1024);
  const tubeRadiusLookup = [2.4, 2.4, 2.4, 1.2, 0.92];
  const tubeRadius = tubeRadiusLookup[numIterations];
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
    color: 0x000000,
    emissive: 0x242424,
    shininess: 100,
    side: THREE.DoubleSide,
    flatShading: false,
  });
  const mesh = new THREE.Mesh(geometry, meshMaterial);
  scene.add(mesh);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.3;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.2;

  function render() {
    requestAnimationFrame(render);
    renderer.render(scene, camera);
    controls.update();
  }
  render();
}

main();
