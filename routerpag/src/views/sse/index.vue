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
import * as THREE from "three";
import Stats from "three/addons/libs/stats.module.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { onMounted, onUnmounted } from "vue";
// import { getThreeControls } from "../three/interactiveControls.ts";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { getHoursData } from "./intehours.ts";
import { managerHome } from "./miniHomeManager.ts";

// let { handleDoorClick } = getThreeControls();
// Three.js 核心对象
let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;
let camera: THREE.PerspectiveCamera;
let stats: Stats;
let model: THREE.Group;
let mixer: THREE.AnimationMixer;
let clock: THREE.Clock;
let houseGroups: THREE.Group[] = []; // 存储所有房屋组
let forestHouse: THREE.Group | null = null; // 新增：森林小屋模型引用

let canvas: HTMLCanvasElement; // 添加到文件顶部的变量声明区域
// 动作控制
let currentBaseAction: keyof typeof baseActions = "idle";
const baseActions = {
  idle: { weight: 1, action: null as THREE.AnimationAction | null },
  walk: { weight: 0, action: null as THREE.AnimationAction | null },
  run: { weight: 0, action: null as THREE.AnimationAction | null },
};
interface DoorRef {
  meshes: THREE.Mesh<THREE.BoxGeometry, THREE.MeshPhongMaterial>[];
  groups: THREE.Group[];
}
let doorRef: DoorRef = {
  meshes: [],
  groups: [],
};

// 键盘状态
let keyStates = {
  W: false,
  S: false,
  A: false,
  D: false,
  shift: false,
};

// 运动参数
const v = new THREE.Vector3();
console.log("运动参数", v);
const a = 300; // 加速度
const maxSpeed = 50000; // 最大速度

let { houseSize, housePosition, housePositiontwo } = getHoursData();
let { createWalls, createNoDoorWall, createDoorWall, createRoof, createDoor } =
  managerHome();

// 射线投射器
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// 门的开关状态
const doorStates = new Map<THREE.Mesh, boolean>();

function initThree() {
  canvas = document.getElementById("draw") as HTMLCanvasElement;
  if (!canvas) {
    console.error("Canvas元素未找到!");
    return;
  }

  // 初始化场景
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa0a0a0);
  scene.fog = new THREE.Fog(0xa0a0a0, 10, 50);

  // 设置光源
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 3);
  hemiLight.position.set(0, 20, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 3);
  dirLight.position.set(3, 10, 10);
  dirLight.castShadow = true;
  scene.add(dirLight);

  // 添加地面网格
  const grid = new THREE.GridHelper(5000, 5000, 0x000000, 0x000000);
  (grid.material as THREE.Material).opacity = 0.2;
  (grid.material as THREE.Material).transparent = true;
  scene.add(grid);

  // 初始化相机
  camera = new THREE.PerspectiveCamera(
    65,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 1.6, -2.5);

  // 初始化渲染器
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;

  // 添加性能监视器
  stats = new Stats();
  document.body.appendChild(stats.dom);

  // 创建小屋
  initHouse(houseSize, housePosition, "house1");
  initHouse(houseSize, housePositiontwo, "house2");

  // 加载模型
  loadModel();
  loadForestHouse(); // 新增：加载森林小屋
}

// 修改后的initHouse函数，添加name参数
function initHouse(
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
  positionData: { x: any; y: any; z: any },
  name: string // 添加name参数
) {
  const houseGroup = new THREE.Group();
  houseGroup.name = name; // 设置组名称

  createWalls(sizeData, positionData, houseGroup);
  createNoDoorWall(sizeData, positionData, houseGroup);
  createDoorWall(sizeData, positionData, houseGroup);
  createRoof(sizeData, positionData, houseGroup);
  const doorResult = createDoor(sizeData, positionData, houseGroup, {
    meshes: doorRef.meshes,
    groups: doorRef.groups,
  });
  // 为门添加交互标识
  if (doorResult) {
    doorResult.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.userData.isDoor = true;
        doorStates.set(child, false); // 初始状态为关闭
        console.log(`门 ${child.name} 的初始状态:`, doorStates.get(child));
      }
    });
  }

  scene.add(houseGroup);
  houseGroups.push(houseGroup); // 添加到房屋组数组

  // console.log('所有房屋组',houseGroups);
}

