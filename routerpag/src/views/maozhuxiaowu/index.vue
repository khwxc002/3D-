<template>
  <div ref="threeContainer" class="three-container"></div>
</template>

<script lang="ts">
import { defineComponent, onMounted, onBeforeUnmount, ref } from "vue";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export default defineComponent({
  name: "ThreeJsModel",
  setup() {
    const threeContainer = ref<HTMLDivElement | null>(null);
    let scene: THREE.Scene | null = null;
    let camera: THREE.PerspectiveCamera | null = null;
    let renderer: THREE.WebGLRenderer | null = null;
    let model: THREE.Group | null = null;
    let controls: OrbitControls | null = null;

    const init = () => {
      if (!threeContainer.value) return;

      // 1. 初始化场景
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf0f0f0);

      // 2. 初始化相机
      camera = new THREE.PerspectiveCamera(
        75,
        threeContainer.value.clientWidth / threeContainer.value.clientHeight,
        0.1,
        1000
      );
      camera.position.set(5, 5, 5);

      // 3. 初始化渲染器
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(
        threeContainer.value.clientWidth,
        threeContainer.value.clientHeight
      );
      renderer.shadowMap.enabled = true;
      threeContainer.value.appendChild(renderer.domElement);

      // 4. 添加控制器
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;

      // 5. 添加光源
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      directionalLight.position.set(5, 10, 7);
      directionalLight.castShadow = true;
      scene.add(directionalLight);

      // 6. 加载模型（关键部分）
      const loader = new GLTFLoader();

      // 设置DRACO解码器
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath(
        "https://www.gstatic.com/draco/versioned/decoders/1.5.6/"
      );
      loader.setDRACOLoader(dracoLoader);

      loader.load(
        "/resources/base/forest_house.glb",
        (gltf) => {
          model = gltf.scene;
          scene?.add(model);

          // 遍历模型设置阴影
          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          console.log("模型加载成功");
        },
        (xhr) => {
          console.log(
            `加载进度: ${((xhr.loaded / xhr.total) * 100).toFixed(2)}%`
          );
        },
        (error) => {
          console.error("加载模型失败:", error);
          console.log("尝试加载的URL:", "/resources/base/forest_house.glb");
        }
      );

      // 7. 动画循环
      const animate = () => {
        requestAnimationFrame(animate);
        controls?.update();
        renderer?.render(scene!, camera!);
      };
      animate();
    };

    onMounted(() => {
      init();
      window.addEventListener("resize", onWindowResize);
    });

    onBeforeUnmount(() => {
      window.removeEventListener("resize", onWindowResize);
      renderer?.dispose();
      controls?.dispose();
    });

    const onWindowResize = () => {
      if (!camera || !renderer || !threeContainer.value) return;
      camera.aspect =
        threeContainer.value.clientWidth / threeContainer.value.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(
        threeContainer.value.clientWidth,
        threeContainer.value.clientHeight
      );
    };

    return { threeContainer };
  },
});
</script>

<style scoped>
.three-container {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}
</style>
