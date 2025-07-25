<template>
  <div class="current-page">
    <canvas
      id="draw"
      class="draw"
      style="border: 1px solid; background-color: #000"
    ></canvas>
  </div>
</template>

<script setup lang="ts">
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as THREE from "three";
import { onMounted, onUnmounted } from "vue";
import grassUrl from "@/assets/img/grass.jpg";
import skyUrl from "@/assets/img/sky.jpeg";

import { getThreeControls } from "./interactiveControls.ts";
import { getHoursData } from "./intehours.ts";
import { managerHome } from "./miniHomeManager.ts";

// Three.js相关对象
let {
  scene,
  camera,
  renderer,
  canvas,
  group,
  doorMeshes,
  doorGroups,
  marker,
  handleDoorClick,
} = getThreeControls();
let { houseSize, housePosition, housePositiontwo } = getHoursData();
let {
  createFloor,
  createWalls,
  createNoDoorWall,
  createDoorWall,
  createRoof,
  createDoor,
} = managerHome();
// 新增：射线投射器和指针变量
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
// 尺寸常量
const width = 1200;
const height = 800;

// 创建一个小木屋模型mui 的模型
function inithouse(
  sizeData: {
    baseWidth: number;
    baseLength: number;
    baseHeight: number;
    baseThickness: number;
    peakHeight: number;
    peakWidth: number;
    doorWidth: number;
    doorHeight: number;
    baseImg: any;
    tileUrl: any;
    doorImg: any;
  },
  positionData: { x: any; y: any; z: any }
) {
  createFloor(sizeData, positionData, group);
  createWalls(sizeData, positionData, group);
  createNoDoorWall(sizeData, positionData, group);
  createDoorWall(sizeData, positionData, group);
  createRoof(sizeData, positionData, group);
  createDoor(sizeData, positionData, group, {
    meshes: doorMeshes,
    groups: doorGroups,
  }); // 新增创建门
}

function initThree() {
  // 修复：使用全局canvas变量，不使用const重新声明
  canvas = document.querySelector("#draw") as HTMLCanvasElement;
  // 确保画布尺寸与样式匹配
  const resize = () => {
    if (!canvas) return; // 添加null检查

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    renderer?.setSize(width, height, false);
    // 修改后
    if (camera) {
      camera.aspect = width / height;
    }
    camera?.updateProjectionMatrix();
  };
  window.addEventListener("resize", resize);
  resize();
  // 创建场景
  scene = new THREE.Scene();

  // 创建相机
  camera = new THREE.PerspectiveCamera(125, width / height, 1, 2000);
  camera.position.set(50, 10, 50);

  // 添加环境光
  const hjLight = new THREE.AmbientLight(0xffffff);

  scene.add(hjLight);

  scene.add(marker);

  // 添加建筑组
  scene.add(group);

  // 创建渲染器
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setSize(width, height);

  // 添加轨道控制器
  const controls = new OrbitControls(camera, canvas);
  controls.addEventListener("change", () => {
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  });

  // 初始渲染
  renderer.render(scene, camera);
}
// 创建地面
function createGround() {
  if (!scene) return;

  const groundTexture = new THREE.TextureLoader().load(grassUrl);
  groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
  groundTexture.repeat.set(100, 100);

  const ground = new THREE.CircleGeometry(500, 100);
  const groundMaterial = new THREE.MeshLambertMaterial({
    side: THREE.DoubleSide,
    map: groundTexture,
  });

  const groundMesh = new THREE.Mesh(ground, groundMaterial);
  groundMesh.name = "ground";
  groundMesh.rotateX(-Math.PI / 2);
  scene.add(groundMesh);
}

function animate() {
  requestAnimationFrame(animate);
  if (!camera || !marker) return; // 添加null检查
  // 让物体始终在 camera 前方 5 单位
  marker.position.copy(camera.position);
  marker.position.add(
    new THREE.Vector3(0, 0, -15).applyQuaternion(camera.quaternion)
  );
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}
function createSkyBox() {
  const texture = new THREE.TextureLoader().load(skyUrl);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  // texture.repeat.set(1, 1);
  const skyBox = new THREE.SphereGeometry(500, 100, 100);
  const material = new THREE.MeshPhongMaterial({
    map: texture,
    side: THREE.BackSide,
  });
  const skyBoxMesh = new THREE.Mesh(skyBox, material);
  group.add(skyBoxMesh);
}

// 新增：设置事件监听器函数
function setupEventListeners() {
  if (!canvas) {
    console.error("Canvas not initialized!"); // 添加错误日志
    return;
  }

  // 移除旧监听器避免重复添加
  canvas.removeEventListener("pointermove", onPointerMove);
  canvas.removeEventListener("click", onClick);
  window.removeEventListener("keydown", handleKeyDown); // 键盘事件需绑定到window
  // 鼠标移动事件
  canvas.addEventListener("pointermove", onPointerMove);
  // 点击事件
  canvas.addEventListener("click", onClick, false);
  // 监听全局键盘事件
  window.addEventListener("keydown", handleKeyDown);
}

// 新增：鼠标移动事件处理
function onPointerMove(event: MouseEvent) {
  if (!canvas) return;

  // 将鼠标位置归一化为设备坐标 (-1 到 +1)
  pointer.x = (event.clientX / canvas.clientWidth) * 2 - 1;
  pointer.y = -(event.clientY / canvas.clientHeight) * 2 + 1;
}

// 新增：点击事件处理
function onClick(event: MouseEvent) {
  if (!scene || !camera || !canvas) return;

  // 精确计算鼠标位置
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  // 增强射线检测参数
  raycaster.params.Points.threshold = 0.1; // 提高点检测阈值
  raycaster.params.Line.threshold = 0.1; // 提高线检测阈值
  raycaster.setFromCamera(pointer, camera);

  // 检测所有可交互对象
  const intersects = raycaster.intersectObjects(scene.children, true);
  if (intersects.length > 0) {
    const clickedObject = intersects[0].object;
    // console.log("点击对象详情:", {
    //   name: clickedObject.name,
    //   position: clickedObject.position,
    //   distance: intersects[0].distance,
    //   point: intersects[0].point,
    // });

    // 改进的门检测逻辑
    if (clickedObject.name === "doorHitBox") {
      handleDoorClick(clickedObject as THREE.Object3D); // 添加类型断言
    }
  }
}
// 新增：键盘事件处理函数
function handleKeyDown(event: KeyboardEvent) {
  console.log("Key pressed:", event.key);
  // 示例：用WASD控制相机移动
  const moveSpeed = 5;
  if (!camera) return;
  console.log("相机的坐标:", camera.position);

  switch (event.key.toLowerCase()) {
    case "w":
      camera.position.z -= moveSpeed;
      break;
    case "s":
      camera.position.z += moveSpeed;
      break;
    case "a":
      camera.position.x -= moveSpeed;
      break;
    case "d":
      camera.position.x += moveSpeed;
      break;
    case " ":
      // 空格键重置相机位置
      camera.position.set(-30, 30, 50);
      break;
  }

  // 触发重新渲染
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

onMounted(() => {
  initThree();
  createGround();
  animate();
  setupEventListeners(); // 新增：设置事件监听器
  createSkyBox();
  inithouse(houseSize, housePosition);
  inithouse(houseSize, housePositiontwo);
});
// 组件卸载时移除事件监听器
onUnmounted(() => {
  if (canvas) {
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("click", onClick);
    window.removeEventListener("keydown", handleKeyDown); // 键盘事件需绑定到window
  }
});
</script>

<style scoped>
.current-page {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.draw {
  width: 100%;
  height: 100%;
}
</style>
