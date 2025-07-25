<template>
  <div class="current-page">
    <canvas
      id="draw"
      class="draw"
      style="border: 1px solid; background-color: #000"
    ></canvas>
    <div class="game-ui">
      <div class="health-bar">
        <div class="health" :style="{ width: playerHealth + '%' }"></div>
      </div>
      <div class="score">得分: {{ score }}</div>
      <button v-if="!gameStarted" @click="startGame">开始游戏</button>
    </div>
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
import { createNoise2D } from "simplex-noise";

import grass from "@/assets/img/floor.jpeg";
// 新增：Vue响应式变量
import { ref } from "vue";
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
// const SimplexNoise = createNoise3D();
let noise2D = createNoise2D();

let canvas: HTMLCanvasElement; // 添加到文件顶部的变量声明区域
// 动作控制

// 新增：游戏相关变量
let monsters: THREE.Group[] = [];
// === 修改：为怪物添加动画混合器数组 ===
let monsterMixers: THREE.AnimationMixer[] = [];
// === 修改结束 ===
let playerHealth = ref(100);
let score = ref(0);
let gameStarted = ref(false);
let attackCooldown = false;
const monsterSpawnInterval = 5000; // 5秒生成一个怪物

// === 新增：弹道相关变量 ===
let projectiles: THREE.Mesh[] = [];
const projectileSpeed = 70;
// === 新增结束 ===

// === 新增：跳跃相关变量 ===
let isJumping = false;
let jumpVelocity = 0;
const gravity = 30;
const jumpStrength = 15;
// === 新增结束 ===

// 新增：开始游戏
function startGame() {
  gameStarted.value = true;
  spawnMonster();
}
let currentBaseAction: keyof typeof baseActions = "idle";
// === 修改：在动画列表中添加跳跃动画 ===
const baseActions = {
  idle: { weight: 1, action: null as THREE.AnimationAction | null },
  walk: { weight: 0, action: null as THREE.AnimationAction | null },
  run: { weight: 0, action: null as THREE.AnimationAction | null },
  attack: { weight: 0, action: null as THREE.AnimationAction | null }, // 攻击动作
  jump: { weight: 0, action: null as THREE.AnimationAction | null }, // 跳跃动作
};
// === 修改结束 ===

interface DoorRef {
  meshes: THREE.Mesh<THREE.BoxGeometry, THREE.MeshPhongMaterial>[];
  groups: THREE.Group[];
}
let doorRef: DoorRef = {
  meshes: [],
  groups: [],
};

// === 修改：添加空格键状态 ===
// 键盘状态
let keyStates = {
  W: false,
  S: false,
  A: false,
  D: false,
  shift: false,
  Space: false, // 新增：空格键用于跳跃
};
// === 修改结束 ===

// 运动参数
const v = new THREE.Vector3();
console.log("运动参数", v);
const a = 300; // 加速度
const maxSpeed = 50000; // 最大速度

