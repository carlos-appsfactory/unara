import { LuggageCategory } from "src/luggage-categories/entities/luggage-category.entity";
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export enum LuggageType {
  SMALL_BACKPACK = "small_backpack",
  LARGE_BACKPACK = "large_backpack",
  SMALL_SUITCASE = "small_suitcase",
  LARGE_SUITCASE = "large_suitcase",
}

@Entity()
export class Luggage {

    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column('text')
    name: string

    @ManyToOne(
        () => LuggageCategory,
        (category) => category.luggage,
        { nullable: false }
    )
    category: LuggageCategory

    // TODO viaje asociado
    // TODO usuario asociado
    
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    updatedAt: Date;
}
