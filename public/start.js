var Vue = require('vue')
var App = require('./vue/App.vue')

new Vue({
    el: '#app',
    render: h => h(App),
})
