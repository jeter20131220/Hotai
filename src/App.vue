<script setup>
import { RouterLink, RouterView } from "vue-router";
</script>

<template>
  <RouterView />
</template>

<style>
.swiper-button-prev,
.swiper-button-next {
  color: var(--main-color) !important;
}

.swiper-button-prev:after,
.swiper-button-next:after {
  font-size: 35px;
}

.swiper-button-next,
.swiper-rtl .swiper-button-prev {
  right: var(--swiper-navigation-sides-offset, 0px) !important;
}

html.a-fullscreen .a-canvas {
  border-radius: 10px !important;
}
</style>
