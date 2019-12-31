import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity({'name': 'debit'})
export class Debit {
    @PrimaryGeneratedColumn()
    id = undefined;

    @Column("integer")
    value = 0;

    @Column("date")
    month = 0;

    @Column("boolean", {default: false})
    is_recalculated = false;
}
