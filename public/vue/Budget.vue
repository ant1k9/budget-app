<template>
  <div>
    <MenuApp />
    <div>
      <table id="budget-app-table">
        <tr v-for="(prop, key, index) in info">
          <td class="budget-app-td">{{ prop.description }}</td>
          <td class="budget-app-td">{{ prop.value }}</td>
        </tr>
      </table>
      <table>
        <tr v-for="(action, key, index) in actions" >
          <td>
            <form method="post" :action="action.url">
              <input v-if="action.hasInput" name="value">
              <button class="budget-app-button">{{ action.description }}</button>
              <input type="hidden" name="next" value="/#/budget">
            </form>
          </td>
        </tr>
      </table>
    </div>
  </div>
</template>

<style>
.budget-app-td {
  padding: 8px;
}

.budget-app-button {
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
      info: {
        fullCredit: {
          description: "Full credit",
          value: 0,
        },
        debit: {
          description: "Estimated budget",
          value: 0,
        },
        spendings: {
          description: "This month spendings",
          value: 0,
        },
        resourcesAll: {
          description: "All resources left",
          value: 0,
        },
        resourcesLeft: {
          description: "Free resources this month",
          value: 0,
        },
      },
      actions: {
        addValue: {
          description: "Add debit or credit",
          hasInput: true,
          url: "/credit",
        },
        changeBudget: {
          description: "Estimated budget",
          hasInput: true,
          url: "/debit",
        },
        recalculateCredit: {
          hasInput: false,
          description: "Recalculate credit",
          url: "/recalculate_credit",
        },
      },
    }
  },
  methods: {
    getCredit: function() {
      return fetch("/credit").then(response => response.json());
    },
    getDebit: function() {
      return fetch("/debit").then(response => response.json());
    },
    getLeftover: function() {
      return fetch("/leftover").then(response => response.json());
    },
  },
  async beforeMount() {
    this.info.fullCredit.value = await this.getCredit();
    this.info.debit.value = await this.getDebit();
    let leftover = await this.getLeftover();
    this.info.spendings.value = leftover.spendings;
    this.info.resourcesAll.value = leftover.leftoverAll;
    this.info.resourcesLeft.value = leftover.leftover;
  },
};
</script>
