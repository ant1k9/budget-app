const express = require( "express" );
const bodyParser = require( "body-parser" );
const path = require( "path" );
const uuid = require("uuid").v4;
const passport = require("passport");
const session = require("express-session");
const pgConnectionString = require('pg-connection-string');
const pg = require('pg');

const PostgreSqlStore = require('connect-pg-simple')(session);
const LocalStrategy = require("passport-local").Strategy;

import { getRepository, createConnection } from "typeorm";
import { Card } from "./entity/Card";
import { Credit } from "./entity/Credit";
import { Debit } from "./entity/Debit";
import { Spending } from "./entity/Spending";
import { Wish } from "./entity/Wishlist";

const app = express();
const port = process.env.PORT || 5000;

const dummy = { id: "test@test.test", email: "test@test.test", password: process.env.APP_PASSWORD };

// connection to DB
let connection;

passport.use(new LocalStrategy(
  { usernameField: "email" },
  (email, password, done) => {
    if( password === process.env.APP_PASSWORD ) {
      return done(null, dummy);
    }
    return done(null, false, { message: 'Invalid credentials.\n' });
  }
));

passport.serializeUser((_, done) => {
  done(null, dummy.id);
});

passport.deserializeUser((_, done) => {
  done(null, dummy);
});

const config = pgConnectionString.parse(process.env.DATABASE_URL)
config.ssl = {
  sslmode: 'require',
  rejectUnauthorized: false
}

const pool = new pg.Pool(config)

