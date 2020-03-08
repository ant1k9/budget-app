const VueRouter = require('vue-router');
const CardApp = require('./vue/Card.vue');
const BudgetApp = require('./vue/Budget.vue');
const WishlistApp = require('./vue/Wishlist.vue');

const router = new VueRouter({
  // mode: 'history',
  base: __dirname,
  routes: [
    { path: '/', component: CardApp },
    { path: '/budget', component: BudgetApp },
    { path: '/wishlist', component: WishlistApp },
  ]
});

module.exports = router;
