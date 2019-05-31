import Vue from 'vue'
import Vuex from 'vuex'
import axios from 'axios'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {

  },
  mutations: {

  },
  actions: {
    getOptimization({state}, url) {
      return axios.get(url).then(response => {
        return response.data;
      }).catch(e => {
        this.$message("Mapboxのルート検索に失敗しました。")
      })
    }
  }
})
