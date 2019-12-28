let Vue = require('vue')
let App = require('./vue/App.vue')

new Vue({
    el: '#app',
    render: h => h(App),
})
