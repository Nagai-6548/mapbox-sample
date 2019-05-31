<template>
  <div id="search-route-wrapper">
    <input id="route-btn" v-if="!searchRouteFlg" type="button" @click="openSearchRoute()" value="経路探索"/>
    <div id="route-panel" :style="{ 'display': searchRouteFlg ? 'block' : 'none' }">
      <div class="route-header">
        経路探索
        <span class="close-btn" @click="openSearchRoute()"></span>
      </div>
      <div class="route-body">
        <div>始点：{{ routeStartStr }}</div>
        <div v-for="(wt, i) in routeWaypoints" class="waypoint" :key="i">
          {{ `中継点：${wt.name}` }}
          <span class="del-btn" @click="deleteWaypoint(wt)"></span>
        </div>
        <div>終点：{{ routeEndStr }}</div>
      </div>
    </div>
  </div>
</template>

<script>
var mapboxgl = require('mapbox-gl/dist/mapbox-gl.js');
/**
 * Mapboxの地図を表示するコンポーネント
 */
export default {
  name: "SearchRoutePanel",
  props: ["map"],
  data() {
    return {
      searchRouteFlg: false,
      routeStart: null,
      routeEnd: null,
      routeStartStr: "",
      routeEndStr: "",
      routeWaypoints: [],
      handleRoute: null,
      shiftPressed: false,
      routeSource: null,
      routeLayer: null,
      routeSource2: null,
      routeLayer2: null
    };
  },
  methods: {
    /**
     * 経路探索モードの切り替え
     */
    openSearchRoute() {
      const that = this;
      this.searchRouteFlg = !this.searchRouteFlg;
      if (this.searchRouteFlg) {
        // commandキー押下のフラグを制御する
        window.onkeydown = (evt) => {
          if (evt.which === 91) {
            that.shiftPressed = true;
          }
        };
        window.onkeyup = (evt) => {
          if (evt.which === 91) {
            that.shiftPressed = false;
          }
        };
        // クリックによる始点、終点の追加イベントを設定
        this.map.on("click", this.onClickMap);
        // ソース追加
        this.routeSource = this.map.addSource('route', {
          type: 'geojson',
          data: {
            "type": "FeatureCollection",
            "features": []
          }
        });
        // レイヤ追加
        this.routeLayer = this.map.addLayer({
          "id": "route",
          "type": "line",
          "source": "route",
          "paint": {
            "line-color": "#f0f",
            "line-width": 5
          }
        });
        // ソース追加
        this.routeSource2 = this.map.addSource('route2', {
          type: 'geojson',
          data: {
            "type": "FeatureCollection",
            "features": []
          }
        });
        // レイヤ追加
        this.routeLayer2 = this.map.addLayer({
          "id": "route2",
          "type": "line",
          "source": "route2",
          "paint": {
            "line-color": "#0ff",
            "line-dasharray": [1, 1],
            "line-width": 5
          }
        });
      } else {
        // 経路探索関係の設定を初期化
        if (this.routeStart) this.routeStart.remove();
        if (this.routeEnd) this.routeEnd.remove();
        this.routeWaypoints.forEach(wt => wt.marker.remove());
        this.routeStart = null;
        this.routeEnd = null;
        this.routePolyline = null;
        this.routeWaypoints = [];
        this.routeStartStr = "";
        this.routeEndStr = "";
        this.map.off("click", this.onClickMap);
        this.map.removeLayer('route');
        this.map.removeLayer('route2');
        this.map.removeSource('route');
        this.map.removeSource('route2');
        window.onkeydown = null;
        window.onkeyup = null;
        this.routeSource = null;
        this.routeLayer = null;
        this.routeSource2 = null;
        this.routeLayer2 = null;
      }
    },
    /**
     * 中継地点を削除する
     */
    deleteWaypoint(wt) {
      this.routeWaypoints.splice(this.routeWaypoints.indexOf(wt), 1);
      wt.marker.remove();
      this.directions();
    },
    /**
     * 経路探索のマーカーを作成する
     */
    createMarker(pos, param) {
      let color = "#00f";
      if (param == "routeEnd") {
        color = "#f00";
      } else if (param == "waypoint") {
        color = "#5f5";
      }
      const icon = {
        "color": color,
        "draggable": true
      }
      var marker = new mapboxgl.Marker(icon).setLngLat(pos).addTo(this.map);
      if (param == "waypoint") {
        const wt = {
          marker: marker,
          name: `${pos[1].toFixed(5)},${pos[0].toFixed(5)}`
        };
        this.routeWaypoints.push(wt);
        marker.on("dragend", (e) => {
          var lnglat = e.target.getLngLat()
          wt.name = `${lnglat.lat.toFixed(5)},${lnglat.lng.toFixed(5)}`;
          this.directions();
        });
        this.directions();
      } else {
        marker.on("dragend", (e) => {
          var lnglat = e.target.getLngLat()
          this[param + "Str"] = `${lnglat.lat.toFixed(5)},${lnglat.lng.toFixed(5)}`;
          this.directions();
        });
        this[param] = marker;
        this[param + "Str"] = `${pos[1].toFixed(5)},${pos[0].toFixed(5)}`;
        this.directions();
      }
      return marker;
    },
    /**
     * 始点、終点、中継地点から経路探索を実行
     */
    directions() {
      const that = this;
      if (this.routeStart && this.routeEnd) {
        let distributionIndex = 1;
        let distributions = [];
        let coordinates = [];
        // 開始位置追加
        coordinates.push(this.routeStart.getLngLat());
        // 中継地点追加
        this.routeWaypoints.forEach(wt => {
          // 例えば中継地点が2つある場合、
          // 中継地点は1,2;2,3のように開始位置からインデックス（1オリジン）を繋げる
          distributions.push(`1,${++distributionIndex}`);
          coordinates.push(wt.marker.getLngLat());
        })
        // 終了位置追加
        coordinates.push(this.routeEnd.getLngLat());
        coordinates = coordinates.map(cd => `${cd.lng},${cd.lat}`);
        if (distributions.length > 0) {
          distributions = `&distributions=${distributions.join(";")}`
        }
        var url = `https://api.mapbox.com/optimized-trips/v1/mapbox/driving/${coordinates.join(';')}?overview=full${distributions}&geometries=geojson&source=first&roundtrip=false&destination=last&access_token=${mapboxgl.accessToken}`
        this.$store.dispatch("getOptimization", url).then(result => {
          that.map.getSource("route").setData({
            "type": "FeatureCollection",
            "features": [{
              "type": "Feature",
              "properties": {},
              "geometry": result.trips[0].geometry
            }]
          });
        });
        const request = {
          origin: new google.maps.LatLng(this.routeStart.getLngLat().lat, this.routeStart.getLngLat().lng),
          destination: new google.maps.LatLng(this.routeEnd.getLngLat().lat, this.routeEnd.getLngLat().lng),
          travelMode: google.maps.TravelMode.DRIVING,
          waypoints: this.routeWaypoints.map(wt => {
            return {
              location: new google.maps.LatLng(wt.marker.getLngLat().lat, wt.marker.getLngLat().lng),
              stopover: false
            }
          })
        };
        new google.maps.DirectionsService().route(request, (result, status) => {
          const route = result.routes[0];
          that.map.getSource("route2").setData({
            "type": "FeatureCollection",
            "features": [{
              "type": "Feature",
              "properties": {},
              "geometry": {
                "type": "LineString",
                "coordinates": route.overview_path.map((gLatLng) => {
                  return [gLatLng.lng(), gLatLng.lat()]
                })
              }
            }]
          });
        });
      }
    },
    onClickMap(e) {
      var pos = [e.lngLat.lng, e.lngLat.lat];
      if (!this.routeStart) {
        this.createMarker(pos, "routeStart");
      } else if (this.shiftPressed) {
        this.createMarker(pos, "waypoint");
      } else if (!this.routeEnd) {
        this.createMarker(pos, "routeEnd");
      }
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
#search-route-wrapper {
  position: absolute;
  top: 0px;
  right: 0px;
}
#route-btn {
  margin-top: 10px;
  margin-right: 10px;
  background: white;
  border: 0;
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: inherit;
  padding: 3px 6px;
  width: 80px;
  cursor: pointer;
  box-shadow: rgba(0, 0, 0, 0.3) 0px 1px 4px -1px;
}
#route-panel {
  display: none;
  width: 250px;
  height: 300px;
  margin-top: 10px;
  margin-right: 10px;
  font-size: 12px;
}
#route-panel .route-header {
  position: relative;
  padding: 2px 5px;
  background-color: #000;
  color: white;
  box-shadow: rgba(0, 0, 0, 0.3) 0px 1px 4px -1px;
}
#route-panel .route-header .close-btn:before {
  background: transparent;
  color: white;
  content: "\00D7";
  font-size: 16px;
  font-weight: 400;
  height: 16px;
  line-height: 16px;
  position: absolute;
  right: 3px;
  text-align: center;
  top: 3px;
  width: 16px;
  cursor: pointer;
}
#route-panel .route-body {
  padding: 5px 10px;
  background-color: white;
  color: black;
}
#route-panel .route-body .waypoint {
  position: relative;
}
#route-panel .route-body .waypoint .del-btn:before {
  background: transparent;
  color: #000;
  content: "\00D7";
  font-size: 16px;
  font-weight: 400;
  height: 16px;
  line-height: 16px;
  position: absolute;
  right: 3px;
  text-align: center;
  top: 3px;
  width: 16px;
  cursor: pointer;
}
#route-panel .route-body .waypoint > div:not(:last-child) {
  margin-bottom: 5px;
}
</style>