function loadModel() {
  const loader = new GLTFLoader();
  loader.load(
    "/resources/base/Xbot.glb",
    (gltf) => {
      model = gltf.scene;

      const cameraGroup = new THREE.Group();
      cameraGroup.name = "cameraGroup";
      cameraGroup.add(camera);
      model.add(cameraGroup);
      model.scale.set(2, 3, 2); // 调整模型大小
      camera.position.z = -3;
      camera.lookAt(0, 3.8, 0);

      scene.add(model);

      model.traverse((obj) => {
        // 设置皮肤颜色
        if (obj instanceof THREE.Mesh) obj.castShadow = true;
      });

      initAnimations(gltf.animations);
      addDebugCube();
      animate();
    },
    undefined,
    (error) => {
      console.error("模型加载失败:", error);
    }
  );
}

function loadForestHouse() {
  const loader = new GLTFLoader();

  // 设置DRACO解码器 (用于压缩模型)
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(
    "https://www.gstatic.com/draco/versioned/decoders/1.5.6/"
  );
  loader.setDRACOLoader(dracoLoader);

  loader.load(
    "/resources/base/forest_house.glb",
    (gltf) => {
      forestHouse = gltf.scene;

      // 调整模型位置和大小
      forestHouse.position.set(80, -2.5, 10); // 设置初始位置
      forestHouse.scale.set(10, 10, 10); // 调整模型大小
      forestHouse.rotation.y = Math.PI / 2; // 调整模型朝向

      // 遍历模型设置阴影
      forestHouse.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      scene.add(forestHouse);
      console.log("森林小屋模型加载成功");
    },
    (xhr) => {
      console.log(
        `森林小屋加载进度: ${((xhr.loaded / xhr.total) * 100).toFixed(2)}%`
      );
    },
    (error) => {
      console.error("加载森林小屋模型失败:", error);
      console.log("尝试加载的URL:", "/resources/base/forest_house.glb");
    }
  );
}
// 优化后的碰撞检测函数
function checkCollision(object: THREE.Group, group: THREE.Group): boolean {
  const playerBox = new THREE.Box3().setFromObject(object);

  // // 仅检查墙壁和门碰撞体
  // return group.children.some((child) => {
  //   // console.log("checkCollision:", child.name);
  //   // 检测所有碰撞体（包括墙体碰撞体和门框碰撞体）console.log("checkCollision:", child.name)
  //   if (child.name.includes("Wall") || child.name === "Collider") {
  //     child.updateMatrixWorld();
  //     const objectBox = new THREE.Box3().setFromObject(child);
  //     if (playerBox.intersectsBox(objectBox)) {
  //       console.log("碰撞发生在:", child.name, "位置:", child.position);
  //       return true;
  //     }
  //   }
  //   return false;
  // });

  // 检测与房屋的碰撞
  const houseCollision = group.children.some((child) => {
    if (child.name.includes("Wall") || child.name === "Collider") {
      child.updateMatrixWorld();
      const objectBox = new THREE.Box3().setFromObject(child);
      if (playerBox.intersectsBox(objectBox)) {
        console.log("碰撞发生在:", child.name, "位置:", child.position);
        return true;
      }
    }
    return false;
  });

  // 检测与森林小屋的碰撞
  if (forestHouse) {
    const forestHouseCollision = forestHouse.children.some((child) => {
      if (child.name.includes("house") || child.name === "Collider") {
        child.updateMatrixWorld();
        const objectBox = new THREE.Box3().setFromObject(child);
        if (playerBox.intersectsBox(objectBox)) {
          console.log("碰撞发生在森林小屋:", child.name);
          return true;
        }
      }
      return false;
    });

    return houseCollision || forestHouseCollision;
  }

  return houseCollision;
}

function checkCollisionDoor(doorGroup: THREE.Group): boolean {
  const hitBox = doorGroup.getObjectByName("doorHitBox") as THREE.Mesh;
  if (!hitBox) return false;
  // 更新碰撞体的世界矩阵
  hitBox.updateMatrixWorld();

  const hitBoxBounds = new THREE.Box3().setFromObject(hitBox);

  // 检测与所有碰撞体的碰撞
  return scene.children.some((obj) => {
    if (
      !obj.userData.isCollidable ||
      obj === doorGroup ||
      doorGroup.children.includes(obj)
    ) {
      return false;
    }

    obj.updateMatrixWorld();
    const objBounds = new THREE.Box3().setFromObject(obj);
    return hitBoxBounds.intersectsBox(objBounds);
  });
}
function initAnimations(animations: THREE.AnimationClip[]) {
  clock = new THREE.Clock();
  mixer = new THREE.AnimationMixer(model);

  animations.forEach((clip) => {
    const name = clip.name as keyof typeof baseActions; // 添加类型断言
    // console.log("模型包含动画:", baseActions, "个动画剪辑");
    if (baseActions[name]) {
      const action = mixer.clipAction(clip);
      baseActions[name].action = action;
      action.play();
    }
  });

  if (baseActions.idle.action) {
    setWeight(baseActions.idle.action, 1);
  }
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);
  handleMovement(delta);
  renderer.render(scene, camera);
  stats.update();
}

