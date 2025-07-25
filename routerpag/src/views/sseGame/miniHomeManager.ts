import * as THREE from 'three'

import floorUrl from "@/assets/img/floor.jpeg";
// import type { Object3D } from 'three/webgpu';

// 创建地板
function createFloor(
  sizeData: {
    baseWidth: number;
    baseLength: number;
    baseHeight: number;
    baseThickness: number;
    peakHeight: number;
    peakWidth: number;
    doorWidth: number;
    doorHeight: number;
    baseImg?: string;
    tileUrl?: string;
    doorImg?: string;
  },
  PositionData: { x: any; y: any; z: any },
  group: THREE.Group<THREE.Object3DEventMap>
) {
  if (!group) return;

  const texture = new THREE.TextureLoader().load(floorUrl);
  const floor = new THREE.BoxGeometry(
    5000,
    0.1,
    5000
  );
  const material = new THREE.MeshPhongMaterial({ map: texture });
  const mesh = new THREE.Mesh(floor, material);

  mesh.position.set(PositionData.x, PositionData.y, PositionData.z);
  mesh.name = "floor";
  group.add(mesh);
}

// 创造墙面
function createWall(
  width: number | undefined,
  height: number | undefined,
  thickness: number | undefined,
  imgUrl: string
) {
  const wallTexture = new THREE.TextureLoader().load(imgUrl);
  const wall = new THREE.BoxGeometry(width, height, thickness);
  const material = new THREE.MeshPhongMaterial({ map: wallTexture });
  return new THREE.Mesh(wall, material);
}

function createWalls(
  sizeData: {
    baseWidth: any;
    baseLength: any;
    baseHeight: any;
    baseThickness: any;
    peakHeight?: number;
    peakWidth?: number;
    doorWidth?: number;
    doorHeight?: number;
    baseImg: any;
    tileUrl?: string;
    doorImg?: string;
  },
  PositionData: { x: number; y: number; z: number },
  group: THREE.Group<THREE.Object3DEventMap>
) {
  if (!group) return;
  // 左侧墙
  const leftWall = createWall(
    sizeData.baseWidth,
    sizeData.baseHeight,
    sizeData.baseThickness,
    sizeData.baseImg
  );
  leftWall.name = "leftWall";
  leftWall.position.set(
    PositionData.x,
    -1 + sizeData.baseHeight / 2 + PositionData.y,
    sizeData.baseLength / 2 + PositionData.z
  );
  group.add(leftWall);

  // 右侧墙
  const rightWall = createWall(
    sizeData.baseWidth,
    sizeData.baseHeight,
    sizeData.baseThickness,
    sizeData.baseImg
  );
  rightWall.name = "rightWall";
  rightWall.position.set(
    PositionData.x,
    -1 + sizeData.baseHeight / 2 + PositionData.y,
    -sizeData.baseLength / 2 + PositionData.z
  );
  group.add(rightWall);
}

// 创建前后墙的通用规则
function genwallShapeNo(sizeData: {
  baseLength: number;
  peakWidth?: number; // 不再是可选参数
  baseHeight: number;
  peakHeight: number;
}) {
  // 添加默认值处理
  const peakWidth = sizeData.peakWidth ?? 5;
  const shape = new THREE.Shape();
  let height = sizeData.baseHeight; // 使用统一的高度
  // 绘制墙体轮廓
  shape.moveTo(0, 0);
  shape.lineTo(0, height);
  shape.lineTo(
    sizeData.baseLength / 2 - peakWidth / 2,
    sizeData.baseHeight + sizeData.peakHeight - 1
  );
  shape.lineTo(
    sizeData.baseLength / 2 - peakWidth / 2,
    sizeData.baseHeight + sizeData.peakHeight
  );
  shape.lineTo(
    sizeData.baseLength / 2 + peakWidth / 2,
    sizeData.baseHeight + sizeData.peakHeight
  );
  shape.lineTo(
    sizeData.baseLength / 2 + peakWidth / 2,
    sizeData.baseHeight + sizeData.peakHeight - 1
  );
  shape.lineTo(sizeData.baseLength, sizeData.baseHeight);
  shape.lineTo(sizeData.baseLength, 0);
  shape.lineTo(0, 0);
  return shape;
}

