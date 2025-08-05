<script setup>
import { ref, reactive } from "vue";
</script>

<template>
  <div class="navbar">
    <img src="../assets/img/logo.png" alt="" class="main-logo me-5" />
    <div >
      <span class="cubic me-2">■</span> <span class="title">AI語音叫車服務</span>
    </div>
    <!-- <img src="../assets/img/ChoozMo_logo.png" alt="" class="sub-logo" /> -->
  </div>
</template>

<style lang="scss" scoped>
.main-logo {
  max-width: 169px;
  height: auto;
  object-fit: cover;
}
.cubic{
  color:#D61718;
  font-size: 14px;
}
.title{
  font-size: 18px;
  font-weight: bold;
  letter-spacing: 2px;
}
.sub-logo {
  max-width: 110px;
  object-fit: cover;
  height: auto;

  @media (min-width: 1440px) {
    max-width: 130px;
  }
}

.navbar {
  height: 7vh;
  display: flex;
  align-items: center;
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  z-index: 50;
  overflow: hidden;
  padding: 5px 15px;
  background-color: #D8D8D8;

  p {
    font-size: 24px;
  }
}
</style>