// 优化后的移动处理函数
function handleMovement(delta: number) {
  if (!model) return;

  const previousPosition = model.position.clone();
  v.set(0, 0, 0);

  if (keyStates.W) {
    const front = new THREE.Vector3();
    model.getWorldDirection(front);
    // console.log("判断运动状态", currentBaseAction);
    if (keyStates.shift) {
      prepareCrossFade(currentBaseAction, "run", 0.2);
      v.add(front.multiplyScalar(5 * a * delta));
    } else {
      prepareCrossFade(currentBaseAction, "walk", 0.2);
      v.add(front.multiplyScalar(a * delta));
    }
  } else if (keyStates.S) {
    // console.log("判断运动状态", currentBaseAction);
    const back = new THREE.Vector3();
    model.getWorldDirection(back);
    prepareCrossFade(currentBaseAction, "walk", 0.2);
    v.add(back.multiplyScalar(-a * delta));
  }

  if (keyStates.A) {
    // console.log("判断运动状态", currentBaseAction);
    const left = new THREE.Vector3();
    model.getWorldDirection(left);
    left.crossVectors(new THREE.Vector3(0, 1, 0), left);
    prepareCrossFade(currentBaseAction, "walk", 0.2);
    v.add(left.multiplyScalar(a * delta));
  }

  if (keyStates.D) {
    // console.log("判断运动状态", currentBaseAction);
    const right = new THREE.Vector3();
    model.getWorldDirection(right);
    right.crossVectors(new THREE.Vector3(0, 1, 0), right).multiplyScalar(-1);
    prepareCrossFade(currentBaseAction, "walk", 0.2);
    v.add(right.multiplyScalar(a * delta));
  }

  if (!keyStates.W && !keyStates.S && !keyStates.A && !keyStates.D) {
    prepareCrossFade(currentBaseAction, "idle", 0.2);
  }

  if (v.length() > maxSpeed) {
    v.normalize().multiplyScalar(maxSpeed);
  }

  v.multiplyScalar(0.98);
  model.position.add(v.clone().multiplyScalar(delta));

  // 使用已存储的houseGroups数组进行碰撞检测
  const collided = houseGroups.some((group) => {
    return checkCollision(model, group);
  });

  if (collided) {
    model.position.copy(previousPosition);
  }
}

function prepareCrossFade(
  currentActionName: keyof typeof baseActions,
  targetActionName: keyof typeof baseActions,
  duration: number
) {
  if (currentActionName === targetActionName) return;

  const currentAction = baseActions[currentActionName]?.action;
  const targetAction = baseActions[targetActionName]?.action;

  if (!targetAction) return;

  if (currentAction) {
    currentAction.fadeOut(duration);
  }
  targetAction.fadeIn(duration);
  targetAction.play();

  currentBaseAction = targetActionName;
}

function setWeight(action: THREE.AnimationAction, weight: number) {
  action.enabled = true;
  action.setEffectiveTimeScale(1);
  action.setEffectiveWeight(weight);
}

function addDebugCube() {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const cube = new THREE.Mesh(geometry, material);
  cube.position.set(0, 0.5, 0);
  scene.add(cube);

  setTimeout(() => {
    scene.remove(cube);
  }, 1000);
}