let { houseSize, housePosition, housePositiontwo } = getHoursData();
let {
  createFloor,
  createWalls,
  createNoDoorWall,
  createDoorWall,
  createRoof,
  createDoor,
} = managerHome();

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
  scene.background = new THREE.Color(0x87ceeb); // 天空蓝背景
  scene.fog = new THREE.Fog(0xa0a0a0, 10, 50);

  // 设置光源
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
  hemiLight.position.set(0, 100, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(-50, 100, -30);
  dirLight.castShadow = true;

  // 优化阴影设置
  dirLight.shadow.camera.left = -100;
  dirLight.shadow.camera.right = 100;
  dirLight.shadow.camera.top = 100;
  dirLight.shadow.camera.bottom = -100;
  dirLight.shadow.camera.far = 200;
  dirLight.shadow.mapSize.width = 1024; // 降低阴影分辨率以提高性能
  dirLight.shadow.mapSize.height = 1024;
  scene.add(dirLight);

  // 创建地形
  createTerrain();

  // 添加地面网格（优化）
  const grid = new THREE.GridHelper(5000, 500, 0x000000, 0x000000);
  (grid.material as THREE.Material).opacity = 0.5;
  (grid.material as THREE.Material).transparent = true;
  scene.add(grid);

  // 初始化相机
  camera = new THREE.PerspectiveCamera(
    65,
    window.innerWidth / window.innerHeight,
    0.1,
    500 // 缩短视距以提高性能
  );
  camera.position.set(0, 1.6, -2.5);

  // 初始化渲染器（优化）
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance", // 优化性能
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 限制最大像素比
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // 优化阴影渲染
  renderer.sortObjects = false; // 禁用对象排序以提高性能

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

// 新增：创建地形
function createTerrain() {
  // 地形参数（优化）
  const width = 2000;
  const height = 2000;
  const widthSegments = 100;
  const heightSegments = 100;

  const geometry = new THREE.PlaneGeometry(
    width,
    height,
    widthSegments,
    heightSegments
  );

  // 使用噪声生成高度
  const vertices = geometry.attributes.position;
  const positionArray = vertices.array as Float32Array;

  console.log("1111", vertices);
  // 使用更高效的方式更新顶点位置
  for (let i = 0; i < vertices.count; i++) {
    const index = i * 3;
    const x = positionArray[index];
    const z = positionArray[index + 2];

    // 优化噪声计算
    let y = noise2D(x * 0.005, z * 0.005) * 20; // 降低地形高度
    y += noise2D(x * 0.01, z * 0.01) * 10;
    y += noise2D(x * 0.05, z * 0.05) * 5;

    // 使用更高效的边界限制
    y = Math.max(-10, Math.min(10, y));

    positionArray[index + 1] = y;
  }

  // 更新法线以便光照正确
  geometry.computeVertexNormals();

  // 创建材质
  // .load(grass);
  const textureLoader = new THREE.TextureLoader();
  let material;

  try {
    const grassTexture = textureLoader.load(
      grass,
      () => {
        console.log("纹理加载成功");
        if (grassTexture) {
          grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
          grassTexture.repeat.set(100, 100); // 增加重复次数使纹理更明显
        }
      },
      undefined,
      (error) => {
        console.error("纹理加载失败:", error);
        // 纹理加载失败时使用纯色材质
        material = new THREE.MeshStandardMaterial({
          color: 0x228b22, // 森林绿
          side: THREE.DoubleSide,
          wireframe: false,
          flatShading: false,
        });
      }
    );

    if (grassTexture) {
      grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
      grassTexture.repeat.set(100, 100);

      material = new THREE.MeshStandardMaterial({
        map: grassTexture,
        side: THREE.DoubleSide,
        wireframe: false,
        flatShading: false,
      });
    } else {
      // 备用材质
      material = new THREE.MeshStandardMaterial({
        color: 0x228b22, // 森林绿
        side: THREE.DoubleSide,
        wireframe: false,
        flatShading: false,
      });
    }
  } catch (error) {
    console.error("纹理加载异常:", error);
    // 异常时使用纯色材质
    material = new THREE.MeshStandardMaterial({
      color: 0x228b22, // 森林绿
      side: THREE.DoubleSide,
      wireframe: false,
      flatShading: false,
    });
  }

  const terrain = new THREE.Mesh(geometry, material);
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.y = 0; // 调整地形位置使其更明显
  terrain.receiveShadow = true;
  terrain.castShadow = true;
  terrain.name = "terrain";
  console.log("确定是否添加了地形纹理", terrain);
  scene.add(terrain);

  // 添加碰撞检测
  terrain.userData.isCollidable = true;

  // 添加辅助线框以便观察地形
  const wireframe = new THREE.WireframeGeometry(geometry);
  const line = new THREE.LineSegments(wireframe);
  // 修复类型问题：确保 material 是单个 Material 对象而不是数组
  if (Array.isArray(line.material)) {
    line.material[0].depthTest = false;
    line.material[0].opacity = 0.25;
    line.material[0].transparent = true;
  } else {
    line.material.depthTest = false;
    line.material.opacity = 0.25;
    line.material.transparent = true;
  }
  line.position.copy(terrain.position);
  line.rotation.copy(terrain.rotation);
  scene.add(line);
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
  // createFloor(sizeData, positionData, houseGroup);
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

      // 新增：查找攻击动画
      const attackClip = gltf.animations.find((anim) =>
        anim.name.includes("Attack")
      );
      if (attackClip) {
        baseActions.attack.action = mixer.clipAction(attackClip);
      }

      // === 新增：查找跳跃动画 ===
      const jumpClip = gltf.animations.find((anim) =>
        anim.name.includes("Jump")
      );
      if (jumpClip) {
        baseActions.jump.action = mixer.clipAction(jumpClip);
      }
      // === 新增结束 ===

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

// === 修改：加载怪物模型并处理动画 ===
function loadMonsterModel(callback: (model: THREE.Group, animations: THREE.AnimationClip[]) => void) {
  const loader = new GLTFLoader();
  loader.load(
    "/resources/base/Horse.glb", // 替换为你的怪物模型路径
    (gltf) => {
      const monster = gltf.scene;
      monster.scale.set(0.03, 0.03, 0.03);
      // model.scale.set(2, 3, 2); // 调整模型大小
      
      // 查找奔跑动画
      const runClip = gltf.animations.find((anim) =>
        anim.name.includes("Run") || anim.name.includes("run") || anim.name.includes("Walk")
      );
      
      callback(monster, runClip ? [runClip] : []);
    },
    undefined,
    (error) => {
      console.error("怪物模型加载失败:", error);
    }
  );
}
// === 修改结束 ===

// === 修改：生成怪物并添加动画 ===
function spawnMonster() {
  if (!gameStarted.value) return;

  loadMonsterModel((monster, animations) => {
    // 随机生成位置
    const angle = Math.random() * Math.PI * 2;
    const distance = 10 + Math.random() * 10;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;

    monster.position.set(x, 0, z);
    monster.userData.health = 30; // 怪物生命值
    monster.userData.speed = 1 + Math.random(); // 随机速度

    scene.add(monster);
    monsters.push(monster);

    // 为怪物创建动画混合器
    if (animations.length > 0) {
      const mixer = new THREE.AnimationMixer(monster);
      const action = mixer.clipAction(animations[0]);
      action.play();
      monsterMixers.push(mixer);
    }

    // 5秒后再次生成怪物
    setTimeout(spawnMonster, monsterSpawnInterval);
  });
}
// === 修改结束 ===

// === 修改：创建弹道攻击 ===
function createProjectile() {
  // 创建弹丸几何体和材质
  const geometry = new THREE.SphereGeometry(0.2, 8, 8);
  const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const projectile = new THREE.Mesh(geometry, material);
  
  // 设置弹丸初始位置（在玩家前方一点）
  const startPosition = new THREE.Vector3();
  model.getWorldPosition(startPosition);
  startPosition.y += 1.5; // 调整到角色腰部高度
  
  // 获取玩家面向方向
  const direction = new THREE.Vector3();
  model.getWorldDirection(direction);
  
  // 设置弹丸位置和方向数据
  projectile.position.copy(startPosition);
  projectile.userData.velocity = direction.multiplyScalar(projectileSpeed);
  projectile.userData.lifeTime = 0;
  projectile.userData.maxLifeTime = 5; // 最大存在时间5秒
  
  scene.add(projectile);
  projectiles.push(projectile);
}

// === 修改：执行攻击（发射弹丸） ===
function performAttack() {
  if (attackCooldown) return;

  // 播放攻击动画
  prepareCrossFade(currentBaseAction, "attack", 0.1);
  
  // 创建弹丸
  createProjectile();

  attackCooldown = true;
  setTimeout(() => {
    attackCooldown = false;
    prepareCrossFade("attack", "idle", 0.2);
  }, 300); // 缩短冷却时间
}
// === 修改结束 ===

// === 修改：更新弹丸位置 ===
function updateProjectiles(delta: number) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const projectile = projectiles[i];
    
    // 更新弹丸生命周期
    projectile.userData.lifeTime += delta;
    
    // 如果超过最大生命周期，移除弹丸
    if (projectile.userData.lifeTime > projectile.userData.maxLifeTime) {
      scene.remove(projectile);
      projectiles.splice(i, 1);
      continue;
    }
    
    // 更新弹丸位置
    projectile.position.add(
      projectile.userData.velocity.clone().multiplyScalar(delta)
    );
    
    // 检查是否击中怪物
    for (let j = monsters.length - 1; j >= 0; j--) {
      const monster = monsters[j];
      const distance = projectile.position.distanceTo(monster.position);
      
      // 如果距离小于阈值，认为击中
      if (distance < 1.5) {
        // 造成伤害
        monster.userData.health -= 10;
        
        // 移除弹丸
        scene.remove(projectile);
        projectiles.splice(i, 1);
        
        // 检查怪物是否死亡
        if (monster.userData.health <= 0) {
          scene.remove(monster);
          monsters.splice(j, 1);
          // === 修改：移除对应的动画混合器 ===
          const mixerIndex = monsters.indexOf(monster);
          if (mixerIndex !== -1) {
            monsterMixers.splice(mixerIndex, 1);
          }
          // === 修改结束 ===
          score.value += 10;
        }
        break;
      }
    }
  }
}
// === 修改结束 ===

