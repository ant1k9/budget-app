<template>
    <div id="app" style="margin: 20px">
        <h3> {{ card }} </h3>
        <div>
            <span id="card-buttons">
                <button v-for="card in cards" style="margin: 10px" v-on:click="getSpendings(card)">
                    {{ card }}
                </button>
            </span>
            <button v-on:click="previousMonth()">&#8592;</button>
            {{ spendingDateFormatted }}
            <button v-on:click="nextMonth()">&#8594;</button>
        </div>
        <form method="post">
            <table>
                <tbody id="spendings-as-t">
                    <tr v-for="type in types">
                        <td style="padding: 12px"> {{ type }} </td>
                        <td><input :name="type" :value="spendingsForType(type)"> </td>
                    </tr>
                </tbody>
            </table>
            <button>Send</button>
            <input type="hidden" name="date" :value="spendingDateFormatted">
            <input type="hidden" name="card" :value="card">
        </form>
        <table>
            <tr>
                <td><input v-model="newCard"></td>
                <td style="padding: 10px"><button v-on:click="addCard()">Add card</button></td>
                <td><input v-model="newType"></td>
                <td style="padding: 10px"><button v-on:click="addType()">Add type</button></td>
            </tr>
        </table>
        <hr style="width: 50%" align="left">
        <h3> Budget </h3>
        <div>
            <table>
                <tr>
                    <td style="padding: 5px">Full credit:</td>
                    <td style="padding: 5px">{{ credit }}</td>
                </tr>
                <tr>
                    <td style="padding: 5px">Estimated budget:</td>
                    <td style="padding: 5px">{{ debit }}</td>
                </tr>
                <tr>
                    <td style="padding: 5px">This month spendings:</td>
                    <td style="padding: 5px">{{ thisMonthSpendings }}</td>
                </tr>
                <tr>
                    <td style="padding: 5px">All resources left:</td>
                    <td style="padding: 5px">{{ leftoverAll }}</td>
                </tr>
                <tr>
                    <td style="padding: 5px">Free resources this month:</td>
                    <td style="padding: 5px">{{ leftover }}</td>
                </tr>
                <tr>
                    <td style="padding: 5px">Add debit/credit value:</td>
                    <td style="padding: 5px">
                        <form method="post" action="/credit">
                            <input name="value">
                            <button>Save</button>
                        </form>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 5px">Estimated budget:</td>
                    <td style="padding: 5px">
                        <form method="post" action="/debit">
                            <input name="value">
                            <button>Save</button>
                        </form>
                    </td>
                </tr>
                <tr>
                    <td>
                        <form method="post" action="/recalculate_credit">
                            <button>Recalculate credit for last month</button>
                        </form>
                    </td>
                </tr>
            </table>
        </div>
        <hr style="width: 50%" align="left">
        <h3> Wishlist </h3>
        <table>
            <tr v-for="wish, index in wishlist">
                <td style="padding: 8px; vertical-align: middle">
                    <h4>#{{index + 1}} - {{ wish.description }}</h4>
                </td>
                <td style="padding: 8px; vertical-align: middle" v-if="index > 0">
                    <form method="post" action="/wishlist/swap">
                        <input type="hidden" name="first" :value="wishlist[index].description">
                        <input type="hidden" name="second" :value="wishlist[index-1].description">
                        <button>⬆</button>
                    </form>
                </td>
                <td style="padding: 8px; vertical-align: middle" v-else></td>
                <td style="padding: 8px; vertical-align: middle" v-if="index < wishlist.length - 1">
                    <form method="post" action="/wishlist/swap">
                        <input type="hidden" name="first" :value="wishlist[index].description">
                        <input type="hidden" name="second" :value="wishlist[index+1].description">
                        <button>⬇</button>
                    </form>
                </td>
                <td style="padding: 8px; vertical-align: middle" v-else></td>
                <td style="padding: 8px; vertical-align: middle">
                    <form method="post" action="/wishlist/remove">
                        <input type="hidden" name="desc" :value="wish.description">
                        <button>✔</button>
                    </form>
                </td>
            </tr>
        </table><br/>
        <form method="post" action="wishlist">
            <input name="description">
            <button>Add wish </button>
        </form>
    </div>
