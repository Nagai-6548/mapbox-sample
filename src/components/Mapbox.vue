<template>
  <div id="mapbox-wrapper">
    <div id="mapbox"></div>
  </div>
</template>

<script>
var mapboxgl = require('mapbox-gl/dist/mapbox-gl.js');
var token = process.env.VUE_APP_MAPBOX_TOKEN;

export default {
  name: 'Mapbox',
  data: () => ({
    "map": null
  }),
  mounted() {
    this.map = this.initMap(this.$el.querySelector("#mapbox"));
    this.map.on('load', this.add3dLayer);
  },
  methods: {
    /**
     * Mapbox初期化
     */
    initMap(el) {
      mapboxgl.accessToken = token;
      return new mapboxgl.Map({
        container: el,
        style: 'mapbox://styles/mapbox/streets-v11',
        zoom: 13,
        center: [139.75, 35.65]
      });
    },
    /**
     * 3Dマップ表示
     */
    add3dLayer() {
      // Insert the layer beneath any symbol layer.
      var layers = this.map.getStyle().layers;
      var labelLayerId;
      for (var i = 0; i < layers.length; i++) {
        if (layers[i].type === 'symbol' && layers[i].layout['text-field']) {
          labelLayerId = layers[i].id;
          break;
        }
      }
      this.map.addLayer({
        'id': '3d-buildings',
        'source': 'composite',
        'source-layer': 'building',
        'filter': ['==', 'extrude', 'true'],
        'type': 'fill-extrusion',
        'minzoom': 15,
        'paint': {
          'fill-extrusion-color': '#aaa',
          // use an 'interpolate' expression to add a smooth transition effect to the
          // buildings as the user zooms in
          'fill-extrusion-height': [
            "interpolate", ["linear"], ["zoom"],
            15, 0,
            15.05, ["get", "height"]
          ],
          'fill-extrusion-base': [
            "interpolate", ["linear"], ["zoom"],
            15, 0,
            15.05, ["get", "min_height"]
          ],
          'fill-extrusion-opacity': .6
        }
      }, labelLayerId);
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
#mapbox-wrapper {
  height: 100%;
  width: 100%;
  margin: 0 auto;
}
#mapbox {
  height: 100%;
}
</style>
