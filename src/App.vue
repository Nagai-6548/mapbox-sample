<template>
  <div id="app">
    <Mapbox/>
  </div>
</template>

<script>
import Mapbox from './components/Mapbox.vue'

export default {
  name: 'app',
  components: {
    Mapbox
  }
}
</script>

<style scoped>
#app {
  height: 100%;
}
</style>
