<template>
  <div class="interactive-map" v-if="map" style="margin: 5px">
    <human-map v-if="map == 'human'" :parts="parts" :id="id"/>
  </div>
</template>

<script>

import HumanMap from "../maps/human/HumanMap";
export default {
  name: "InteractiveMap",
  components: {HumanMap},
  props: ['map', 'parts', 'id']
}
</script>

<style>
.interactive-map svg {
  display: block;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}


#info-box {
  display: none;
  position: absolute;
  top: 0px;
  left: 0px;
  z-index: 1;
  background-color: #ffffff;
  border: 2px solid #006c88;
  border-radius: 5px;
  padding: 5px;
}
</style>
