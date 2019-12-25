import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity({'name': 'my_wallet'})
export class Spending {
    @PrimaryGeneratedColumn()
    id = undefined;

    @Column("varchar", {"length": 255})
    type = "";

    @Column("date")
    month = new Date();

    @Column("integer")
    spent_money = 0;

    @Column("varchar", {"length": 32})
    card = "";
}