// === 修改：执行跳跃 ===
function performJump() {
  // 允许在地面上或空中跳跃（二段跳）
  if (!isJumping) {
    isJumping = true;
    jumpVelocity = jumpStrength;
    prepareCrossFade(currentBaseAction, "jump", 0.1);
  }
}
// === 修改结束 ===

// === 修改：更新怪物动画 ===
function updateMonsters(delta: number) {
  const playerPosition = model.position;

  // 更新所有怪物动画
  monsterMixers.forEach(mixer => {
    mixer.update(delta);
  });

  monsters.forEach((monster) => {
    // 使用向量运算优化移动逻辑
    const direction = new THREE.Vector3()
      .subVectors(playerPosition, monster.position)
      .normalize();
    monster.position.add(
      direction.multiplyScalar(monster.userData.speed * delta)
    );

    // 优化碰撞伤害检测
    if (monster.position.distanceTo(playerPosition) < 1.5) {
      playerHealth.value -= 0.5;
      if (playerHealth.value <= 0) {
        gameOver();
      }
    }
  });
}
// === 修改结束 ===

// 新增：游戏结束
function gameOver() {
  gameStarted.value = false;
  alert(`游戏结束！你的得分: ${score.value}`);
  resetGame();
}

// 新增：重置游戏
function resetGame() {
  monsters.forEach((monster) => scene.remove(monster));
  monsters = [];
  
  // === 修改：清理怪物动画混合器 ===
  monsterMixers = [];
  // === 修改结束 ===
  
  // === 新增：清理弹丸 ===
  projectiles.forEach((projectile) => scene.remove(projectile));
  projectiles = [];
  // === 新增结束 ===
  
  playerHealth.value = 100;
  score.value = 0;
}
// 优化后的碰撞检测函数
function checkCollision(object: THREE.Group, group: THREE.Group): boolean {
  const playerBox = new THREE.Box3().setFromObject(object);

  // 使用空间分区优化碰撞检测
  const boundingSphere = new THREE.Sphere();
  playerBox.getBoundingSphere(boundingSphere);

  // 检测与房屋的碰撞
  return group.children.some((child) => {
    if (child.name.includes("Wall") || child.name === "Collider") {
      // 先进行球体碰撞粗检测
      const childBox = new THREE.Box3().setFromObject(child);
      const childSphere = new THREE.Sphere();
      childBox.getBoundingSphere(childSphere);

      if (boundingSphere.intersectsSphere(childSphere)) {
        // 粗检测通过后再进行精确检测
        child.updateMatrixWorld();
        const objectBox = new THREE.Box3().setFromObject(child);
        return playerBox.intersectsBox(objectBox);
      }
    }
    return false;
  });
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
  if (gameStarted.value) updateMonsters(delta); // 新增：更新怪物行为
  // === 新增：更新弹丸 ===
  updateProjectiles(delta);
  // === 新增结束 ===

  // 调试信息
  if (scene) {
    const terrain = scene.getObjectByName("terrain");
    if (terrain) {
      // console.log("地形存在，位置:", terrain.position);
    } else {
      // console.log("地形不存在");
    }
  }

  renderer.render(scene, camera);
  stats.update();
}