function setupEventListeners() {
  window.addEventListener("keydown", (e) => {
    const key = e.key.toUpperCase();
    if (key in keyStates) {
      keyStates[key as keyof typeof keyStates] = true;

      if (e.key == "shift") {
        keyStates.shift = true;
      }
    }
    if (e.key === "v") {
      const cameraGroup = model?.getObjectByName("cameraGroup") as THREE.Group;
      if (cameraGroup) {
        camera.position.z = camera.position.z === -2.5 ? 0.8 : -2.5;
      }
    }
  });

  window.addEventListener("keyup", (e) => {
    const key = e.key.toUpperCase();
    if (key in keyStates) {
      keyStates[key as keyof typeof keyStates] = false;
      if (e.key === "shift") {
        keyStates.shift = false;
      }
    }
  });

  document.addEventListener("mousedown", (e) => {
    if (!scene || !camera || !canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (keyStates.W || keyStates.A || keyStates.S || keyStates.D) {
      document.body.requestPointerLock();
    } else {
      if (e.button === 0) {
        // 鼠标左键
        // 计算鼠标在标准化设备坐标中的位置
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        // 通过鼠标位置更新射线
        // 增强射线检测参数
        raycaster.params.Points.threshold = 0.1; // 提高点检测阈值
        raycaster.params.Line.threshold = 0.1; // 提高线检测阈值
        raycaster.setFromCamera(mouse, camera);

        // 计算射线与场景中物体的交点
        const intersects = raycaster.intersectObjects(scene.children, true);
        for (let i = 0; i < intersects.length; i++) {
          const intersect = intersects[i];
          const object = intersect.object;
          handleDoorClick(object as THREE.Object3D); // 添加类型断言
        }
      }
    }
  });

  document.addEventListener("mousemove", (e) => {
    if (document.pointerLockElement === document.body && model) {
      model.rotation.y -= e.movementX / 600;

      const cameraGroup = model.getObjectByName("cameraGroup") as THREE.Group;
      if (cameraGroup) {
        const angleMin = THREE.MathUtils.degToRad(-15);
        const angleMax = THREE.MathUtils.degToRad(15);
        let angle = cameraGroup.rotation.x + e.movementY / 600;
        if (angle > angleMin && angle < angleMax) {
          cameraGroup.rotation.x = angle;
        }
      }
    }
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function handleDoorClick(doorObject: THREE.Object3D) {
  // console.log('点击门：', doorObject)
  // === 修改点1：增强验证逻辑 ===
  // 检查是否是门对象或碰撞体
  const isActualDoor = doorObject.name === "door" || doorObject.userData.isDoor;
  const isHitBox =
    doorObject.name === "doorHitBox" && doorObject.userData.isDoor;

  if (!isActualDoor && !isHitBox) {
    // console.error("Clicked object is not a door:", doorObject)
    return;
  }

  // 确定目标门对象
  const targetDoor = isHitBox ? doorObject.parent : doorObject;

  // === 修改点2：增强门组查找逻辑 ===
  const doorGroup = doorRef.groups.find((group) =>
    group.children.some(
      (child) =>
        child === targetDoor || child.children.some((c) => c === targetDoor)
    )
  );

  if (!doorGroup) {
    // console.error("Cannot find door group for:", doorObject.name)
    return;
  }

  const rotationSpeed = 0.05;
  const maxRotation = Math.PI / 2;
  const currentRotation = doorGroup.rotation.y;
  const isOpen = Math.abs(currentRotation) >= maxRotation - rotationSpeed;

  // 类型安全断言
  const animatedDoor = doorGroup as unknown as THREE.Object3D & {
    animationInterval?: number;
  };

  // 清除现有动画
  if (animatedDoor.animationInterval) {
    clearInterval(animatedDoor.animationInterval);
  }

  // 动画逻辑
  animatedDoor.animationInterval = setInterval(() => {
    // 在动画开始前先检测一次碰撞
    if (checkCollisionDoor(doorGroup) && !isOpen) {
      console.warn("Initial collision detected! Cannot open door.");
      clearInterval(animatedDoor.animationInterval);
      return;
    }

    const currentY = doorGroup.rotation.y;

    if (isOpen) {
      // 关门逻辑
      doorGroup.rotation.y =
        currentY > 0
          ? Math.max(0, currentY - rotationSpeed)
          : Math.min(0, currentY + rotationSpeed);

      if (Math.abs(doorGroup.rotation.y) < rotationSpeed) {
        doorGroup.rotation.y = 0;
        clearInterval(animatedDoor.animationInterval);
      }
    } else {
      // 开门逻辑
      doorGroup.rotation.y =
        currentY >= 0
          ? Math.min(maxRotation, currentY + rotationSpeed)
          : Math.max(-maxRotation, currentY - rotationSpeed);

      if (
        Math.abs(Math.abs(doorGroup.rotation.y) - maxRotation) < rotationSpeed
      ) {
        clearInterval(animatedDoor.animationInterval);
      }
    }

    // 只在开门时检测碰撞
    if (!isOpen && checkCollisionDoor(doorGroup)) {
      console.warn(
        "Collision detected during opening! Stopping door animation."
      );
      clearInterval(animatedDoor.animationInterval);
    }
  }, 1000 / 60);
}

onMounted(() => {
  initThree();
  setupEventListeners();
});

onUnmounted(() => {
  // 移除所有事件监听器
  const events = ["resize", "mousedown", "mousemove", "keydown", "keyup"];
  events.forEach((event) => {
    window.removeEventListener(event, () => {});
  });

  // 清理资源
  if (mixer) mixer.uncacheRoot(model);
  if (renderer) renderer.dispose();
  if (scene) scene.clear();
});
</script>

<style scoped>
.current-page {
  width: 100%;
  height: calc(100% - 50px);
  display: flex;
  justify-content: center;
  align-items: center;
}

.draw {
  width: 100%;
  height: 100%;
}
</style>