function createIrregularWall(
  shape: THREE.Shape | THREE.Shape[] | undefined,
  position: any[],
  textureUrl: string,
  group: THREE.Group<THREE.Object3DEventMap>,
  sizeData: { baseWidth: number; baseLength: number; baseHeight: number; baseThickness: number; peakHeight: number; peakWidth: number; doorWidth: number; doorHeight: number; baseImg?: any; tileUrl?: string; doorImg?: string; }
) {
  const extrudeSettings = {
    depth: sizeData.baseThickness, // 使用统一的厚度
    bevelEnabled: false,
  };
  const wallTexture = new THREE.TextureLoader().load(textureUrl);
  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
  wallTexture.repeat.set(0.05, 0.05);
  const material = new THREE.MeshPhongMaterial({
    map: wallTexture,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position[0], position[1], position[2]);
  group.add(mesh);
  return mesh;
}
//  创建有门的墙
function createDoorWall(
  sizeData: {
    baseWidth: number;
    baseLength: number;
    baseHeight: number;
    baseThickness: number;
    peakHeight: number;
    peakWidth: number;
    doorWidth: number;
    doorHeight: number;
    baseImg?: any;
    tileUrl?: string;
    doorImg?: string;
  },
  positionData: { x: any; y: any; z: any },
  group: THREE.Group<THREE.Object3DEventMap>
) {
  const shape = genwallShapeNo(sizeData);
  const door = new THREE.Path();
  const doorOffsetX = sizeData.baseLength / 2;

  door.moveTo(doorOffsetX - sizeData.doorWidth / 2, 0);
  door.lineTo(doorOffsetX - sizeData.doorWidth / 2, sizeData.doorHeight);
  door.lineTo(doorOffsetX + sizeData.doorWidth / 2, sizeData.doorHeight);
  door.lineTo(doorOffsetX + sizeData.doorWidth / 2, 0);

  shape.holes.push(door);

  const mesh = createIrregularWall(
    shape,
    [
      sizeData.baseWidth / 2 + positionData.x - 1,
      -1 + positionData.y,
      sizeData.baseLength / 2 + positionData.z,
    ],
    sizeData.baseImg,
    group,
    sizeData
  );
  mesh.name = "doorQian";
  mesh.rotation.y = Math.PI / 2;

  // ===== 精确碰撞体方案 =====
  // 计算基本位置参数    0                20                  
  const wallCenterX = positionData.x + sizeData.baseWidth / 2 - 1;
  //                   0                         30   - 12
  const wallCenterZ = positionData.z + sizeData.baseLength / 2;
  const wallBottomY = positionData.y - 1;

  // 1. 左侧墙体碰撞体
  const leftWidth = (sizeData.baseLength - sizeData.doorWidth) / 2;
  const leftCollider = new THREE.Mesh(
    new THREE.BoxGeometry(
      leftWidth,
      sizeData.baseHeight,
      sizeData.baseThickness
    ),
    new THREE.MeshBasicMaterial({
      visible: false,
      wireframe: true,
      color: 0xff0000 // 红色线框便于调试
    })
  );
  // leftCollider.position.set(
  //   wallCenterX - sizeData.baseLength / 2 + leftWidth / 2,
  //   wallBottomY + sizeData.baseHeight / 2,
  //   wallCenterZ
  // );
  leftCollider.position.set(
    wallCenterX + 0.5,
    0,
    wallCenterZ - sizeData.doorWidth - 2.05
  );
  leftCollider.rotation.y = Math.PI / 2;
  leftCollider.name = "leftWallCollider";
  leftCollider.userData.isCollidable = true;
  group.add(leftCollider);

  // 2. 右侧墙体碰撞体
  const rightCollider = leftCollider.clone();
  rightCollider.position.set(
    wallCenterX + 0.5,
    0,
    -wallCenterZ + sizeData.doorWidth + 2.05
  );
  rightCollider.name = "rightWallCollider";
  rightCollider.userData.isCollidable = true;
  group.add(rightCollider);

  // 3. 门上方墙体碰撞体
  const topHeight = sizeData.baseHeight - sizeData.doorHeight;
  const topCollider = new THREE.Mesh(
    new THREE.BoxGeometry(
      sizeData.doorWidth,
      topHeight,
      sizeData.baseThickness
    ),
    new THREE.MeshBasicMaterial({
      visible: false,
      wireframe: true,
      color: 0x00ff00 // 绿色线框便于调试
    })
  );
  topCollider.position.set(
    wallCenterX,
    wallBottomY + sizeData.doorHeight + topHeight / 2,
    wallCenterZ
  );
  topCollider.rotation.y = Math.PI / 2;
  topCollider.name = "topWallCollider";
  topCollider.userData.isCollidable = true;
  group.add(topCollider);

  return mesh;
  // ========== 新增碰撞体部分结束 ==========
}
// 创建没有门的墙
function createNoDoorWall(
  sizeData: {
    baseWidth: number;
    baseLength: number;
    baseHeight: number;
    baseThickness: number;
    peakHeight: number;
    peakWidth: number;
    doorWidth: number;
    doorHeight: number;
    baseImg?: any;
    tileUrl?: string;
    doorImg?: string;
  },
  positionData: { x: any; y: any; z: any },
  group: THREE.Group<THREE.Object3DEventMap>
) {
  const shape = genwallShapeNo(sizeData);
  let mesh = createIrregularWall(
    shape,
    [
      -sizeData.baseWidth / 2 + positionData.x,
      -1 + positionData.y,
      sizeData.baseLength / 2 + positionData.z,
    ],
    sizeData.baseImg,
    group, sizeData
  );
  mesh.name = "backWall";
  mesh.rotation.y = Math.PI / 2;
}



// 创建屋顶
function createRoof(
  sizeData: {
    baseWidth: any;
    baseLength?: number;
    baseHeight: any;
    baseThickness?: number;
    peakHeight: any;
    peakWidth?: number;
    doorWidth?: number;
    doorHeight?: number;
    baseImg?: string;
    tileUrl: any;
    doorImg?: string;
  },
  positionData: { x: any; y: any; z: any },
  group: THREE.Group<THREE.Object3DEventMap>
) {
  if (!group) return;

  // 屋顶参数
  const roofPeakHeight = sizeData.peakHeight; // 屋顶顶点高度
  const roofEaveLength = 5; // 屋檐延伸长度

  // 计算屋顶实际尺寸
  const roofWidth =
    Math.sqrt(sizeData.baseWidth ** 2 + roofPeakHeight ** 2) + roofEaveLength;
  const roofLength = sizeData.baseWidth - 6; // 比墙面略长
  const roofThickness = 1; // 屋顶厚度

  // 屋顶高度位置 (墙高 + 屋顶厚度)
  const roofPositionY = sizeData.baseHeight + roofThickness + 1;

  // 创建屋顶几何体
  const geometry = new THREE.BoxGeometry(roofLength, roofWidth, roofThickness);

  // 加载屋顶纹理
  const texture = new THREE.TextureLoader().load(sizeData.tileUrl);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);

  // 创建屋顶材质
  const material = new THREE.MeshPhongMaterial({
    map: texture,
    side: THREE.DoubleSide,
  });

  // 创建右侧屋顶
  const rightRoof = new THREE.Mesh(geometry, material);
  rightRoof.rotation.set(
    80 * (Math.PI / 180), // X轴旋转角度（弧度）
    0 * (Math.PI / 180), // Y轴旋转180度
    90 * (Math.PI / 180) // Z轴旋转45度
  );
  rightRoof.position.set(
    -sizeData.baseWidth / 2 + sizeData.baseHeight + positionData.x,
    roofPositionY + positionData.y,
    positionData.z - 16.5
  );
  rightRoof.name = "rightRoof";
  group.add(rightRoof);

  // 创建左侧屋顶（对称）
  const leftRoof = new THREE.Mesh(geometry, material);
  leftRoof.rotation.set(
    100 * (Math.PI / 180), // X轴旋转角度（弧度）
    0 * (Math.PI / 180), // Y轴旋转180度
    90 * (Math.PI / 180) // Z轴旋转45度
  );
  leftRoof.position.set(
    sizeData.baseWidth / 2 - sizeData.baseHeight + positionData.x,
    roofPositionY + positionData.y,
    positionData.z + 16.5
  );
  leftRoof.name = "leftRoof";
  group.add(leftRoof);

  return {
    roofs: [rightRoof, leftRoof],
    width: roofWidth,
  };
}