// 优化后的移动处理函数
function handleMovement(delta: number) {
  if (!model) return;

  const previousPosition = model.position.clone();
  v.set(0, 0, 0);

  // === 修改：处理跳跃物理 ===
  if (isJumping) {
    // 更新垂直速度
    jumpVelocity -= gravity * delta;
    // 更新垂直位置
    model.position.y += jumpVelocity * delta;

    // 检查是否着陆（地面高度为0，角色初始高度为1.6）
    if (model.position.y <= 1.6) {
      model.position.y = 1.6; // 重置到地面高度
      isJumping = false;
      jumpVelocity = 0;
      prepareCrossFade("jump", "idle", 0.2);
    }
  }
  // === 修改结束 ===

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

  // === 修改：只有在非跳跃状态下才切换到空闲状态 ===
  if (!keyStates.W && !keyStates.S && !keyStates.A && !keyStates.D) {
    if (!isJumping) {
      // 添加条件检查
      prepareCrossFade(currentBaseAction, "idle", 0.2);
    }
  }
  // === 修改结束 ===

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
    // === 修改：将攻击键改为K，跳跃键设为空格 ===
    if (e.key === "k" || e.key === "K") {
      console.log("执行攻击！！");
      performAttack();
    }
    if (e.key === " ") {
      // 空格键用于跳跃
      performJump();
    }
    // === 修改结束 ===
    if (e.key === "g" && !gameStarted.value) {
      gameStarted.value = true;
      spawnMonster();
    }
  });

  window.addEventListener("keyup", (e) => {
    const key = e.key.toUpperCase();
    if (key in keyStates) {
      keyStates[key as keyof typeof keyStates] = false;
      if (e.key === "shift") {
        keyStates.shift = false;
      }
      // === 修改：移除空格键状态跟踪 ===
      // === 修改结束 ===
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

  // 清理资源（优化）
  if (mixer) {
    mixer.uncacheRoot(model);
    mixer.stopAllAction();
  }
  // 清理怪物
  monsters.forEach((monster) => {
    monster.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => mat.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    scene.remove(monster);
  });
  monsters = [];

  // === 修改：清理怪物动画混合器 ===
  monsterMixers = [];
  // === 修改结束 ===

  // === 新增：清理弹丸 ===
  projectiles.forEach((projectile) => {
    projectile.geometry.dispose();
    (projectile.material as THREE.Material).dispose();
    scene.remove(projectile);
  });
  projectiles = [];
  // === 新增结束 ===

  // 清理模型
  if (model) {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => mat.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    scene.remove(model);
  }

  // 清理地形
  if (scene && scene.getObjectByName("terrain")) {
    const terrain = scene.getObjectByName("terrain") as THREE.Mesh;
    terrain.geometry.dispose();
    if (Array.isArray(terrain.material)) {
      terrain.material.forEach((mat) => mat.dispose());
    } else {
      terrain.material.dispose();
    }
    scene.remove(terrain);
  }

  // 清理渲染器
  if (renderer) {
    renderer.dispose();
    (renderer.domElement as HTMLCanvasElement).width = 0;
    (renderer.domElement as HTMLCanvasElement).height = 0;
  }

  // 清理场景
  if (scene) {
    scene.clear();
  }
});
</script>

<style scoped>
.current-page {
  width: 100%;
  height: calc(100% - 50px);
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.draw {
  width: 100%;
  height: 100%;
}

.game-ui {
  position: absolute;
  top: 20px;
  left: 20px;
  color: white;
  font-size: 20px;
}

.health-bar {
  width: 200px;
  height: 20px;
  border: 2px solid white;
  margin-bottom: 10px;
}

.health {
  height: 100%;
  background-color: green;
  transition: width 0.3s;
}

button {
  padding: 10px 20px;
  font-size: 16px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}
</style>