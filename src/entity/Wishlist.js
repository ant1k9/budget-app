import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity({'name': 'wishlist'})
export class Wish {
    @PrimaryGeneratedColumn()
    id = undefined;

    @Column("varchar", {"length": 255})
    description = "";

    @Column("integer")
    priority = 0;

    @Column("boolean")
    is_done = false;
}