</template>

<script>
const formatDate = (d) =>
    `${d.getUTCFullYear()}-${d.getMonth() > 8 ? "" : "0"}${d.getMonth() + 1}-01`;

export default {
    data() {
        return {
            "spendings": {},
            "cards": [],
            "types": [],
            "spendingDate": undefined,
            "spendingDateFormatted": "",
            "card": "",
            "credit": 0,
            "debit": 0,
            "thisMonthSpendings": 0,
            "leftover": 0,
            "leftoverAll": 0,
            "newCard": "",
            "newType": "",
            "wishlist": [],
        }
    },
    methods: {
        addCard: function() {
            this.cards.push(this.newCard);
        },
        addType: function() {
            this.types.push(this.newType);
        },
        saveCard: function() {
            localStorage["card"] = this.card;
        },
        restoreCard: function() {
            this.card = localStorage["card"];
        },
        checkCard: function(card) {
            let found = false;
            for ( let c of this.cards )
                if ( card === c )
                    found = true;
            return found ? card : (this.cards[0] || "");
        },
        getCurrentMonth: function() {
            this.spendingDate = new Date();
            this.spendingDate.setDate(1);
            this.spendingDate.setHours(12);
            this.spendingDateFormatted = formatDate(this.spendingDate);
        },
        nextMonth: function() {
            let month = this.spendingDate.getMonth();
            let year = month === 11
                ? this.spendingDate.getUTCFullYear() + 1
                : this.spendingDate.getUTCFullYear();
            this.spendingDate.setMonth((month + 1)  % 12);
            this.spendingDate.setYear(year);
            this.spendingDateFormatted = formatDate(this.spendingDate);
            this.getSpendings(this.card);
        },
        previousMonth: function() {
            let month = this.spendingDate.getMonth();
            let year = month === 0
                ? this.spendingDate.getUTCFullYear() - 1
                : this.spendingDate.getUTCFullYear();
            this.spendingDate.setMonth((month + 12 - 1) % 12);
            this.spendingDate.setYear(year);
            this.spendingDateFormatted = formatDate(this.spendingDate);
            this.getSpendings(this.card);
        },
        getSpendings: function(card) {
            card = this.checkCard(card);
            this.card = card;
            this.saveCard();
            return fetch(
                `/spendings?card=${this.card || ""}&date=${formatDate(this.spendingDate)}`)
                .then(response => response.json())
                .then(data => {
                    let spendings = {};
                    for ( let item of data ) {
                        spendings[item["type"]] = item["spent_money"];
                    }
                    this.spendings = spendings;
                });
        },
        getCards: function() {
            return fetch("/items/distinct/card")
                .then(response => response.json())
                .then(data => (this.cards = data));
        },
        getTypes: function() {
            return fetch("/items/distinct/type")
                .then(response => response.json())
                .then(data => (this.types = data));
        },
        spendingsForType: function(type) {
            return this.spendings[type] || 0;
        },
        getCredit: function() {
            return fetch("/credit")
                .then(response => response.json())
                .then(data => (this.credit = data));
        },
        getDebit: function() {
            return fetch("/debit")
                .then(response => response.json())
                .then(data => (this.debit = data));
        },
        getLeftover: function() {
            return fetch("/leftover")
                .then(response => response.json())
                .then(data => {
                    this.leftover = data["leftover"];
                    this.thisMonthSpendings = data["spendings"];
                    this.leftoverAll = data["leftoverAll"];
                });
        },
        getWishlist: function() {
            return fetch("/wishlist")
                .then(response => response.json())
                .then(data => this.wishlist = data);
        },
    },
    async beforeMount() {
        this.restoreCard();
        await this.getCurrentMonth();
        await this.getCards();
        await this.getSpendings(this.card);
        this.getTypes();
        this.getCredit();
        this.getDebit();
        this.getLeftover();
        await this.getWishlist();
    },
}
</script>