app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
  genid: () => {
    return uuid() // use UUIDs for session IDs
  },
  store: new PostgreSqlStore({
    pool: pool,
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

createConnection({
  type: "postgres",
  url: process.env.DATABASE_URL,
  entities: [
    "entity/*.js",
  ],
  synchronize: true,
  ssl: config.ssl,
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
  if (req.isAuthenticated()) {
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
  } else {
    res.redirect("/login");
  }
});

app.get( "/credit", async ( req, res ) => {
  if (req.isAuthenticated()) {
    let credit = await getCredit();
    res.write(`${credit}`);
    res.end();
  } else {
    res.redirect("/login");
  }
});

app.get( "/debit", async ( req, res ) => {
  if (req.isAuthenticated()) {
    let debitInfo = await getDebitInfo();

    if ( debitInfo[1] === 1 )
      res.write(`${debitInfo[0][0]["value"]}`);
    else
      res.write("0");

    res.end();
  } else {
    res.redirect("/login");
  }
});

app.get( "/leftover", async ( req, res ) => {
  if (req.isAuthenticated()) {
    let debitInfo = await getDebitInfo();
    let debit = debitInfo[1] == 1 ? +debitInfo[0][0]["value"] : 0;
    let credit = await getCredit();
    let spendingRepo = await connection.getRepository(Spending);
    let date = currentDate();

    debit += (+credit > 0) ? +credit : 0;

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

    res.write(JSON.stringify({
      leftover: `${Math.round(leftover)}`,
      leftoverAll: `${Math.round(debit - thisMonthAllSpendings["total"])}`,
      spendings: thisMonthAllSpendings["total"]
    }));
    res.end();
  } else {
    res.redirect("/login");
  }
});

app.get( "/items/distinct/:item", async ( req, res ) => {
  if (req.isAuthenticated()) {
    let item = req.params["item"]

    let query = connection
      .getRepository(Spending)
      .createQueryBuilder("my_wallet")
      .select(item)
      .distinct();

    if ( item === "card" ) {
      let excludedCards = await connection
        .getRepository(Card)
        .createQueryBuilder("my_wallet")
        .select("name")
        .distinct()
        .getRawMany();
      excludedCards = excludedCards.map(card => card["name"]);
      if ( excludedCards.length > 0 ) {
        query = query.where("my_wallet.card NOT IN (:...cards)", { cards: excludedCards });
      }
    }

    let items = await query.getRawMany();
    items = items.map(i => i[item]);
    items.sort();

    res.write(JSON.stringify(items));
    res.end();
  } else {
    res.redirect("/login");
  }
});

app.get( "/wishlist", async ( req, res ) => {
  if (req.isAuthenticated()) {
    let wishRepo = await connection.getRepository(Wish);
    let wishlist = await wishRepo.createQueryBuilder("wishlist")
      .select("description")
      .where("NOT is_done")
      .orderBy("priority")
      .getRawMany();

    res.send(JSON.stringify(wishlist));
    res.end();
  } else {
    res.redirect("/login");
  }
});

app.delete( "/card/:card", async ( req, res ) => {
  if ( req.isAuthenticated() ) {
    let card = new Card();
    card.name = req.params["card"];
    await connection.getRepository( Card ).save( card );
  }
  res.end();
});

app.post( "/credit", async( req, res ) => {
  if (req.isAuthenticated()) {
    let value = req.body["value"];
    let creditRepo = await connection.getRepository(Credit);

    let credit = new Credit();
    credit.month = new Date();
    credit.value = value;
    await creditRepo.save(credit);

    res.redirect(req.body["next"] || "/");
    res.end();
  } else {
    res.redirect("/login");
  }
});

app.post( "/debit", async( req, res ) => {
  if (req.isAuthenticated()) {
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

    res.redirect(req.body["next"] || "/");
    res.end();
  } else {
    res.redirect("/login");
  }
});

app.post( "/recalculate_credit", async ( req, res ) => {
  if (req.isAuthenticated()) {
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

    res.redirect(req.body["next"] || "/");
    res.end();
  } else {
    res.redirect("/login");
  }
});

app.post( "/wishlist/swap", async ( req, res ) => {
  if (req.isAuthenticated()) {
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

    res.redirect(req.body["next"] || "/");
    res.end();
  } else {
    res.redirect("/login");
  }
});

app.post( "/wishlist/remove", async ( req, res ) =>  {
  if (req.isAuthenticated()) {
    let wishRepo = await connection.getRepository(Wish);
    await wishRepo.createQueryBuilder("wishlist")
      .update()
      .set({is_done: true})
      .where("NOT wishlist.is_done AND wishlist.description = :desc", { desc: req.body["desc"] })
      .execute();

    res.redirect(req.body["next"] || "/");
    res.end();
  } else {
    res.redirect("/login");
  }
});

app.post( "/wishlist", async ( req, res ) => {
  if (req.isAuthenticated()) {
    let wishRepo = await connection.getRepository(Wish);
    let newWish = new Wish();

    let maxPriority = await wishRepo.createQueryBuilder("wishlist")
      .select("MAX(priority)", "max")
      .getRawOne();

    newWish.description = req.body["description"];
    newWish.is_done = false;
    newWish.priority = (maxPriority["max"] || 0) + 1;

    wishRepo.save(newWish);

    res.redirect(req.body["next"] || "/");
    res.end();
  } else {
    res.redirect("/login");
  }
});

app.get( "/login", async ( req, res ) => {
  res.sendFile( path.join(__dirname, "public", "login.html") );
} );

app.post( "/login", async ( req, res, next ) => {
  passport.authenticate('local', (err, user, info) => {
    if (info) {
      return res.send(info.message);
    }
    if (err) {
      return next(err);
    }
    if (info || !user) {
      return res.redirect('/login');
    }

    req.login(user, (err) => {
      if (err) {
        return next(err);
      }
      return res.redirect('/');
    })
  })(req, res, next);
} );

// serve static content
app.get( "/:filename", ( req, res ) => {
  if (req.isAuthenticated()) {
    let filename = req.params["filename"];
    res.sendFile( path.join(__dirname, "public", filename) );
  } else {
    res.redirect("/login");
  }
} );

// define a route handler for the default home page
app.get( "*", ( req, res ) => {
  if (req.isAuthenticated()) {
    res.sendFile( path.join(__dirname, "public", "index.html") );
  } else {
    res.redirect("/login");
  }
} );

app.post( "/", async ( req, res ) => {
  if (req.isAuthenticated()) {
    let card = req.body["card"];
    let date = req.body["date"];
    let spendingRepo = await connection.getRepository(Spending);

    await connection.getRepository( Card ).delete({ name: card });

    for ( let type of Object.keys(req.body) ) {
      if ( type !== "card" && type !== "date" && type !== "next" ) {
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

    res.redirect(req.body["next"] || "/");
    res.end();
  } else {
    res.redirect("/login");
  }
} );

// start the Express server
app.listen( port, () => {
  console.log( `server started at http://localhost:${ port }` );
} );
