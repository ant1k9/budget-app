import Vue from 'vue'
import Vuex from 'vuex'
import state from './modules/state.js'
import getters from './modules/getters.js'
import mutations from './modules/mutations.js'

Vue.use(Vuex)

const store = new Vuex.Store({
    state: state,
    getters: getters,
    mutations: mutations,
})

export default store
