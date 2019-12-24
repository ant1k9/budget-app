const express = require( "express" );
const bodyParser = require( "body-parser" );
const path = require( "path" );

import { getRepository, createConnection } from "typeorm";
import { Spending } from "./entity/models";

const app = express();
const port = 8080;

app.use(bodyParser.urlencoded({ extended: false }));

let connection;
createConnection().then(conn => connection = conn);

app.get( "/spendings", async ( req, res ) => {
    let card = req.query['card'] || "mkb";
    let date = req.query['date'];

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

    res.write(JSON.stringify(items));
    res.end();
});

// define a route handler for the default home page
app.get( "/", ( req, res ) => {
    res.sendFile( path.join(__dirname, "public", "index.html") );
} );

app.post( "/", async ( req, res ) => {
    let card = req.body['card'];
    let date = req.body['date'];
    let spendingRepo = await connection.getRepository(Spending);

    for ( let type of Object.keys(req.body) ) {
        if ( type !== 'card' && type !== 'date' ) {
            let objects = await spendingRepo.findAndCount({card: card, month: date, type: type});
            if ( objects[1] === 0 ) {
                let spending = new Spending();
                spending.card = card;
                spending.month = date;
                spending.type = type;
                spending.spent_money = req.body[type];
                await spendingRepo.save(spending);
            } else if ( objects[1] === 1 ) {
                objects[0][0].spent_money = req.body[type];
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

