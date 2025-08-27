import { ItemCategory } from "src/item-categories/entities/item-category.entity";
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
        () => ItemCategory,
        (category) => category.items,
        { nullable: false }
    )
    category: ItemCategory

    // TODO: Relacionarlo usuarios
    // TODO: Relacionarlo con maletas

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date
}
