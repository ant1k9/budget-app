import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity({'name': 'credit'})
export class Credit {
    @PrimaryGeneratedColumn()
    id = undefined;

    @Column("integer")
    value = 0;

    @Column("date")
    month = 0;
}
