<script setup lang="ts">
import { RouterLink, RouterView } from "vue-router";
</script>

<template>
  <!-- <header> -->
  <div class="container">
    <div class="container-top">
      <nav>
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/about">About</RouterLink>
        <RouterLink to="/sse">sse</RouterLink>
      </nav>
    </div>
    <div class="container-box">
      <RouterView />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  .container-top {
    width: 100%;
    height: 50px;
    background-color: #f5f5f5;
    display: flex;
    justify-items: center;
    align-items: center;
    nav {
      width: 100%;
      font-size: 12px;
      text-align: center;
    }

    nav a.router-link-exact-active {
      color: var(--color-text);
    }

    nav a.router-link-exact-active:hover {
      background-color: transparent;
    }

    nav a {
      display: inline-block;
      padding: 0 1rem;
      border-left: 1px solid var(--color-border);
    }

    nav a:first-of-type {
      border: 0;
    }
  }

  .container-box {
    display: flex;
    width: 100%;
    height: calc(100% - 50px);
  }
}
</style>
