const express = require( "express" );
const bodyParser = require( "body-parser" );
const path = require( "path" );

import { getRepository, createConnection } from "typeorm";
import { Spending } from "./entity/Spending";
import { Credit } from "./entity/Credit";
import { Debit } from "./entity/Debit";
import { Wish } from "./entity/Wishlist";

const app = express();
const port = 8080;

app.use(bodyParser.urlencoded({ extended: false }));

let connection;

createConnection({
    type: "postgres",
    url: process.env.DATABASE_URL,
    entities: [
      "dist/entity/*.js",
    ],
}).then(conn => connection = conn);

const getDebitInfo = async _ => {
    return await connection
        .getRepository(Debit)
        .findAndCount({"month": currentDate()});
};

const getCredit = async _ => {
    let credit = await connection
        .getRepository(Credit)
        .createQueryBuilder("credit")
        .select("SUM(credit.value)", "sum")
        .getRawOne();
    return credit["sum"];
};

const currentDate = _ => {
    let date = new Date();
    date.setUTCDate(1);
    date.setUTCHours(0);
    return date
};

app.get( "/spendings", async ( req, res ) => {
    let card = req.query["card"];
    let date = req.query["date"];

    let spendings = await connection
        .getRepository(Spending)
        .createQueryBuilder("my_wallet")
        .select(["type", "spent_money"])
        .where({"card": card, "month": date})
        .distinct()
        .getRawMany();

    res.write(JSON.stringify(spendings));
    res.end();
});

app.get( "/credit", async ( req, res ) => {
    let credit = await getCredit();
    res.write(`${credit}`);
    res.end();
});

app.get( "/debit", async ( req, res ) => {
    let debitInfo = await getDebitInfo();

    if ( debitInfo[1] === 1 )
        res.write(`${debitInfo[0][0]["value"]}`);
    else
        res.write("0");

    res.end();
});

app.get( "/leftover", async ( req, res ) => {
    let debitInfo = await getDebitInfo();
    let debit = debitInfo[1] == 1 ? +debitInfo[0][0]["value"] : 0;
    let credit = await getCredit();
    let spendingRepo = await connection.getRepository(Spending);
    let date = currentDate();

    let sixMonthsAgo = new Date(date);
    if ( sixMonthsAgo.getMonth() > 5 )
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    else {
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() + 12 - 6);
        sixMonthsAgo.setUTCFullYear(sixMonthsAgo.getUTCFullYear() - 1);
    }

    let regularSpendingsLastSixMonths = await spendingRepo
        .createQueryBuilder("my_wallet")
        .select("SUM(my_wallet.spent_money)", "total")
        .where("my_wallet.month >= :date AND my_wallet.month < :now", {
            date: sixMonthsAgo, now: date
        })
        .andWhere("my_wallet.type IN (:...types)", { types: ["food", "utilities", "transport"] })
        .getRawOne();

    let thisMonthIrregularSpendings = await spendingRepo
        .createQueryBuilder("my_wallet")
        .select("SUM(my_wallet.spent_money)", "total")
        .where("my_wallet.month = :date", { date: date })
        .andWhere("my_wallet.type NOT IN (:...types)", {
            types: ["food", "utilities", "transport", "education"]
        })
        .getRawOne();

    let thisMonthAllSpendings = await spendingRepo
        .createQueryBuilder("my_wallet")
        .select("SUM(my_wallet.spent_money)", "total")
        .where("my_wallet.month = :date", { date: date })
        .andWhere("my_wallet.type != :type", {type: "education"})
        .getRawOne();

    let averageRegularSpendings = regularSpendingsLastSixMonths["total"] / 6;
    let leftover = debit - averageRegularSpendings - thisMonthIrregularSpendings["total"];
    leftover += credit > 0 ? credit : 0;

    res.write(JSON.stringify({
        leftover: `${Math.round(leftover)}`,
        leftoverAll: `${Math.round(debit - thisMonthAllSpendings["total"])}`,
        spendings: thisMonthAllSpendings["total"]
    }));
    res.end();
});

app.get( "/items/distinct/:item", async ( req, res ) => {
    let item = req.params["item"]

    let items = await connection
        .getRepository(Spending)
        .createQueryBuilder("my_wallet")
        .select(item)
        .distinct()
        .getRawMany();

    for ( let i in items ) {
        items[i] = items[i][item];
    }
    items.sort();

    res.write(JSON.stringify(items));
    res.end();
});

app.get( "/wishlist", async ( req, res ) => {
    let wishRepo = await connection.getRepository(Wish);
    let wishlist = await wishRepo.createQueryBuilder("wishlist")
        .select("description")
        .where("NOT is_done")
        .orderBy("priority")
        .getRawMany();

    res.send(JSON.stringify(wishlist));
    res.end();
});

