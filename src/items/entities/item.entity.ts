import { LuggageCategory } from "src/luggage-categories/entities/luggage-category.entity";
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class Item {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'varchar', length: 255 })
    name: string

    @Column({ type: 'text', nullable: true })
    description?: string

    @Column({ type: 'text', nullable: true })
    icon?: string

    @ManyToOne(
        () => LuggageCategory,
        (category) => category.luggage
    )
    category: LuggageCategory

    // TODO: Relacionarlo usuarios
    // TODO: Relacionarlo con maletas

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date
}
