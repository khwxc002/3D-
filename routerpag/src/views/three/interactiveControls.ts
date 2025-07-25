import * as THREE from 'three'

// 声明全局变量
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let canvas: HTMLCanvasElement | null = null
const group = new THREE.Group()

// 动画相关对象
let model: THREE.Group | null = null;
let skeleton: THREE.SkeletonHelper | null = null;
let mixer: THREE.AnimationMixer | null = null;
let clock = new THREE.Clock();

// 改进点1：增强门对象引用管理
const doorRef = {
  meshes: [] as THREE.Mesh<THREE.BoxGeometry, THREE.MeshPhongMaterial>[], // 支持多门
  groups: [] as THREE.Group[]
}

const marker = new THREE.Mesh(
  new THREE.SphereGeometry(0.5, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xff0000 })
)

// 增强类型定义
declare module 'three' {
  interface Object3D {
    animationInterval?: number
    isDoor?: boolean // 新增自定义属性
  }
}

// 改进点2：增强门点击处理逻辑
function handleDoorClick(doorObject: THREE.Object3D) {
  // console.log('点击门：', doorObject)
  // === 修改点1：增强验证逻辑 ===
  // 检查是否是门对象或碰撞体
  const isActualDoor = doorObject.name === 'door' || doorObject.userData.isDoor
  const isHitBox = doorObject.name === 'doorHitBox'

  if (!isActualDoor && !isHitBox) {
    console.error("Clicked object is not a door:", doorObject)
    return
  }

  // 确定目标门对象
  const targetDoor = isHitBox
    ? doorObject.parent
    : doorObject

  // === 修改点2：增强门组查找逻辑 ===
  const doorGroup = doorRef.groups.find(group =>
    group.children.some(child =>
      child === targetDoor ||
      child.children.some(c => c === targetDoor)
    )
  )

  if (!doorGroup) {
    console.error("Cannot find door group for:", doorObject.name)
    return
  }

  const rotationSpeed = 0.05
  const maxRotation = Math.PI / 2
  const currentRotation = doorGroup.rotation.y
  const isOpen = Math.abs(currentRotation) >= maxRotation - rotationSpeed

  // 类型安全断言
  const animatedDoor = doorGroup as unknown as THREE.Object3D & {
    animationInterval?: number
  }

  // 清除现有动画
  if (animatedDoor.animationInterval) {
    clearInterval(animatedDoor.animationInterval)
  }

  // 动画逻辑
  animatedDoor.animationInterval = setInterval(() => {
    const currentY = doorGroup.rotation.y

    if (isOpen) {
      // 关门逻辑
      doorGroup.rotation.y = currentY > 0
        ? Math.max(0, currentY - rotationSpeed)
        : Math.min(0, currentY + rotationSpeed)

      if (Math.abs(doorGroup.rotation.y) < rotationSpeed) {
        doorGroup.rotation.y = 0
        clearInterval(animatedDoor.animationInterval)
      }
    } else {
      // 开门逻辑
      doorGroup.rotation.y = currentY >= 0
        ? Math.min(maxRotation, currentY + rotationSpeed)
        : Math.max(-maxRotation, currentY - rotationSpeed)

      if (Math.abs(Math.abs(doorGroup.rotation.y) - maxRotation) < rotationSpeed) {
        clearInterval(animatedDoor.animationInterval)
      }
    }
  }, 1000 / 60)
}

// 导出增强类型安全的函数
export function getThreeControls() {
  return {
    scene,
    camera,
    renderer,
    canvas,
    group,
    doorMeshes: doorRef.meshes, // 改为复数形式
    doorGroups: doorRef.groups, // 改为复数形式
    marker,
    model,
    skeleton,
    mixer,
    clock,
    handleDoorClick
  }
}