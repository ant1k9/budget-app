<template>
  <div>
    <MenuApp />
    <table>
      <tr v-for="wish, index in wishlist">
        <td class="wishlist-app-td">
          <h4>#{{index + 1}} - {{ wish.description }}</h4>
        </td>
        <td class="wishlist-app-td" v-if="index > 0">
          <form method="post" action="/wishlist/swap">
            <input type="hidden" name="first" :value="wishlist[index].description">
            <input type="hidden" name="second" :value="wishlist[index-1].description">
            <input type="hidden" name="next" value="/#/wishlist">
            <button>⬆</button>
          </form>
        </td>
        <td class="wishlist-app-td" v-else></td>
        <td class="wishlist-app-td" v-if="index < wishlist.length - 1">
          <form method="post" action="/wishlist/swap">
            <input type="hidden" name="first" :value="wishlist[index].description">
            <input type="hidden" name="second" :value="wishlist[index+1].description">
            <input type="hidden" name="next" value="/#/wishlist">
            <button>⬇</button>
          </form>
        </td>
        <td class="wishlist-app-td" v-else></td>
        <td class="wishlist-app-td">
          <form method="post" action="/wishlist/remove">
            <input type="hidden" name="desc" :value="wish.description">
            <input type="hidden" name="next" value="/#/wishlist">
            <button>✔</button>
          </form>
        </td>
      </tr>
    </table><br/>
    <form method="post" action="wishlist">
      <input name="description">
      <input type="hidden" name="next" value="/#/wishlist">
      <button class="wishlist-app-button">Add wish </button>
    </form>
  </div>
</template>

<style>
.wishlist-app-td {
  padding: 6px;
  vertical-align: middle;
}

.wishlist-app-button {
  margin-left: 10px;
}
</style>

<script>
import MenuApp from "./Menu.vue";

export default {
  components: {
    MenuApp,
  },
  data() {
    return {
      wishlist: [],
    }
  },
  methods: {
    async getWishList() {
      return fetch("/wishlist").then(response => response.json());
    },
  },
  async beforeMount() {
    this.wishlist = await this.getWishList();
  },
}
</script>
