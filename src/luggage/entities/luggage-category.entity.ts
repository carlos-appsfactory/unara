import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Luggage } from ".";

@Entity()
export class LuggageCategory {

    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column('text')
    name: string

    @Column({ type: 'text', nullable: true })
    description?: string

    @Column('text')
    image: string

    @OneToMany(
        () => Luggage,
        (luggage) => luggage.category
    )
    luggage: Luggage[]

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date
}