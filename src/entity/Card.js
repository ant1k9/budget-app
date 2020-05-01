import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity({'name': 'card'})
export class Card {
    @PrimaryGeneratedColumn()
    id = undefined;

    @Column("varchar", {"length": 32, "unique": true})
    name = "";
}
