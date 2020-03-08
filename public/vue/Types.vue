<template>
  <div>
    <table>
      <tr>
        <td><input v-model="newCard"></td>
        <td class="card-app-td"><button v-on:click="addCard()">Add card</button></td>
      </tr>
      <tr>
        <td><input v-model="newType"></td>
        <td class="card-app-td"><button v-on:click="addType()">Add type</button></td>
      </tr>
    </table>
  </div>
</template>

<script>
export default {
  data() {
    return {
      newCard: "",
      newType: "",
    }
  },
  methods: {
    addCard: function(card) {
      this.$store.commit({
        type: "addCard",
        value: card || this.newCard,
      });
    },
    addType: function(type) {
      this.$store.commit({
        type: "addType",
        value: type || this.newType,
      });
    },
    getCards: function() {
      return fetch("/items/distinct/card").then(response => response.json());
    },
    getTypes: function() {
      return fetch("/items/distinct/type").then(response => response.json())
    },
  },
  async beforeMount() {
    if ( this.$store.state.cards.length === 0 ) {
      let cards = await this.getCards();
      for (let card of cards) this.addCard(card);
    }

    if ( this.$store.state.types.length === 0 ) {
      let types = await this.getTypes();
      for (let type of types) this.addType(type);
    }
  },
};
</script>
