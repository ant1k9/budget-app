const Vue = require("vue");
const VueRouter = require("vue-router");
const RouterApp = require("./vue/Router.vue");
const store = require("./store.js");

Vue.use(VueRouter);

new Vue({
  el: "#app",
  render: h => h(RouterApp),
  store,
});
