import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

document.querySelectorAll('[data-model]').forEach(button => button.addEventListener('click', async () => {
  button.disabled = true;
  let renderer;
  try {
    const container = button.nextElementSibling;
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0x050a11);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.85;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap;
    const { scene: model } = await new GLTFLoader().loadAsync(button.dataset.model);
    const scene = new THREE.Scene();
    model.traverse(object => { if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; } });
    scene.add(model, new THREE.HemisphereLight(0xd9efff, 0x17232d, 1.5));
    const light = new THREE.DirectionalLight(0xd0e5ff, 2.5);
    light.position.set(-7, 14, 8);
    light.castShadow = true;
    light.shadow.radius = 5;
    light.shadow.blurSamples = 12;
    light.shadow.normalBias = 0.025;
    light.shadow.mapSize.set(2048, 2048);
    Object.assign(light.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, far: 60 });
    scene.add(light);
    const fill = new THREE.DirectionalLight(0x68b6df, 1.5);
    fill.position.set(8, 5, -6);
    scene.add(fill);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshStandardMaterial({ color: 0x050a11, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.025;
    floor.receiveShadow = true;
    scene.add(floor);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const centre = box.getCenter(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z) * 0.85;
    const camera = new THREE.OrthographicCamera(-radius, radius, radius, -radius, 0.01, 500);
    camera.position.copy(centre).add(new THREE.Vector3(radius * 2, radius * 2, radius * 2));
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(centre);
    controls.update();
    container.append(renderer.domElement);
    const render = () => renderer.render(scene, camera);
    const resize = () => {
      const aspect = container.clientWidth / container.clientHeight;
      camera.left = -radius * Math.max(aspect, 1);
      camera.right = -camera.left;
      camera.top = radius / Math.min(aspect, 1);
      camera.bottom = -camera.top;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
      render();
    };
    new ResizeObserver(resize).observe(container);
    controls.addEventListener('change', render);
    resize();
    button.textContent = 'Drag to orbit · scroll to zoom';
  } catch {
    renderer?.dispose();
    button.textContent = '3D unavailable — poster remains available';
  }
}));
