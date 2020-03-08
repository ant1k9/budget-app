const Vue = require("vue");
const Vuex = require("vuex");

Vue.use(Vuex);

const formatDate = (d) =>
   `${d.getUTCFullYear()}-${d.getMonth() > 8 ? "" : "0"}${d.getMonth() + 1}-01`;

let currentMonth = new Date();
currentMonth.setDate(1);
currentMonth.setHours(12);

const store = new Vuex.Store({
  state: {
    cards: [],
    types: [],
    spendingDate: currentMonth,
    spendingDateFormatted: formatDate(currentMonth),
  },
  mutations: {
    addCard: (state, card) => {
      state.cards.push(card.value);
    },
    addType: (state, type) => {
      state.types.push(type.value);
    },
    nextMonth: (state) => {
      let month = state.spendingDate.getMonth();
      let year = month === 11
        ? state.spendingDate.getUTCFullYear() + 1
        : state.spendingDate.getUTCFullYear();
      state.spendingDate.setMonth((month + 1)  % 12);
      state.spendingDate.setYear(year);
      state.spendingDateFormatted = formatDate(state.spendingDate);
    },
    previousMonth: (state) => {
      let month = state.spendingDate.getMonth();
      let year = month === 0
        ? state.spendingDate.getUTCFullYear() - 1
        : state.spendingDate.getUTCFullYear();
      state.spendingDate.setMonth((month + 12 - 1) % 12);
      state.spendingDate.setYear(year);
      state.spendingDateFormatted = formatDate(state.spendingDate);
    },
  },
})

module.exports = store;
