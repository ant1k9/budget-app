<template>
  <h3 class="router-header">
    <span class="router-link" v-on:click="go('/')">Cards</span>
    <span class="router-link" v-on:click="go('/budget')">Budget</span>
    <span class="router-link" v-on:click="go('/wishlist')">Wishlist</span>
  </h3>
</template>

<style>
.router-link {
  margin: 10px;
  padding: 5px;
  border: 1px solid;
}

.router-header {
  margin-top: 25px;
  margin-bottom: 30px;
}
</style>

<script>
export default {
  methods: {
    go: function(where) {
      this.$router.push({
        path: where,
      });
    },
  },
};
</script>