app.get( "/:filename", ( req, res ) => {
    let filename = req.params["filename"];
    res.sendFile( path.join(__dirname, "../public", filename) );
} );

// define a route handler for the default home page
app.get( "/", ( req, res ) => {
    res.sendFile( path.join(__dirname, "../public", "index.html") );
} );

app.post( "/credit", async( req, res ) => {
    let value = req.body["value"];
    let creditRepo = await connection.getRepository(Credit);

    let credit = new Credit();
    credit.month = new Date();
    credit.value = value;
    await creditRepo.save(credit);

    res.redirect("/");
    res.end();
});

app.post( "/debit", async( req, res ) => {
    let value = req.body["value"];
    let debitRepo = await connection.getRepository(Debit);
    let debitInfo = await getDebitInfo();
    let debit = undefined;
    let date = currentDate();

    if ( debitInfo[1] === 1 )
        debit = debitInfo[0][0];
    else
        debit = new Debit();

    debit.month = date;
    debit.value = value;
    await debitRepo.save(debit);

    res.redirect("/");
    res.end();
});

app.post( "/recalculate_credit", async ( req, res ) => {
    let debitRepo = await connection.getRepository(Debit);
    let creditRepo = await connection.getRepository(Credit);
    let spendingRepo = await connection.getRepository(Spending);
    let date = currentDate();

    if ( date.getUTCMonth() == 0 ) {
        date.setMonth( 11 );
        date.setYear( date.getUTCFullYear() - 1 );
    } else {
        date.setMonth( date.getUTCMonth() - 1 );
    }

    let debitLastMonth = await debitRepo.find({"month": date});
    if ( debitLastMonth.length > 0 && !debitLastMonth[0].is_recalculated ) {
        let debit = debitLastMonth[0];
        let lastMonthIrregularSpendings = await spendingRepo
            .createQueryBuilder("my_wallet")
            .select("SUM(my_wallet.spent_money)", "total")
            .where("my_wallet.month = :date", { date: date })
            .andWhere("my_wallet.type NOT IN (:...types)", { types: ["education"] })
            .getRawOne();

        let extraCredit = new Credit();
        extraCredit.value = debit.value - lastMonthIrregularSpendings["total"];
        extraCredit.month = new Date();
        creditRepo.save(extraCredit);

        debit.is_recalculated = true;
        debitRepo.save(debit);
    }

    res.redirect("/");
    res.end();
});

app.post( "/wishlist/swap", async ( req, res ) => {
    let first = req.body["first"];
    let second = req.body["second"];
    let wishRepo = await connection.getRepository(Wish);

    let firstWish = await wishRepo.findOne({is_done: false, description: first});
    let secondWish = await wishRepo.findOne({is_done: false, description: second});

    if ( firstWish !== undefined && secondWish !== undefined ) {
        let tmp = firstWish.priority;
        firstWish.priority = secondWish.priority;
        secondWish.priority = tmp;
        await wishRepo.save([firstWish, secondWish]);
    }

    res.redirect("/");
    res.end();
});

app.post( "/wishlist/remove", async ( req, res ) =>  {
    let wishRepo = await connection.getRepository(Wish);
    await wishRepo.createQueryBuilder("wishlist")
        .update()
        .set({is_done: true})
        .where("NOT wishlist.is_done AND wishlist.description = :desc", { desc: req.body["desc"] })
        .execute();

    res.redirect("/");
    res.end();
});

app.post( "/wishlist", async ( req, res ) => {
    let wishRepo = await connection.getRepository(Wish);
    let newWish = new Wish();

    let maxPriority = await wishRepo.createQueryBuilder("wishlist")
        .select("MAX(priority)", "max")
        .getRawOne();

    newWish.description = req.body["description"];
    newWish.is_done = false;
    newWish.priority = (maxPriority["max"] || 0) + 1;

    wishRepo.save(newWish);

    res.redirect("/");
    res.end();
});

app.post( "/", async ( req, res ) => {
    let card = req.body["card"];
    let date = req.body["date"];
    let spendingRepo = await connection.getRepository(Spending);

    for ( let type of Object.keys(req.body) ) {
        if ( type !== "card" && type !== "date" ) {
            let objects = await spendingRepo.findAndCount({card: card, month: date, type: type});
            if ( objects[1] === 0 ) {
                let spending = new Spending();
                spending.card = card;
                spending.month = date;
                spending.type = type;
                spending.spent_money = eval(req.body[type]);
                await spendingRepo.save(spending);
            } else if ( objects[1] === 1 ) {
                objects[0][0].spent_money = eval(req.body[type]);
                await spendingRepo.save(objects[0][0]);
            }
        }
    }

    res.redirect("/");
    res.end();
} );

// start the Express server
app.listen( port, () => {
    console.log( `server started at http://localhost:${ port }` );
} );
