import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { LuggageCategory } from ".";

@Entity()
export class Luggage {

    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column('text')
    name: string

    @ManyToOne(
        () => LuggageCategory,
        (category) => category.luggage
    )
    category: LuggageCategory

    // TODO viaje asociado
    // TODO usuario asociado
    
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    updatedAt: Date;
}