// 创建门
function createDoor(
  sizeData: {
    baseWidth: number;
    baseLength: number;
    baseHeight: number;
    baseThickness: number;
    peakHeight: number;
    peakWidth: number;
    doorWidth: number;
    doorHeight: number;
    baseImg?: any;
    tileUrl?: any;
    doorImg: any;
  },
  positionData: { x: any; y: any; z: any },
  group: THREE.Group,
  doorRef: {
    meshes: THREE.Mesh<THREE.BoxGeometry, THREE.MeshPhongMaterial>[],
    groups: THREE.Group[]
  }
): THREE.Group | null {
  if (!group) return null;

  // 创建门组
  const newDoorGroup = new THREE.Group()
  newDoorGroup.name = "doorGroup"

  // 加载门纹理
  const texture = new THREE.TextureLoader().load(sizeData.doorImg)

  // 创建门几何体
  const doorGeometry = new THREE.BoxGeometry(
    sizeData.doorWidth,
    sizeData.doorHeight,
    sizeData.baseThickness
  )

  // 创建门材质
  const material = new THREE.MeshPhongMaterial({
    map: texture,
    transparent: true,
    opacity: 1,
  })

  // 正确更新门引用
  const doorMesh = new THREE.Mesh(doorGeometry, material)
  doorMesh.name = "door"
  // 将门模型的位置调整到标记点2处（即门的左侧边缘）
  doorMesh.position.set(-sizeData.doorWidth / 2, 0, 0); // 标记点2的位置
  doorMesh.userData.isDoor = true // 新增

  // 更新引用
  doorRef.meshes.push(doorMesh)
  doorRef.groups.push(newDoorGroup)

  // 将门添加到门组
  newDoorGroup.add(doorMesh)

  // 设置门组位置和旋转
  newDoorGroup.position.set(
    sizeData.baseWidth / 2 + positionData.x - 0.5,
    sizeData.doorHeight / 2 + positionData.y - 1,
    -sizeData.doorWidth / 2 + positionData.z
  )
  newDoorGroup.rotation.y = Math.PI / 2

  // 将门组添加到场景组
  group.add(newDoorGroup)
  // 添加辅助碰撞体
  const hitBoxGeometry = new THREE.BoxGeometry(
    sizeData.doorWidth * 1.2,  // 加宽20%
    sizeData.doorHeight * 1.1, // 加高10%
    0.8                        // 加厚60%
  );
  const hitBox = new THREE.Mesh(hitBoxGeometry);
  hitBox.visible = false; // 不可见只用于碰撞检测
  hitBox.name = "doorHitBox";
  hitBox.userData.isDoor = true // 碰撞体也标记为门相关
  hitBox.position.set(0, 0, 0); // 标记点2的位置
  doorMesh.add(hitBox)
  // 修改点击检测逻辑
  doorMesh.userData.isInteractive = true;

  return newDoorGroup; // 返回门组对象
}
// 重点修改部分结束

// 或者如果需要更新对象，可以导出函数形式
export function managerHome() {
  return {
    createFloor,
    createWalls,
    createNoDoorWall,
    createDoorWall,
    createRoof,
    createDoor
  }
}