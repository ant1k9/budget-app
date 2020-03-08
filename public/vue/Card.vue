<template>
  <div>
    <MenuApp />
    <h3 class="card-margin-left"><span>{{ card }}</span></h3>
    <div>
      <span id="card-buttons">
        <button v-for="card in allCards" class="card-app-button" v-on:click="getSpendings(card)">
          {{ card }}
        </button>
      </span>
    </div>
    <div>
      <button v-on:click="previousMonth()" class="card-app-button">&#8592;</button>
      {{ spendingDateFormatted }}
      <button v-on:click="nextMonth()" class="card-app-button">&#8594;</button>
    </div>
    <form method="post">
      <table>
        <tr v-for="type in allTypes">
          <td class="card-app-td"> {{ type }} </td>
          <td><input :name="type" :value="spendingsForType(type)"> </td>
        </tr>
      </table>
      <button>Send</button>
      <input type="hidden" name="date" :value="spendingDateFormatted">
      <input type="hidden" name="card" :value="card">
      <input type="hidden" name="next" value="/#/">
    </form>
    <TypesApp />
  </div>
</template>

<style>
.card-app-td {
  padding: 10px;
}

.card-app-button {
  margin: 10px;
}

.card-margin-left {
  margin-left: 20px;
}
</style>

<script>
import TypesApp from "./Types.vue";
import MenuApp from "./Menu.vue";

export default {
  components: {
    MenuApp,
    TypesApp,
  },
  computed: {
    allCards() { return this.$store.state.cards; },
    allTypes() { return this.$store.state.types; },
    spendingDateFormatted() { return this.$store.state.spendingDateFormatted; }
  },
  data() {
    return {
      spendings: {},
      card: "",
    }
  },
  methods: {
    restoreCard: function() {
      return localStorage["card"];
    },
    saveCard: function(card) {
      localStorage["card"] = this.card =
        this.$store.state.cards.includes(card) ? card : "cash";
    },
    nextMonth: function() {
      this.$store.commit('nextMonth');
      this.getSpendings(this.card);
    },
    previousMonth: function() {
      this.$store.commit('previousMonth');
      this.getSpendings(this.card);
    },
    getSpendings: function(card) {
      this.saveCard(card);
      return fetch(
        `/spendings?card=${this.card || ""}&date=${this.spendingDateFormatted}`)
        .then(response => response.json())
        .then(data => {
          this.spendings = {};
          for ( let item of data ) {
            this.spendings[item["type"]] = item["spent_money"];
          }
        });
    },
    spendingsForType: function(type) {
      return this.spendings[type] || 0;
    },
  },
  async beforeMount() {
    this.card = this.restoreCard();
    await this.getSpendings(this.card);
  },
};
</script>
